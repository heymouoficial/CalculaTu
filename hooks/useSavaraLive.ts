import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../services/supabaseClient';
import { syncVoiceUsage } from '../services/usageService';

const MODEL = "models/gemini-2.0-flash-exp"; // Fallback/Standard
const MODEL_LIVE = "gemini-2.5-flash-native-audio-preview-12-2025"; // Optimized for Live
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as any).GEMINI_API_KEY;

interface UseSavaraLiveProps {
  onItemAdded?: (item: any) => void;
  onHangUp?: () => void;
  userName?: string | null;
  machineId?: string | null;
}

export const useSavaraLive = ({ onItemAdded, onHangUp, userName, machineId }: UseSavaraLiveProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<any>(null);

  // Audio Context State
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const workletNode = useRef<AudioWorkletNode | null>(null);
  const audioContextOutput = useRef<AudioContext | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const nextStartTime = useRef<number>(0);

  // Acceso al Store para Function Calling y Metering
  const addItem = useAppStore((state) => state.addItem);
  const removeItem = useAppStore((state) => state.removeItem);
  const updateItem = useAppStore((state) => state.updateItem);
  const items = useAppStore((state) => state.items);
  const incrementVoiceUsage = useAppStore((state) => state.incrementVoiceUsage);
  const fetchRemoteUsage = useAppStore((state) => state.fetchRemoteUsage); // Get fetch action
  const voiceUsageSeconds = useAppStore((state) => state.voiceUsageSeconds);
  const license = useAppStore((state) => state.license);
  const unsyncedSeconds = useRef(0);

  // Initial Fetch
  useEffect(() => {
    fetchRemoteUsage().catch(console.error);
  }, []);
  
  // Metering Interval & Sync
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        incrementVoiceUsage(1);
        unsyncedSeconds.current += 1;
        
        // Sync to Backend every 10 seconds
        if (unsyncedSeconds.current >= 10) {
           if (machineId) {
             syncVoiceUsage(machineId, unsyncedSeconds.current).then(() => {
               unsyncedSeconds.current = 0;
             });
           }
        }
        
        // Dynamic Limit: Lifetime = 60 min (3600s), Others = 30 min (1800s)
        const LIMIT_SECONDS = license.tier === 'lifetime' ? 3600 : 1800;
        
        if (voiceUsageSeconds >= LIMIT_SECONDS) {
           console.warn("Límite de uso de voz alcanzado.");
           disconnect();
           setError({ 
             code: 'USAGE_LIMIT_REACHED', 
             message: `Has alcanzado tu límite de voz (${LIMIT_SECONDS / 60} min).` 
           });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, incrementVoiceUsage, voiceUsageSeconds, license.tier]);

  // Definición de Herramientas (Function Calling)
  const tools = [
    {
      function_declarations: [
        {
          name: "add_shopping_item",
          description: "Adds an item to the shopping list with price and quantity.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Name of the product" },
              price: { type: "string", description: "Price per unit (numeric string)" },
              currency: { type: "string", description: "Currency code (USD, EUR, VES)" },
              quantity: { type: "number", description: "Quantity of items" }
            },
            required: ["product_name", "price"]
          }
        },
        {
          name: "remove_shopping_item",
          description: "Removes an item from the shopping list by name.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Name of the product to remove" }
            },
            required: ["product_name"]
          }
        },
        {
          name: "update_shopping_item_quantity",
          description: "Updates the quantity of an existing item.",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string", description: "Name of the product" },
              new_quantity: { type: "number", description: "New quantity" }
            },
            required: ["product_name", "new_quantity"]
          }
        },
        {
          name: "get_user_profile",
          description: "Fetches the user's profile information from the database.",
          parameters: { type: "object", properties: {} }
        },
        {
          name: "check_license_status",
          description: "Checks the current license status and expiration for the user.",
          parameters: { type: "object", properties: {} }
        },
        {
          name: "get_bcv_rate",
          description: "Gets the current official BCV exchange rate from the database.",
          parameters: { type: "object", properties: {} }
        }
      ]
    }
  ];

  const connect = useCallback(async (initialPrompt?: string) => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) return;
      
      // Check Usage Limit Before Connecting
      const LIMIT_SECONDS = 1800; // 30 Mins Promo
      if (useAppStore.getState().voiceUsageSeconds >= LIMIT_SECONDS) {
        setError({ code: 'USAGE_LIMIT_REACHED', message: "Has alcanzado tu límite mensual de voz (30 min)." });
        return;
      }

      console.log("🔵 Iniciando Savara Live...");
      setError(null);

      // 1. Get Microphone Stream
      try {
        mediaStream.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true
          }
        });
      } catch (micErr) {
        throw { code: 'MIC_PERMISSION_DENIED', message: 'Permiso de micrófono denegado' };
      }

      // 2. Audio Context & Worklet
      audioContext.current = new AudioContext({ sampleRate: 16000 });
      await audioContext.current.audioWorklet.addModule('/pcm-processor.js');

      // Output Context (24kHz typically from Gemini)
      audioContextOutput.current = new AudioContext({ sampleRate: 24000 });
      nextStartTime.current = audioContextOutput.current.currentTime;

      // 3. WebSocket Connection
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as any).GEMINI_API_KEY;
      if (!apiKey) {
        console.error("❌ Savara Error: No se encontró VITE_GEMINI_API_KEY en el entorno.");
        throw new Error("Falta la configuración de API Key (Gemini) en este dispositivo.");
      }

      const WS_URL_DYNAMIC = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      ws.current = new WebSocket(WS_URL_DYNAMIC);

      ws.current.onopen = () => {
        console.log("🟢 Savara Conectada (Sockets Optimized)");
        setIsConnected(true);

        // Handshake Init
        const identityPrompt = `
          Eres Savara, la asistente inteligente de CalculaTú.
          Tu tono es cálido, profesional y extremadamente conciso.
          ${userName ? `Estás hablando con ${userName}.` : ''}
          ${machineId ? `El ID de dispositivo del usuario es: ${machineId}.` : ''}
          Tienes acceso a la base de datos de Multiversa para consultas.
          Responde siempre en español. Sé breve y útil.
          
          ${initialPrompt || ''}
        `.trim();

        const msg = {
          setup: {
            model: `models/${MODEL_LIVE}`,
            tools: tools,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
              }
            },
            systemInstruction: {
              parts: [{ text: identityPrompt }]
            }
          }
        };
        ws.current?.send(JSON.stringify(msg));
      };

      ws.current.onmessage = async (event) => {
        try {
          let data;
          if (event.data instanceof Blob) {
            data = JSON.parse(await event.data.text());
          } else {
            data = JSON.parse(event.data);
          }

          // Audio Response
          if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
            const base64Audio = data.serverContent.modelTurn.parts[0].inlineData.data;
            if (audioContextOutput.current) {
              playAudioChunk(base64Audio, audioContextOutput.current, nextStartTime);
            }
          }

          // Tool Calls
          if (data.toolCall) {
            await handleToolCall(data.toolCall);
          }

        } catch (e) {
          console.error("Error parsing WS msg", e);
        }
      };

      ws.current.onclose = (event) => {
        console.log("🔴 Socket Closed", event.code, event.reason);
        setIsConnected(false);
        if (onHangUp) onHangUp(); // Trigger callback

        if (event.code === 1011 || event.reason.includes("Quota") || event.reason.includes("quota")) {
          setError({ code: 'API_LIMIT_REACHED', message: "Quota Exceeded or Blocked." });
        } else if (event.code !== 1000) {
          setError({ code: 'CONNECTION_ERROR', message: "Conexión cerrada inesperadamente." });
        }
      };

      ws.current.onerror = (event) => {
        console.error("🔴 Socket Error", event);
        setError({ code: 'CONNECTION_ERROR', message: "Error de conexión WebSocket." });
        setIsConnected(false);
      };

      // 4. Setup Audio Processing Chain
      const source = audioContext.current.createMediaStreamSource(mediaStream.current);
      workletNode.current = new AudioWorkletNode(audioContext.current, 'pcm-processor');

      workletNode.current.port.onmessage = (event) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          const pcmData = event.data; // Int16Array

          // Convert Int16Array to Base64
          const buffer = pcmData.buffer;
          const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

          ws.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm",
                data: base64
              }]
            }
          }));
        }
      };

      source.connect(workletNode.current);

    } catch (err: any) {
      console.error("Error init Savara:", err);

      let errorData = { code: 'UNKNOWN_ERROR', message: err.message || "Error desconocido" };

      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        errorData = { code: 'MIC_PERMISSION_DENIED', message: "Permiso de micrófono denegado." };
      } else if (err.code === 'CONNECTION_ERROR') {
        // Si ya viene formateado
        errorData = err;
      } else if (err.code === 'MIC_PERMISSION_DENIED') {
        errorData = err;
      }

      setError(errorData);
      setIsConnected(false);
    }
  }, [addItem, onHangUp]);

  const disconnect = useCallback(() => {
    // 1. Cerrar WebSocket si está abierto
    if (ws.current) {
      // Evitar bucles: quitar listeners antes de cerrar para no disparar 'onclose' de nuevo
      ws.current.onclose = null; 
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.close();
      ws.current = null;
    }
  
    // 2. Limpieza de Audio IDEMPOTENTE (El fix del error)
    if (audioContext.current) {
      // Solo intentar cerrar si NO está cerrado ya
      if (audioContext.current.state !== 'closed') {
        audioContext.current.close()
          .then(() => console.log("AudioContext cerrado correctamente"))
          .catch(e => console.warn("Error cerrando AudioContext (ignorable):", e));
      }
      audioContext.current = null;
    }
  
    // 3. Desconectar Worklet si existe
    if (workletNode.current) {
      workletNode.current.disconnect();
      workletNode.current = null;
    }
    
    // 4. Limpiar media stream
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    // 5. Limpiar Output Context
    if (audioContextOutput.current) {
      if (audioContextOutput.current.state !== 'closed') {
        audioContextOutput.current.close().catch(e => console.warn(e));
      }
      audioContextOutput.current = null;
    }

    // 6. Final Sync
    if (unsyncedSeconds.current > 0 && machineId) {
      syncVoiceUsage(machineId, unsyncedSeconds.current).then(() => {
        unsyncedSeconds.current = 0;
      });
    }

    setIsConnected(false);
  }, [machineId]); // Added dependency on machineId because it's used in callback

  const handleToolCall = async (toolCall: any) => {
    const functionCalls = toolCall.functionCalls;
    const responses: any[] = [];

    for (const call of functionCalls) {
      // 1. Existing Cart Tools
      if (call.name === "add_shopping_item") {
        const { product_name, price, currency, quantity } = call.args;
        const newItem = {
          id: Date.now().toString(),
          name: product_name,
          price: Number(price),
          currency: currency || 'USD',
          quantity: Number(quantity) || 1
        };
        addItem(newItem);
        if (onItemAdded) onItemAdded(newItem);
        responses.push({ id: call.id, name: call.name, response: { result: "Item added successfully" } });
      }
      else if (call.name === "remove_shopping_item") {
        const { product_name } = call.args;
        const itemToRemove = items.find(item => item.name.toLowerCase() === product_name.toLowerCase());
        if (itemToRemove) {
          removeItem(itemToRemove.id);
          responses.push({ id: call.id, name: call.name, response: { result: `Item '${product_name}' eliminado.` } });
        } else {
          responses.push({ id: call.id, name: call.name, response: { result: `Item '${product_name}' no encontrado.` } });
        }
      }
      else if (call.name === "update_shopping_item_quantity") {
        const { product_name, new_quantity } = call.args;
        const itemToUpdate = items.find(item => item.name.toLowerCase() === product_name.toLowerCase());
        if (itemToUpdate) {
          updateItem(itemToUpdate.id, { ...itemToUpdate, quantity: Number(new_quantity) });
          responses.push({ id: call.id, name: call.name, response: { result: `Cantidad de '${product_name}' actualizada.` } });
        } else {
          responses.push({ id: call.id, name: call.name, response: { result: `Item '${product_name}' no encontrado.` } });
        }
      }
      // 2. New Supabase Tools
      else if (call.name === "get_user_profile") {
        if (!supabase || !machineId) {
          responses.push({ id: call.id, name: call.name, response: { error: "Database not available" } });
          continue;
        }
        const { data, error: dbErr } = await supabase.from('profiles').select('*').eq('machine_id', machineId).maybeSingle();
        responses.push({ id: call.id, name: call.name, response: dbErr ? { error: dbErr.message } : { profile: data } });
      }
      else if (call.name === "check_license_status") {
        if (!supabase || !machineId) {
          responses.push({ id: call.id, name: call.name, response: { error: "Database not available" } });
          continue;
        }
        const { data, error: dbErr } = await supabase.from('contracts').select('*').eq('machine_id', machineId).eq('status', 'active').maybeSingle();
        responses.push({ id: call.id, name: call.name, response: dbErr ? { error: dbErr.message } : { license: data || "No active license found" } });
      }
      else if (call.name === "get_bcv_rate") {
        if (!supabase) {
          responses.push({ id: call.id, name: call.name, response: { error: "Database not available" } });
          continue;
        }
        const { data, error: dbErr } = await supabase.from('bcv_rates').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
        responses.push({ id: call.id, name: call.name, response: dbErr ? { error: dbErr.message } : { rates: data } });
      }
    }

    ws.current?.send(JSON.stringify({
      toolResponse: {
        functionResponses: responses
      }
    }));
  };

  return {
    connect,
    disconnect,
    isConnected,
    error,
    latency: 0, // Mock for API compat
    isLowLatency: false
  };
};

// Helper: Play Audio
function playAudioChunk(base64String: string, context: AudioContext, nextStartTime: React.MutableRefObject<number>) {
  try {
    const binaryString = window.atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

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
