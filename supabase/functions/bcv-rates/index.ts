// supabase/functions/bcv-rates/index.ts
// Supabase Edge Function to fetch BCV exchange rates every 6 hours
// USD from bcv-api.rafnixg.dev, EUR calculated via ECB cross-rate

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BCVResponse {
    dollar: number
    date: string
}

interface ECBResponse {
    rates: { USD: number }
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Fetch USD/VES from BCV API
        const bcvRes = await fetch('https://bcv-api.rafnixg.dev/rates/')
        if (!bcvRes.ok) {
            throw new Error(`BCV API failed: ${bcvRes.status}`)
        }
        const bcvData: BCVResponse = await bcvRes.json()
        const usd = bcvData.dollar

        // 2. Fetch EUR/USD from ECB (via frankfurter)
        const ecbRes = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD')
        if (!ecbRes.ok) {
            throw new Error(`ECB API failed: ${ecbRes.status}`)
        }
        const ecbData: ECBResponse = await ecbRes.json()
        const eurUsdRate = ecbData.rates.USD // e.g., 1.04 means 1 EUR = 1.04 USD

        // 3. Calculate EUR/VES using cross-rate
        // If 1 EUR = 1.04 USD, and 1 USD = 285 VES
        // Then 1 EUR = 1.04 * 285 = 296.4 VES
        const eur = usd * eurUsdRate

        // 4. Update Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error } = await supabase.from('exchange_rates').upsert(
            {
                id: 1,
                usd: Math.round(usd * 100) / 100,
                eur: Math.round(eur * 100) / 100,
                source: 'bcv-auto',
            },
            { onConflict: 'id' }
        )

        if (error) {
            throw new Error(`Supabase upsert failed: ${error.message}`)
        }

        const result = {
            success: true,
            usd: Math.round(usd * 100) / 100,
            eur: Math.round(eur * 100) / 100,
            eurUsdRate,
            bcvDate: bcvData.date,
            updatedAt: new Date().toISOString(),
        }

        console.log('[bcv-rates] Updated:', result)

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (err) {
        console.error('[bcv-rates] Error:', err)
        return new Response(
            JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
