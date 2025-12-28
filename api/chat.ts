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
    // Check for Gemini API key
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      console.error('[API Chat] CRITICAL: GEMINI_API_KEY not found in environment.');
      return res.status(500).json({
        error: 'Configuration Error',
        details: 'API Key not found. Add GEMINI_API_KEY in Vercel Settings → Environment Variables.'
      });
    }

    const chatSession = createChatSession(key);
    const maskedKey = `${key.slice(0, 6)}...${key.slice(-4)}`;
    console.log(`[API Chat] Using Key: ${maskedKey}`);
    console.log(`[API Chat] Sending message to Gemini. History length: ${history?.length || 0}`);

    const responseText = await sendMessageToGemini(chatSession, message, systemContext, history || [], coreStats);
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