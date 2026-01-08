import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, KeyRound, Fingerprint, ShieldCheck, DollarSign, Euro, LogIn, LogOut, Save, Lock, Eye, EyeOff, Mail, Key, ArrowLeft, Calendar as CalendarIcon, Send, RefreshCcw, Download } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { fetchGlobalRates, getAuthEmail, signInWithPassword, signOut, upsertGlobalRates, resetPassword, updatePassword, fetchHistoricalRates } from '../services/ratesService';
import { supabase } from '../services/supabaseClient';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [globalUsd, setGlobalUsd] = useState<number>(0);
  const [globalEur, setGlobalEur] = useState<number>(0);
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState<string | null>(null);
  const [historicalRates, setHistoricalRates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profileSearch, setProfileSearch] = useState('');
  const [extendDate, setExtendDate] = useState('');

  const isAdminAuthed = authEmail === 'multiversagroup@gmail.com';

  // LOGS SYSTEM
  const [logs, setLogs] = useState<{ id: string; msg: string; type: 'info' | 'warn' | 'success'; time: string }[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [nodeStatus, setNodeStatus] = useState<{ gemini: 'online' | 'error' | 'loading', supabase: 'online' | 'error' | 'loading' }>({
    gemini: 'loading',
    supabase: 'loading'
  });

  const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      msg,
      type,
      time: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 50));
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

  const handleGeminiTest = async () => {
    addLog('Iniciando Ping Diagnóstico a Gemini...', 'info');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'ping' }),
      });

      if (response.ok) {
        const data = await response.json();
        // The API returns { text: "..." } or similar
        const responseText = data.text || data.response || '';
        addLog(`Gemini respondió: ${responseText}`, 'success');
      } else {
        const errorData = await response.json();
        const details = errorData.details || errorData.error || 'Error desconocido';
        addLog(`Gemini Test Fallido: ${response.status} - ${details}`, 'warn');
        if (details.includes('429') || details.toLowerCase().includes('quota')) {
          addLog('🚨 Confirmado: Error 429 (Quota Exceeded). La cuenta actual no tiene saldo/cuota.', 'warn');
        }
      }
    } catch (error: any) {
      addLog(`Error de conexión con el servidor: ${error.message}`, 'warn');
    }
  };

  const handleExtendTrial = async () => {
    if (!deviceId || !extendDate || !isAdminAuthed) return;

    // Date validation
    const targetDate = new Date(extendDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      setStatus('Error: No puedes asignar una fecha en el pasado.');
      addLog('Intento de extensión fallido: Fecha en el pasado', 'warn');
      return;
    }

    setIsBusy(true);
    setStatus('');
    addLog(`${deviceId === 'GLOBAL_USER' ? 'Activando Pase Global' : 'Extendiendo trial'} para ${deviceId}...`, 'info');
    try {
      const { error } = await supabase
        .from('contracts')
        .upsert({
          machine_id: deviceId,
          email: deviceId === 'GLOBAL_USER' ? 'global@portality.gen' : 'customer@portality.gen',
          plan: deviceId === 'GLOBAL_USER' ? 'lifetime' : 'monthly',
          token: 'EXTENDED_VIA_DASHBOARD',
          expires_at: targetDate.toISOString(),
          status: 'active'
        }, { onConflict: 'machine_id' });

      if (error) throw error;
      setStatus('Trial extendido exitosamente ✅');
      addLog(`Trial extendido: ${deviceId} hasta ${extendDate}`, 'success');
      fetchContracts();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      addLog(`Error extendiendo trial: ${e.message}`, 'warn');
    } finally {
      setIsBusy(false);
    }
  };

  const fetchContracts = async () => {
    if (!isAdminAuthed) return;
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setContracts(data || []);
    } catch (e) {
      console.error('Error fetching contracts:', e);
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

    // Check session on mount and listen for auth changes
    const checkSession = async () => {
      try {
        const email = await getAuthEmail();
        setAuthEmail(email);
        if (email === 'multiversagroup@gmail.com') {
          fetchContracts();
          fetchProfiles();
          fetchSystemLogs();
        }
      } catch {
        setAuthEmail(null);
      }
    };

    checkSession();

    // Polling for real-time data
    const interval = setInterval(() => {
      if (authEmail === 'multiversagroup@gmail.com') {
        fetchSystemLogs();
        checkConnectivity();
      }
    }, 10000);

    const checkConnectivity = async () => {
      // Check Supabase
      if (supabase) {
        const { error } = await supabase.from('exchange_rates').select('id').eq('id', 1).single();
        setNodeStatus(prev => ({ ...prev, supabase: error ? 'error' : 'online' }));
      }

      // Check Gemini (Simple ping)
      try {
        const resp = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: 'ping' }), headers: { 'Content-Type': 'application/json' } });
        setNodeStatus(prev => ({ ...prev, gemini: resp.ok ? 'online' : 'error' }));
      } catch {
        setNodeStatus(prev => ({ ...prev, gemini: 'error' }));
      }
    };

    checkConnectivity();

    // Listen for auth state changes (persistence)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) {
          const email = session.user.email;
          setAuthEmail(email);
          if (email === 'multiversagroup@gmail.com') {
            addLog('Admin detectado. Sincronizando datos del Core...', 'info');
            fetchContracts();
            fetchProfiles();
          }
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
        }
      });

      return () => {
        subscription.unsubscribe();
        clearInterval(interval);
      };
    }

    // Fetch rates regardless, but maybe only show them if auth
    fetchGlobalRates()
      .then((r) => {
        if (!r) return;
        setGlobalUsd(r.USD);
        setGlobalEur(r.EUR);
        setGlobalUpdatedAt(r.updatedAt ?? null);
      })
      .catch(() => { });

    fetchHistoricalRates(10)
      .then(setHistoricalRates)
      .catch(() => { });
  }, [isResettingPassword]);

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

  const handleSaveGlobalRates = async () => {
    setIsBusy(true);
    setStatus('');
    addLog(`Publicando tasas manuales: $${globalUsd}...`, 'info');
    try {
      await upsertGlobalRates({ USD: globalUsd, EUR: globalEur, source: 'manual' });
      setStatus('Tasa global guardada en Supabase ✅');
      addLog(`Tasas publicadas con éxito: $${globalUsd} / €${globalEur}`, 'success');
      const r = await fetchGlobalRates();
      if (r) setGlobalUpdatedAt(r.updatedAt ?? null);
      
      const hist = await fetchHistoricalRates(10);
      setHistoricalRates(hist);
    } catch (e: any) {
      setStatus(e?.message || 'No pude guardar la tasa global');
      addLog(`Error publicando tasas: ${e.message}`, 'warn');
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
      {/* LIQUID GLASS BACKGROUND (Sincronizado con App.tsx) */}
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

          {/* === LEFT COLUMN: RATES & METRICS (4/12) === */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/10 transition-colors"></div>

              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Tasa Oficial (BCV)</h2>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-500">
                  {globalUpdatedAt ? format(new Date(globalUpdatedAt), 'HH:mm:ss') : 'Syncing...'}
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="p-6 bg-black/40 border border-white/5 rounded-[2rem] hover:border-emerald-500/30 transition-colors group/input">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-2 mb-3">
                    <DollarSign size={14} className="text-emerald-500" /> Precio USD
                  </label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-700 font-mono">Bs.</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={globalUsd || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (/^\d*\.?\d*$/.test(val)) setGlobalUsd(val as any);
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
                      value={globalEur || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (/^\d*\.?\d*$/.test(val)) setGlobalEur(val as any);
                      }}
                      className="w-full bg-transparent text-white font-mono font-black text-4xl outline-none placeholder:text-gray-800"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Trend Visualizer */}
                {historicalRates.length > 0 && (
                  <div className="px-2 pt-2">
                    <div className="flex items-end justify-between h-12 gap-1">
                      {historicalRates.slice().reverse().map((rate, i) => {
                        const min = Math.min(...historicalRates.map(r => r.usd));
                        const max = Math.max(...historicalRates.map(r => r.usd));
                        const range = max - min || 1;
                        const height = ((rate.usd - min) / range) * 100;
                        return (
                          <div
                            key={i}
                            className="bg-emerald-500/20 w-full rounded-t-sm hover:bg-emerald-500 transition-all group/bar relative"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-[8px] text-black font-bold rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                              {rate.usd.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-2 text-center">Tendencia Últimos 10 Cambios</p>
                  </div>
                )}

                <button
                  onClick={handleSaveGlobalRates}
                  disabled={isBusy}
                  className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
                >
                  <Save size={16} /> {isBusy ? 'Guardando...' : 'Actualizar Base de Datos'}
                </button>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 text-center backdrop-blur-md">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Nodos</p>
                <div className="text-2xl font-black">{profiles.length}</div>
              </div>
              <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 text-center backdrop-blur-md">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Activos</p>
                <div className="text-2xl font-black text-emerald-500">{contracts.filter(c => c.status === 'active').length}</div>
              </div>
            </div>
          </div>

          {/* === CENTER COLUMN: USERS & CONTRACTS (4/12) === */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 h-full flex flex-col backdrop-blur-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">Explorador de Nodos</h2>
                <Fingerprint size={16} className="text-gray-700" />
              </div>

              {/* Profile Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="Filtrar nodos..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50 backdrop-blur-md transition-all placeholder:text-gray-700"
                />
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {profiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-600 italic">
                    <Mail size={32} className="mb-4 opacity-10" />
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
                      onClick={() => {
                        setDeviceId(p.machine_id);
                        addLog(`Nodo seleccionado: ${p.full_name || 'Anónimo'}`, 'info');
                      }}
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

              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-[10px] font-black uppercase text-gray-600 mb-4 tracking-widest">Últimos Contratos</h3>
                <div className="space-y-2">
                  {contracts.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-black/20 text-[10px]">
                      <span className="font-mono text-gray-500">{c.machine_id.slice(0, 8)}...</span>
                      <span className={`font-black uppercase text-[8px] px-1.5 py-0.5 rounded ${c.plan === 'lifetime' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{c.plan}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* === RIGHT COLUMN: LICENSE GEN & KNOWLEDGE (4/12) === */}
          <div className="lg:col-span-4 space-y-6">
            {/* Knowledge Manager */}
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative group overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors"></div>
               <h2 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2 relative z-10">
                 <RefreshCcw size={16} /> Brain Ingestion (RAG)
               </h2>
               
               <div className="space-y-4 relative z-10">
                 <div className="border-2 border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer bg-white/[0.02] backdrop-blur-sm group/drop">
                    <Download className="text-gray-600 mb-2 group-hover/drop:text-purple-400 group-hover/drop:scale-110 transition-all" size={24} />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover/drop:text-white transition-colors">Arrastra PDF / TXT</p>
                    <p className="text-[8px] text-gray-700 mt-1">Límite 2MB • Vectorización Automática</p>
                 </div>
                 
                 <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-gray-600 font-mono mb-2 uppercase">Memoria Reciente</p>
                    <div className="space-y-2">
                       <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span className="truncate max-w-[120px]">reglas_negocio.pdf</span>
                          <span className="text-emerald-500 font-black">ACTIVE</span>
                       </div>
                       <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span className="truncate max-w-[120px]">promociones_enero.txt</span>
                          <span className="text-emerald-500 font-black">ACTIVE</span>
                       </div>
                    </div>
                 </div>
               </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl">
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-8 flex items-center gap-2">
                <KeyRound size={16} /> Forjado de Licencias
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2 block">ID del Dispositivo</label>
                  <div className="flex gap-2">
                    <input
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-emerald-400 outline-none focus:border-emerald-500/50"
                      placeholder="M-XXXX-XXXX"
                    />
                    <button
                      onClick={() => setDeviceId('GLOBAL_USER')}
                      className={`px-3 rounded-xl border transition-all text-[9px] font-black ${deviceId === 'GLOBAL_USER' ? 'bg-purple-500 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}
                    >
                      GLOBAL
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 block flex items-center gap-2">
                    <CalendarIcon size={14} className="text-blue-500" /> Vencimiento del Contrato
                  </label>

                  <div className="p-4 bg-black/40 border border-white/10 rounded-[2rem] flex justify-center overflow-hidden">
                    <Calendar
                      mode="single"
                      selected={extendDate ? new Date(extendDate) : undefined}
                      onSelect={(date) => date && setExtendDate(format(date, 'yyyy-MM-dd'))}
                      disabled={{ before: new Date() }}
                      className="rounded-xl border border-white/5 bg-black/40"
                    />
                  </div>
                </div>

                <button
                  onClick={handleExtendTrial}
                  disabled={isBusy || !deviceId || !extendDate}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black uppercase tracking-widest text-xs hover:from-blue-500 hover:to-blue-400 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-20"
                >
                  {isBusy ? 'Firmando Contrato...' : 'Firmar y Activar Licencia'}
                </button>

                {status && (
                  <p className="text-center text-[10px] font-mono p-3 bg-white/5 rounded-xl border border-white/5 text-gray-400">{status}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* === BOTTOM SECTION: REAL-TIME LOGS & DIAGNOSTICS === */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Activity Logs</h2>
                </div>
                
                {/* Node Status Mini-Dashboard */}
                <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${nodeStatus.supabase === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Supabase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${nodeStatus.gemini === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Gemini</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors"
              >
                Limpiar Consola
              </button>
            </div>

            <div className="font-mono text-[11px] space-y-2 h-[300px] overflow-y-auto pr-4 custom-scrollbar bg-black/40 p-6 rounded-3xl border border-white/5">
              {/* Persistent System Logs */}
              {systemLogs.map(log => (
                <div key={log.id} className="flex gap-4 group border-b border-white/[0.02] pb-1 mb-1 last:border-0">
                  <span className="text-gray-600 shrink-0">[{format(new Date(log.created_at), 'HH:mm:ss')}]</span>
                  <span className={`shrink-0 font-black uppercase text-[9px] ${log.level === 'error' ? 'text-red-500' : log.level === 'success' ? 'text-emerald-500' : 'text-purple-500'}`}>
                    {log.level || 'SYS'}
                  </span>
                  <span className="text-gray-400 group-hover:text-white transition-colors">{log.message}</span>
                </div>
              ))}

              {/* Session Logs (Original) */}
              {logs.map(log => (
                <div key={log.id} className="flex gap-4 group opacity-60 italic">
                  <span className="text-gray-600 shrink-0">[{log.time}]</span>
                  <span className={`shrink-0 font-bold uppercase text-[9px] ${log.type === 'success' ? 'text-emerald-500' : log.type === 'warn' ? 'text-red-500' : 'text-blue-500'}`}>
                    {log.type}
                  </span>
                  <span className="text-gray-500 group-hover:text-gray-300 transition-colors">{log.msg}</span>
                </div>
              ))}

              {logs.length === 0 && systemLogs.length === 0 && (
                <div className="text-gray-700 py-10 text-center italic">Esperando eventos del sistema...</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-3xl flex flex-col justify-center items-center text-center group">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <RefreshCcw size={32} className={isBusy ? 'animate-spin' : ''} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-2">Gemini Diagnostics</h3>
            <p className="text-[10px] text-gray-500 mb-6">Verifica si el API Key actual tiene cuota disponible y responde correctamente.</p>
            <button
              onClick={handleGeminiTest}
              disabled={isBusy}
              className="w-full py-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs uppercase hover:bg-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Send size={14} /> {isBusy ? 'Testeando...' : 'Testear Conectividad'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portality;


