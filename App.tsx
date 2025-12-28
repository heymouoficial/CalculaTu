import React, { useEffect, useState } from 'react';
import { Portality } from './components/Portality';
import { ViewState } from './types';
import { useAppStore } from './store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { fetchGlobalRates, forceRefreshRates } from './services/ratesService';

import { supabase } from './services/supabaseClient';
import { autoActivateTrial, activateChristmasPromo } from './utils/license';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  ChevronRight,
  Mic,
  MessageSquare,
  Settings,
  ShieldCheck,
  Smartphone,
  Zap,
  CloudOff,
  Lock,
  Twitter,
  Instagram,
  Facebook,
  Star,
  Download,
  ArrowRight,
  BrainCircuit,
  Clock,
  WifiOff,
  Leaf,
  BadgeCheck,
  Sparkles
} from 'lucide-react';
import { CalculatorView } from './components/CalculatorView';
import { Logo } from './components/Logo';
import { DemoCard } from './components/DemoCard';
import { ChatWidget } from './components/ChatWidget';
import { InstallBanner } from './components/InstallBanner';
import { PromotionBanner } from './components/PromotionBanner';
import {
  Linkedin,
  MessageCircle,
  Hash // Using Hash as a proxy for Threads if distinct one not available
} from 'lucide-react';

// FAQ Data
const FAQS = [
  {
    question: "¿Savara funciona sin internet?",
    answer: "El Modo Bunker (Cálculo manual) funciona 100% offline, ideal para supermercados sin señal. Para usar la voz de Savara AI, necesitas una conexión mínima de datos, pero está optimizada para consumir muy poco."
  },
  {
    question: "¿Cómo pago en Bolívares?",
    answer: "Aceptamos Pago Móvil (Banesco) y Binance Pay. Al seleccionar un plan, Savara te abrirá un chat para darte los datos y validar tu pago manualmente con nuestro equipo."
  },
  {
    question: "¿La tasa de cambio es real?",
    answer: "Sí. Nos sincronizamos diariamente con la tasa oficial del BCV. No usamos tasas paralelas ni promedios extraños. Tu dinero rinde lo justo."
  },
  {
    question: "¿Tengo que pagar mensualidades?",
    answer: "Solo si eliges el plan Mensual. Si aprovechas la oferta Lifetime, pagas una sola vez y tienes acceso a Savara Pro de por vida, incluyendo futuras actualizaciones."
  }
];

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; pain: string; solution: string }> = ({ icon, title, pain, solution }) => (
  <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <div className="space-y-2">
      <p className="text-sm text-red-300/80 flex items-start gap-2">
        <AlertCircle size={14} className="mt-0.5 shrink-0" /> <span className="italic">"{pain}"</span>
      </p>
      <p className="text-sm text-emerald-300 flex items-start gap-2 font-medium">
        <Check size={14} className="mt-0.5 shrink-0" /> {solution}
      </p>
    </div>
  </div>
);

const FaqItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({ question, answer, isOpen, onClick }) => (
  <div className="border-b border-white/5 last:border-0">
    <button onClick={onClick} className="w-full py-5 flex items-center justify-between text-left hover:text-emerald-400 transition-colors">
      <span className="font-medium text-lg">{question}</span>
      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
      <p className="text-gray-400 leading-relaxed">{answer}</p>
    </div>
  </div>
);

const App: React.FC = () => {
  // PERSISTENCIA DE ESTADO: Recordar dónde quedó el usuario
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/portal')) {
        return 'portal';
      }
      const savedView = localStorage.getItem('savara_last_view');
      return (savedView === 'calculator') ? 'calculator' : 'landing';
    }
    return 'landing';
  });

  const [showEuro, setShowEuro] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [chatTrigger, setChatTrigger] = useState<{ open: boolean; message?: string }>({ open: false });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const { rates, setBaseRates, machineId, setUserName } = useAppStore(useShallow(s => ({
    rates: s.rates,
    setBaseRates: s.setBaseRates,
    machineId: s.machineId,
    setUserName: s.setUserName
  })));

  // Sync User Profile (Identity)
  useEffect(() => {
    const syncProfile = async () => {
      if (!machineId || machineId === 'M-LOADING...' || !supabase) return;

      // Auto-activate trial if first launch
      await autoActivateTrial(machineId);

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('machine_id', machineId)
        .maybeSingle();

      if (data?.full_name) {
        console.log("👤 Profile synced:", data.full_name);
        setUserName(data.full_name);
      }
    };

    syncProfile();
  }, [machineId, setUserName]);

  // Efecto para guardar la preferencia cada vez que cambia la vista
  useEffect(() => {
    if (currentView !== 'portal') {
      localStorage.setItem('savara_last_view', currentView);
    }
  }, [currentView]);

  useEffect(() => {
    const date = new Date();
    const formatted = date.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });
    setCurrentDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  // Load global rates from Supabase (public read). If user has a 24h override, it stays.
  useEffect(() => {
    fetchGlobalRates()
      .then((r) => {
        if (r) setBaseRates({ USD: r.USD, EUR: r.EUR, prevUSD: r.prevUSD, prevEUR: r.prevEUR });
      })
      .catch(() => { });
  }, []);

  const handleRefreshRates = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      const r = await forceRefreshRates();
      if (r) setBaseRates({ USD: r.USD, EUR: r.EUR, prevUSD: r.prevUSD, prevEUR: r.prevEUR });
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const toggleCurrency = () => setShowEuro(!showEuro);

  const handleActivateChristmas = async () => {
    if (!machineId) return;
    await activateChristmasPromo(machineId);
    setCurrentView('calculator');
    // Force voice mode activation in CalculatorView if needed
    localStorage.setItem('savara_voice_mode', 'true');
  };

  const renderDelta = (current: number, prev?: number) => {
    if (!prev || current === prev) return null;
    const isUp = current > prev;
    return (
      <span className={`flex items-center text-[10px] ml-1 ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
        {isUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </span>
    );
  };

  const handlePlanClick = (planName: string) => {
    setChatTrigger({
      open: true,
      message: `¡Hola Savara! 👋 Estoy interesado en activar el plan **${planName}**. ¿Me ayudas con los métodos de pago?`
    });
  };

  if (currentView === 'calculator') return <CalculatorView onBack={() => setCurrentView('landing')} />;
  if (currentView === 'portal') return <Portality />;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <PromotionBanner onActivate={handleActivateChristmas} />

      {/* NAVBAR */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <nav className="sticky top-0 w-full z-40 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div className="flex flex-col"><span className="font-bold text-lg leading-none tracking-tight">CalculaTú</span><span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{currentDate}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCurrency}
              className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-1.5 border border-white/5 transition-all active:scale-95"
            >
              <div className="text-right">
                <div className="text-[10px] text-gray-400 font-medium uppercase">Tasa BCV</div>
                <div className="text-sm font-mono font-bold text-emerald-400 flex items-center justify-end">
                  {showEuro ? `€ ${rates.EUR}` : `$ ${rates.USD}`}
                  {showEuro ? renderDelta(rates.EUR, rates.prevEUR) : renderDelta(rates.USD, rates.prevUSD)}
                </div>
              </div>
              <div
                onClick={handleRefreshRates}
                className={`w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCcw size={14} />
              </div>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative pt-24 px-4 pb-20 max-w-6xl mx-auto">

        {/* HERO SECTION */}
        <section className="flex flex-col md:flex-row items-center gap-12 md:gap-20 mb-32">
          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2 animate-pulse"><Star size={14} className="fill-current" /><span>Lo nuevo de Multiversa</span></div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">Mercado sin <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">Estrés.</span></h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-lg mx-auto md:mx-0 leading-relaxed">Tu <strong>Asistente de Mercado</strong> personal. Deja de pelear con la calculadora y empieza a usar tu voz con <span className="text-purple-400 font-semibold">Savara AI</span>.</p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
              <button onClick={() => setCurrentView('calculator')} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2">Comenzar Gratis <Download size={20} /></button>
              <button onClick={() => handlePlanClick('Lifetime')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2">Hablar con Savara <ArrowRight size={20} /></button>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md"><DemoCard /></div>
        </section>

        {/* FEATURES: DOLOR vs SOLUCION */}
        <section className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Te suena familiar?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Hacer mercado en Venezuela es un deporte extremo. Nosotros te damos el equipo adecuado.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<BrainCircuit size={24} />}
              title="Cero Matemáticas"
              pain="Odio sacar la cuenta de $3.50 x 36.5 y luego sumarle el IVA..."
              solution="CalculaTú convierte todo a Bs automáticamente a tasa oficial."
            />
            <FeatureCard
              icon={<Clock size={24} />}
              title="Manos Libres"
              pain="Es incómodo escribir en el celular mientras empujo el carrito."
              solution="Solo dile a Savara: 'Agrega harina y queso' y listo."
            />
            <FeatureCard
              icon={<WifiOff size={24} />}
              title="Modo Bunker"
              pain="En el supermercado nunca tengo señal de datos."
              solution="Nuestra tecnología funciona perfecto sin internet."
            />
            <FeatureCard
              icon={<Leaf size={24} />}
              title="100% Ecológico"
              pain="Esos papelitos térmicos se borran y contaminan."
              solution="Tickets digitales. Cuidamos tu bolsillo y el planeta."
            />
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes Transparentes</h2>
            <p className="text-gray-400">Sin letras chiquitas. Elige cómo quieres ahorrar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">

            {/* FREE TIER */}
            <div className="p-8 rounded-3xl bg-[#0a0a0a]/60 border border-white/5 flex flex-col h-[420px]">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-400 mb-2">Básico</h3>
                <div className="text-4xl font-bold text-white">Gratis</div>
                <p className="text-xs text-gray-500 mt-2">Para compras rápidas</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><BadgeCheck size={18} className="text-gray-600" /> Calculadora Manual</li>
                <li className="flex items-center gap-3 text-gray-300"><BadgeCheck size={18} className="text-gray-600" /> Tasa BCV al día</li>
                <li className="flex items-center gap-3 text-gray-300"><BadgeCheck size={18} className="text-gray-600" /> Sin límites de uso</li>
              </ul>
              <button onClick={() => setCurrentView('calculator')} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all">Usar Ahora</button>
            </div>

            {/* MONTHLY TIER */}
            <div className="p-8 rounded-3xl bg-[#111] border border-white/10 flex flex-col h-[460px] relative">
              <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl uppercase tracking-wider">
                Hasta 01 Ene
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Pro Mensual</h3>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">$1</span>
                    <span className="text-lg text-gray-500 line-through decoration-red-500/50">$3</span>
                    <span className="text-sm text-gray-500">/mes</span>
                  </div>
                  <span className="text-sm font-mono text-emerald-500 mt-1">
                    ≈ Bs {(1 * rates.USD).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Facturado mensualmente</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-white"><BadgeCheck size={18} className="text-emerald-500" /> <strong>Todo lo Gratis</strong></li>
                <li className="flex items-center gap-3 text-white"><BadgeCheck size={18} className="text-emerald-500" /> <strong>30 Minutos</strong> de Voz</li>
                <li className="flex items-center gap-3 text-white"><BadgeCheck size={18} className="text-emerald-500" /> Historial de Compras</li>
              </ul>
              <button onClick={() => handlePlanClick('Mensual $1')} className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-all">Suscribirse</button>
            </div>

            {/* LIFETIME TIER (BEST VALUE) */}
            <div className="relative h-[500px]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 w-full px-4">
                <div className="bg-gradient-to-r from-[#10b981] via-[#3b82f6] to-[#8b5cf6] py-1.5 rounded-t-xl flex items-center justify-center gap-2 shadow-lg">
                  <Sparkles size={12} className="text-white fill-current" />
                  <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">OFERTA HASTA 31 ENE</span>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 to-purple-600 rounded-3xl opacity-20 blur-xl"></div>
              <div className="relative h-full p-1 rounded-3xl bg-gradient-to-b from-emerald-500 to-purple-600">
                <div className="bg-[#0a0a0a] rounded-[22px] p-8 h-full flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-purple-400 mb-2">Lifetime Pro</h3>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-white tracking-tight">$10</span>
                        <span className="text-lg text-gray-500 line-through decoration-red-500/50">$20</span>
                      </div>
                      <span className="text-sm font-mono text-emerald-200 mt-1">
                        ≈ Bs {(10 * rates.USD).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400 font-bold mt-2 uppercase tracking-wide">Pago Único - De por vida</p>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-center gap-3 text-white"><BadgeCheck size={18} className="text-purple-400" /> <strong>Todo lo Pro Mensual</strong></li>
                    <li className="flex items-center gap-3 text-white"><BadgeCheck size={18} className="text-purple-400" /> <strong>60 Minutos</strong> de Voz</li>
                    <li className="flex items-center gap-3 text-white"><BadgeCheck size={18} className="text-purple-400" /> Sin mensualidades jamás</li>
                    <li className="flex items-center gap-3 text-white"><ShieldCheck size={18} className="text-purple-400" /> Soporte Prioritario</li>
                  </ul>
                  <button onClick={() => handlePlanClick('Lifetime $10')} className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:to-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95">
                    Obtener Acceso Vitalicio
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="max-w-3xl mx-auto mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Preguntas Frecuentes</h2>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8">
            {FAQS.map((faq, idx) => (
              <FaqItem
                key={idx}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaqIndex === idx}
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
              />
            ))}
          </div>
        </section>

        <footer className="text-center border-t border-white/5 pt-12 pb-10">
          <div className="flex items-center justify-center gap-6 mb-8">
            <a href="https://tiktok.com/@mou_multiversa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="TikTok">
              <span className="text-xs font-black uppercase tracking-tighter">TikTok</span>
            </a>
            <a href="https://instagram.com/mou_multiversa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-instagram transition-colors" title="Instagram">
              <Instagram size={20} />
            </a>
            <a href="https://threads.net/@mou_multiversa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="Threads">
              <MessageCircle size={20} />
            </a>
            <a href="https://facebook.com/mou_multiversa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors" title="Facebook">
              <Facebook size={20} />
            </a>
            <a href="https://linkedin.com/in/moumultiversa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors" title="LinkedIn">
              <Linkedin size={20} />
            </a>
            <a href="https://x.com/moumultiversa" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="X (Twitter)">
              <Twitter size={20} />
            </a>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <Logo size={20} />
            <span className="font-semibold">CalculaTú</span>
          </div>
          <p className="text-gray-600 text-sm italic">© 2025-2026 MultiversaGroup. Hecho con ❤️ en Venezuela.</p>
        </footer>
      </main>
      <ChatWidget defaultOpen={chatTrigger.open} initialMessage={chatTrigger.message} onClose={() => setChatTrigger({ open: false })} />
      <InstallBanner />
    </div>
  );
};
export default App;