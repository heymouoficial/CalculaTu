
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Client } from 'npm:@notionhq/client'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate User via Supabase Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid User Token')
    }

    // 2. Initialize Notion Client
    const notionToken = Deno.env.get('NOTION_MCP_TOKEN')
    if (!notionToken) {
      return new Response(
        JSON.stringify({ error: 'Notion Token not configured on server' }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const notion = new Client({ auth: notionToken })

    // 3. Parse Request
    const { action, payload } = await req.json()

    let result

    switch (action) {
      case 'connection_status':
        // Simple check to see if we can list users or similar (lightweight)
        try {
          await notion.users.me({})
          result = { status: 'connected' }
        } catch (e) {
            console.error("Notion connection check failed:", e)
            result = { status: 'disconnected', error: e.message }
        }
        break

      case 'dashboard':
        // Fetch recent pages as a "dashboard" view
        // Is sensitive to user having access to pages
        const searchResponse = await notion.search({
          filter: { property: 'object', value: 'page' },
          page_size: 5,
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
        })
        
        result = searchResponse.results.map((page: any) => ({
            id: page.id,
            title: page.properties?.title?.title?.[0]?.plain_text || page.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
            icon: page.icon?.emoji || '📄',
            url: page.url,
            lastEdited: page.last_edited_time
        }))
        break
      
       case 'query_database':
        // Query a specific database
        if (!payload?.database_id) {
           throw new Error('Missing database_id in payload')
        }
        result = await notion.databases.query({
            database_id: payload.database_id,
            filter: payload.filter,
            sorts: payload.sorts,
            start_cursor: payload.start_cursor,
            page_size: payload.page_size || 100
        })
        break

      case 'create_page':
        if (!payload?.parent_id || !payload?.properties) {
          throw new Error('Missing parent_id or properties')
        }
        result = await notion.pages.create({
          parent: { database_id: payload.parent_id },
          properties: payload.properties,
          icon: payload.icon
        })
        break

      case 'update_page':
        if (!payload?.page_id || !payload?.properties) {
           throw new Error('Missing page_id or properties')
        }
        result = await notion.pages.update({
            page_id: payload.page_id,
            properties: payload.properties
        })
        break

      case 'get_users':
        result = await notion.users.list({})
        break

      case 'search':
        // Generic search
        result = await notion.search({
            query: payload?.query,
            page_size: payload?.pageSize || 10
        })
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error handling request:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
