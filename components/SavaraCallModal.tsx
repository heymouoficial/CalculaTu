import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, ShoppingBag } from 'lucide-react';
import { SAVARA_AVATAR } from '../constants';

interface SavaraCallModalProps {
    isOpen: boolean;
    isListening: boolean;
    currentItems: { name: string; price: number; currency: string; quantity: number }[];
    currentTotals: { usd: number; bs: number; eur: number };
    rates: { USD: number; EUR: number };
    onHangUp: () => void;
    latency?: number;
    isLowLatency?: boolean;
    usageSeconds?: number;
}

export const SavaraCallModal: React.FC<SavaraCallModalProps> = ({
    isOpen,
    isListening,
    currentItems,
    currentTotals,
    rates,
    onHangUp,
    latency = 0,
    isLowLatency = true,
    usageSeconds = 0,
}) => {
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    
    // Promo Limit: 30 mins (1800s)
    const LIMIT_SECONDS = 1800;
    const remainingSeconds = Math.max(0, LIMIT_SECONDS - (usageSeconds + callDuration));
    const remainingMins = Math.floor(remainingSeconds / 60);

    // Call timer
    useEffect(() => {
        if (!isOpen) {
            setCallDuration(0);
            return;
        }

        const timer = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-gradient-to-b from-[#0a0a0a] to-[#1a1a2e] flex flex-col items-center justify-between py-12 px-6 animate-fade-in">
            {/* Status Bar */}
            <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Llamada en curso</span>
                </div>
                <span className="text-white/50 text-xs font-mono">{formatTime(callDuration)}</span>
                
                {/* Remaining Time Badge */}
                <div className={`mt-2 flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border animate-fade-in ${remainingMins < 5 ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    <span>⏱️ Quedan {remainingMins} min de voz</span>
                </div>
                
                {!isLowLatency && (
                  <div className="mt-2 flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-amber-500/30 animate-pulse">
                    <span>⚠️ Conexión Lenta ({latency}ms)</span>
                  </div>
                )}
            </div>

            {/* Avatar + Pulse */}
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    {/* Outer pulse rings */}
                    <div className="absolute inset-0 scale-150">
                        <div className={`absolute inset-0 rounded-full border-2 border-emerald-500/30 ${isListening ? 'animate-ping-slow' : ''}`} />
                    </div>
                    <div className="absolute inset-0 scale-125">
                        <div className={`absolute inset-0 rounded-full border border-emerald-500/20 ${isListening ? 'animate-ping-slower' : ''}`} />
                    </div>

                    {/* Avatar */}
                    <div className={`w-36 h-36 rounded-full overflow-hidden border-4 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)] ${isListening ? 'scale-105' : ''} transition-transform`}>
                        <img
                            src={SAVARA_AVATAR}
                            alt="Savara AI"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Listening indicator */}
                    {isListening && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Mic size={12} /> Escuchando...
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-black text-white mb-1">Savara AI</h2>
                    <p className="text-emerald-400 text-sm">Asistente de Compras</p>
                </div>

                {/* Live Context Display - Vertical Wrapper */}
                <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-6 w-full max-w-sm border border-white/10 shadow-2xl flex flex-col gap-4">
                    
                    {/* Main Total (BS) */}
                    <div className="flex flex-col items-center border-b border-white/5 pb-4">
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Total Estimado</span>
                        <div className="text-white font-mono text-3xl font-black tracking-tight">
                            Bs {currentTotals.bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Secondary Totals Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 rounded-xl p-3 flex flex-col items-center">
                            <span className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">En Dólares</span>
                            <span className="font-mono text-white font-bold text-lg">$ {currentTotals.usd.toFixed(2)}</span>
                        </div>
                        <div className="bg-black/20 rounded-xl p-3 flex flex-col items-center">
                            <span className="text-[9px] uppercase font-black text-white/40 tracking-widest mb-1">Productos</span>
                            <div className="flex items-center gap-2 text-white font-bold text-lg">
                                <ShoppingBag size={14} className="text-emerald-400" />
                                <span>{currentItems.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rates Footer */}
                    <div className="flex justify-center items-center gap-2 pt-1">
                         <span className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Tasa BCV:</span>
                         <span className="text-[10px] text-white/60 font-mono">Bs {rates.USD.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Call Controls */}
            <div className="flex items-center gap-6">
                {/* Mute Button */}
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted
                        ? 'bg-white/10 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                {/* Hang Up Button */}
                <button
                    onClick={onHangUp}
                    className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:bg-red-600 hover:scale-105 transition-all active:scale-95"
                >
                    <PhoneOff size={32} />
                </button>

                {/* Speaker (placeholder) */}
                <button className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all">
                    <Phone size={24} />
                </button>
            </div>

            <style>{`
        @keyframes ping-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes ping-slower {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.8); }
        }
        .animate-ping-slow { animation: ping-slow 2s ease-in-out infinite; }
        .animate-ping-slower { animation: ping-slower 2.5s ease-in-out infinite; }
      `}</style>
        </div>
    );
};
