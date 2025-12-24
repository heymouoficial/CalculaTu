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
    // Create a fresh session for every request (Stateless/Serverless friendly)
    // We rely on the client sending the history.
    const chatSession = createChatSession(); 

    const responseText = await sendMessageToGemini(chatSession, message, systemContext, history || []);
    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    console.error('[API Chat] Error:', error);
    return res.status(500).json({ error: 'Failed to get response from Gemini' });
  }
}