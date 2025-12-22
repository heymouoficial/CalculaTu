import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Mic, Trash2, ArrowLeft, Plus, Settings, X, Check, RefreshCcw, ListFilter, DollarSign, Euro, Calculator, ChevronUp, ReceiptText, Share2, History, CreditCard, Fingerprint, Save, Copy, MessageCircle, Lock, Eye, Calendar, HelpCircle, AlertTriangle, Send, CircleDollarSign } from 'lucide-react';
import { RATES, SAVARA_AVATAR } from '../constants';
import { ShoppingItem } from '../types';
import { SavaraLiveClient } from '../services/geminiService';
import { saveHistoryEntry, getAllHistoryEntries, deleteHistoryEntry, HistoryEntry } from '../utils/historyDB';
import { useAppStore } from '../store/useAppStore';
import { generateDiagnosticReport, formatDiagnosticReport } from '../utils/diagnostics';
import { OnboardingFlow, useOnboarding } from './OnboardingFlow';
import { FeedbackButton } from './FeedbackForm';
import { BUILD_VERSION } from '../config';
import { Confetti } from './Confetti';
import { Logo } from './Logo';
import { WhatsAppIcon, BinanceIcon, BanescoIcon } from './BrandIcons';
import { showToast, ToastContainer } from './Toast';
import { SavaraCallModal } from './SavaraCallModal';

interface CalculatorViewProps {
  onBack: () => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({ onBack }) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);

  // Voucher Modal States
  const [showVoucher, setShowVoucher] = useState(false);
  const [viewingHistoryEntry, setViewingHistoryEntry] = useState<HistoryEntry | null>(null);

  // App States
  const [currentDateDisplay, setCurrentDateDisplay] = useState('');

  // Modes & License
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const license = useAppStore(s => s.license);
  const setLicense = useAppStore(s => s.setLicense);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Settings Drawer State
  const [activeTab, setActiveTab] = useState<'config' | 'history' | 'license' | 'support'>('config');
  const [supportIssueType, setSupportIssueType] = useState<string>('');
  const [supportMessage, setSupportMessage] = useState('');
  const budgetLimit = useAppStore(s => s.budgetLimit);
  const setBudgetLimit = useAppStore(s => s.setBudgetLimit);
  const rates = useAppStore(s => s.rates);
  const setRatesTemporarily = useAppStore(s => s.setRatesTemporarily);
  const clearTemporaryRates = useAppStore(s => s.clearTemporaryRates);
  const ratesOverrideExpiresAt = useAppStore(s => s.ratesOverrideExpiresAt);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const machineId = useAppStore(s => s.machineId);

  // Onboarding for first-time users
  const { showOnboarding, completeOnboarding } = useOnboarding();

  // Load history from IndexedDB on mount
  useEffect(() => {
    getAllHistoryEntries().then((entries) => {
      setHistory(entries);
    });
  }, []);
  const [activationToken, setActivationToken] = useState('');

  // Copy Feedback State
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Confetti State for license activation celebration
  const [showConfetti, setShowConfetti] = useState(false);

  // Manual Input State
  const [inputName, setInputName] = useState('');
  const [inputPrice, setInputPrice] = useState('');
  const [inputQuantity, setInputQuantity] = useState('');
  const [inputCurrency, setInputCurrency] = useState<'USD' | 'EUR' | 'VES'>('USD');

  const liveClientRef = useRef<SavaraLiveClient | null>(null);

  useEffect(() => {
    const date = new Date();
    const formatted = date.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });
    setCurrentDateDisplay(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  // Totals Calculation (Helper function to calculate from any list of items)
  const calculateTotals = (itemList: ShoppingItem[]) => {
    return itemList.reduce((acc, item) => {
      let usd = 0;
      if (item.currency === 'USD') usd = item.price * item.quantity;
      else if (item.currency === 'EUR') usd = (item.price * 1.08) * item.quantity;
      else if (item.currency === 'VES') usd = (item.price / rates.USD) * item.quantity;
      return {
        usd: acc.usd + usd,
        bs: acc.bs + (usd * rates.USD),
        eur: acc.eur + ((usd * rates.USD) / rates.EUR)
      };
    }, { usd: 0, bs: 0, eur: 0 });
  };

  const currentTotals = calculateTotals(items);

  // Handle Manual Add
  const handleAddItem = () => {
    if (!inputName.trim() || !inputPrice) return;
    const qty = inputQuantity ? parseFloat(inputQuantity) : 1;

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: inputName,
      price: parseFloat(inputPrice),
      currency: inputCurrency,
      quantity: qty > 0 ? qty : 1
    };
    setItems(prev => [newItem, ...prev]);

    // Reset inputs
    setInputName('');
    setInputPrice('');
    setInputQuantity('');
  };

  const handleFinish = () => {
    if (items.length > 0) {
      setViewingHistoryEntry(null); // Ensure we are viewing current items
      setShowVoucher(true);
    }
  };

  const handleCloseVoucher = async () => {
    // Only save if we are closing a NEW voucher, not viewing history
    if (!viewingHistoryEntry) {
      const date = new Date();
      const newEntry: Omit<HistoryEntry, 'createdAt'> = {
        id: Date.now().toString(),
        date: date.toLocaleDateString('es-VE'),
        time: date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        totalBs: currentTotals.bs,
        totalUsd: currentTotals.usd,
        totalEur: currentTotals.eur,
        itemCount: items.length,
        items: [...items] // Deep copy items
      };

      // Save to IndexedDB
      await saveHistoryEntry(newEntry);
      setHistory(prev => [newEntry, ...prev]);
      setItems([]); // Clear list after "saving"
    }

    setShowVoucher(false);
    setViewingHistoryEntry(null);
  };

  const validateToken = async () => {
    const token = activationToken.trim();
    if (!token) return;

    try {
      const resp = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceId: machineId }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.valid) {
        alert(data?.error || 'Token inválido o no corresponde a este dispositivo.');
        return;
      }

      const features = Array.isArray(data.features) ? data.features : ['voice'];

      setLicense({
        active: true,
        plan: data.plan,
        expiresAt: data.expiresAt ?? null,
        token,
        featureToken: {
          uic: machineId,
          features,
          expiresAt: data.expiresAt ?? null,
          token,
        },
      });

      // Show confetti celebration!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);

      // Use non-blocking toast instead of alert
      showToast('¡Licencia Activada! Savara desbloqueada.', 'success');
    } catch {
      showToast('No pude validar el token. Revisa tu conexión.', 'error');
    }
  };

  const handleCopyText = async (key: string, text: string) => {
    let success = false;

    // Method 1: Modern clipboard API (works on HTTPS)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch (e) {
      console.log('[Copy] Clipboard API failed, trying fallback...');
    }

    // Method 2: execCommand fallback (works on older browsers)
    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(textarea);

        // iOS requires specific handling
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(textarea);
        selection?.removeAllRanges();
        selection?.addRange(range);
        textarea.setSelectionRange(0, 999999);

        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.log('[Copy] execCommand failed:', e);
      }
    }

    // Method 3: Select the input element directly for manual copy
    if (!success && key === 'machineId') {
      const input = document.getElementById('machineId-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
        input.setSelectionRange(0, 999999);
        // Show hint to user
        alert('Texto seleccionado. Usa Copiar del menú o Ctrl+C / Cmd+C');
      }
    }

    setCopiedState(key);
    setTimeout(() => setCopiedState(null), 2500);
  };

  const cycleCurrency = () => {
    if (inputCurrency === 'USD') setInputCurrency('EUR');
    else if (inputCurrency === 'EUR') setInputCurrency('VES');
    else setInputCurrency('USD');
  };

  const getCurrencyDisplay = (curr: 'USD' | 'EUR' | 'VES') => {
    switch (curr) {
      case 'USD': return { symbol: '$', label: 'USD', color: 'text-blue-400' };
      case 'EUR': return { symbol: '€', label: 'EUR', color: 'text-purple-400' };
      case 'VES': return { symbol: 'Bs', label: 'VES', color: 'text-emerald-400' };
    }
  };

  const currDisplay = getCurrencyDisplay(inputCurrency);

  // Toggle Savara Logic
  const toggleSavara = async () => {
    // FASE 3: Validate Feature Token before initializing Savara
    if (!license.active || !license.featureToken) {
      alert('Savara requiere una licencia activa con feature "voice".');
      return;
    }

    if (!license.featureToken.features.includes('voice')) {
      alert('Tu licencia no incluye la feature "voice". Contacta soporte.');
      return;
    }

    if (isListening) {
      await liveClientRef.current?.disconnect();
      liveClientRef.current = null;
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        const client = new SavaraLiveClient({
          onToolCall: async (name: string, args: any) => {
            if (name === 'addItem') {
              const newItem: ShoppingItem = {
                id: Date.now().toString(),
                name: args.name,
                price: Number(args.price),
                currency: args.currency as any,
                quantity: Number(args.quantity) || 1
              };
              setItems(prev => [newItem, ...prev]);
              // Show toast notification for added item
              showToast(`Agregado ${args.name} x${args.quantity || 1} a $${args.price}`, 'item');
              return `Listo, añadí ${args.name}.`;
            }
            if (name === 'finishList') {
              handleFinish();
              return "He generado tu ticket de compra.";
            }
            return "Ok";
          },
          onClose: () => setIsListening(false)
        });
        await client.connect();
        liveClientRef.current = client;

        // Log initial state after connection
        console.log('[Savara] Connected, state:', client.getState());
      } catch (e) {
        console.error('[Savara] Connection error:', e);
        setIsListening(false);
        // Log state on error
        if (liveClientRef.current) {
          console.log('[Savara] Error state:', liveClientRef.current.getState());
        }
      }
    }
  };

  // WhatsApp Activation Handler
  const sendActivationMessage = () => {
    const text = `Hola Multiversa 👋. Deseo activar mi licencia Pro.\n\nMachine ID: ${machineId}\n\n(Adjunto captura de pago a continuación)`;
    window.open(`https://wa.me/584142949498?text=${encodeURIComponent(text)}`);
  };

  // Cleanup on unmount or mode switch
  useEffect(() => {
    return () => {
      liveClientRef.current?.disconnect();
    };
  }, []);

  // When switching modes
  useEffect(() => {
    if (!isVoiceMode && isListening) {
      toggleSavara(); // Turn off if switching to manual
    }
  }, [isVoiceMode]);

  // Determine what data to show in Voucher
  const voucherItems = viewingHistoryEntry ? viewingHistoryEntry.items : items;
  const voucherTotals = viewingHistoryEntry
    ? { bs: viewingHistoryEntry.totalBs, usd: viewingHistoryEntry.totalUsd, eur: viewingHistoryEntry.totalEur }
    : currentTotals;
  const voucherDate = viewingHistoryEntry
    ? `${viewingHistoryEntry.date} ${viewingHistoryEntry.time}`
    : new Date().toLocaleString('es-VE');

  return (
    <div className="h-screen bg-black flex flex-col font-sans overflow-hidden select-none relative">

      {/* HEADER BAR */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">

        {/* Left: Back & Brand */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-all">
            <ArrowLeft size={18} />
          </button>
          <Logo size={32} />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-white leading-none">CalculaTú</span>
            <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Calendar size={8} /> {currentDateDisplay}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {items.length > 0 && license.active && (
            <button
              onClick={handleFinish}
              className="p-2.5 bg-emerald-500 text-black rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 transition-all animate-fade-in"
              title="Generar Voucher (Pro)"
            >
              <ReceiptText size={18} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all hover:rotate-90 duration-500"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Main Totals Display */}
      <div className="pt-20 pb-6 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-500/5 to-transparent">
        <span className="text-[10px] font-extrabold text-emerald-500 tracking-[0.3em] uppercase mb-1">Total a Pagar</span>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-6xl font-bold tracking-tighter text-white font-mono">
            {currentTotals.bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-2xl font-bold text-emerald-500 italic">Bs.</span>
        </div>

        {/* Budget Progress Bar - Enhanced with gradient */}
        {budgetLimit > 0 && (() => {
          const percentage = Math.min(100, (currentTotals.usd / budgetLimit) * 100);
          const isOver = currentTotals.usd > budgetLimit;
          const remaining = budgetLimit - currentTotals.usd;

          // Progressive color based on percentage
          const getBarColor = () => {
            if (isOver) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
            if (percentage > 80) return 'bg-gradient-to-r from-yellow-500 to-red-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
            if (percentage > 50) return 'bg-gradient-to-r from-emerald-500 to-yellow-500';
            return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
          };

          const getTextColor = () => {
            if (isOver) return 'text-red-400';
            if (percentage > 80) return 'text-yellow-400';
            return 'text-emerald-400';
          };

          return (
            <div className="w-full max-w-[280px] mt-2 mb-4 px-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                <span className="text-gray-500">Presupuesto</span>
                <span className={getTextColor()}>
                  {Math.round(percentage)}%
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${getBarColor()}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className={`text-center text-[10px] mt-2 font-mono ${isOver ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                {isOver
                  ? `¡Excediste ${Math.abs(remaining).toFixed(2)} USD!`
                  : `Quedan $${remaining.toFixed(2)} de $${budgetLimit.toFixed(2)}`}
              </p>
            </div>
          );
        })()}

        {/* Currency Pills */}
        <div className="flex gap-4">
          <div className="bg-[#111] border border-white/5 rounded-full px-5 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-bold font-mono text-gray-200">$ {currentTotals.usd.toFixed(2)}</span>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-full px-5 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-sm font-bold font-mono text-gray-200">€ {currentTotals.eur.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Rates Bar */}
      <div className="w-full border-y border-white/5 bg-black/40 py-2 flex flex-col items-center gap-1">
        <span className="text-[10px] text-emerald-400/70 font-medium tracking-wider">Tasas en tiempo real • BCV</span>
        <div className="flex justify-center gap-8 items-center text-xs font-black uppercase tracking-widest text-gray-500">
          <div className="flex gap-2 items-center">
            <DollarSign size={16} className="text-emerald-400" />
            <span className="text-white font-mono">Bs {rates.USD.toFixed(2)}</span>
          </div>
          <div className="h-3 w-px bg-white/10"></div>
          <div className="flex gap-2 items-center">
            <Euro size={16} className="text-purple-400" />
            <span className="text-white font-mono">Bs {rates.EUR.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area (List) */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center px-4 pb-44">
        {items.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center opacity-50">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
              <ShoppingBag size={32} className="text-gray-500" />
            </div>
            <p className="text-sm text-gray-600">Tu carrito está vacío</p>
          </div>
        ) : (
          <div className="w-full max-w-md h-full overflow-y-auto space-y-3 py-4 custom-scroll">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-3xl bg-[#0c0c0c] border border-white/5 flex items-center justify-between group animate-fade-in-up">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-400 text-xs font-mono">
                    {item.quantity}x
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{item.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 font-mono">{item.currency}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{item.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-emerald-400 font-mono">
                    {((item.price * (item.currency === 'VES' ? 1 : (item.currency === 'EUR' ? rates.EUR : rates.USD))) * item.quantity).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => setItems(items.filter(i => i.id !== item.id))}
                    className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM DOCK AREA */}
      <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-[60]">

        {/* MANUAL MODE DOCK */}
        {!isVoiceMode && (
          <div className="w-full max-w-md bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 shadow-2xl animate-fade-in-up">

            {/* Row 1: Qty & Name */}
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value)}
                placeholder="Cant."
                className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-center text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-sm"
              />
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Nombre del producto..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            {/* Row 2: Controls & Price Group */}
            <div className="flex gap-2 h-12">

              {/* Currency + Price Input Hybrid */}
              <div className="flex-1 flex bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                <button
                  onClick={cycleCurrency}
                  className="h-full px-3 bg-white/5 border-r border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5 min-w-[70px]"
                >
                  <span className={`font-mono font-bold text-lg ${currDisplay.color}`}>{currDisplay.symbol}</span>
                  <span className="text-[10px] font-bold text-gray-500 pt-1">{currDisplay.label}</span>
                </button>
                <input
                  type="number"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 w-full bg-transparent border-none px-3 text-white font-mono text-lg placeholder:text-gray-700 focus:ring-0 outline-none"
                />
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddItem}
                disabled={!inputName || !inputPrice}
                className="aspect-square h-full bg-emerald-500 rounded-xl text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-95 hover:bg-emerald-400 transition-all flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
              >
                <Plus size={26} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {/* VOICE MODE DOCK (SAVARA) - ONLY IF LICENSE ACTIVE */}
        {isVoiceMode && license.active && (
          <div className="flex items-center gap-4 px-6 py-4 bg-[#111]/90 backdrop-blur-3xl border border-emerald-500/20 rounded-[2.5rem] shadow-[0_0_50px_rgba(16,185,129,0.1)] z-[100] min-w-[320px] animate-fade-in-up">
            <div className="flex-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/30 shadow-sm relative">
                <img src={SAVARA_AVATAR} alt="Savara" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay"></div>
              </div>
              <div>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-0.5 italic">Savara Pro</p>
                <p className="text-xs font-bold text-gray-300">
                  {isListening ? "Escuchando..." : "Presiona para hablar"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleSavara}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 transform active:scale-90 relative ${isListening
                ? 'bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.7)]'
                : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                }`}
            >
              {isListening ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl animate-ping bg-black/20" />
                  <div className="flex gap-1 items-end h-5 relative z-10">
                    <div className="w-1 bg-black rounded-full animate-voice-1"></div>
                    <div className="w-1 bg-black rounded-full animate-voice-2"></div>
                    <div className="w-1 bg-black rounded-full animate-voice-3"></div>
                  </div>
                </div>
              ) : (
                <Mic size={24} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* VOUCHER MODAL (Generic for History and New) */}
      {showVoucher && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white text-black w-full max-w-[340px] shadow-2xl overflow-hidden relative animate-slide-up rounded-sm">

            {/* Thermal Paper Texture Simulation */}
            <div className="p-6 font-mono text-xs relative">

              {/* Header */}
              <div className="text-center mb-6 relative">
                {/* Close button */}
                <button
                  onClick={handleCloseVoucher}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                  title="Cerrar"
                >
                  <X size={16} className="text-gray-600" />
                </button>
                <h2 className="text-2xl font-black tracking-tighter mb-1 font-sans">CALCULATÚ</h2>
                <p className="uppercase text-[10px] text-gray-500 font-bold tracking-widest">
                  {viewingHistoryEntry ? 'Copia de Recibo' : 'Resumen de Cuenta'}
                </p>
                <p className="text-gray-400 mt-1">{voucherDate}</p>
              </div>

              {/* Items */}
              <div className="border-b-2 border-dashed border-gray-300 mb-4 pb-2">
                <div className="flex justify-between font-bold mb-2 text-[10px] text-gray-400 uppercase">
                  <span>Cant • Producto</span>
                  <span>Bs</span>
                </div>
                <div className="space-y-2">
                  {voucherItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <span className="font-bold">{item.quantity}x</span>
                        <span className="uppercase max-w-[160px] truncate">{item.name}</span>
                      </div>
                      <span className="font-bold">
                        {((item.price * (item.currency === 'VES' ? 1 : (item.currency === 'EUR' ? rates.EUR : rates.USD))) * item.quantity).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-between items-end mb-1">
                <span className="text-lg font-black">TOTAL</span>
                <span className="text-2xl font-black tracking-tighter">Bs {voucherTotals.bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-end gap-3 text-gray-500 text-[10px] font-bold border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                <span>REF: $ {voucherTotals.usd.toFixed(2)}</span>
                <span>EUR {voucherTotals.eur.toFixed(2)}</span>
              </div>

              {/* Footer */}
              <div className="text-center">
                <p className="font-bold text-[10px] uppercase mb-1">¡Gracias por su compra!</p>
                <p className="text-[9px] text-gray-400">
                  {viewingHistoryEntry ? 'Reimpresión Digital' : 'Guardado en Historial • Copia Cliente'}
                </p>

                {/* Fake Barcode */}
                <div className="mt-4 flex justify-center gap-1 opacity-40 h-8 items-end">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="bg-black w-0.5" style={{ height: Math.random() > 0.5 ? '100%' : '70%', width: Math.random() * 3 + 1 }}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleCloseVoucher}
              className="w-full py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              {viewingHistoryEntry ? <X size={16} /> : <Check size={16} />}
              {viewingHistoryEntry ? 'Cerrar Recibo' : 'Finalizar y Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS DRAWER */}
      {isSettingsOpen && (
        <>
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[70] animate-fade-in"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-[#121212] border-t border-white/10 rounded-t-[2.5rem] p-6 z-[80] animate-slide-up shadow-2xl h-[70vh] flex flex-col">
            {/* Drawer Handle + Close Button */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="w-10" /> {/* Spacer for centering */}
              <div className="w-12 h-1 bg-white/20 rounded-full" />
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* TABS HEADER */}
            <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl mb-6 shrink-0">
              <button
                onClick={() => setActiveTab('config')}
                className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'config' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                Config
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'history' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
              >
                Historial
              </button>
              <button
                onClick={() => setActiveTab('license')}
                className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'license' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                Licencia
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'support' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                Soporte
              </button>
            </div>

            {/* SCROLLABLE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scroll pb-6">

              {/* === CONFIG TAB === */}
              {activeTab === 'config' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Savara Toggle */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${license.active ? 'bg-white/5 border-white/5' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${license.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {license.active ? <Mic size={20} /> : <Lock size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">Savara AI</h4>
                        <p className={`text-[10px] ${license.active ? 'text-gray-400' : 'text-amber-400'}`}>
                          {license.active ? 'Asistente de Voz Activo' : '¡Activa tu licencia Pro!'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (license.active) {
                          setIsVoiceMode(!isVoiceMode);
                        } else {
                          // Redirect to license tab
                          setActiveTab('license');
                        }
                      }}
                      className={`w-12 h-7 rounded-full transition-colors relative ${license.active && isVoiceMode ? 'bg-emerald-500' : license.active ? 'bg-white/10' : 'bg-amber-500/30'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 rounded-full transition-transform shadow-md ${license.active && isVoiceMode ? 'bg-white left-6' : license.active ? 'bg-white left-1' : 'bg-amber-400 left-1'}`} />
                    </button>
                  </div>

                  {/* Rates */}
                  <div>
                    <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Tasas de Cambio (Temporal)</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                        <label className="text-[10px] text-blue-400 font-bold block mb-1">TASA USD</label>
                        <input
                          type="number"
                          value={rates.USD}
                          onChange={(e) => setRatesTemporarily({ ...rates, USD: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                        />
                      </div>
                      <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                        <label className="text-[10px] text-purple-400 font-bold block mb-1">TASA EUR</label>
                        <input
                          type="number"
                          value={rates.EUR}
                          onChange={(e) => setRatesTemporarily({ ...rates, EUR: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[10px] text-gray-500">
                        {ratesOverrideExpiresAt ? `Guardado 24h • expira: ${new Date(ratesOverrideExpiresAt).toLocaleString('es-VE')}` : 'Por defecto (BCV/global)'}
                      </p>
                      <button
                        onClick={clearTemporaryRates}
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Límite de Presupuesto</h5>
                    <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                      <div className="flex items-center gap-3">
                        <CreditCard size={20} className="text-emerald-400" />
                        <input
                          type="number"
                          placeholder="Monto máximo..."
                          value={budgetLimit || ''}
                          onChange={(e) => setBudgetLimit(parseFloat(e.target.value) || 0)}
                          className="flex-1 bg-transparent text-white text-lg font-mono font-bold outline-none placeholder:text-gray-500"
                        />
                        {/* Currency indicator */}
                        <span className="text-emerald-400 font-bold text-sm">USD</span>
                      </div>
                      {budgetLimit > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-emerald-500/10 rounded-lg px-3 py-2">
                          <Check size={14} className="text-emerald-400" />
                          <span>Presupuesto activo: <span className="text-white font-bold">${budgetLimit.toFixed(2)}</span></span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">El presupuesto se aplica en USD. Se muestra en la barra superior.</p>
                  </div>
                </div>
              )}

              {/* === HISTORY TAB === */}
              {activeTab === 'history' && (
                <div className="animate-fade-in">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                      <History size={32} className="text-gray-500 mb-2" />
                      <p className="text-xs text-gray-400">No hay tickets guardados aún.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {history.map((entry) => (
                        <div key={entry.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-white">{entry.date}</span>
                              <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{entry.time}</span>
                            </div>
                            <p className="text-[10px] text-gray-400">{entry.itemCount} productos</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-400 font-mono">Bs {entry.totalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                              <p className="text-[10px] text-gray-500 font-mono">$ {entry.totalUsd.toFixed(2)}</p>
                            </div>
                            <button
                              onClick={() => { setViewingHistoryEntry(entry); setShowVoucher(true); }}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                              title="Ver Recibo Ecológico"
                            >
                              <ReceiptText size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* === LICENSE TAB === */}
              {activeTab === 'license' && (
                <div className="space-y-6 animate-fade-in">

                  {/* License Status - Only show if license is active */}
                  {license.active && (
                    <div className={`p-6 rounded-2xl border relative overflow-hidden ${license.plan === 'lifetime'
                      ? 'bg-gradient-to-br from-purple-900/30 to-black border-purple-500/40'
                      : 'bg-gradient-to-br from-emerald-900/30 to-black border-emerald-500/40'
                      }`}>
                      <div className="absolute top-0 right-0 p-3 opacity-20">
                        {license.plan === 'lifetime' ? (
                          <span className="text-5xl">💎</span>
                        ) : (
                          <Check size={64} className="text-emerald-500" />
                        )}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${license.plan === 'lifetime' ? 'text-purple-400' : 'text-emerald-400'
                        }`}>
                        {license.plan === 'lifetime' ? 'Licencia Lifetime' : 'Licencia Mensual'}
                      </p>
                      <p className="text-xl font-bold text-white mb-2">
                        {license.plan === 'lifetime'
                          ? '¡Gracias por confiar en nosotros!'
                          : '✅ Licencia Activada'}
                      </p>
                      <p className={`text-sm ${license.plan === 'lifetime' ? 'text-purple-300' : 'text-emerald-300'}`}>
                        {license.plan === 'lifetime'
                          ? 'Tu licencia no vence nunca. Disfruta de Savara sin límites.'
                          : `Próxima renovación: ${license.expiresAt
                            ? new Date(license.expiresAt).toLocaleDateString('es-VE', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })
                            : 'No definida'}`}
                      </p>
                    </div>
                  )}

                  {/* Machine ID Card - Only show if NOT lifetime license */}
                  {license.plan !== 'lifetime' && (
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-20">
                        <Fingerprint size={64} className="text-emerald-500" />
                      </div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Huella Digital del Dispositivo</p>
                      <div className="flex flex-col gap-2 mb-2">
                        <input
                          id="machineId-input"
                          type="text"
                          readOnly
                          value={machineId}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="w-full bg-black/50 text-lg font-mono font-bold text-white tracking-wider px-3 py-2 rounded-lg border border-emerald-500/30 focus:border-emerald-500 focus:outline-none select-all"
                        />
                        <button
                          onClick={() => handleCopyText('machineId', machineId)}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${copiedState === 'machineId'
                            ? 'bg-emerald-500 text-black'
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black active:scale-95'
                            }`}
                        >
                          {copiedState === 'machineId' ? <><Check size={18} /> ¡Copiado!</> : <><Copy size={18} /> Tocar para Copiar</>}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">Toca el ID para seleccionarlo, luego usa "Copiar" del menú.</p>
                    </div>
                  )}

                  {/* Payment Info - Only show if license NOT active */}
                  {!license.active && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Binance Card */}
                        <div className="p-3 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 flex flex-col justify-center relative group">
                          <div className="absolute top-3 right-3">
                            <button
                              onClick={() => handleCopyText('binance', '53820365')}
                              className="p-1.5 rounded-lg bg-[#F0B90B]/20 text-[#F0B90B] hover:bg-[#F0B90B] hover:text-black transition-colors"
                            >
                              {copiedState === 'binance' ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <BinanceIcon size={16} className="text-[#F0B90B]" />
                            <p className="text-[11px] text-[#F0B90B] font-black uppercase">Binance Pay</p>
                          </div>
                          <p className="text-sm text-white font-mono font-bold truncate">MultiversaGroup</p>
                          <p className="text-[11px] text-gray-300 font-mono">ID: 53820365</p>
                        </div>

                        {/* Pago Movil Card */}
                        <div className="p-3 rounded-xl bg-[#E31837]/10 border border-[#E31837]/30 flex flex-col justify-center relative group">
                          <div className="absolute top-3 right-3">
                            <button
                              onClick={() => handleCopyText('pagomovil', '04125322257\nV16619748\n0134')}
                              className="p-1.5 rounded-lg bg-[#E31837]/20 text-[#E31837] hover:bg-[#E31837] hover:text-white transition-colors"
                            >
                              {copiedState === 'pagomovil' ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <BanescoIcon size={16} />
                            <p className="text-[11px] text-[#E31837] font-black uppercase">Pago Móvil</p>
                          </div>
                          <p className="text-sm text-white font-mono font-bold">0412 532 2257</p>
                          <p className="text-[11px] text-gray-300 font-mono">V16619748 • Banesco</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={sendActivationMessage}
                        className="w-full py-4 rounded-xl bg-[#25D366] text-white font-bold uppercase tracking-wide shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-3"
                      >
                        <WhatsAppIcon size={22} /> Activar por WhatsApp
                      </button>

                      <div className="flex items-center gap-3 my-2">
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-[10px] text-gray-500 uppercase">Validar Token</span>
                        <div className="h-px flex-1 bg-white/10"></div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ingresa tu Token de Activación"
                            value={activationToken}
                            onChange={(e) => setActivationToken(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                          />
                          <button
                            onClick={validateToken}
                            className="px-4 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            <Check size={20} />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                          Este token te lo proporcionamos nosotros después de validar tu pago vía WhatsApp, normalmente respondemos en minutos.
                        </p>
                      </div>
                    </>
                  )}

                </div>
              )}

              {/* === SUPPORT TAB === */}
              {activeTab === 'support' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="p-6 rounded-2xl bg-blue-900/20 border border-blue-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <HelpCircle size={24} className="text-blue-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Soporte & Reportes</h3>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Reporta problemas técnicos. No necesitas escribir datos técnicos, nuestro sistema los detecta automáticamente.
                    </p>
                  </div>

                  {/* Issue Type Selector */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                      Tipo de Problema
                    </label>
                    <select
                      value={supportIssueType}
                      onChange={(e) => setSupportIssueType(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="">Selecciona un tipo...</option>
                      <option value="voice">Savara (Voz) no funciona</option>
                      <option value="license">Problema con licencia</option>
                      <option value="calculation">Error en cálculos</option>
                      <option value="offline">Problemas offline</option>
                      <option value="other">Otro problema</option>
                    </select>
                  </div>

                  {/* Optional Message */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                      Mensaje (Opcional)
                    </label>
                    <textarea
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe brevemente qué pasó..."
                      rows={4}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 resize-none"
                    />
                  </div>

                  {/* Send Report Button */}
                  <button
                    onClick={async () => {
                      if (!supportIssueType) {
                        alert('Por favor selecciona un tipo de problema.');
                        return;
                      }

                      try {
                        const diagnostic = await generateDiagnosticReport();
                        const report = {
                          issueType: supportIssueType,
                          message: supportMessage || '(Sin mensaje)',
                          diagnostic: formatDiagnosticReport(diagnostic),
                          timestamp: new Date().toISOString(),
                        };

                        // Store in IndexedDB for offline sending
                        try {
                          if (typeof window !== 'undefined' && window.indexedDB) {
                            const db = await new Promise<IDBDatabase>((resolve, reject) => {
                              const req = indexedDB.open('calculatu_db', 1);
                              req.onsuccess = () => resolve(req.result);
                              req.onerror = () => reject(req.error);
                              req.onupgradeneeded = (e) => {
                                const db = (e.target as IDBOpenDBRequest).result;
                                if (!db.objectStoreNames.contains('support_reports')) {
                                  db.createObjectStore('support_reports', { keyPath: 'id', autoIncrement: true });
                                }
                              };
                            });

                            const tx = db.transaction('support_reports', 'readwrite');
                            const store = tx.objectStore('support_reports');
                            await new Promise((resolve, reject) => {
                              const req = store.add({ ...report, id: Date.now() });
                              req.onsuccess = () => resolve(req.result);
                              req.onerror = () => reject(req.error);
                            });
                          }
                        } catch (dbErr) {
                          console.error('Error storing report:', dbErr);
                        }

                        // Try to send via WhatsApp
                        const whatsappText = `Reporte CalculaTú\n\nTipo: ${supportIssueType}\nMensaje: ${supportMessage || 'N/A'}\n\nUIC: ${diagnostic.uic}\n\nDiagnóstico:\n${formatDiagnosticReport(diagnostic)}`;
                        window.open(`https://wa.me/584142949498?text=${encodeURIComponent(whatsappText)}`, '_blank');

                        alert('Reporte generado. Se abrirá WhatsApp para enviarlo.');
                        setSupportIssueType('');
                        setSupportMessage('');
                      } catch (err) {
                        console.error('Error generating report:', err);
                        alert('Hubo un error generando el reporte. Intenta de nuevo.');
                      }
                    }}
                    className="w-full py-4 rounded-xl bg-blue-500 text-white font-bold uppercase tracking-wide shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={20} /> Enviar Reporte
                  </button>

                  {/* Diagnostic Info */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                      El diagnóstico se genera automáticamente y no incluye datos personales. Se almacena localmente para envío offline si es necesario.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      <style>{`
        .animate-voice-1 { animation: sound 0.4s infinite alternate ease-in-out; }
        .animate-voice-2 { animation: sound 0.7s infinite alternate ease-in-out; }
        .animate-voice-3 { animation: sound 0.5s infinite alternate ease-in-out; }
        @keyframes sound { 0% { height: 6px; } 100% { height: 18px; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Feedback Button */}
      <FeedbackButton />

      {/* Version Badge */}
      <div className="fixed bottom-2 right-2 z-30 text-[10px] text-gray-600 font-mono bg-black/50 px-2 py-0.5 rounded">
        {BUILD_VERSION}
      </div>

      {/* Onboarding Flow for first-time users */}
      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}

      {/* Confetti celebration for license activation */}
      <Confetti show={showConfetti} />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Savara Call Modal */}
      <SavaraCallModal
        isOpen={isListening}
        isListening={isListening}
        currentItems={items}
        currentTotals={currentTotals}
        rates={rates}
        onHangUp={toggleSavara}
      />
    </div>
  );
};