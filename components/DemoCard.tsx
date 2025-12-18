import React, { useState, useMemo } from 'react';
import { ShoppingCart, Mic, Calculator, ArrowRight, CheckCircle2 } from 'lucide-react';
import { RATES, DEMO_ITEMS, SAVARA_AVATAR } from '../constants';

export const DemoCard: React.FC = () => {
  const [isSavaraMode, setIsSavaraMode] = useState(false);

  const totalUsd = useMemo(() => DEMO_ITEMS.reduce((acc, item) => acc + item.priceUsd, 0), []);
  const totalBs = useMemo(() => totalUsd * RATES.USD, [totalUsd]);

  return (
    <div className="relative w-full max-w-sm mx-auto perspective-1000">
      {/* Liquid Glass Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-500 hover:shadow-[0_0_50px_rgba(16,185,129,0.2)]">
        
        {/* Toggle Switch */}
        <div className="flex p-2 m-4 rounded-xl bg-white/5 border border-white/5 relative">
          <div 
            className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-emerald-500 rounded-lg transition-all duration-300 ${isSavaraMode ? 'left-[calc(50%+4px)]' : 'left-2'}`}
          />
          <button 
            onClick={() => setIsSavaraMode(false)}
            className={`flex-1 relative z-10 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${!isSavaraMode ? 'text-black' : 'text-gray-400'}`}
          >
            <Calculator size={16} /> Manual
          </button>
          <button 
            onClick={() => setIsSavaraMode(true)}
            className={`flex-1 relative z-10 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isSavaraMode ? 'text-black' : 'text-gray-400'}`}
          >
            <Mic size={16} /> Savara AI
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 pt-0 min-h-[320px] flex flex-col">
          
          {!isSavaraMode ? (
            // Manual Mode Content
            <div className="animate-fade-in flex flex-col h-full">
              <div className="space-y-4 mb-6 flex-grow">
                {DEMO_ITEMS.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-gray-300">{item.name}</span>
                    <span className="font-mono text-emerald-400">${item.priceUsd.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total a Pagar</p>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-emerald-400">Bs</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">${totalUsd.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Savara AI Mode Content
            <div className="animate-fade-in flex flex-col h-full items-center justify-center text-center">
              
              {/* Savara Avatar */}
              <div className="mb-6 relative">
                 <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    <img src={SAVARA_AVATAR} alt="Savara" className="w-full h-full object-cover" />
                 </div>
                 <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 border-4 border-[#0a0a0a]">
                    <Mic size={12} className="text-black" />
                 </div>
              </div>

              <div className="flex gap-1 h-8 items-center justify-center mb-6">
                <div className="w-1 bg-emerald-400 rounded-full voice-bar"></div>
                <div className="w-1 bg-emerald-400 rounded-full voice-bar"></div>
                <div className="w-1 bg-emerald-400 rounded-full voice-bar"></div>
                <div className="w-1 bg-emerald-400 rounded-full voice-bar"></div>
                <div className="w-1 bg-emerald-400 rounded-full voice-bar"></div>
              </div>
              
              <p className="text-lg text-white font-medium mb-2">"Savara, agrega harina PAN..."</p>
              <p className="text-xs text-emerald-400/80 uppercase tracking-widest font-semibold">Procesando Voz</p>

              <div className="mt-8 w-full">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <span className="text-sm text-emerald-100">Item agregado al carrito</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Floating Action */}
        <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-[#0a0a0a] to-transparent">
           <button className="w-full bg-white text-black font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2">
             {isSavaraMode ? 'Probar Demo' : 'Calcular Total'} <ArrowRight size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};