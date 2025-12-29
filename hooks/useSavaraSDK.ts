/**
 * useSavaraSDK - Hook React para Savara Live con SDK oficial
 * 
 * Versión simplificada que usa el SDK @google/genai
 * para conexión bidireccional de audio.
 * 
 * Compatible con la API de useSavaraLive para drop-in replacement.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { SavaraLiveSDK, type SavaraLiveConfig } from '../services/savaraLiveSDK';

interface UseSavaraSDKProps {
    onItemAdded?: (item: any) => void;
    onHangUp?: () => void;
    userName?: string | null;
    machineId?: string;
}

interface UseSavaraSDKReturn {
    connect: (initialPrompt?: string) => Promise<void>;
    disconnect: () => void;
    isConnected: boolean;
    isConnecting: boolean;
    error: { code: string; message: string } | null;
    latency: number;
    isLowLatency: boolean;
}

export const useSavaraSDK = ({ onItemAdded, onHangUp, userName, machineId }: UseSavaraSDKProps = {}): UseSavaraSDKReturn => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<{ code: string; message: string } | null>(null);

    // Refs to persist across Strict Mode re-mounts
    const clientRef = useRef<SavaraLiveSDK | null>(null);
    const mountedRef = useRef(true);
    const intentionalDisconnect = useRef(false);

    // Store actions
    const addItem = useAppStore((state) => state.addItem);
    const removeItem = useAppStore((state) => state.removeItem);
    const items = useAppStore((state) => state.items);

    const connect = useCallback(async (initialPrompt?: string) => {
        // Reset intentional disconnect flag
        intentionalDisconnect.current = false;

        if (clientRef.current?.getConnectionStatus()) {
            console.log('Ya conectado, ignorando...');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const config: SavaraLiveConfig = {
                userName,
                systemContext: initialPrompt,
                onConnected: () => {
                    if (mountedRef.current) {
                        setIsConnected(true);
                        setIsConnecting(false);
                        console.log('✅ Savara SDK conectada y lista');
                    }
                },
                onDisconnected: () => {
                    if (mountedRef.current) {
                        setIsConnected(false);
                        setIsConnecting(false);
                        onHangUp?.();
                    }
                },
                onError: (err) => {
                    if (mountedRef.current) {
                        setError({
                            code: err.code || 'CONNECTION_ERROR',
                            message: err.message || 'Error de conexión'
                        });
                        setIsConnecting(false);
                    }
                },
                onItemAdded: (item) => {
                    addItem(item);
                    onItemAdded?.(item);
                },
                onItemRemoved: (name) => {
                    const itemToRemove = items.find(i => i.name.toLowerCase() === name.toLowerCase());
                    if (itemToRemove) {
                        removeItem(itemToRemove.id);
                    }
                }
            };

            clientRef.current = new SavaraLiveSDK(config);
            await clientRef.current.connect();

        } catch (err: any) {
            console.error('Error en useSavaraSDK.connect:', err);
            if (mountedRef.current) {
                setError({
                    code: err.code || 'UNKNOWN_ERROR',
                    message: err.message || 'Error desconocido'
                });
                setIsConnecting(false);
            }
        }
    }, [userName, addItem, removeItem, items, onItemAdded, onHangUp]);

    const disconnect = useCallback(() => {
        intentionalDisconnect.current = true;
        if (clientRef.current) {
            clientRef.current.disconnect();
            clientRef.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
    }, []);

    // Track mount status - NO cleanup of connection on unmount in dev mode
    // This prevents React Strict Mode from killing the connection
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            // Only disconnect if it was intentional or we're truly unmounting in production
            // In Strict Mode, the component will remount immediately, so we skip cleanup
            if (intentionalDisconnect.current && clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
            }
        };
    }, []);

    return {
        connect,
        disconnect,
        isConnected,
        isConnecting,
        error,
        // Compatibility fields - SDK doesn't track latency
        latency: 0,
        isLowLatency: true
    };
};

// Re-export as useSavaraLive for backward compatibility
export { useSavaraSDK as useSavaraLive };
