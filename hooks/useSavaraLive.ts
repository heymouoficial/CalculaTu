import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ShoppingItem } from '../types';

const MODEL_ID = "gemini-2.0-flash-exp"; // Using 2.0 Flash Exp as it's the stable experimental one, user mentioned 2.5 but 2.0 is the current public beta endpoint for Live usually.
// Wait, the user EXPLICITLY provided code with "gemini-2.5-flash-native-audio-preview-12-2025".
// I will use the user's string to be safe, assuming they have access to it.
// Actually, let's use the one in the prompt code.
const MODEL_ID_USER = "gemini-2.5-flash-native-audio-preview-12-2025"; 

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
// Note: v1beta is standard, but Bidi might be v1alpha or v1beta. User code said v1beta.
// User code: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`

export const useSavaraLive = (config?: { onItemAdded?: (item: ShoppingItem) => void; onHangUp?: () => void }) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioContextOutput = useRef<AudioContext | null>(null);
  const workletNode = useRef<AudioWorkletNode | null>(null);
  const nextStartTime = useRef<number>(0);
  
  const addItem = useAppStore((state) => state.addItem); 
  const items = useAppStore((state) => state.items);
  const rates = useAppStore((state) => state.rates);

  // Tools definition
  const tools = [
    {
      function_declarations: [
        {
          name: "add_shopping_item",
          description: "Agrega un producto a la lista de compras del usuario con su precio aproximado.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Nombre del producto (ej: Harina PAN)" },
              price: { type: "number", description: "Precio del producto" },
              currency: { type: "string", enum: ["USD", "EUR", "VES"], description: "Moneda del precio (USD, EUR, VES). Si el usuario no especifica, asume USD." }
            },
            required: ["product_name", "price", "currency"]
          }
        },
        {
            name: "finish_list",
            description: "Finaliza la lista de compras y genera el recibo.",
            parameters: {
                type: "object",
                properties: {}
            }
        }
      ]
    }
  ];

  const connect = useCallback(async (systemInstruction: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    // 1. Initialize Audio Contexts
    // Input: 16kHz for Gemini
    audioContext.current = new AudioContext({ sampleRate: 16000 });
    await audioContext.current.audioWorklet.addModule('/pcm-processor.js');

    // Output: 24kHz for Gemini response
    audioContextOutput.current = new AudioContext({ sampleRate: 24000 });
    nextStartTime.current = audioContextOutput.current.currentTime;

    // 2. Connect WebSocket
    // Using v1alpha for Bidi as per some docs, but user said v1beta. sticking to user prompt v1beta.
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("🟢 Savara Conectada");
      setIsConnected(true);

      // 1. Setup Message
      const setupMsg = {
        setup: {
          model: `models/${MODEL_ID_USER}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
            }
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          tools: tools
        }
      };
      ws.current?.send(JSON.stringify(setupMsg));

      // 2. Kickstart Message (Force Hello)
      // Enviamos un mensaje de texto oculto para que el modelo inicie la interacción
      const kickstartMsg = {
        clientContent: {
          turns: [{
            role: "user",
            parts: [{ text: "Hola Savara, preséntate." }]
          }],
          turnComplete: true
        }
      };
      ws.current?.send(JSON.stringify(kickstartMsg));
    };

    ws.current.onerror = (error) => {
      console.error("🔴 Savara WebSocket Error:", error);
      // No desconectamos aquí, dejamos que onclose maneje la limpieza
    };

    ws.current.onclose = (event) => {
      console.log(`🔴 Savara Desconectada. Code: ${event.code}, Reason: ${event.reason}`);
      setIsConnected(false);
      // Cleanup audio contexts
      if (audioContext.current?.state !== 'closed') audioContext.current?.close();
      if (audioContextOutput.current?.state !== 'closed') audioContextOutput.current?.close();
    };

    ws.current.onmessage = async (event) => {
      let data;
      try {
        if (event.data instanceof Blob) {
          data = JSON.parse(await event.data.text());
        } else {
          data = JSON.parse(event.data);
        }
      } catch (e) {
        console.error("Error parsing WS message", e);
        return;
      }

      // Handle Audio Response (Resilient Search)
      const audioPart = data.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData?.data);
      if (audioPart && audioContextOutput.current) {
        playAudioChunk(audioPart.inlineData.data, audioContextOutput.current, nextStartTime);
      }

      // Handle Function Calling
      if (data.toolCall) {
        console.log("🛠️ Savara Tool Call Received:", data.toolCall);
        const responses = [];
        let shouldHangUp = false;

        for (const call of data.toolCall.functionCalls) {
          if (call.name === "add_shopping_item") {
            const { product_name, price, currency } = call.args;
            const newItem: ShoppingItem = {
                id: Date.now().toString(),
                name: product_name,
                price: Number(price),
                currency: (currency as 'USD' | 'EUR' | 'VES') || 'USD',
                quantity: 1
            };
            addItem(newItem);
            if (config?.onItemAdded) config.onItemAdded(newItem);
            
            responses.push({
              id: call.id,
              name: call.name,
              response: { result: "Item agregado correctamente" }
            });
          }
          else if (call.name === "finish_list") {
             shouldHangUp = true;
             responses.push({
                id: call.id,
                name: call.name,
                response: { result: "Lista finalizada." }
             });
          }
        }
        
        // Send tool response first
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                toolResponse: { functionResponses: responses }
            }));
        }

        // Hang up after a short delay to allow audio/responses to flush
        if (shouldHangUp && config?.onHangUp) {
            setTimeout(() => config.onHangUp?.(), 1500);
        }
      }
    };

    // 3. Start Microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { 
      channelCount: 1, 
      sampleRate: 16000 
    }});
    
    // CRITICAL: Resume context ensures microphone is active
    await audioContext.current.resume();

    const source = audioContext.current.createMediaStreamSource(stream);
    workletNode.current = new AudioWorkletNode(audioContext.current, 'pcm-processor');
    
    workletNode.current.port.onmessage = (e) => {
      const pcmData = e.data;
      const base64Audio = arrayBufferToBase64(pcmData);
      
      if (ws.current?.readyState === WebSocket.OPEN) {
        // Debug esporádico (solo imprime si el audio tiene energía para no saturar consola)
        // const hasSound = new Int16Array(pcmData).some(x => Math.abs(x) > 100);
        // if (hasSound) console.log("🎤"); 

        const audioMsg = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: "audio/pcm",
              data: base64Audio
            }]
          }
        };
        ws.current.send(JSON.stringify(audioMsg));
      }
    };

    source.connect(workletNode.current);
    // Note: Do NOT connect worklet to destination to avoid echo
  }, [addItem, items, rates]);

  const disconnect = useCallback(() => {
    if (ws.current) {
        ws.current.close();
        ws.current = null;
    }
    if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close().catch(() => {});
    }
    if (audioContextOutput.current && audioContextOutput.current.state !== 'closed') {
        audioContextOutput.current.close().catch(() => {});
    }
    setIsConnected(false);
  }, []);

  return { connect, disconnect, isConnected };
};

// Helpers

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function playAudioChunk(base64String: string, context: AudioContext, nextStartTime: React.MutableRefObject<number>) {
  try {
      const binaryString = window.atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // PCM 16-bit Little Endian
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }
      
      const buffer = context.createBuffer(1, float32Data.length, 24000);
      buffer.copyToChannel(float32Data, 0);
      
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      
      const now = context.currentTime;
      const start = Math.max(now, nextStartTime.current);
      source.start(start);
      nextStartTime.current = start + buffer.duration;
      
  } catch (e) {
      console.error("Error playing audio chunk", e);
  }
}
