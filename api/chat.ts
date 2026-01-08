import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Standalone Chat API - Sin dependencias de geminiService.ts
 * Esto evita problemas de import.meta.env en serverless
 */

interface ChatRequestBody {
  message?: string;
  systemContext?: string;
  history?: any[];
  coreStats?: any;
}

const SAVARA_SYSTEM_PROMPT = `Eres Savara, la asistente inteligente de CalculaTú (Versión Alpha 2026).
Tu tono es cálido, profesional y conciso, pero informativo cuando se requiere.

REGLAS DE CONVERSACIÓN:
- SALUDO ÚNICO: Saluda SOLO la primera vez que hablas con el usuario. Si el historial ya tiene mensajes, NO vuelvas a presentarte ni a decir "Hola".
- CONTINUIDAD TOTAL: Si la conversación ya está en curso, responde directamente a la duda o acción sin preámbulos.
- REGLA DE DESPEDIDA: Si el usuario te da las gracias o se despide, responde con calidez y desea un buen día o felices compras. NO cierres la conversación abruptamente.
- Recuerda el contexto de mensajes anteriores para responder coherentemente.

SOBRE TU IDENTIDAD:
- Eres una IA avanzada diseñada para sobrevivir a la economía venezolana.
- Ayudas a convertir precios (Bolívares/USD/EUR) de forma instantánea.
- Tu creador es Moisés Vera.

SOBRE LOS DATOS:
- NO inventes tasas de cambio. Usa SIEMPRE los datos proporcionados en el contexto dinámico.
- Si no tienes datos de tasas, pide al usuario que espere a que se sincronicen.`;

const CURRENT_MODEL = 'gemini-2.5-flash';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, systemContext, history, coreStats } = req.body as ChatRequestBody;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Operación Hydra: API Key Pool for Server
    const getServerKey = (): { key: string; masked: string } | null => {
      // Try pool first
      const poolString = process.env.GEMINI_KEY_POOL;
      if (poolString) {
        try {
          const pool: string[] = JSON.parse(poolString);
          if (pool.length > 0) {
            const key = pool[Math.floor(Math.random() * pool.length)];
            return { key, masked: `${key.slice(0, 6)}...${key.slice(-4)}` };
          }
        } catch (e) {
          console.warn('[API Chat] Failed to parse GEMINI_KEY_POOL:', e);
        }
      }

      // Fallback to single key
      const singleKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (singleKey) {
        return { key: singleKey, masked: `${singleKey.slice(0, 6)}...${singleKey.slice(-4)}` };
      }

      return null;
    };

    const keyResult = getServerKey();
    if (!keyResult) {
      console.error('[API Chat] CRITICAL: No API Keys available.');
      return res.status(500).json({
        error: 'Configuration Error',
        details: 'API Keys not found. Add GEMINI_KEY_POOL or GEMINI_API_KEY in Vercel Settings.'
      });
    }

    console.log(`[API Chat] 🐍 Hydra: Using Key: ${keyResult.masked}`);

    // El systemContext del cliente ya incluye las tasas BCV actuales
    // Solo agregamos SAVARA_SYSTEM_PROMPT y la regla de oro
    const enhancedSystemContext = `
${SAVARA_SYSTEM_PROMPT}

${systemContext || ''}

REGLA DE ORO ABSOLUTA: Las tasas de cambio SIEMPRE vienen en el contexto anterior (ej: "Tasa USD: Bs 294.96"). 
USA ESAS TASAS EXACTAS. NUNCA inventes ni aproximes valores. Si no ves tasas, pide que esperen a la sincronización.
    `.trim();

    // Build conversation contents
    const contents = [
      ...((history || []).map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(h.parts?.[0]?.text || h.text || '') }]
      }))),
      { role: 'user', parts: [{ text: message }] }
    ];

    // Call Gemini API directly
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_MODEL}:generateContent?key=${keyResult.key}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: enhancedSystemContext }] },
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[API Chat] Gemini API Error:', errorData);

      const status = response.status === 429 ? 429 : 500;
      return res.status(status).json({
        error: status === 429 ? 'Quota exceeded' : 'API Error',
        details: JSON.stringify(errorData)
      });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Perdona, ¿me repites eso?';

    return res.status(200).json({ text: responseText });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API Chat] CRITICAL ERROR:', err.message, err.stack);

    return res.status(500).json({
      error: 'Failed to get response from Savara',
      details: err.message || 'Unknown error'
    });
  }
}