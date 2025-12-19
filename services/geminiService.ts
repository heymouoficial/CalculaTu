import { GoogleGenAI, Chat, FunctionDeclaration, Type, LiveServerMessage, Modality } from "@google/genai";

const LANDING_SYSTEM_INSTRUCTION = `Eres Savara, la voz oficial de CalculaTu.
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
- Sé breve, amable y profesional. Usa negritas para resaltar puntos clave.`;

const LIVE_TEXT_MODEL = 'gemini-live-2.5-flash-preview';

// --- Audio Helpers (PCM raw streams) ---
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

function createBlob(data: Float32Array) {
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

export class SavaraLiveClient {
  private sessionPromise: Promise<any> | null = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private config: any;
  private sources = new Set<AudioBufferSourceNode>();

  constructor(config: any) {
    this.config = config;
  }

  async connect() {
    this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Low Latency Fix: Resume contexts immediately
    if (this.inputContext.state === 'suspended') await this.inputContext.resume();
    if (this.outputContext.state === 'suspended') await this.outputContext.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `Eres Savara, la inteligencia de CalculaTu. Tu tono es humano, cálido y experto.
        GUÍA DE OPERACIÓN:
        1. El usuario dirá cosas como "Savara, agrega dos harinas pan a 1.25 cada una".
        2. EXTRAE: name, price, quantity, currency.
        3. SIEMPRE detecta la moneda:
           - "un dólar", "uno con veinte", "uno punto cinco", "cada una" -> currency: 'USD'
           - "dos euros", "1.50 euros" -> currency: 'EUR'
           - "cien bolívares", "mil soberanos", "en bss" -> currency: 'VES'
        4. Si no especifica moneda pero el monto es pequeño (ej. < 10), asume USD. 
        5. Llama a addItem() para cada producto detectado.
        6. Responde confirmando brevemente: "Vale, dos harinas pan agregadas."
        
        TASAS Y PLANES:
        - CalculaTu convierte automáticamente USD/EUR a Bs usando la tasa BCV oficial.
        - Savara Pro Lifetime: $10 (Pago único, oferta válida). Regular $15.`;

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => { this.startAudioInput(); },
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
        onclose: () => this.config.onClose(),
        onerror: () => this.config.onClose()
      },
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        tools: [{ functionDeclarations: [addItemTool, finishListTool] }]
      }
    });
  }

  private startAudioInput() {
    if (!this.inputContext || !this.stream) return;
    const source = this.inputContext.createMediaStreamSource(this.stream);
    // Latency Optimization: Reduced buffer size from 4096 to 2048
    this.processor = this.inputContext.createScriptProcessor(2048, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };
    source.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }

  async disconnect() {
    if (this.processor) this.processor.disconnect();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.inputContext) await this.inputContext.close();
    if (this.outputContext) await this.outputContext.close();
    this.sessionPromise?.then(session => session.close());
  }
}

export const connectLandingLiveChat = async (callbacks: {
  onmessage: (message: LiveServerMessage) => void;
  onclose?: () => void;
  onerror?: () => void;
  onopen?: () => void;
}) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.live.connect({
    model: LIVE_TEXT_MODEL,
    callbacks: {
      onopen: callbacks.onopen,
      onmessage: callbacks.onmessage,
      onclose: callbacks.onclose,
      onerror: callbacks.onerror,
    },
    config: {
      responseModalities: [Modality.TEXT],
      systemInstruction: LANDING_SYSTEM_INSTRUCTION,
    },
  });
};

export const createChatSession = (): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: LANDING_SYSTEM_INSTRUCTION,
    },
  });
};

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "Perdona, ¿me repites eso?";
  } catch (error) {
    return "Me desconecté un segundo, pero ya estoy aquí. ¿En qué te ayudo?";
  }
};