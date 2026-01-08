import React from 'react';
import { Sparkles, X, Rocket } from 'lucide-react';

interface ServiceUnavailableBannerProps {
    onClose: () => void;
    onActivate?: () => void;
    isOpen: boolean;
}

export const ServiceUnavailableBanner: React.FC<ServiceUnavailableBannerProps> = ({ onClose, onActivate, isOpen }) => {
    if (!isOpen) return null;

    const handleActivate = () => {
        if (onActivate) onActivate();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-[#111] border border-emerald-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] relative animate-slide-up overflow-hidden">

                {/* Glow Effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center gap-4 py-2">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-2 relative">
                        <Sparkles size={32} className="text-emerald-400 absolute top-4 left-4 animate-pulse" />
                        <Rocket size={40} className="text-emerald-500 relative z-10" />
                    </div>

                    <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">
                        Savara Pro <span className="text-emerald-500">Live</span>
                    </h3>

                    <div className="bg-emerald-500/10 rounded-xl px-4 py-2 border border-emerald-500/20">
                        <p className="text-emerald-400 font-bold text-sm tracking-wide italic">SAVARA PRO REQUERIDO</p>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed max-w-[260px]">
                        Activa Savara Pro para desbloquear el <strong>Co-Piloto de Voz</strong>, el <strong>Historial de Compras</strong> y tickets digitales.
                    </p>

                    <button
                        onClick={handleActivate}
                        className="w-full py-4 mt-4 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        ¡Activar Savara Pro Ahora!
                    </button>
                </div>
            </div>
        </div>
    );
};
