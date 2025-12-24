import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

export const PromotionBanner: React.FC = () => {
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
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-3 px-4 relative z-[100] animate-fade-in shadow-lg">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                        <Sparkles size={16} className="text-emerald-100" />
                    </div>
                    <p className="text-sm font-bold tracking-tight">
                        🎁 REGALO DE NAVIDAD: <span className="text-emerald-50">24 HORAS DE SAVARA PRO GRATIS</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden sm:block opacity-40">|</span>
                    <p className="text-xs font-medium opacity-90 hidden lg:block">
                        Prueba la asistente de voz inteligente hoy mismo sin costo.
                    </p>
                    <button
                        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                        className="group flex items-center gap-1.5 bg-black/20 hover:bg-black/30 transition-colors px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10"
                    >
                        Activar Ahora <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
            <button
                onClick={handleClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
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
