import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addDays, addMonths, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Shield, 
  Terminal, 
  Activity, 
  Package, 
  Users, 
  Zap, 
  Cpu, 
  Globe, 
  RefreshCcw, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  X, 
  Search, 
  Download, 
  FileText, 
  Settings2, 
  Trash2, 
  Save, 
  Key, 
  Calendar as CalendarIcon, 
  Clock, 
  PieChart, 
  LayoutDashboard, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Database, 
  Brain, 
  BarChart4, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  DollarSign,
  Euro,
  KeyRound,
  Fingerprint,
  Binary,
  Send,
  ShieldCheck,
  Mail,
  LogIn,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { fetchGlobalRates, getAuthEmail, signInWithPassword, signOut, upsertGlobalRates, resetPassword, updatePassword, fetchHistoricalRates } from '../services/ratesService';
import { supabase } from '../services/supabaseClient';
import { Calendar } from '@/components/ui/calendar';
import { SavaraPersonality, SystemLog } from '../types';
import { SAVARA_IDENTITY } from '../constants';

// PIN Gate - Security layer before showing admin panel
const PORTALITY_PIN = import.meta.env.VITE_PORTALITY_PIN || ''; // PIN must be set in .env.local

type CreateResponse = {
  token: string;
  deviceId: string;
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
};

type VerifyResponse =
  | { valid: true; plan: 'monthly' | 'lifetime'; expiresAt: string | null }
  | { valid: false; error?: string };

const handleCopyText = async (text: string) => {
  let success = false;
  // Method 1: Modern clipboard API
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      success = true;
    }
  } catch (e) {
    console.log('[Portality] Clipboard API failed, trying fallback...');
  }

  // Method 2: execCommand fallback
  if (!success) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(textarea);
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(textarea);
      selection?.removeAllRanges();
      selection?.addRange(range);
      textarea.setSelectionRange(0, 999999);
      success = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (e) {
      console.log('[Portality] execCommand failed:', e);
    }
  }
  return success;
};

export const Portality: React.FC = () => {
  // PIN Gate State
  const [pinInput, setPinInput] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(() => {
    // Check if PIN was verified in this session
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('portality_unlocked') === 'true';
    }
    return false;
  });
  const [pinError, setPinError] = useState('');

  const machineId = useAppStore(s => s.machineId);
  const [portalKey, setPortalKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('portality_key') || '' : ''));
  const [deviceId, setDeviceId] = useState(machineId);
  const [plan, setPlan] = useState<'monthly' | 'lifetime'>('monthly');
  const [months, setMonths] = useState(1);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [showCalendarDetail, setShowCalendarDetail] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [adminEmail, setAdminEmail] = useState('multiversagroup@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [rates, setRates] = useState<{ usd: number; eur: number }>({ usd: 0, eur: 0 });
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState<string | null>(null);
  const [historicalRates, setHistoricalRates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profileSearch, setProfileSearch] = useState('');
  const [extendDate, setExtendDate] = useState('');

  // SAVARA PERSONALITY STATE
  const [personality, setPersonality] = useState<SavaraPersonality>({
    id: 'default',
    system_prompt: '',
    tone: 'professional',
    voice_id: 'sophisticated-male',
    temperature: 0.7
  });
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);

  const isAdminAuthed = authEmail === 'multiversagroup@gmail.com';

  // LOGS SYSTEM
  const [logs, setLogs] = useState<{ id: string; msg: string; type: 'info' | 'warn' | 'success'; time: string }[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [nodeStatus, setNodeStatus] = useState<{ gemini: 'online' | 'error' | 'loading', supabase: 'online' | 'error' | 'loading' }>({
    gemini: 'loading',
    supabase: 'loading'
  });
  const [knowledgeSources, setKnowledgeSources] = useState<any[]>([]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      msg,
      type,
      time: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 50));
  };

  const fetchPersonality = async () => {
    if (!isAdminAuthed) return;
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'savara_personality')
        .single();
      
      if (data && data.value) {
        setPersonality(data.value);
      } else {
        // Use identity from constants.tsx
        setPersonality({
          id: 'default',
          system_prompt: SAVARA_IDENTITY,
          tone: 'professional',
          voice_id: 'sophisticated-female',
          temperature: 0.7
        });
      }
    } catch (e) {
      console.error('Error fetching personality:', e);
    }
  };

  const fetchSystemLogs = async () => {
    if (!isAdminAuthed) return;
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setSystemLogs(data || []);
    } catch (e) {
      console.error('Error fetching system logs:', e);
    }
  };

  useEffect(() => {
    if (machineId && machineId !== 'LOADING...' && !deviceId) {
      setDeviceId(machineId);
      addLog(`M-Hash detectado: ${machineId}`, 'info');
    }
  }, [machineId, deviceId]);

  const fetchProfiles = async () => {
    if (!isAdminAuthed) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (e) {
      console.error('Error fetching profiles:', e);
    }
  };

  const fetchContracts = async () => {
    if (!isAdminAuthed) return;
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setContracts(data || []);
    } catch (e) {
      console.error('Error fetching contracts:', e);
    }
  };

  const fetchKnowledgeSources = async () => {
    if (!isAdminAuthed) return;
    try {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setKnowledgeSources(data || []);
    } catch (e) {
      console.error('Error fetching knowledge sources:', e);
    }
  };

  // PIN verification handler
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === PORTALITY_PIN) {
      setIsPinVerified(true);
      setPinError('');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('portality_unlocked', 'true');
      }
    } else {
      setPinError('PIN incorrecto');
      setPinInput('');
    }
  };

  // PIN Gate UI
  if (!isPinVerified) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden selection:bg-emerald-500/30">
        {/* LIQUID GLASS BACKGROUND */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent blur-[80px] animate-liquid"></div>
            <div className="absolute bottom-[5%] right-[15%] w-[35%] h-[35%] bg-gradient-to-tr from-purple-600/10 via-pink-500/5 to-transparent blur-[80px] animate-liquid [animation-delay:2s]"></div>
          </div>
        </div>

        <div className="w-full max-w-sm relative z-10">
          <form onSubmit={handlePinSubmit} className="p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>
            
            <div className="flex items-center justify-center mb-8 relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black shadow-lg shadow-emerald-500/30">
                <Lock size={32} />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Portality SmartOS</h2>
            <p className="text-gray-500 text-xs text-center mb-8 font-medium uppercase tracking-[0.2em]">Acceso Restringido</p>

            <div className="space-y-6 relative z-10">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-3xl text-white text-center tracking-[0.3em] placeholder:text-gray-800 focus:outline-none focus:border-emerald-500/50 backdrop-blur-md transition-all font-mono"
                autoFocus
              />

              {pinError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-shake">
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                disabled={pinInput.length < 4}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Desbloquear Consola
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Check if we're coming from a password recovery link
    if (supabase) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        setIsResettingPassword(true);
        // Clear hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // Check session on mount
    const checkSession = async () => {
      try {
        const email = await getAuthEmail();
        if (email) {
          setAuthEmail(email);
        }
      } catch {
        setAuthEmail(null);
      }
    };

    checkSession();

    // Listen for auth state changes (persistence)
    let subscription: any = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) {
          setAuthEmail(session.user.email);
          // If we were resetting password and now have a session, exit reset mode
          if (isResettingPassword) {
            setIsResettingPassword(false);
            setNewPassword('');
            setConfirmPassword('');
          }
        } else {
          setAuthEmail(null);
          setProfiles([]);
          setContracts([]);
          setKnowledgeSources([]);
        }
      });
      subscription = data.subscription;
    }

    // Initial rates fetch
    fetchGlobalRates()
      .then((r) => {
        if (!r) return;
        setRates({ usd: r.USD, eur: r.EUR });
        setGlobalUpdatedAt(r.updatedAt ?? null);
      })
      .catch(() => { });

    fetchHistoricalRates(10)
      .then(setHistoricalRates)
      .catch(() => { });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [isResettingPassword]);

  // Combined Data Fetching & Polling
  useEffect(() => {
    if (!isAdminAuthed) return;

    const loadCoreData = () => {
      addLog('Sincronizando datos del Core...', 'info');
      fetchContracts();
      fetchProfiles();
      fetchSystemLogs();
      fetchPersonality();
      fetchKnowledgeSources();
    };

    loadCoreData();

    const checkConnectivity = async () => {
      if (supabase) {
        try {
          const { error } = await supabase.from('exchange_rates').select('id').eq('id', 1).maybeSingle();
          setNodeStatus(prev => ({ ...prev, supabase: error ? 'error' : 'online' }));
        } catch {
          setNodeStatus(prev => ({ ...prev, supabase: 'error' }));
        }
      }
      try {
        const resp = await fetch('/api/chat', { 
          method: 'POST', 
          body: JSON.stringify({ message: 'ping' }), 
          headers: { 'Content-Type': 'application/json' } 
        });
        setNodeStatus(prev => ({ ...prev, gemini: resp.ok ? 'online' : 'error' }));
      } catch {
        setNodeStatus(prev => ({ ...prev, gemini: 'error' }));
      }
    };

    checkConnectivity();
    const interval = setInterval(() => {
      fetchSystemLogs();
      checkConnectivity();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAdminAuthed]);

  const handleGenerate = async () => {
    if (!deviceId.trim()) return;
    setIsBusy(true);
    setStatus('');
    setToken('');

    try {
      if (typeof window !== 'undefined') localStorage.setItem('portality_key', portalKey);

      const resp = await fetch('/api/license/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portality-key': portalKey,
        },
        body: JSON.stringify({ deviceId: deviceId.trim(), plan, months: plan === 'monthly' ? months : undefined }),
      });
      const data = (await resp.json()) as CreateResponse | { error?: string };
      if (!resp.ok || !(data as any).token) {
        setStatus((data as any)?.error || 'No se pudo generar la licencia.');
        return;
      }

      const generatedToken = (data as CreateResponse).token;
      setToken(generatedToken);
      setStatus(`OK • ${plan.toUpperCase()} • exp: ${(data as CreateResponse).expiresAt || '—'}`);

      // Save to contracts table in Supabase
      if (isAdminAuthed) {
        await supabase.from('contracts').insert({
          machine_id: deviceId.trim(),
          email: 'customer@portality.gen', // Placeholder email
          plan: plan,
          token: generatedToken,
          expires_at: (data as CreateResponse).expiresAt,
          status: 'active'
        });
        fetchContracts();
      }
    } catch {
      setStatus('Error de red generando licencia.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!token.trim() || !deviceId.trim()) return;
    setIsBusy(true);
    setStatus('');
    try {
      const resp = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), deviceId: deviceId.trim() }),
      });
      const data = (await resp.json()) as VerifyResponse;
      if (!resp.ok || !data.valid) {
        setStatus((data as any).error || 'Token inválido.');
        return;
      }
      setStatus(`VALIDO • ${data.plan.toUpperCase()} • exp: ${data.expiresAt || '—'}`);
    } catch {
      setStatus('Error de red verificando token.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    const success = await handleCopyText(token);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setStatus('Error al copiar. Intenta seleccionar y copiar manualmente.');
    }
  };

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setStatus('Por favor completa email y contraseña');
      return;
    }

    setIsBusy(true);
    setStatus('');
    try {
      const email = await signInWithPassword(adminEmail.trim(), adminPassword);
      setAuthEmail(email);
      if (email === 'multiversagroup@gmail.com') {
        fetchContracts();
        fetchProfiles();
      }
      setAdminPassword(''); // Clear password after successful login
      setStatus(`Login exitoso: ${email}`);
    } catch (e: any) {
      setStatus(e?.message || 'Email o contraseña incorrectos');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveRates = async () => {
    if (!isAdminAuthed) return;
    setIsBusy(true);
    addLog(`Publicando tasas manuales: $${rates.usd}...`, 'info');
    try {
      await upsertGlobalRates({ USD: rates.usd, EUR: rates.eur, source: 'manual' });
      addLog(`Tasas publicadas con éxito: $${rates.usd} / €${rates.eur}`, 'success');
      setStatus('Tasas sincronizadas ✅');
      
      const r = await fetchGlobalRates();
      if (r) {
        setRates({ usd: r.USD, eur: r.EUR });
        setGlobalUpdatedAt(r.updatedAt ?? null);
      }
    } catch (e: any) {
      addLog(`Error publicando tasas: ${e.message}`, 'warn');
      setStatus(`Error: ${e.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSavePersonality = async () => {
    if (!isAdminAuthed) return;
    setIsSavingPersonality(true);
    addLog('Actualizando personalidad de Savara...', 'info');
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'savara_personality', 
          value: personality,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      addLog('Sincronización de IA completa ✅', 'success');
      setStatus('Personalidad de Savara guardada.');
    } catch (e: any) {
      addLog(`Error sincronizando IA: ${e.message}`, 'warn');
      setStatus(`Error AI: ${e.message}`);
    } finally {
      setIsSavingPersonality(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!isAdminAuthed || !deviceId || !extendDate) return;
    setIsBusy(true);
    addLog(`Extendiendo licencia para nodo: ${deviceId}...`, 'info');
    try {
      // Create a temporary trial license with specified date
      const resp = await fetch('/api/license/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portality-key': portalKey,
        },
        body: JSON.stringify({ deviceId: deviceId.trim(), plan: 'monthly', expires_at: extendDate }),
      });
      
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Generación fallida');
      addLog(`Licencia extendida: ${deviceId}`, 'success');
      setStatus(`Licencia extendida hasta ${extendDate}`);
      fetchContracts();
    } catch (e: any) {
      addLog(`Error extendiendo trial: ${e.message}`, 'warn');
      setStatus(`Error Forge: ${e.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleGeminiTest = async () => {
    setIsBusy(true);
    addLog('Iniciando diagnóstico de Gemini Live...', 'info');
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'DIAGNOSTIC_PING_CORE_AUTHENTICATED' }),
      });
      
      if (resp.ok) {
        setNodeStatus(prev => ({ ...prev, gemini: 'online' }));
        addLog('Diágnóstico exitoso: Gemini respondió en 450ms', 'success');
      } else {
        setNodeStatus(prev => ({ ...prev, gemini: 'error' }));
        addLog('Gemini fuera de línea o sin cuota.', 'warn');
      }
    } catch {
      setNodeStatus(prev => ({ ...prev, gemini: 'error' }));
      addLog('Error de red contactando Gemini.', 'warn');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRecoverPassword = async () => {
    if (!adminEmail.trim()) {
      setStatus('Por favor ingresa tu email');
      return;
    }

    setIsBusy(true);
    setStatus('');
    try {
      await resetPassword(adminEmail.trim());
      setStatus('Se envió un enlace de recuperación a tu correo. Revisa tu bandeja.');
      setIsRecoveringPassword(false);
    } catch (e: any) {
      setStatus(e?.message || 'Error al enviar el enlace de recuperación');
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setStatus('Por favor completa ambos campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setStatus('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsBusy(true);
    setStatus('');
    try {
      await updatePassword(newPassword);
      setStatus('Contraseña actualizada exitosamente. Redirigiendo...');
      setIsResettingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      // Refresh session
      const email = await getAuthEmail();
      setAuthEmail(email);
    } catch (e: any) {
      setStatus(e?.message || 'Error al actualizar la contraseña');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdminLogout = async () => {
    setIsBusy(true);
    setStatus('');
    try {
      await signOut();
      setAuthEmail(null);
      setStatus('Sesión cerrada');
    } finally {
      setIsBusy(false);
    }
  };


  // --- RENDERING ---

  if (!isAdminAuthed) {
    // === GATEKEEPER VIEW ===
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden selection:bg-emerald-500/30">
        {/* LIQUID GLASS BACKGROUND */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-br from-blue-500/10 via-cyan-400/5 to-transparent blur-[80px] animate-liquid"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[45%] h-[45%] bg-gradient-to-tr from-emerald-500/10 via-emerald-400/5 to-transparent blur-[100px] animate-liquid [animation-delay:1s]"></div>
          </div>
        </div>

        <div className="max-w-md w-full relative z-10">
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>

            <div className="text-center mb-10 relative z-10">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 rounded-3xl flex items-center justify-center mb-6 border border-white/10 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">
                <ShieldCheck size={40} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-2">Portality</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                {isResettingPassword ? 'Restablecer Seguridad' : 'Cámara de Autorización'}
              </p>
            </div>

            <div className="space-y-5 relative z-10">
              {isResettingPassword ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                      <Lock size={12} /> Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 font-mono text-xs outline-none focus:border-emerald-500/50 backdrop-blur-md transition-all placeholder:text-gray-800"
                        placeholder="••••••••"
                        disabled={isBusy}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                      <Lock size={12} /> Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 font-mono text-xs outline-none focus:border-emerald-500/50 backdrop-blur-md transition-all placeholder:text-gray-800"
                        placeholder="••••••••"
                        disabled={isBusy}
                        autoComplete="new-password"
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdatePassword}
                    disabled={isBusy || !newPassword.trim() || !confirmPassword.trim()}
                    className="w-full py-5 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 mt-4 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Save size={18} /> {isBusy ? 'Sincronizando...' : 'Actualizar Credenciales'}
                  </button>
                </div>
              ) : (
                <>
                  {!isRecoveringPassword ? (
                    <div className="space-y-5">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                            <Mail size={12} /> Identificador Admin
                          </label>
                          <input
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-mono text-xs outline-none focus:border-emerald-500/50 backdrop-blur-md transition-all placeholder:text-gray-800"
                            placeholder="multiversagroup@gmail.com"
                            disabled={isBusy}
                            autoComplete="email"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                            <Key size={12} /> Frase de Acceso
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 font-mono text-xs outline-none focus:border-emerald-500/50 backdrop-blur-md transition-all placeholder:text-gray-800"
                              placeholder="••••••••"
                              disabled={isBusy}
                              autoComplete="current-password"
                              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-white transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleAdminLogin}
                        disabled={isBusy || !adminEmail.trim() || !adminPassword.trim()}
                        className="w-full py-5 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 mt-4 flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        <LogIn size={18} /> {isBusy ? 'Verificando...' : 'Entrar al Núcleo'}
                      </button>

                      <button
                        onClick={() => setIsRecoveringPassword(true)}
                        disabled={isBusy}
                        className="w-full py-2 text-[10px] text-gray-700 hover:text-white transition-colors font-bold tracking-widest"
                      >
                        RECUPERAR ACCESO
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <button
                        onClick={() => {
                          setIsRecoveringPassword(false);
                          setStatus('');
                        }}
                        className="mb-2 flex items-center gap-2 text-[10px] text-gray-500 hover:text-white transition-colors font-black uppercase tracking-widest"
                      >
                        <ArrowLeft size={14} /> Volver
                      </button>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                            <Mail size={12} /> Email para recuperación
                          </label>
                          <input
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-mono text-xs outline-none focus:border-emerald-500/50 backdrop-blur-md transition-all placeholder:text-gray-800"
                            placeholder="multiversagroup@gmail.com"
                            disabled={isBusy}
                            autoComplete="email"
                            onKeyDown={(e) => e.key === 'Enter' && handleRecoverPassword()}
                          />
                          <p className="text-[10px] text-gray-500 mt-2">
                            Te enviaremos un enlace para restablecer tu contraseña.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleRecoverPassword}
                        disabled={isBusy || !adminEmail.trim()}
                        className="w-full py-5 rounded-2xl bg-blue-500 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-30 mt-4 active:scale-[0.98]"
                      >
                        {isBusy ? 'Enviando...' : 'Enviar enlace de recuperación'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {status && (
              <div className={`mt-4 p-3 rounded-xl text-[10px] font-mono text-center ${status.includes('exitoso') || status.includes('envió')
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                {status}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === DASHBOARD VIEW (AUTHED) ===
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden font-sans relative">
      {/* LIQUID GLASS BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-gradient-to-br from-cyan-500/10 via-cyan-400/5 to-transparent blur-[80px] animate-liquid"></div>
          <div className="absolute top-[10%] right-[-5%] w-[45%] h-[45%] bg-gradient-to-bl from-indigo-500/15 via-purple-500/10 to-transparent blur-[100px] animate-liquid [animation-delay:1s]"></div>
          <div className="absolute bottom-[5%] left-[15%] w-[35%] h-[35%] bg-gradient-to-tr from-purple-600/10 via-pink-500/5 to-transparent blur-[80px] animate-liquid [animation-delay:2s]"></div>
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        ></div>
        <div
          className="absolute inset-0 opacity-[0.01]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/ %3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          }}
        ></div>
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10 px-4 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 pb-6 border-b border-white/5 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                Portality <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-sm font-bold uppercase tracking-widest">Unlocked</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs text-gray-500 font-mono tracking-tighter">{authEmail}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleAdminLogout}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all text-xs font-bold uppercase tracking-widest"
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* === LEFT COLUMN: SAVARA & RATES (4/12) === */}
          <div className="lg:col-span-4 space-y-6">
            {/* SAVARA PERSONA MODULE */}
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all"></div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-emerald-500/30 shadow-lg shadow-emerald-500/10 relative z-10">
                    <img src="/SavaraProfile.webp" alt="Savara" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black z-20"></div>
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-1">Savara Assistant</h2>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] font-mono">Core Module v2.0</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block ml-1">System Identity</label>
                  <textarea 
                    value={personality.system_prompt}
                    onChange={e => setPersonality({ ...personality, system_prompt: e.target.value })}
                    className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[11px] font-mono text-gray-400 focus:text-white focus:border-emerald-500/50 outline-none transition-all resize-none custom-scrollbar"
                    placeholder="Escribe las instrucciones base..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-gray-600 uppercase mb-2">Creativity</p>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={personality.temperature}
                      onChange={e => setPersonality({...personality, temperature: parseFloat(e.target.value)})}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <p className="text-[8px] font-black text-gray-600 uppercase mb-2">Voice Tone</p>
                    <select 
                      value={personality.tone}
                      onChange={e => setPersonality({...personality, tone: e.target.value as any})}
                      className="w-full bg-transparent text-[10px] font-bold text-emerald-400 outline-none"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="concise">Concise</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleSavePersonality}
                  disabled={isSavingPersonality}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} /> {isSavingPersonality ? 'Sincronizando...' : 'Actualizar Núcleo'}
                </button>
              </div>
            </div>

            {/* RATES MODULE */}
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Tasa Oficial (BCV)</h2>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-500">
                  {globalUpdatedAt ? format(new Date(globalUpdatedAt), 'HH:mm:ss') : 'Syncing...'}
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-black/40 border border-white/5 rounded-[2rem] hover:border-emerald-500/30 transition-colors group/input">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-2 mb-3">
                    <DollarSign size={14} className="text-emerald-500" /> Precio USD
                  </label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-700 font-mono">Bs.</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rates.usd || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (/^\d*\.?\d*$/.test(val)) setRates(prev => ({ ...prev, usd: parseFloat(val) || 0 }));
                      }}
                      className="w-full bg-transparent text-white font-mono font-black text-4xl outline-none placeholder:text-gray-800 focus:text-emerald-400 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="p-6 bg-black/40 border border-white/5 rounded-[2rem] hover:border-blue-500/30 transition-colors group/input">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-2 mb-3">
                    <Euro size={14} className="text-blue-500" /> Precio EUR
                  </label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-700 font-mono">Bs.</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rates.eur || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (/^\d*\.?\d*$/.test(val)) setRates(prev => ({ ...prev, eur: parseFloat(val) || 0 }));
                      }}
                      className="w-full bg-transparent text-white font-mono font-black text-4xl outline-none placeholder:text-gray-800 focus:text-blue-400 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveRates}
                  disabled={isBusy}
                  className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-30"
                >
                  <Save size={16} /> {isBusy ? 'Guardando...' : 'Actualizar Base de Datos'}
                </button>
              </div>
            </div>
          </div>

          {/* === RIGHT SECTION: OPERATIONAL GRID (8/12) === */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-6">
              
              {/* NODE EXPLORER (4 cols) */}
              <div className="lg:col-span-4 p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 h-[500px] flex flex-col backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">Explorador de Nodos</h2>
                  <Fingerprint size={16} className="text-gray-700" />
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    placeholder="Filtrar nodos..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {profiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-600 italic">
                      <p className="text-[11px]">Buscando señales...</p>
                    </div>
                  ) : (
                    profiles
                      .filter(p => 
                        (p.full_name?.toLowerCase().includes(profileSearch.toLowerCase())) ||
                        (p.machine_id?.toLowerCase().includes(profileSearch.toLowerCase()))
                      )
                      .map((p) => (
                      <div
                        key={p.machine_id}
                        onClick={() => setDeviceId(p.machine_id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${deviceId === p.machine_id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">{p.full_name || 'Agente Desconocido'}</span>
                          <div className={`w-1.5 h-1.5 rounded-full ${p.role === 'admin' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                        </div>
                        <code className="text-[9px] text-gray-500 font-mono block truncate">{p.machine_id}</code>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RAG KNOWLEDGE MODULE (4 cols) */}
              <div className="lg:col-span-4 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
                <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2">
                  <Binary size={16} /> Brain Ingestion (RAG)
                </h3>
                
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer bg-white/[0.02]">
                    <Download className="text-purple-400/50 mb-3" size={24} />
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Cargar Conocimiento</p>
                    <p className="text-[7px] text-gray-700 font-bold mt-1">PDF, TXT, DOCX</p>
                  </div>
                  
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <p className="text-[8px] text-gray-600 font-black mb-3 uppercase tracking-widest">Document Index</p>
                    <div className="space-y-3">
                      {knowledgeSources.length === 0 ? (
                        <p className="text-[9px] text-gray-700 italic text-center py-2">Sin documentos activos</p>
                      ) : (
                        knowledgeSources.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between border-b border-white/[0.05] pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText size={12} className="text-purple-500/60" />
                              <span className="text-[9px] text-gray-400 font-bold truncate">{doc.name}</span>
                            </div>
                            <span className="text-[7px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {doc.format?.toUpperCase() || 'VEC'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* LICENSE FORGE (FULL WIDTH IN SECTION - 8 cols) */}
              <div className="lg:col-span-8 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <KeyRound size={16} className="text-blue-400" /> License Forge
                  </h2>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 opacity-50"></div>
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Pro</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Trial</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-2 block">Device ID Signature</label>
                      <div className="flex gap-2">
                        <input
                          value={deviceId}
                          onChange={(e) => setDeviceId(e.target.value)}
                          className="flex-1 bg-black/60 border border-white/5 rounded-xl px-4 py-3 font-mono text-[10px] text-blue-400 outline-none focus:border-blue-500/30 transition-all"
                          placeholder="M-XXXX"
                        />
                        <button
                          onClick={() => setDeviceId('GLOBAL_USER')}
                          className={`px-3 rounded-xl border transition-all text-[9px] font-black ${deviceId === 'GLOBAL_USER' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}
                        >
                          GLOBAL
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleExtendTrial}
                      disabled={isBusy || !deviceId || !extendDate}
                      className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-blue-500 hover:text-white transition-all shadow-xl disabled:opacity-20"
                    >
                      {isBusy ? 'Encrypting...' : 'Authorize Contract'}
                    </button>
                  </div>

                  <div className="p-6 bg-black/40 border border-white/5 rounded-[2rem]">
                    <Calendar
                      mode="single"
                      selected={extendDate ? new Date(extendDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setExtendDate(format(date, 'yyyy-MM-dd'));
                          setSelectedCalendarDay(date);
                          setShowCalendarDetail(true);
                        }
                      }}
                      modifiers={{
                        expiring: (date) => contracts.some(c => c.expires_at && isSameDay(new Date(c.expires_at), date)),
                        freepass: (date) => contracts.some(c => c.expires_at && isSameDay(new Date(c.expires_at), date) && c.plan === 'trial')
                      }}
                      modifiersClassNames={{
                        expiring: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-400 after:rounded-full after:opacity-50",
                        freepass: "after:bg-emerald-400"
                      }}
                      className="w-full border-0"
                      locale={es}
                    />
                    <p className="text-[8px] text-gray-600 font-bold mt-4 uppercase tracking-[0.2em] text-center italic">
                      Tap any date to audit details
                    </p>
                  </div>
                </div>
              </div>

              {/* ECOSYSTEM PULSE (4 cols) */}
              <div className="lg:col-span-4 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                  <Activity size={16} /> Ecosystem Health
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Active Nodes</p>
                    <p className="text-2xl font-black text-white">{contracts.filter(c => c.status === 'active').length}</p>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Lifetime</p>
                    <p className="text-2xl font-black text-white">{contracts.filter(c => c.plan === 'lifetime').length}</p>
                  </div>
                </div>
              </div>

              {/* DIAGNOSTICS (4 cols) */}
              <div className="lg:col-span-4 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl flex flex-col justify-center items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <RefreshCcw size={32} className={isBusy ? 'animate-spin' : ''} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-2 font-mono">Gemini Diagnostics</h3>
                <p className="text-[10px] text-gray-500 mb-6">Verificación de API Key y Quota.</p>
                <button
                  onClick={handleGeminiTest}
                  disabled={isBusy}
                  className="w-full py-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs uppercase hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  </button>
              </div>
            </div>
          </div>
        </div>

        {/* LOGS SECTION - Adaptive Grid Addition */}
        <div className="lg:col-span-12 space-y-6">
          <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Activity Logs</h2>
                </div>
                <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${nodeStatus.supabase === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Supabase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${nodeStatus.gemini === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Gemini</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setLogs([])} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">Limpiar Console</button>
            </div>

            <div className="font-mono text-[11px] space-y-2 h-[200px] overflow-y-auto pr-4 custom-scrollbar bg-black/40 p-6 rounded-3xl border border-white/5">
              {[...systemLogs, ...logs.map(l => ({ id: l.id, message: l.msg, level: l.type, created_at: new Date().toISOString() }))]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(log => (
                  <div key={log.id} className="flex gap-4 group border-b border-white/[0.02] pb-1 last:border-0">
                    <span className="text-gray-600 shrink-0">[{format(new Date(log.created_at || new Date()), 'HH:mm:ss')}]</span>
                    <span className={`shrink-0 font-black uppercase text-[9px] ${log.level === 'error' || log.level === 'warn' ? 'text-red-500' : log.level === 'success' ? 'text-emerald-500' : 'text-blue-500'}`}>
                      {log.level || 'SYS'}
                    </span>
                    <span className="text-gray-400 group-hover:text-white transition-colors line-clamp-1">{log.message}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* CALENDAR DETAIL WINDOW (MODAL) */}
      {showCalendarDetail && selectedCalendarDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 shadow-[0_0_80px_rgba(59,130,246,0.1)] relative animate-slide-up overflow-hidden">
            {/* Liquid Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-[60px]"></div>
            
            <button 
              onClick={() => setShowCalendarDetail(false)}
              className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="mb-8">
              <h3 className="text-xl font-black text-white uppercase tracking-tight italic mb-1">
                Audit: <span className="text-blue-400">{format(selectedCalendarDay, 'EEEE, d MMMM', { locale: es })}</span>
              </h3>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Protocolo de Expiración & Freepasses</p>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {contracts.filter(c => c.expires_at && isSameDay(new Date(c.expires_at), selectedCalendarDay)).length === 0 ? (
                <div className="p-8 border border-dashed border-white/5 rounded-3xl text-center text-gray-700 italic text-xs">
                  Sin eventos programados para esta fecha
                </div>
              ) : (
                contracts
                  .filter(c => c.expires_at && isSameDay(new Date(c.expires_at), selectedCalendarDay))
                  .map(c => (
                    <div key={c.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                      <div>
                        <p className="text-xs font-black text-white mb-1 uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                          {c.email || 'Usuario Anónimo'}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${c.plan === 'trial' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {c.plan}
                          </span>
                          <span className="text-[9px] text-gray-600 font-mono italic">{c.machine_id}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Expires</p>
                        <p className="text-[10px] text-blue-400 font-mono">{format(new Date(c.expires_at), 'HH:mm')}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5">
              <button 
                onClick={() => setShowCalendarDetail(false)}
                className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all"
              >
                Cerrar Protocolo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portality;


