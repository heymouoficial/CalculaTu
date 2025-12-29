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
    onDurationUpdate?: (durationSeconds: number) => void;
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
    onDurationUpdate,
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
            setCallDuration(prev => {
                const next = prev + 1;
                if (onDurationUpdate) onDurationUpdate(next);
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, onDurationUpdate]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-3xl flex flex-col items-center justify-between py-8 px-6 animate-fade-in h-[100dvh] overflow-hidden select-none">
            {/* Ambient Background Noise/Grain Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

            {/* Status Bar - Compact */}
            <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="tracking-wide">Llamada en curso</span>
                </div>
                <span className="text-white/50 text-xs font-mono">{formatTime(callDuration)}</span>

                {/* Remaining Time Badge */}
                <div className={`mt-2 flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border animate-fade-in ${remainingMins < 5 ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    <span>⏱️ Quedan {remainingMins} min de voz</span>
                </div>
            </div>

            {/* Avatar + Brand - Central Section */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4 w-full overflow-hidden">
                <div
                    onClick={() => setIsAvatarExpanded(true)}
                    className="relative cursor-pointer group active:scale-95 transition-transform"
                >
                    {/* Outer pulse rings */}
                    <div className="absolute inset-0 scale-150 pointer-events-none">
                        <div className={`absolute inset-0 rounded-full border-2 border-emerald-500/30 ${isListening ? 'animate-ping-slow' : ''}`} />
                    </div>

                    {/* Avatar */}
                    <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)] ${isListening ? 'scale-105' : ''} transition-all relative z-10`}>
                        <img
                            src={SAVARA_AVATAR}
                            alt="Savara AI"
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay"></div>
                    </div>

                    {/* Listening indicator */}
                    {isListening && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 z-20 shadow-lg">
                            <Mic size={10} strokeWidth={3} /> Escuchando
                        </div>
                    )}
                </div>

                <div className="text-center shrink-0">
                    <h2 className="text-2xl font-black text-white tracking-tight">Savara AI</h2>
                    <p className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest">Asistente de Compras</p>
                </div>

                {/* Live Context Display - Adaptive Card */}
                <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] p-6 w-full max-w-sm border border-white/10 shadow-2xl flex flex-col gap-4 shrink-0 mt-2">

                    {/* Main Total (BS) */}
                    <div className="flex flex-col items-center border-b border-white/5 pb-4">
                        <span className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Total Estimado</span>
                        <div className="text-white font-mono text-4xl font-black tracking-tighter">
                            Bs {currentTotals.bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Secondary Totals Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/30 rounded-3xl p-3 flex flex-col items-center border border-white/[0.05]">
                            <span className="text-[8px] uppercase font-black text-white/40 tracking-widest mb-1 items-center flex gap-1">
                                <span className="w-1 h-1 rounded-full bg-blue-500"></span> USD
                            </span>
                            <span className="font-mono text-white font-bold text-lg leading-none tracking-tight">$ {currentTotals.usd.toFixed(2)}</span>
                        </div>
                        <div className="bg-black/30 rounded-3xl p-3 flex flex-col items-center border border-white/[0.05]">
                            <span className="text-[8px] uppercase font-black text-white/40 tracking-widest mb-1 items-center flex gap-1">
                                <ShoppingBag size={8} className="text-emerald-400" /> PRODUCTOS
                            </span>
                            <div className="text-white font-bold text-lg leading-none tracking-tight">
                                <span>{currentItems.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rates Footer - More subtle */}
                    <div className="flex justify-center items-center gap-2 pt-1 opacity-40">
                        <span className="text-[8px] text-white uppercase font-black tracking-[0.2em]">Tasa BCV •</span>
                        <span className="text-[9px] text-white font-mono font-bold tracking-wider">Bs {rates.USD.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Call Controls - Compact */}
            <div className="flex items-center gap-6 shrink-0 pb-4">
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
                    className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(244,63,94,0.4)] hover:bg-rose-600 hover:scale-110 transition-all active:scale-95 animate-pulse-subtle"
                >
                    <PhoneOff size={32} />
                </button>

                {/* Speaker (placeholder) */}
                <button className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all">
                    <Phone size={24} />
                </button>
            </div>

            {/* EXPANDED AVATAR VIEW */}
            {isAvatarExpanded && (
                <div
                    className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-fade-in"
                    onClick={() => setIsAvatarExpanded(false)}
                >
                    <div className="relative max-w-lg w-full aspect-square">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
                        <div className="relative z-10 w-full h-full rounded-[3.5rem] overflow-hidden border-2 border-white/20 shadow-2xl animate-scale-up">
                            <img
                                src={SAVARA_AVATAR}
                                alt="Savara"
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-10">
                                <h3 className="text-3xl font-black text-white mb-1">Savara AI</h3>
                                <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-sm">Tu Asistente de IA</p>
                            </div>
                        </div>
                        {/* Close hint */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-white/40 text-xs font-black uppercase tracking-widest animate-bounce">
                            Toca para cerrar
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes ping-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0; transform: scale(1.5); }
                }
                @keyframes ping-slower {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0; transform: scale(1.8); }
                }
                @keyframes scale-up {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-ping-slow { animation: ping-slow 2s ease-in-out infinite; }
                .animate-ping-slower { animation: ping-slower 2.5s ease-in-out infinite; }
                .animate-scale-up { animation: scale-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-pulse-subtle { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            `}</style>
        </div>
    );
};
