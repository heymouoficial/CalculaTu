import React, { useEffect, useState } from 'react';
import { Check, ShoppingBag, X } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'item' | 'error';
    icon?: React.ReactNode;
}

let toastId = 0;
const toastListeners: Set<(toast: Toast) => void> = new Set();

export function showToast(message: string, type: Toast['type'] = 'success', icon?: React.ReactNode) {
    const toast: Toast = { id: `toast-${toastId++}`, message, type, icon };
    toastListeners.forEach(listener => listener(toast));
}

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const listener = (toast: Toast) => {
            setToasts(prev => [...prev, toast]);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 3000);
        };

        toastListeners.add(listener);
        return () => { toastListeners.delete(listener); };
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 left-0 right-0 z-[300] flex flex-col items-center gap-2 pointer-events-none px-4">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-down pointer-events-auto max-w-sm ${toast.type === 'success'
                            ? 'bg-emerald-500 text-white'
                            : toast.type === 'item'
                                ? 'bg-white/95 text-black backdrop-blur-md border border-white/20'
                                : 'bg-red-500 text-white'
                        }`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-white/20' : toast.type === 'item' ? 'bg-emerald-500' : 'bg-white/20'
                        }`}>
                        {toast.icon || (toast.type === 'item' ? <ShoppingBag size={16} className="text-white" /> : <Check size={16} />)}
                    </div>
                    <span className="font-medium text-sm">{toast.message}</span>
                </div>
            ))}
            <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
        </div>
    );
};
