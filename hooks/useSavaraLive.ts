import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ShoppingItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { getSavaraSystemInstruction } from '../utils/savaraLogic';

const MODEL_ID = "gemini-2.0-flash-exp"; 
const MODEL_ID_USER = "gemini-2.5-flash-native-audio-preview-12-2025"; 

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

export type SavaraError = {
  code: 'CONNECTION_ERROR' | 'MIC_PERMISSION_DENIED' | 'API_LIMIT_REACHED' | 'UNKNOWN';
  message: string;
} | null;

export const useSavaraLive = (config?: { onItemAdded?: (item: ShoppingItem) => void; onHangUp?: () => void }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<SavaraError>(null);
  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioContextOutput = useRef<AudioContext | null>(null);
  const workletNode = useRef<AudioWorkletNode | null>(null);
  const nextStartTime = useRef<number>(0);
  
  const items = useAppStore(s => s.items);
  const rates = useAppStore(s => s.rates);
  const userName = useAppStore(s => s.userName);
  const machineId = useAppStore(s => s.machineId);
  const addItem = useAppStore(s => s.addItem);
  const removeItem = useAppStore(s => s.removeItem);
  const updateItem = useAppStore(s => s.updateItem);
  const setUserName = useAppStore(s => s.setUserName);

  // Tools definition
  const tools = [
    {
      function_declarations: [
        {
          name: "add_shopping_item",
          description: "Agrega un producto a la lista de compras del usuario con su precio aproximado y cantidad.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Nombre del producto (ej: Harina PAN)" },
              price: { type: "number", description: "Precio del producto" },
              currency: { type: "string", enum: ["USD", "EUR", "VES"], description: "Moneda del precio (USD, EUR, VES). Si el usuario no especifica, asume USD." },
              quantity: { type: "number", description: "Cantidad de unidades del producto. Si no se especifica, se asume 1." }
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
        },
        {
          name: "save_user_name",
          description: "Guarda el nombre del usuario para recordarlo en el futuro.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "El nombre que el usuario me dijo." }
            },
            required: ["name"]
          }
        },
        {
          name: "get_latest_rates",
          description: "Obtiene las tasas de cambio actuales de USD y EUR en Bolívares (BCV).",
          parameters: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_shopping_list",
          description: "Obtiene la lista actual de productos en el carrito de compras.",
          parameters: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "remove_shopping_item",
          description: "Elimina un producto de la lista de compras basándose en su nombre.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Nombre del producto a eliminar. Debe ser lo más exacto posible." }
            },
            required: ["product_name"]
          }
        },
        {
          name: "update_shopping_item",
          description: "Modifica un producto existente en la lista. Se puede ajustar la cantidad, el precio o el nombre.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Nombre del producto a actualizar." },
              new_price: { type: "number", description: "El nuevo precio del producto." },
              new_quantity: { type: "number", description: "La nueva cantidad de unidades del producto." },
              new_name: { type: "string", description: "El nuevo nombre para el producto." }
            },
            required: ["product_name"]
          }
        }
      ]
    }
  ];

  const connect = useCallback(async (systemInstruction: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    setError(null);

    try {
      // 1. Initialize Audio Contexts
      audioContext.current = new AudioContext({ sampleRate: 16000 });
      await audioContext.current.audioWorklet.addModule('/pcm-processor.js');

      audioContextOutput.current = new AudioContext({ sampleRate: 24000 });
      nextStartTime.current = audioContextOutput.current.currentTime;

      // 2. Connect WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("🟢 Savara Conectada");
        setIsConnected(true);
        setError(null);

        // Inject Name, Items, and Rates into System Instruction using helper
        const personalizedInstruction = getSavaraSystemInstruction(
          systemInstruction,
          userName,
          items,
          rates
        );

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
              parts: [{ text: personalizedInstruction }]
            },
            tools: tools
          }
        };
        ws.current?.send(JSON.stringify(setupMsg));

        // 2. Kickstart Message (Force Hello)
        // If we know the name, we greet personally. If not, we ask.
        const greetingPrompt = userName
          ? `Hola Savara. Soy ${userName}. Salúdame corto.`
          : `Hola Savara. No sé mi nombre aún. Salúdame y pregúntame cómo me llamo para recordarlo.`;

        const kickstartMsg = {
          clientContent: {
            turns: [{
              role: "user",
              parts: [{ text: greetingPrompt }]
            }],
            turnComplete: true
          }
        };
        ws.current?.send(JSON.stringify(kickstartMsg));
      };

      ws.current.onerror = (error) => {
        console.error("🔴 Savara WebSocket Error:", error);
        setError({ code: 'CONNECTION_ERROR', message: "Error de conexión con Savara." });
        setIsConnected(false);
      };

      ws.current.onclose = (event) => {
        console.log(`🔴 Savara Desconectada. Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
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

        const audioPart = data.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData?.data);
        if (audioPart && audioContextOutput.current) {
          playAudioChunk(audioPart.inlineData.data, audioContextOutput.current, nextStartTime);
        }

        if (data.toolCall) {
          console.log("🛠️ Savara Tool Call Received:", data.toolCall);
          const responses = [];
          let shouldHangUp = false;

          for (const call of data.toolCall.functionCalls) {
            if (call.name === "add_shopping_item") {
              const { product_name, price, currency, quantity } = call.args;
              const newItem: ShoppingItem = {
                  id: Date.now().toString(),
                  name: product_name,
                  price: Number(price),
                  currency: (currency as 'USD' | 'EUR' | 'VES') || 'USD',
                  quantity: Number.isFinite(quantity) && quantity > 0 ? Number(quantity) : 1
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
            else if (call.name === "save_user_name") {
              const { name } = call.args;
              console.log("👤 Saving user name:", name);
              
              // 1. Update Local Store
              setUserName(name);

              // 2. Persist to Supabase
              if (supabase && machineId) {
                supabase.from('profiles').upsert({ 
                  machine_id: machineId, 
                  full_name: name 
                }).then(({ error }) => {
                  if (error) console.error("Error saving profile to DB:", error);
                });
              }

              responses.push({
                id: call.id,
                name: call.name,
                response: { result: `Nombre ${name} guardado exitosamente.` }
              });
            }
            else if (call.name === "get_latest_rates") {
              responses.push({
                id: call.id,
                name: call.name,
                response: { 
                  usd: rates.USD, 
                  eur: rates.EUR,
                  last_updated: new Date().toISOString() 
                }
              });
            }
            else if (call.name === "remove_shopping_item") {
              const { product_name } = call.args;
              const itemToRemove = [...items].find(item => item.name.toLowerCase() === product_name.toLowerCase());
              
              if (itemToRemove) {
                removeItem(itemToRemove.id);
                responses.push({ id: call.id, name: call.name, response: { result: `Item '${product_name}' eliminado.` } });
              } else {
                responses.push({ id: call.id, name: call.name, response: { result: `No encontré el item '${product_name}'.` } });
              }
            }
            else if (call.name === "update_shopping_item") {
              const { product_name, new_price, new_quantity, new_name } = call.args;
              const itemToUpdate = [...items].find(item => item.name.toLowerCase() === product_name.toLowerCase());

              if (itemToUpdate) {
                const updatedFields: Partial<ShoppingItem> = {};
                if (Number.isFinite(new_price)) updatedFields.price = new_price;
                if (Number.isFinite(new_quantity) && new_quantity > 0) updatedFields.quantity = new_quantity;
                if (new_name) updatedFields.name = new_name;
                
                updateItem(itemToUpdate.id, updatedFields);
                responses.push({ id: call.id, name: call.name, response: { result: `Item '${product_name}' actualizado.` } });
              } else {
                responses.push({ id: call.id, name: call.name, response: { result: `No encontré el item '${product_name}' para actualizar.` } });
              }
            }
          }
          
          if (ws.current?.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({
                  toolResponse: { functionResponses: responses }
              }));
          }

          if (shouldHangUp && config?.onHangUp) {
              setTimeout(() => config.onHangUp?.(), 2000); // User requested 2 seconds
          }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { 
        channelCount: 1, 
        sampleRate: 16000 
      }});
      
      await audioContext.current.resume();

      const source = audioContext.current.createMediaStreamSource(stream);
      workletNode.current = new AudioWorkletNode(audioContext.current, 'pcm-processor');
      
      workletNode.current.port.onmessage = (e) => {
        const pcmData = e.data;
        const base64Audio = arrayBufferToBase64(pcmData);
        
        if (ws.current?.readyState === WebSocket.OPEN) {
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
    } catch (e: any) {
      console.error("🔴 Savara Connection/Mic Error:", e);
      setIsConnected(false);
      
      // Categorize error
      if (e.message?.includes("Permission denied") || e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError({ code: 'MIC_PERMISSION_DENIED', message: "Necesitamos permiso del micrófono para hablar contigo." });
      } else {
        setError({ code: 'UNKNOWN', message: "Error al iniciar Savara. Intenta de nuevo." });
      }
    }
  }, [items, rates, userName, machineId, addItem, removeItem, updateItem, setUserName]);

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

  return { connect, disconnect, isConnected, error };
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
