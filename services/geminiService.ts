// services/geminiService.ts
// Using OpenAI API Direct

const CURRENT_MODEL = 'gpt-4o-mini';

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
const getOpenAIApiKey = (): string | undefined => {
  // Check for standard OPENAI_API_KEY or VITE_ prefixed version
  const key = (typeof process !== 'undefined' && process.env ? process.env.OPENAI_API_KEY : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_OPENAI_API_KEY : undefined) ||
    (typeof process !== 'undefined' && process.env ? process.env.VITE_OPENAI_API_KEY : undefined);
  return key;
};

// ==================== LANDING CHAT (OpenAI API - Direct) ====================

class SavaraChat {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || getOpenAIApiKey();
    if (!key) {
      console.error('[SavaraChat] CRITICAL: OPENAI_API_KEY not found in environment.');
      throw new Error('CRITICAL: OPENAI_API_KEY not found in environment.');
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

    // Build OpenAI-compatible messages
    const messages = [
      { role: 'system', content: finalSystemInstruction },
      ...history.map((h: any) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: String(h.parts?.[0]?.text || h.text || '')
      })),
      { role: 'user', content: userMessage }
    ];

    const url = 'https://api.openai.com/v1/chat/completions';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: CURRENT_MODEL,
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[Savara OpenAI] API Error:', response.status, errorData);

        if (response.status === 429) {
          throw new Error('Rate limit exceeded (429)');
        }
        if (response.status === 401) {
          throw new Error('Invalid API Key (401)');
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        console.warn('[Savara OpenAI] No text in response:', JSON.stringify(data));
        return "Perdona, ¿me repites eso?";
      }

      return text;

    } catch (error: any) {
      console.error('[Savara OpenAI] Error:', error.message);

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
