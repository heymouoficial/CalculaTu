// services/geminiService.ts

// ==================== SHARED CONFIGURATION ====================

const CURRENT_MODEL = 'gemini-1.5-flash'; // More stable model identifier

const SAVARA_SYSTEM_PROMPT = `Eres Savara, la voz oficial de CalculaTú (CalculaTu). 
Tu tono es humano, cálido, profesional y conciso. Ayuda al usuario con sus compras y dudas sobre la app.
Responde siempre en español. Sé extremadamente breve (máximo 25 palabras).
Si te preguntan por precios o planes, menciónalos con entusiasmo.`;

// Helper for Universal Environment Access
const getGeminiApiKey = (): string | undefined => {
  // For Vercel Serverless Functions or other Node.js environments
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  // For Vite client-side
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  // Fallback for other potential setups
  if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) {
    return process.env.VITE_GEMINI_API_KEY;
  }
  return undefined;
};

// ==================== LANDING CHAT (REST API) ====================

class SavaraChat {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    const key = apiKey || getGeminiApiKey();
    if (!key) throw new Error('CRITICAL: VITE_GEMINI_API_KEY not found in environment or constructor.');
    this.apiKey = key;
    this.baseUrl = `https://generativelanguage.googleapis.com/v1/models/${CURRENT_MODEL}:generateContent?key=${this.apiKey}`;
  }

  async sendMessage(userMessage: string, dynamicSystemInstruction?: string, history: Array<{ role: string, parts: { text: string }[] }> = []): Promise<string> {
    try {
      // Combine static persona with dynamic context if provided
      const finalSystemInstruction = dynamicSystemInstruction
        ? `${SAVARA_SYSTEM_PROMPT}\n\nCONTEXTO ADICIONAL:\n${dynamicSystemInstruction}`
        : SAVARA_SYSTEM_PROMPT;

      // Construct full conversation history
      const contents = [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      const payload = {
        contents,
        systemInstruction: {
          parts: [{ text: finalSystemInstruction }]
        }
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorDetails = await response.text();
        let parsedError;
        try { parsedError = JSON.parse(errorDetails); } catch { parsedError = errorDetails; }

        console.error('[Savara Chat] Gemini API Status Error:',
          response.status,
          response.statusText,
          JSON.stringify(parsedError, null, 2)
        );

        // Throw a cleaner message but with the details available
        const message = parsedError?.error?.message || response.statusText;
        throw new Error(`Gemini API Error (${response.status}): ${message}`);
      }

      const data = await response.json();

      // Extract text from response, with safer access
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text === undefined) {
        console.warn('[Savara Chat] Unexpected response structure. Full Data:', JSON.stringify(data, null, 2));
        return "Perdona, he recibido una respuesta inesperada. ¿Podemos intentar con otra pregunta?";
      }
      return text || "Perdona, ¿me repites eso?";

    } catch (error: any) {
      console.error('[Savara Chat] Network/Parse Error:', error);
      throw error;
    }
  }
}

export const createChatSession = (apiKey?: string) => new SavaraChat(apiKey);
export const sendMessageToGemini = async (chat: SavaraChat, message: string, systemContext?: string, history: Array<{ role: string, parts: { text: string }[] }> = []) => chat.sendMessage(message, systemContext, history);
