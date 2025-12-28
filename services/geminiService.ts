// services/geminiService.ts
// Using Google Gemini API Direct (Gemini 1.5 Flash - Stable)

import { SAVARA_IDENTITY } from '../constants';

const CURRENT_MODEL = 'gemini-2.5-flash'; // As seen in User Dashboard

const SAVARA_SYSTEM_PROMPT = SAVARA_IDENTITY;

const getGeminiApiKey = (): string | undefined => {
  const key = (typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined);
  return key;
};

class SavaraChat {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || getGeminiApiKey();
    if (!key) {
      throw new Error('CRITICAL: GEMINI_API_KEY not found.');
    }
    this.apiKey = key;
  }

  async sendMessage(userMessage: string, dynamicSystemInstruction?: string, history: any[] = []): Promise<string> {
    const finalSystemInstruction = dynamicSystemInstruction
      ? `${SAVARA_SYSTEM_PROMPT}\n\nCONTEXTO:\n${dynamicSystemInstruction}`
      : SAVARA_SYSTEM_PROMPT;

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(h.parts?.[0]?.text || h.text || '') }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_MODEL}:generateContent?key=${this.apiKey}`;

    console.log("[GeminiService] PROMPT PREVIEW:", finalSystemInstruction.slice(0, 500));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: finalSystemInstruction }] },
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 8192 // UNLEASHED - MAX ALLOWED
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[GeminiService] API ERROR:", errorData);
      throw new Error(`API Error ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("[GeminiService] FULL RESPONSE:", JSON.stringify(data, null, 2));
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Perdona, ¿me repites eso?";
  }
}

export const createChatSession = (apiKey?: string) => new SavaraChat(apiKey);
export const sendMessageToGemini = async (chat: SavaraChat, message: string, systemContext?: string, history: any[] = []) => chat.sendMessage(message, systemContext, history);
