/**
 * SavaraLiveSDK - Implementación con @google/genai SDK oficial
 * 
 * Esta versión usa el SDK oficial de Google que soporta:
 * - gemini-2.5-flash-native-audio-preview (límites más altos)
 * - Bidirectional audio streaming
 * - Function calling nativo
 * 
 * Integrado con Operación Hydra para rotación de API Keys.
 * 
 * @author Multiversa Lab
 * @version 2.0.1
 */

import { GoogleGenAI, Modality, type LiveServerMessage, type FunctionDeclaration, Type } from "@google/genai";
import { GeminiKeyManager } from '../utils/geminiKeyManager';

// Audio Helpers
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function encode(bytes: Uint8Array): string {
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

// Tool Declarations
const addItemTool: FunctionDeclaration = {
    name: 'add_shopping_item',
    description: 'Añade un artículo a la lista de compras del usuario.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            product_name: { type: Type.STRING, description: 'Nombre del producto' },
            price: { type: Type.STRING, description: 'Precio unitario (string numérico)' },
            currency: { type: Type.STRING, description: 'Divisa: USD, EUR o VES (Bolivares)' },
            quantity: { type: Type.NUMBER, description: 'Cantidad' }
        },
        required: ['product_name', 'price']
    }
};

const removeItemTool: FunctionDeclaration = {
    name: 'remove_shopping_item',
    description: 'Elimina un artículo de la lista por nombre.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            product_name: { type: Type.STRING, description: 'Nombre del producto a eliminar' }
        },
        required: ['product_name']
    }
};

const getBcvRateTool: FunctionDeclaration = {
    name: 'get_bcv_rate',
    description: 'Obtiene la tasa de cambio BCV actual.',
    parameters: { type: Type.OBJECT, properties: {} }
};

export interface SavaraLiveConfig {
    onItemAdded?: (item: any) => void;
    onItemRemoved?: (name: string) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: any) => void;
    userName?: string | null;
    systemContext?: string;
    // NEW: Real-time data injection
    bcvRates?: { USD: number; EUR: number };
    cartInfo?: { itemCount: number; totalBs: number; totalUsd: number };
}

export class SavaraLiveSDK {
    // FIX: Use sessionPromise instead of session directly (like original AI Studio code)
    private sessionPromise: Promise<any> | null = null;
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private nextStartTime = 0;
    private config: SavaraLiveConfig;
    private currentApiKey: string | null = null;
    private isConnected = false;

    constructor(config: SavaraLiveConfig = {}) {
        this.config = config;
    }

    async connect(): Promise<void> {
        try {
            // Hydra: Get API Key from pool
            const keyManager = GeminiKeyManager.getInstance();
            this.currentApiKey = keyManager.getKey();

            if (!this.currentApiKey) {
                throw { code: 'NO_KEYS_AVAILABLE', message: 'Todas las API Keys están agotadas. Intenta en 1 hora.' };
            }

            console.log(`🐍 Hydra SDK: Usando key ${keyManager.getStatus().currentKeyMasked}`);

            // Initialize Audio Contexts
            this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            if (this.inputContext.state === 'suspended') await this.inputContext.resume();
            if (this.outputContext.state === 'suspended') await this.outputContext.resume();

            // Get Microphone
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Initialize Google AI SDK
            const ai = new GoogleGenAI({ apiKey: this.currentApiKey });

            // Build dynamic context with BCV rates
            const ratesContext = this.config.bcvRates
                ? `TASAS BCV HOY: $1 USD = ${this.config.bcvRates.USD.toFixed(2)} Bolívares | €1 EUR = ${this.config.bcvRates.EUR.toFixed(2)} Bolívares`
                : 'Tasas BCV no disponibles.';

            const cartContext = this.config.cartInfo
                ? `CARRITO ACTUAL: ${this.config.cartInfo.itemCount} productos, Total: ${this.config.cartInfo.totalBs.toFixed(2)} Bolívares ($${this.config.cartInfo.totalUsd.toFixed(2)} USD)`
                : '';

            const systemInstruction = `
        Eres Savara, la asistente de voz de CalculaTú - la app venezolana de compras inteligentes.
        Tu tono es cálido, profesional y extremadamente conciso.
        Hablas como una amiga experta en finanzas venezolanas.
        ${this.config.userName ? `Estás hablando con ${this.config.userName}.` : ''}
        
        ${ratesContext}
        ${cartContext}
        
        REGLAS ABSOLUTAS:
        - Responde siempre en español venezolano.
        - Sé BREVE (máximo 2 oraciones).
        - SALUDO ÚNICO: Saluda solo al inicio. Si ya están hablando, ve directo al grano.
        - REGLA DE DESPEDIDA: Si se despiden o agradecen, responde con calidez y brevedad.
        - Usa add_shopping_item para agregar productos.
        - Si dicen "bolívares" o "Bs", usa currency: "VES".
        - Si dicen "dólares" o "$", usa currency: "USD".
        - Si dicen "euros" o "€", usa currency: "EUR".
        - Cuando agregues algo, confirma: "Listo, agregué [producto]".
        - Si preguntan por la tasa, usa los datos de TASAS BCV HOY.
        
        SOBRE CALCULATÚ:
        - App para hacer mercado sin estrés en Venezuela
        - Convierte automáticamente USD/EUR a Bolívares con tasa BCV oficial
        - Savara Pro permite agregar productos por voz
        - Promoción: Pro GRATIS hasta Enero 2026
        
        ${this.config.systemContext || ''}
      `.trim();

            // FIX: Store as Promise, don't await - this matches original AI Studio pattern
            this.sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('🟢 Savara SDK Conectada');
                        this.isConnected = true;
                        this.startAudioInput(); // Now this will work because we use sessionPromise
                        this.config.onConnected?.();
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Audio Response
                        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData && this.outputContext) {
                            console.log('🔊 Recibiendo audio de Savara...');
                            this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), this.outputContext, 24000, 1);
                            const source = this.outputContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(this.outputContext.destination);
                            source.start(this.nextStartTime);
                            this.nextStartTime += audioBuffer.duration;
                        }

                        // Handle Tool Calls
                        if (message.toolCall) {
                            await this.handleToolCalls(message.toolCall);
                        }
                    },
                    onclose: (event: any) => {
                        console.log('🔴 Savara SDK Desconectada', event);
                        this.isConnected = false;
                        this.config.onDisconnected?.();

                        // Hydra: Report error if quota exceeded
                        if (event?.code === 1011 || event?.reason?.includes('quota')) {
                            const keyManager = GeminiKeyManager.getInstance();
                            if (this.currentApiKey) {
                                keyManager.reportError(this.currentApiKey);
                            }
                        }
                    },
                    onerror: (error: any) => {
                        console.error('🔴 Savara SDK Error:', error);
                        this.config.onError?.(error);
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction,
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
                    },
                    tools: [{ functionDeclarations: [addItemTool, removeItemTool, getBcvRateTool] }]
                }
            });

        } catch (err: any) {
            console.error('Error conectando Savara SDK:', err);

            // Hydra: Report key failure
            if (this.currentApiKey && (err.message?.includes('429') || err.message?.includes('quota'))) {
                const keyManager = GeminiKeyManager.getInstance();
                keyManager.reportError(this.currentApiKey);
            }

            this.config.onError?.(err);
            throw err;
        }
    }

    private startAudioInput(): void {
        // FIX: Don't check this.session - use stream and context instead
        if (!this.inputContext || !this.stream) {
            console.error('❌ No input context or stream for audio');
            return;
        }

        const source = this.inputContext.createMediaStreamSource(this.stream);
        this.processor = this.inputContext.createScriptProcessor(2048, 1, 1);

        this.processor.onaudioprocess = (e) => {
            if (!this.isConnected || !this.sessionPromise) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);

            // FIX: Send audio through the Promise (like original)
            this.sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            }).catch(() => {
                // Session might be closing, ignore
            });
        };

        source.connect(this.processor);
        this.processor.connect(this.inputContext.destination);
        console.log('🎤 Audio input iniciado - enviando a Gemini');
    }

    private async handleToolCalls(toolCall: any): Promise<void> {
        const responses: any[] = [];

        for (const fc of toolCall.functionCalls || []) {
            console.log('🔧 Tool Call:', fc.name, fc.args);

            if (fc.name === 'add_shopping_item') {
                const { product_name, price, currency, quantity } = fc.args;
                const newItem = {
                    id: Date.now().toString(),
                    name: product_name,
                    price: Number(price),
                    currency: currency || 'USD',
                    quantity: Number(quantity) || 1
                };
                this.config.onItemAdded?.(newItem);
                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: `Agregado: ${product_name}` }
                });
            }
            else if (fc.name === 'remove_shopping_item') {
                const { product_name } = fc.args;
                this.config.onItemRemoved?.(product_name);
                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: `Eliminado: ${product_name}` }
                });
            }
            else if (fc.name === 'get_bcv_rate') {
                responses.push({
                    id: fc.id,
                    name: fc.name,
                    response: { result: { USD: 294.97, EUR: 347.68 } }
                });
            }
        }

        // FIX: Send tool response through Promise
        if (responses.length > 0 && this.sessionPromise) {
            this.sessionPromise.then(session => {
                session.sendToolResponse({ functionResponses: responses });
            }).catch(() => { });
        }
    }

    async disconnect(): Promise<void> {
        this.isConnected = false;

        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        if (this.inputContext && this.inputContext.state !== 'closed') {
            await this.inputContext.close().catch(() => { });
            this.inputContext = null;
        }

        if (this.outputContext && this.outputContext.state !== 'closed') {
            await this.outputContext.close().catch(() => { });
            this.outputContext = null;
        }

        // FIX: Close session through Promise
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                session.close();
            }).catch(() => { });
            this.sessionPromise = null;
        }

        console.log('🔴 Savara SDK Desconectada (cleanup)');
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }
}
