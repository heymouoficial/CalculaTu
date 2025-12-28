import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const { file, fileName, machineId, scope = 'global' } = await req.json()

  // 1. Parse Text (Simple implementation for demo/MVP)
  // In a real scenario, use a PDF parser here.
  const content = file // Assuming text for now

  // 2. Generate Embedding
  const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text: content }] }
    })
  })
  const { embedding } = await embeddingResponse.json()

  // 3. Store in Supabase
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await supabase.from('knowledge_base').insert({
    content,
    embedding: embedding.values,
    metadata: { fileName, machineId, scope }
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
