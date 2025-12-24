import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, systemContext, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Verify API Key existence early to give better feedback
    if (!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY) {
      console.error('[API Chat] Missing Gemini API Key in environment.');
      return res.status(500).json({
        error: 'Savara is currently unavailable (Configuration Error)',
        details: 'API Key not found in server environment.'
      });
    }

    // Create a fresh session for every request (Stateless/Serverless friendly)
    // We rely on the client sending the history.
    const chatSession = createChatSession();

    const responseText = await sendMessageToGemini(chatSession, message, systemContext, history || []);
    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    console.error('[API Chat] Error catch:', error.message || error);

    // Check if it's an API Key error from the service
    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({
        error: 'Authentication failed',
        details: 'The AI service could not be authenticated. Please check server logs.'
      });
    }

    return res.status(500).json({
      error: 'Failed to get response from Savara',
      details: error.message || 'Unknown error'
    });
  }
}