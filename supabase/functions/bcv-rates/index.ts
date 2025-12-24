// supabase/functions/bcv-rates/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Suppress Deno name errors in some IDEs
declare const Deno: any;

// Definimos interfaces para las respuestas
interface BCVResponse {
    dollar: number
    date: string
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Lógica de APIs ---

// Fuente Primaria: Wrapper de BCV (Rafnixg)
async function fetchPrimarySource(): Promise<number> {
    console.log('[bcv-rates] Trying Primary Source (Rafnixg)...');
    const res = await fetch('https://bcv-api.rafnixg.dev/rates/');
    if (!res.ok) throw new Error(`Primary API Error: ${res.status}`);
    const data: BCVResponse = await res.json();
    if (!data.dollar || isNaN(Number(data.dollar))) {
        throw new Error('Invalid data from Primary Source');
    }
    return Number(data.dollar);
}

// Fuente Secundaria (Fallback): PyDolarVenezuela (BCV endpoint)
async function fetchSecondarySource(): Promise<number> {
    console.log('[bcv-rates] Primary failed. Trying Secondary Source (PyDolar)...');
    // Usamos el endpoint oficial de BCV en PyDolar como fallback
    const res = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=bcv');
    if (!res.ok) throw new Error(`Secondary API Error: ${res.status}`);
    const data = await res.json();
    // La estructura suele ser monitors.usd.price o similar según la versión
    const price = data?.monitors?.usd?.price;
    if (!price) throw new Error('Price not found in Secondary Source');
    const cleanPrice = String(price).replace(',', '.');
    if (isNaN(Number(cleanPrice))) {
        throw new Error('Invalid numeric data from Secondary Source');
    }
    return Number(cleanPrice);
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        let usdPrice = 0;
        let sourceUsed = 'primary';

        // 1. Intentar obtener USD con Fallback
        try {
            usdPrice = await fetchPrimarySource();
        } catch (e: any) {
            console.warn('[bcv-rates] Primary source failed:', e.message);
            try {
                usdPrice = await fetchSecondarySource();
                sourceUsed = 'secondary-pydolar';
            } catch (e2: any) {
                console.error('[bcv-rates] All sources failed');
                throw new Error(`Critical: Unable to fetch BCV rates. Errors: ${e.message} | ${e2.message}`);
            }
        }

        // 2. Calcular EUR usando Cross-Rate (Frankfurter)
        let eurPrice = 0;
        try {
            const ecbRes = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD');
            if (ecbRes.ok) {
                const ecbData = await ecbRes.json();
                const eurUsdRate = ecbData.rates.USD;
                // 1 EUR = X USD, 1 USD = Y VES -> 1 EUR = X * Y VES
                eurPrice = usdPrice * eurUsdRate;
            } else {
                throw new Error('ECB API unstable');
            }
        } catch (err) {
            console.warn('[bcv-rates] EUR cross-rate failed, estimating with 1.08 static fallback');
            eurPrice = usdPrice * 1.08; // Fallback razonable si falla Frankfurter
        }

        // 3. Guardar en Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error } = await supabase.from('exchange_rates').upsert(
            {
                id: 1,
                usd: Number(usdPrice.toFixed(4)), // Mas precisión internamente
                eur: Number(eurPrice.toFixed(4)),
                source: `bcv-auto-${sourceUsed}`,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
        )

        if (error) {
            throw new Error(`Supabase upsert failed: ${error.message}`)
        }

        const result = {
            success: true,
            usd: Number(usdPrice.toFixed(2)),
            eur: Number(eurPrice.toFixed(2)),
            source: sourceUsed,
            updatedAt: new Date().toISOString(),
        }

        console.log('[bcv-rates] Update successful:', result)

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
