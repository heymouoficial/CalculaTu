import React from 'react';

interface StickyPricingHeaderProps {
  totalBs: number;
  totalUsd: number;
  rateUsd: number;
}

export const StickyPricingHeader: React.FC<StickyPricingHeaderProps> = ({ totalBs, totalUsd, rateUsd }) => {
  return (
    <div className="sticky top-0 z-40 w-full backdrop-blur-md bg-black/60 border-b border-white/5 pt-8 pb-4 px-6 flex flex-col items-center justify-center animate-fade-in shadow-2xl">
      <div className="flex flex-col items-center">
        {/* Massive BS Total - Mobile First Typography */}
        <div className="flex items-baseline gap-2">
          <span className="text-5xl md:text-6xl font-black tracking-tighter text-white font-mono leading-none drop-shadow-lg">
            {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xl font-bold text-emerald-500">Bs</span>
        </div>
        
        {/* Secondary USD Total */}
        <div className="flex items-center gap-2 mt-1 opacity-80">
           <span className="text-lg font-bold text-gray-400 font-mono">
             $ {totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </span>
           <div className="h-3 w-px bg-white/20"></div>
           <span className="text-[10px] text-emerald-500/80 font-mono">
             Rate: {rateUsd.toFixed(2)}
           </span>
        </div>
      </div>
    </div>
  );
};
