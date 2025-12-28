import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface PromotionBannerProps {
    onActivate?: () => void;
}

export const PromotionBanner: React.FC<PromotionBannerProps> = ({ onActivate }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has closed the banner before
        const isClosed = localStorage.getItem('savara_promo_closed');
        if (!isClosed) {
            setIsVisible(true);
        }
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('savara_promo_closed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="bg-gradient-to-r from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white py-3 px-4 relative z-[100] animate-fade-in border-b border-emerald-500/30 shadow-[0_4px_30px_rgba(16,185,129,0.15)]">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-amber-400/30 blur-lg rounded-full animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 rounded-lg shadow-lg">
                            <Sparkles size={16} className="text-black" />
                        </div>
                    </div>
                    <p className="text-sm font-bold tracking-tight">
                        🎟️ FREEPASS: <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">SAVARA PRO GRATIS HASTA EL 1 DE ENERO</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden sm:block opacity-20 text-emerald-500">|</span>
                    <p className="text-xs font-medium text-gray-400 hidden lg:block">
                        ¡Usa el Co-Piloto de Voz sin costo y danos tu feedback!
                    </p>
                    <button
                        onClick={() => {
                            onActivate?.();
                            setIsVisible(false);
                            localStorage.setItem('savara_promo_closed', 'true');
                        }}
                        className="relative group bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black px-5 py-2 rounded-full text-sm font-black uppercase tracking-wide flex items-center gap-2 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/30 active:scale-95"
                    >
                        <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        <span className="relative">ACTIVAR AHORA</span> <ArrowRight size={14} className="relative" />
                    </button>
                </div>
            </div>
            <button
                onClick={handleClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                aria-label="Cerrar anuncio"
            >
                <X size={16} />
            </button>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
        </div>
    );
};
