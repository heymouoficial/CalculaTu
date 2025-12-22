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



function createBlob(data: Float32Array) {
  // SIMPLIFIED: Since inputContext is now 16kHz, no resampling needed
  // This matches the working Google AI Studio code exactly
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
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

const getExchangeRateTool: FunctionDeclaration = {
  name: 'get_exchange_rate',
  description: 'Obtiene la tasa de cambio actual del BCV y Paralelo en Venezuela.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      provider: {
        type: Type.STRING,
        description: 'El proveedor de la tasa: "BCV" o "EnParaleloVzla"'
      }
    },
    required: ['provider']
  }
};

const debugConnectionLatencyTool: FunctionDeclaration = {
  name: 'debug_connection_latency',
  description: 'Ejecuta un ping de retorno para medir la latencia entre el cliente y el modelo.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      client_timestamp: {
        type: Type.STRING,
        description: 'ISO timestamp enviado por el cliente'
      }
    }
  }
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

      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        console.error('[Savara Live] Not in a Secure Context (HTTPS or localhost). Microphone access will be denied.');
        throw new Error('Insecure Context: Savara requiere HTTPS');
      }

      // CRITICAL FIX: Force inputContext to 16kHz to avoid resampling issues
      // This matches the working Google AI Studio code exactly
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      console.log(`[Savara Live] Input context sample rate: ${this.inputContext.sampleRate}Hz`);
      console.log(`[Savara Live] Output context sample rate: ${this.outputContext.sampleRate}Hz`);
      this.logState('connect:audioContexts-created');

      if (this.inputContext.state === 'suspended') {
        console.log('[Savara Live] Resuming input context...');
        await this.inputContext.resume();
      }
      if (this.outputContext.state === 'suspended') {
        console.log('[Savara Live] Resuming output context...');
        await this.outputContext.resume();
      }
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

    // Optimized system instruction for ultra-low latency - User Specs
    const systemInstruction = `**Role:** You are SAVARA, the voice of CalculaTú.
**Protocol:**
1. **No Filler:** Never say "Hello", "How can I help?", or "Let me see". Give results directly. Speak in Spanish.
2. **Audio-Only:** Your output is exclusively voice. Optimize for 24kHz PCM.
3. **VAD High Sensitivity:** If you hear noise, ignore it. If you hear a clear voice, process immediately.
4. **Task:** Perform currency conversions (USD/VES/EUR) and basic math using provided tools.
5. **Debug Mode:** If you receive a 'ping' frame, respond with 'pong' immediately to verify latency.
6. **addItem Tool:** Use it whenever a product and price is mentioned.

**Response Format:**
- Numeric value + Currency + Brief context (Optional).
- Maximum 15 words per response.`;

    // CRITICAL FIX: Use the exact model name that works in Google AI Studio
    const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

    console.log('[Savara Live] Initializing GenAI with model:', LIVE_MODEL);
    this.sessionPromise = ai.live.connect({
      model: LIVE_MODEL,
      callbacks: {
        onopen: () => {
          this.wsState = 'open';
          console.log('[Savara Live] WebSocket opened with', LIVE_MODEL);
          this.logState('websocket:opened');
          // NOTE: Do NOT call startAudioInput here - wait for session to resolve
        },
        onmessage: async (message: LiveServerMessage) => {
          // Detailed message logging
          if (message.serverContent?.modelTurn) {
            const parts = message.serverContent.modelTurn.parts || [];
            console.log(`[Savara Live] Model response received, parts: ${parts.length}`);
          } else if (message.serverContent?.interrupted) {
            console.log('[Savara Live] Model interrupted (Barge-in)');
          }

          if (message.toolCall) {
            console.log('[Savara Live] Tool call message received:', JSON.stringify(message.toolCall));
          }

          // Debug Mode: Ping-Pong responder
          const textPart = message.serverContent?.modelTurn?.parts?.find(p => p.text);
          if (textPart?.text?.toLowerCase().includes('ping')) {
            console.log('[Savara Live] Ping received, sending pong');
            this.sessionPromise?.then(session => {
              session.sendRealtimeInput([{ text: 'pong' }]);
            });
          }

          // Improved audio part detection: search all parts
          const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData?.data);
          const audioData = audioPart?.inlineData?.data;

          if (audioData && this.outputContext) {
            console.log('[Savara Live] Audio response received, bytes:', audioData.length);
            this.decodeAudioData(audioData).then(buffer => {
              this.playAudioBuffer(buffer);
            }).catch(err => {
              console.error('[Savara Live] Error decoding audio:', err);
            });
          }
          if (message.toolCall) {
            console.log('[Savara Live] Executing tools:', message.toolCall.functionCalls.map(f => f.name));
            for (const fc of message.toolCall.functionCalls) {
              try {
                const result = await this.config.onToolCall(fc.name, fc.args);
                console.log(`[Savara Live] Tool ${fc.name} result:`, result);
                this.sessionPromise?.then(session => {
                  session.sendToolResponse({
                    functionResponses: [{ id: fc.id, name: fc.name, response: { result: result } }]
                  });
                });
              } catch (toolErr) {
                console.error(`[Savara Live] Error executing tool ${fc.name}:`, toolErr);
              }
            }
          }
        },
        onclose: () => {
          this.wsState = 'closed';
          console.log('[Savara Live] WebSocket closed');
          this.logState('websocket:closed');
          this.config.onClose();
        },
        onerror: (err: any) => {
          this.wsState = 'error';
          // Enhanced error logging for debugging
          console.error('[Savara Live] WebSocket error - FULL DETAILS:', {
            message: err?.message || 'No message',
            code: err?.code || 'No code',
            type: err?.type || typeof err,
            raw: err
          });
          this.logState('websocket:error');
          this.config.onClose();
        }
      },
      // Config object with flat structure (per deprecation warning, fields should be at this level, not nested in generationConfig)
      config: {
        systemInstruction,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
        tools: [{ functionDeclarations: [addItemTool, finishListTool, getExchangeRateTool, debugConnectionLatencyTool] }]
      }
    }).then((session) => {
      this.session = session;
      console.log('[Savara Live] Session resolved successfully, starting audio input');
      this.logState('session:resolved');
      // Start audio input AFTER session is fully resolved
      this.startAudioInput();
      return session;
    }).catch((err) => {
      console.error('[Savara Live] Session connection FAILED:', err);
      this.wsState = 'error';
      this.config.onClose();
      throw err;
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
    // CRITICAL FIX: Reduced buffer size from 8192 to 2048 for lower latency (matches working code)
    this.processor = this.inputContext.createScriptProcessor(2048, 1, 1);

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

      const pcmBlob = createBlob(inputData);
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
          // Revert to media object format which is the standard for @google/genai SDK
          session.sendRealtimeInput({
            media: pcmBlob
          });
        }
      }).catch(err => {
        console.error('[Savara Live] Error sending audio:', err);
      });
    };
    source.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
    console.log('[Savara Live] Audio pipeline connected');
  }

  private async decodeAudioData(base64: string): Promise<AudioBuffer> {
    if (!this.outputContext) throw new Error('No output context');
    const data = decode(base64);
    const dataInt16 = new Int16Array(data.buffer);
    const numChannels = 1;
    const sampleRate = 24000; // Gemini response rate
    const frameCount = dataInt16.length / numChannels;
    const buffer = this.outputContext.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.outputContext) return;

    // Schedule playback to be gapless
    const now = this.outputContext.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now + 0.05; // Small buffer for network jitter
    }

    const source = this.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputContext.destination);
    source.start(this.nextStartTime);

    this.nextStartTime += buffer.duration;
    this.sources.add(source);

    source.onended = () => {
      this.sources.delete(source);
    };
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