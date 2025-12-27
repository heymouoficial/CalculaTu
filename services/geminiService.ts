// services/geminiService.ts
// Using Google Gemini API Direct

const CURRENT_MODEL = 'gemini-1.5-flash-latest';

const SAVARA_SYSTEM_PROMPT = `Eres Savara, la asistente inteligente de CalculaTú.
Tu tono es cálido, profesional y extremadamente conciso (máximo 30 palabras).

SOBRE CALCULATÚ:
- App venezolana para calcular compras en Bs/USD/EUR
- Convierte precios automáticamente usando la tasa BCV del día
- Tiene un modo voz PRO para dictar productos

PROMOCIÓN NAVIDAD 2024:
- 🎁 24 horas GRATIS de Savara Pro (asistente de voz)
- Solo deben hacer clic en "ACTIVAR AHORA" en el banner verde

PRECIOS PREMIUM:
- Pro Mensual: $2.99/mes - voz ilimitada
- Pro Lifetime: $24.99 una vez - para siempre

Responde siempre en español. Sé breve y útil.`;

// Helper for Universal Environment Access
const getGeminiApiKey = (): string | undefined => {
  const key = (typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined);
  return key;
};

// ==================== LANDING CHAT (Gemini API - Direct) ====================

class SavaraChat {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || getGeminiApiKey();
    if (!key) {
      console.error('[SavaraChat] CRITICAL: GEMINI_API_KEY not found in environment.');
      throw new Error('CRITICAL: GEMINI_API_KEY not found in environment.');
    }
    this.apiKey = key;
  }

  async sendMessage(userMessage: string, dynamicSystemInstruction?: string, history: any[] = [], coreStats?: any): Promise<string> {
    let finalSystemInstruction = dynamicSystemInstruction
      ? `${SAVARA_SYSTEM_PROMPT}\n\nCONTEXTO ADICIONAL:\n${dynamicSystemInstruction}`
      : SAVARA_SYSTEM_PROMPT;

    if (coreStats) {
      finalSystemInstruction += `
      ### CORE INTELLIGENCE (AUTORIZADO) ###
      Blueprint: ${coreStats.systemStatus}
      Users: ${coreStats.totalUsers}
      Contracts: ${coreStats.activeSubscriptions}
      Platform: ${coreStats.platform}
      Recent Synchronizations: ${coreStats.recentActivity?.length || 0}
      
      IMPORTANTE: Eres Savara Core. Estos datos son confidenciales y solo para el Arquitecto (Moisés).
      `;
    }

    // Build Gemini-compatible contents
    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(h.parts?.[0]?.text || h.text || '') }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_MODEL}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: finalSystemInstruction }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[Savara Gemini] API Error:', response.status, errorData);

        if (response.status === 429) {
          throw new Error('Rate limit exceeded (429)');
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.warn('[Savara Gemini] No text in response:', JSON.stringify(data));
        return "Perdona, ¿me repites eso?";
      }

      return text;

    } catch (error: any) {
      console.error('[Savara Gemini] Error:', error.message);
      throw error;
    }
  }
}

export const createChatSession = (apiKey?: string) => new SavaraChat(apiKey);
export const sendMessageToGemini = async (
  chat: SavaraChat,
  message: string,
  systemContext?: string,
  history: any[] = [],
  coreStats?: any
) => chat.sendMessage(message, systemContext, history, coreStats);