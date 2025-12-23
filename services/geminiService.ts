import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality } from "@google/genai";

// ==================== SHARED CONFIGURATION ====================

const CURRENT_MODEL = 'gemini-2.0-flash';

const SAVARA_SYSTEM_PROMPT = `Eres Savara, la voz oficial de CalculaTú (Multi-Voz Pro).
Tu tono es humano, cálido, experto y extremadamente conciso. Actúa como una asistente personal de compras venezolana.

CONOCIMIENTO OBLIGATORIO:
1. ¿Qué es CalculaTú?: App inteligente para controlar gastos del mercado. Convierte USD/EUR a Bs usando tasa BCV.
2. Cómo funciona: Sumas productos, Savara convierte y te da el total. Funciona con voz o teclado.
3. Características: Tasa BCV oficial, Modo Bunker (Offline), Comandos de voz, Historial de tickets.
4. Planes:
   - Gratis: Básico manual.
   - Pro Mensual: $1/mes.
   - Savara Pro Lifetime: $10 PAGO ÚNICO (De por vida).
5. Pagos: Aceptamos Binance Pay y Pago Móvil.
6. Tasas: Sincronización automática con el Banco Central de Venezuela.

ESTRUCTURA DE RESPUESTA:
- Si mencionas pagos, usa [[BINANCE]] o [[PAGO_MOVIL]] para que el sistema muestre la tarjeta.
- Sé breve, amable y profesional. Usa negritas para resaltar puntos clave.
- Responde siempre en español. No uses siglas (di Dólares, Bolívares).
- Máximo 25 palabras por respuesta.`;

// ==================== LANDING CHAT (Text-based) ====================

class SavaraChat {
  private genAI: GoogleGenAI;
  private model: any;
  private chat: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: CURRENT_MODEL,
      systemInstruction: SAVARA_SYSTEM_PROMPT,
    });
    this.chat = this.model.startChat({
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    });
  }

  async sendMessage(userMessage: string): Promise<string> {
    try {
      const result = await this.chat.sendMessage({
        message: userMessage
      });
      return result.text || "Perdona, ¿me repites eso?";
    } catch (error: any) {
      console.error('[Savara Chat] Error:', error?.message || error);
      throw error;
    }
  }

  clearHistory() {
    // The SDK chat objects don't have a direct clear, so we just recreate it if needed
    // In this app, we usually just refresh the page or ignore it.
  }
}

let chatInstance: SavaraChat | null = null;

export const createChatSession = (): SavaraChat => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY no configurada');

  return new SavaraChat(apiKey);
};

export const sendMessageToGemini = async (chat: SavaraChat, message: string): Promise<string> => {
  try {
    return await chat.sendMessage(message);
  } catch (error: any) {
    console.error('[Savara Chat] Error completo:', error);
    if (JSON.stringify(error).includes('429') || error?.message?.includes('429')) {
      return "Tengo muchas peticiones en este momento. Por favor, espera unos segundos y vuelve a preguntarme.";
    }
    return "Me desconecté un segundo, pero ya estoy aquí. ¿En qué te ayudo?";
  }
};

// ==================== SAVARA LIVE VOICE (Pro Feature) ====================

// Audio Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const addItemTool: FunctionDeclaration = {
  name: 'addItem',
  description: 'Añade un artículo a la lista de compras del usuario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Nombre del producto' },
      price: { type: Type.NUMBER, description: 'Precio unitario' },
      currency: { type: Type.STRING, description: 'Divisa: USD, EUR o VES' },
      quantity: { type: Type.NUMBER, description: 'Cantidad' }
    },
    required: ['name', 'price', 'currency']
  }
};

const finishListTool: FunctionDeclaration = {
  name: 'finishList',
  description: 'Finaliza la lista y muestra el voucher resumen.',
  parameters: { type: Type.OBJECT, properties: {} }
};

export interface SavaraState {
  microphone: 'granted' | 'denied' | 'unknown';
  inputAudioContext: 'running' | 'suspended' | 'closed' | 'none';
  outputAudioContext: 'running' | 'suspended' | 'closed' | 'none';
  websocket: 'open' | 'closed' | 'error' | 'none';
  license: boolean;
  timestamp: string;
}

export class SavaraLiveClient {
  private sessionPromise: Promise<any> | null = null;
  private session: any = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private config: any;
  private wsState: 'open' | 'closed' | 'error' | 'none' = 'none';

  constructor(config: any) {
    this.config = config;
  }

  getState(): SavaraState {
    return {
      microphone: this.stream?.active ? 'granted' : 'denied',
      inputAudioContext: this.inputContext ? (this.inputContext.state as any) : 'none',
      outputAudioContext: this.outputContext ? (this.outputContext.state as any) : 'none',
      websocket: this.wsState,
      license: true,
      timestamp: new Date().toISOString(),
    };
  }

  private logState(operation: string) {
    const state = this.getState();
    console.log(`[Savara Live] ${operation}:`, state);
  }

  async connect(dynamicSystemInstruction?: string) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY no configurada');

    this.logState('connect:start');

    // Contexts setup
    this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    if (this.inputContext.state === 'suspended') await this.inputContext.resume();
    if (this.outputContext.state === 'suspended') await this.outputContext.resume();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.logState('connect:microphone-granted');
    } catch (err) {
      console.error('[Savara Live] Error mic:', err);
      this.wsState = 'error';
      this.config.onClose();
      throw err;
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = dynamicSystemInstruction || SAVARA_SYSTEM_PROMPT;

    console.log('[Savara Live] Initializing GenAI with model:', CURRENT_MODEL);

    this.sessionPromise = ai.live.connect({
      model: CURRENT_MODEL,
      callbacks: {
        onopen: () => {
          this.wsState = 'open';
          this.startAudioInput();
          console.log('[Savara Live] WebSocket opened');
        },
        onmessage: async (message: LiveServerMessage) => {
          const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData?.data);
          if (audioPart?.inlineData?.data && this.outputContext) {
            this.decodeAudioData(audioPart.inlineData.data).then(buffer => this.playAudioBuffer(buffer));
          }

          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              try {
                const result = await this.config.onToolCall(fc.name, fc.args);
                this.session?.sendToolResponse({
                  functionResponses: [{ id: fc.id, name: fc.name, response: { result: result } }]
                });
              } catch (toolErr) {
                console.error(`[Savara Live] Tool error ${fc.name}:`, toolErr);
              }
            }
          }
        },
        onclose: () => {
          this.wsState = 'closed';
          console.warn('[Savara Live] WebSocket closed by server');
          this.config.onClose();
        },
        onerror: (err: any) => {
          this.wsState = 'error';
          const errorStr = JSON.stringify(err);
          const isQuotaError = errorStr.includes('429') || err?.message?.includes('429');
          console.error(`[Savara Live] WebSocket error ${isQuotaError ? '(QUOTA EXHAUSTED)' : ''}:`, err);

          if (isQuotaError) {
            // We won't alert here to avoid blocking UI, the onClose handles the status update
          }

          this.config.onClose();
        }
      },
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        tools: [{ functionDeclarations: [addItemTool, finishListTool] }]
      }
    }).then(session => {
      this.session = session;

      // Initial greeting with small delay to ensure setup completion
      setTimeout(() => {
        if (this.session && this.wsState === 'open') {
          console.log('[Savara Live] Sending initial greeting');
          this.session.sendRealtimeInput([{ text: "Comienza la llamada. Identifécate como Savara, saluda y pregunta cómo puedes ayudar hoy." }]);
        }
      }, 1000);

      return session;
    }).catch(err => {
      const errorStr = JSON.stringify(err);
      if (errorStr.includes('429')) {
        console.error('[Savara Live] Connection FAILED (Quota):', err);
      } else {
        console.error('[Savara Live] Connection FAILED:', err);
      }
      this.wsState = 'error';
      this.config.onClose();
      throw err;
    });
  }

  private startAudioInput() {
    if (!this.inputContext || !this.stream) return;
    const source = this.inputContext.createMediaStreamSource(this.stream);
    // Increased buffer size 4096 to prevent 'too much audio at once' pressure if needed
    this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (this.wsState !== 'open' || !this.session) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      try {
        if (this.session && this.wsState === 'open') {
          this.session.sendRealtimeInput([{ inlineData: pcmBlob }]);
        }
      } catch (err: any) {
        console.warn('[Savara Live] Send audio failed, closing pipeline:', err?.message || 'Socket closed');
        this.wsState = 'closed';
        if (this.processor) {
          this.processor.disconnect();
        }
        this.config.onClose();
      }
    };
    source.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
    console.log('[Savara Live] Audio pipeline connected');
  }

  private async decodeAudioData(base64: string): Promise<AudioBuffer> {
    if (!this.outputContext) throw new Error('No output context');
    const data = decode(base64);
    const alignedBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const dataInt16 = new Int16Array(alignedBuffer);
    const buffer = this.outputContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.outputContext) return;
    const now = this.outputContext.currentTime;
    if (this.nextStartTime < now) this.nextStartTime = now + 0.1; // Increased jitter buffer
    const source = this.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputContext.destination);
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  async disconnect() {
    this.logState('disconnect:start');
    if (this.processor) this.processor.disconnect();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.inputContext) await this.inputContext.close();
    if (this.outputContext) await this.outputContext.close();
    if (this.session) await this.session.close();
    this.wsState = 'closed';
  }
}

export type { SavaraChat };