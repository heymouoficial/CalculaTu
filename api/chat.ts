// api/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';

// This is a simplified in-memory session management.
// For production, you would use a more robust session store like Redis.
let chatSession: any = null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, systemContext } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Initialize session on first message
    if (!chatSession) {
      chatSession = createChatSession(); // Will use process.env.VITE_GEMINI_API_KEY by default
    }

    const responseText = await sendMessageToGemini(chatSession, message, systemContext);
    return res.status(200).json({ text: responseText });
      } catch (error: any) {
        console.error('[API Chat] Error:', error); // Log the full error object
        return res.status(500).json({ error: 'Failed to get response from Gemini' });
      }}
