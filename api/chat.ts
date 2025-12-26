import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, systemContext, history, coreStats } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) {
      console.error('[API Chat] CRITICAL: No API Key found in environment.');
      return res.status(500).json({
        error: 'Configuration Error',
        details: 'API Key not found in server environment.'
      });
    }

    const chatSession = createChatSession(key);
    console.log(`[API Chat] Sending message to Gemini. History length: ${history?.length || 0}`);

    const responseText = await sendMessageToGemini(chatSession, message, systemContext, history || [], coreStats);
    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    console.error('[API Chat] CRITICAL ERROR:', {
      message: error.message,
      stack: error.stack,
      historyCount: history?.length
    });

    const status = error.message?.includes('429') ? 429 : 500;
    const details = error.message || 'Unknown error';

    return res.status(status).json({
      error: status === 429 ? 'Quota exceeded' : 'Failed to get response from Savara',
      details
    });
  }
}