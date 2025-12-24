// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";

// ==================== SHARED CONFIGURATION ====================

const CURRENT_MODEL = 'gemini-1.5-flash';

const SAVARA_SYSTEM_PROMPT = `Eres Savara, la voz oficial de CalculaTú (CalculaTu). 
Tu tono es humano, cálido, profesional y conciso. Ayuda al usuario con sus compras y dudas sobre la app.
Responde siempre en español. Sé extremadamente breve (máximo 25 palabras).
Si te preguntan por precios o planes, menciónalos con entusiasmo.`;

// Helper for Universal Environment Access
const getGeminiApiKey = (): string | undefined => {
  const key = (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY);
  return key;
};

// ==================== LANDING CHAT (SDK) ====================

class SavaraChat {
  private genAI: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || getGeminiApiKey();
    if (!key) throw new Error('CRITICAL: VITE_GEMINI_API_KEY not found in environment.');
    this.genAI = new GoogleGenAI({ apiKey: key });
  }

  async sendMessage(userMessage: string, dynamicSystemInstruction?: string, history: any[] = []): Promise<string> {
    try {
      const finalSystemInstruction = dynamicSystemInstruction
        ? `${SAVARA_SYSTEM_PROMPT}\n\nCONTEXTO ADICIONAL:\n${dynamicSystemInstruction}`
        : SAVARA_SYSTEM_PROMPT;

      // Build conversation contents
      const contents = [
        ...history.map((h: any) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(h.parts?.[0]?.text || h.text || '') }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      // Use the new SDK API
      const response = await this.genAI.models.generateContent({
        model: CURRENT_MODEL,
        contents: contents,
        config: {
          systemInstruction: finalSystemInstruction
        }
      });

      return response.text || "Perdona, ¿me repites eso?";

    } catch (error: any) {
      console.error('[Savara Chat SDK] Error:', error);
      if (error.message?.includes('429')) throw new Error('Quota exceeded (429)');
      if (error.message?.includes('SAFETY')) return "Lo siento, no puedo responder a eso por políticas de seguridad.";
      throw error;
    }
  }
}

export const createChatSession = (apiKey?: string) => new SavaraChat(apiKey);
export const sendMessageToGemini = async (chat: SavaraChat, message: string, systemContext?: string, history: any[] = []) => chat.sendMessage(message, systemContext, history);
