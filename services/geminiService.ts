// services/geminiService.ts
// Using REST API for maximum reliability across all environments

const CURRENT_MODEL = 'gemini-1.5-flash';

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
  // Try VITE prefix first as requested for standardization across client and server (Vercel)
  const key = (typeof process !== 'undefined' && process.env ? process.env.VITE_GEMINI_API_KEY : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined) ||
    (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
  return key;
};

// ==================== LANDING CHAT (REST API - RELIABLE) ====================

class SavaraChat {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || getGeminiApiKey();
    if (!key) {
      // This error message is adapted for the service context, as 'res' is not available here.
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

    // Build conversation contents
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
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: finalSystemInstruction }]
          },
          contents
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[Savara REST] API Error:', response.status, errorData);

        if (response.status === 429) {
          throw new Error('Quota exceeded (429)');
        }
        if (response.status === 400) {
          throw new Error(`Bad Request: ${errorData}`);
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.warn('[Savara REST] No text in response:', JSON.stringify(data));
        return "Perdona, ¿me repites eso?";
      }

      return text;

    } catch (error: any) {
      console.error('[Savara REST] Error:', error.message);

      if (error.message?.includes('SAFETY')) {
        return "Lo siento, no puedo responder a eso por políticas de seguridad.";
      }

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
