import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';

interface ChatRequestBody {
  message?: string;
  systemContext?: string;
  history?: any[]; // TODO: Define strict Content type from Google AI SDK
  coreStats?: any;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, systemContext, history, coreStats } = req.body as ChatRequestBody;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Operación Hydra: API Key Pool for Server
    // Serverless functions don't have access to import.meta.env, use process.env
    const getServerKey = (): { key: string; masked: string } | null => {
      // Try pool first
      const poolString = process.env.GEMINI_KEY_POOL;
      if (poolString) {
        try {
          const pool: string[] = JSON.parse(poolString);
          if (pool.length > 0) {
            // Random selection for serverless (no state between calls)
            const key = pool[Math.floor(Math.random() * pool.length)];
            return { key, masked: `${key.slice(0, 6)}...${key.slice(-4)}` };
          }
        } catch (e) {
          console.warn('[API Chat] Failed to parse GEMINI_KEY_POOL');
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
      console.error('[API Chat] CRITICAL: No API Keys available (Hydra pool empty).');
      return res.status(500).json({
        error: 'Configuration Error',
        details: 'API Keys not found. Add GEMINI_KEY_POOL or GEMINI_API_KEY in Vercel Settings.'
      });
    }

    const chatSession = createChatSession(keyResult.key);
    console.log(`[API Chat] 🐍 Hydra: Using Key: ${keyResult.masked}`);
    console.log(`[API Chat] Sending message to Gemini. History length: ${history?.length || 0}`);

    // Inject Product Context (read from file)
    let productContext = '';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const productPath = path.join(process.cwd(), 'conductor', 'product.md');
      if (fs.existsSync(productPath)) {
        productContext = fs.readFileSync(productPath, 'utf-8');
      }
    } catch (e) {
      console.warn('[API Chat] Failed to read product.md', e);
    }

    const enhancedSystemContext = `
    ${productContext}
    
    ${systemContext || ''}
    
    REGLA DE ORO DE TASAS:
    Usa SIEMPRE las tasas proporcionadas en el contexto (USD: ${req.body.coreStats?.rates?.USD || '??'}, EUR: ${req.body.coreStats?.rates?.EUR || '??'}).
    NO inventes valores.
    `;

    const responseText = await sendMessageToGemini(chatSession, message, enhancedSystemContext, history || []);
    return res.status(200).json({ text: responseText });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API Chat] CRITICAL ERROR:', {
      message: err.message,
      stack: err.stack,
      historyCount: history?.length
    });

    const status = err.message?.includes('429') ? 429 : 500;
    const details = err.message || 'Unknown error';

    return res.status(status).json({
      error: status === 429 ? 'Quota exceeded' : 'Failed to get response from Savara',
      details
    });
  }
}