/**
 * Gemini Service - Redesigned Chat Implementation
 * Uses @google/genai SDK with the correct API methods
 */

import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality } from "@google/genai";

// ==================== LANDING CHAT (Text-based) ====================

const SAVARA_SYSTEM_PROMPT = `Eres Savara, la voz oficial de CalculaTu.

CONOCIMIENTO OBLIGATORIO:
1. ¿Qué es CalculaTu?: App inteligente para controlar gastos del mercado. Convierte USD/EUR a Bs usando tasa BCV.
2. Cómo funciona: Sumas productos, Savara convierte y te da el total. Funciona con voz o teclado.
3. Características: Tasa BCV oficial, Modo Bunker (Offline), Comandos de voz, Historial de tickets.
4. Planes:
   - Gratis: Básico manual.
   - Pro Mensual: $1/mes.
   - Savara Pro Lifetime: $10 PAGO ÚNICO (Oferta hasta 31 Enero). Precio regular $15.
5. Pagos: Aceptamos Binance Pay y Pago Móvil.
6. Tasas: Sincronización automática con el Banco Central de Venezuela.

ESTRUCTURA DE RESPUESTA:
- Si mencionas pagos, usa [[BINANCE]] o [[PAGO_MOVIL]] para que el sistema muestre la tarjeta.
- Sé breve, amable y profesional. Usa negritas para resaltar puntos clave.
- Responde siempre en español.`;

// Chat model - gemini-2.5-flash is the current stable model per official docs
const CHAT_MODEL = 'gemini-2.5-flash';

// Store for conversation history
interface ConversationMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

class SavaraChat {
  private ai: GoogleGenAI;
  private history: ConversationMessage[] = [];

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async sendMessage(userMessage: string): Promise<string> {
    // Add user message to history
    this.history.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    try {
      const response = await this.ai.models.generateContent({
        model: CHAT_MODEL,
        contents: this.history,
        config: {
          systemInstruction: SAVARA_SYSTEM_PROMPT,
          maxOutputTokens: 1000,
        }
      });

      const responseText = response.text || "Perdona, ¿me repites eso?";

      // Add model response to history
      this.history.push({
        role: 'model',
        parts: [{ text: responseText }]
      });

      return responseText;
    } catch (error: any) {
      console.error('[Savara Chat] Error:', error?.message || error);

      // Remove the failed user message from history
      this.history.pop();

      throw error;
    }
  }

  clearHistory() {
    this.history = [];
  }
}

// Singleton instance
let chatInstance: SavaraChat | null = null;

/**
 * Creates or returns the chat instance
 */
export const createChatSession = (): SavaraChat => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[Savara Chat] API KEY no encontrada.');
    console.error('[Savara Chat] Verifica que .env.local tenga: VITE_GEMINI_API_KEY=tu_key');
    throw new Error('VITE_GEMINI_API_KEY no configurada');
  }

  if (!chatInstance) {
    chatInstance = new SavaraChat(apiKey);
    console.log('[Savara Chat] Nueva sesión creada');
  }

  return chatInstance;
};

/**
 * Sends a message and returns the response
 */
export const sendMessageToGemini = async (chat: SavaraChat, message: string): Promise<string> => {
  try {
    console.log('[Savara Chat] Enviando:', message);
    const response = await chat.sendMessage(message);
    console.log('[Savara Chat] Respuesta:', response.substring(0, 100) + '...');
    return response;
  } catch (error: any) {
    console.error('[Savara Chat] Error completo:', {
      name: error?.name,
      message: error?.message,
      status: error?.status,
    });
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

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array, sourceSampleRate: number = 16000) {
  // Resample to 16kHz if needed (Gemini Live API requires 16kHz)
  const targetSampleRate = 16000;
  let resampled = data;

  if (sourceSampleRate !== targetSampleRate) {
    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.floor(data.length / ratio);
    resampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      resampled[i] = data[srcIndex];
    }
  }

  const l = resampled.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp to -1 to 1 range and convert to 16-bit
    const s = Math.max(-1, Math.min(1, resampled[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
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
  private sources = new Set<AudioBufferSourceNode>();
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

  async connect() {
    try {
      this.logState('connect:start');

      // Use browser's native sample rate, we'll resample to 16kHz
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      console.log(`[Savara Live] Input context sample rate: ${this.inputContext.sampleRate}Hz`);
      console.log(`[Savara Live] Output context sample rate: ${this.outputContext.sampleRate}Hz`);
      this.logState('connect:audioContexts-created');

      if (this.inputContext.state === 'suspended') await this.inputContext.resume();
      if (this.outputContext.state === 'suspended') await this.outputContext.resume();
      this.logState('connect:audioContexts-resumed');

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.logState('connect:microphone-granted');
    } catch (err) {
      console.error('[Savara Live] Error during connect setup:', err);
      this.logState('connect:error');
      throw err;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[Savara Live] API KEY no encontrada.');
      throw new Error('VITE_GEMINI_API_KEY no configurada');
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Eres Savara, la inteligencia de CalculaTu. Tu tono es humano, cálido y experto.
GUÍA DE OPERACIÓN:
1. El usuario dirá cosas como "Savara, agrega dos harinas pan a 1.25 cada una".
2. EXTRAE: name, price, quantity, currency.
3. SIEMPRE detecta la moneda:
   - "un dólar", "uno con veinte" -> currency: 'USD'
   - "dos euros", "1.50 euros" -> currency: 'EUR'
   - "cien bolívares", "en bss" -> currency: 'VES'
4. Si no especifica moneda pero el monto es pequeño, asume USD.
5. Llama a addItem() para cada producto detectado.
6. Responde confirmando brevemente.`;

    // Live API model for voice - per official docs for audio
    const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

    this.sessionPromise = ai.live.connect({
      model: LIVE_MODEL,
      callbacks: {
        onopen: () => {
          this.wsState = 'open';
          console.log('[Savara Live] WebSocket opened successfully');
          this.logState('websocket:opened');
          // Small delay before starting audio to ensure connection is stable
          setTimeout(() => this.startAudioInput(), 500);
        },
        onmessage: async (message: LiveServerMessage) => {
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && this.outputContext) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), this.outputContext, 24000, 1);
            const source = this.outputContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputContext.destination);
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              const result = await this.config.onToolCall(fc.name, fc.args);
              this.sessionPromise?.then(session => {
                session.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
                });
              });
            }
          }
        },
        onclose: () => {
          this.wsState = 'closed';
          this.logState('websocket:closed');
          this.config.onClose();
        },
        onerror: (err: any) => {
          this.wsState = 'error';
          console.error('[Savara Live] WebSocket error:', err);
          this.logState('websocket:error');
          this.config.onClose();
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        tools: [{ functionDeclarations: [addItemTool, finishListTool] }]
      }
    }).then((session) => {
      this.session = session;
      return session;
    });
  }

  private startAudioInput() {
    if (!this.inputContext || !this.stream) {
      console.error('[Savara Live] Cannot start audio input - missing inputContext or stream');
      return;
    }

    const actualSampleRate = this.inputContext.sampleRate;
    console.log(`[Savara Live] Starting audio input, mic sample rate: ${actualSampleRate}Hz, target: 16000Hz`);

    const source = this.inputContext.createMediaStreamSource(this.stream);
    // Larger buffer for more stable processing
    this.processor = this.inputContext.createScriptProcessor(8192, 1, 1);

    let chunkCount = 0;
    let lastSendTime = Date.now();

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate max amplitude for diagnostics
      let maxAmplitude = 0;
      for (let i = 0; i < inputData.length; i++) {
        const abs = Math.abs(inputData[i]);
        if (abs > maxAmplitude) maxAmplitude = abs;
      }

      const pcmBlob = createBlob(inputData, actualSampleRate);
      const now = Date.now();

      // Log first 10 chunks to diagnose
      if (chunkCount < 10) {
        console.log(`[Savara Live] Audio chunk ${chunkCount + 1}: bytes=${pcmBlob.data.length}, maxAmp=${maxAmplitude.toFixed(4)}, interval=${now - lastSendTime}ms`);
      } else if (chunkCount === 10) {
        console.log('[Savara Live] Audio streaming... (further logs suppressed)');
      }
      chunkCount++;
      lastSendTime = now;

      this.sessionPromise?.then(session => {
        if (session && this.wsState === 'open') {
          session.sendRealtimeInput({ media: pcmBlob });
        }
      }).catch(err => {
        console.error('[Savara Live] Error sending audio:', err);
      });
    };
    source.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
    console.log('[Savara Live] Audio pipeline connected');
  }

  async disconnect() {
    this.logState('disconnect:start');

    if (this.processor) this.processor.disconnect();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());

    try {
      if (this.inputContext) await this.inputContext.close();
      if (this.outputContext) await this.outputContext.close();
      if (this.session) await this.session.close();
    } catch (err) {
      console.error('[Savara Live] Error during disconnect:', err);
    }

    this.wsState = 'closed';
    this.logState('disconnect:complete');
  }
}

// Export the Chat type for TypeScript
export type { SavaraChat };