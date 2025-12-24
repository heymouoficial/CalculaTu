import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Mic, Copy, Check, CreditCard, Smartphone, MessageCircle, Info, Zap, HelpCircle, BarChart3 } from 'lucide-react';
import { Message } from '../types';
import { SAVARA_AVATAR } from '../constants';
import { useAppStore } from '../store/useAppStore';

// SVG Logos for Branding
const BinanceLogo = () => (
  <svg viewBox="0 0 32 32" className="w-full h-full text-[#F0B90B] fill-current">
    <path d="M16 0l6 6-6 6-6-6 6-6zm0 12l-6 6 6 6 6-6-6-6zm10.5-1.5l-4.5 4.5 4.5 4.5 4.5-4.5-4.5-4.5zm-21 0l-4.5 4.5 4.5 4.5 4.5-4.5-4.5-4.5zm10.5 13.5l6 6-6 6-6-6 6-6z" />
  </svg>
);

const BanescoLogo = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full text-white fill-current">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
);

const PAYMENT_DATA = {
  binance: {
    title: "Binance PAY",
    id: "53820365",
    label: "BINANCE ID",
    color: "#F0B90B",
    bg: "bg-[#1E2026]",
    accent: "text-[#F0B90B]",
    border: "border-[#F0B90B]/30"
  },
  pagoMovil: {
    title: "Pago Móvil",
    bank: "0134 - Banesco",
    id: "V16619748",
    phone: "0412 532 2257",
    color: "#207e5c",
    bg: "bg-[#004d38]", // Darker Banesco green for background
    accent: "text-white",
    border: "border-[#207e5c]/50"
  }
};

const WHATSAPP_NUMBER = "584142949498";

const QUICK_ACTIONS = [
  { label: "¿Qué es CalculaTú? 📱", query: "Cuéntame qué es CalculaTú y por qué es mejor que una calculadora común.", icon: <Info size={14} /> },
  { label: "¿Cómo funciona? 🤔", query: "¿Cómo funciona el proceso de suma y conversión en la app?", icon: <HelpCircle size={14} /> },
  { label: "Características ⚡", query: "¿Cuáles son las características principales (Voz, Offline, etc)?", icon: <Zap size={14} /> },
  { label: "Planes de Pago 💎", query: "¿Qué planes tienen y cuánto cuesta el acceso Pro?", icon: <Sparkles size={14} /> },
  { label: "Métodos de Pago 💳", query: "¿Cómo puedo pagar mi cuenta Pro? (Binance/Pago Móvil)", icon: <CreditCard size={14} /> },
  { label: "Tasa USD/EUR 📈", query: "¿De dónde sacan la tasa de cambio para los cálculos?", icon: <BarChart3 size={14} /> }
];

const CopyButton: React.FC<{ text: string; label?: string; dark?: boolean }> = ({ text, label, dark }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all group ${dark
        ? 'bg-black/40 border-white/10 hover:bg-black/60'
        : 'bg-white/10 border-white/20 hover:bg-white/20'
        }`}
    >
      <div className="flex flex-col items-start text-left">
        {label && <span className="text-[9px] opacity-70 font-black uppercase tracking-widest mb-0.5">{label}</span>}
        <span className="text-sm font-mono font-bold tracking-tight">{text}</span>
      </div>
      <div className="p-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </div>
    </button>
  );
};

const PaymentCard: React.FC<{ type: 'binance' | 'pagoMovil' }> = ({ type }) => {
  const isBinance = type === 'binance';
  const data = isBinance ? PAYMENT_DATA.binance : PAYMENT_DATA.pagoMovil;

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Hola Multiversa 👋. Deseo activar mi cuenta Pro para ahorrar con Savara. Ya realicé el pago vía ${data.title}.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`);
  };

  return (
    <div className={`my-6 rounded-[1.5rem] overflow-hidden shadow-2xl ${data.bg} border ${data.border}`}>
      {/* Header Card */}
      <div className="p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBinance ? 'bg-black/40' : 'bg-white/20'}`}>
              {isBinance ? <div className="w-6 h-6"><BinanceLogo /></div> : <div className="w-6 h-6"><BanescoLogo /></div>}
            </div>
            <div>
              <h4 className={`font-black text-sm tracking-wide ${data.accent}`}>{data.title}</h4>
              <p className={`text-[10px] opacity-80 ${data.accent}`}>Cuenta Oficial</p>
            </div>
          </div>
          {isBinance && <div className="text-[#F0B90B]"><Sparkles size={16} fill="currentColor" /></div>}
        </div>

        <div className={`space-y-3 ${isBinance ? 'text-[#F0B90B]' : 'text-white'}`}>
          {isBinance ? (
            <CopyButton text={data.id} label="Binance ID" dark />
          ) : (
            <>
              <CopyButton text={(data as any).phone} label="Teléfono" />
              <CopyButton text={(data as any).id} label="Cédula" />
              <div className="px-1 text-[10px] opacity-60 text-center font-mono uppercase mt-1">
                {(data as any).bank}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-black/20 border-t border-white/5">
        <button
          onClick={handleWhatsApp}
          className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${isBinance
            ? 'bg-[#F0B90B] text-black hover:bg-[#ffe252]'
            : 'bg-white text-[#207e5c] hover:bg-gray-100'
            }`}
        >
          <MessageCircle size={16} strokeWidth={2.5} /> Reportar Pago
        </button>
      </div>
    </div>
  );
};

const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const paragraphs = text.split('\n');
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, pIndex) => {
        if (!paragraph.trim()) return null;
        return <p key={pIndex} className="text-gray-300 leading-relaxed">{parseBold(paragraph)}</p>;
      })}
    </div>
  );
};

const parseBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    return part;
  });
};

const MessageContent: React.FC<{ text: string }> = ({ text }) => {
  if (text.includes('[[BINANCE]]')) {
    const parts = text.split('[[BINANCE]]');
    return (<div><MarkdownText text={parts[0]} /><PaymentCard type="binance" /><MarkdownText text={parts[1]} /></div>);
  }
  if (text.includes('[[PAGO_MOVIL]]')) {
    const parts = text.split('[[PAGO_MOVIL]]');
    return (<div><MarkdownText text={parts[0]} /><PaymentCard type="pagoMovil" /><MarkdownText text={parts[1]} /></div>);
  }
  return <MarkdownText text={text} />;
};

export const ChatWidget: React.FC<{ defaultOpen?: boolean; initialMessage?: string; onClose?: () => void }> = ({ defaultOpen = false, initialMessage, onClose }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'model', text: '¡Hola! Soy **Savara AI** 🎙️. Tu compañera experta de **CalculaTú**. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const rates = useAppStore(state => state.rates);

  useEffect(() => {
    if (defaultOpen && !isOpen) setIsOpen(true);
  }, [defaultOpen]);

  useEffect(() => {
    if (isOpen && initialMessage && messages.length === 1) {
      handleSend(initialMessage);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemContext = `DATOS EN TIEMPO REAL: Tasa USD: Bs ${rates.USD.toFixed(2)}, Tasa EUR: Bs ${rates.EUR.toFixed(2)}.`;
      
      // Construct history from previous messages
      // Filter out messages that might be purely UI logic if needed, but here we take all valid chat turns.
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: textToSend, systemContext, history }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: data.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', text: 'Ups, perdona. ¿Podemos intentarlo de nuevo?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop for closing on mobile tap outside */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in lg:bg-transparent lg:backdrop-blur-none"
          onClick={handleClose}
        />
      )}

      <div className={`fixed bottom-6 right-6 z-[110] flex flex-col items-end`}>
        {isOpen && (
          <div className="mb-4 w-[400px] max-w-[92vw] h-[min(640px,85vh)] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-fade-in-up">

            {/* Header with Savara Avatar */}
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20 border-2 border-[#10b981]">
                    <img src={SAVARA_AVATAR} alt="Savara" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#10b981] border-2 border-[#0a0a0a] rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-black text-white text-lg leading-none tracking-tight">Savara AI</h3>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1 opacity-80">En línea ahora</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex overflow-x-auto p-4 gap-2 border-b border-white/5 bg-white/[0.01] scrollbar-hide">
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(action.query)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] rounded-[2rem] p-5 text-sm shadow-sm ${msg.role === 'user'
                    ? 'bg-[#10b981] text-black font-semibold rounded-tr-none'
                    : 'bg-[#1a1a1a] text-gray-200 rounded-tl-none border border-white/5'
                    }`}>
                    <MessageContent text={msg.text} />
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-[#1a1a1a] rounded-[2rem] rounded-tl-none p-5 border border-white/5 flex items-center gap-4">
                    <div className="flex gap-1.5 items-end h-3">
                      <span className="w-1.5 bg-[#10b981]/60 rounded-full animate-typing-1"></span>
                      <span className="w-1.5 bg-[#10b981]/60 rounded-full animate-typing-2"></span>
                      <span className="w-1.5 bg-[#10b981]/60 rounded-full animate-typing-3"></span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Savara escribiendo...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/40 border-t border-white/5">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu duda aquí..."
                  className="w-full bg-[#111] border border-white/10 rounded-2xl pl-6 pr-14 py-4 text-sm text-white focus:outline-none focus:border-emerald-500/30 transition-all placeholder:text-gray-600"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2.5 bg-[#10b981] rounded-xl text-black shadow-lg disabled:opacity-20 transition-all active:scale-90"
                >
                  <Send size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Launcher Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-2xl bg-[#10b981] text-black shadow-[0_15px_45px_rgba(16,185,129,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group overflow-hidden"
          >
            <MessageCircle size={28} strokeWidth={2.5} />
          </button>
        )}

        <style>{`
          @keyframes typing {
            0%, 100% { height: 6px; }
            50% { height: 14px; }
          }
          .animate-typing-1 { animation: typing 0.6s infinite alternate ease-in-out; }
          .animate-typing-2 { animation: typing 0.6s infinite alternate 0.2s ease-in-out; }
          .animate-typing-3 { animation: typing 0.6s infinite alternate 0.4s ease-in-out; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>
      </div>
    </>
  );
};