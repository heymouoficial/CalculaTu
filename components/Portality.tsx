import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, KeyRound, Fingerprint, ShieldCheck, DollarSign, Euro, LogIn, LogOut, Save, Lock, Eye, EyeOff, Mail, Key, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { fetchGlobalRates, getAuthEmail, signInWithPassword, signOut, upsertGlobalRates, resetPassword, updatePassword } from '../services/ratesService';
import { supabase } from '../services/supabaseClient';

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
  const [contracts, setContracts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [extendDate, setExtendDate] = useState('');

  const canGenerate = useMemo(() => !!deviceId.trim() && (!!portalKey.trim() || true), [deviceId, portalKey]);
  const isAdminAuthed = authEmail === 'multiversagroup@gmail.com';

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

  const handleExtendTrial = async () => {
    if (!deviceId || !extendDate || !isAdminAuthed) return;
    setIsBusy(true);
    setStatus('');
    try {
      const { error } = await supabase
        .from('contracts')
        .upsert({
          machine_id: deviceId,
          email: 'trial@portality.gen',
          plan: 'monthly',
          token: 'EXTENDED_VIA_DASHBOARD',
          expires_at: new Date(extendDate).toISOString(),
          status: 'active'
        }, { onConflict: 'machine_id' });

      if (error) throw error;
      setStatus('Trial extendido exitosamente ✅');
      fetchContracts();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <form onSubmit={handlePinSubmit} className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Lock className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Acceso Restringido</h2>
            <p className="text-gray-400 text-sm text-center mb-6">Ingresa el PIN de administrador</p>

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-4 text-2xl text-white text-center tracking-[0.5em] placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 font-mono"
              autoFocus
            />

            {pinError && (
              <p className="text-red-400 text-sm text-center mt-3">{pinError}</p>
            )}

            <button
              type="submit"
              disabled={pinInput.length < 4}
              className="w-full mt-6 py-3 rounded-xl bg-emerald-500 text-black font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
            >
              Verificar
            </button>
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
        }
      } catch {
        setAuthEmail(null);
      }
    };

    checkSession();

    // Listen for auth state changes (persistence)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) {
          setAuthEmail(session.user.email);
          if (session.user.email === 'multiversagroup@gmail.com') {
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
        }
      });

      return () => {
        subscription.unsubscribe();
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
    try {
      await upsertGlobalRates({ USD: globalUsd, EUR: globalEur, source: 'manual' });
      setStatus('Tasa global guardada en Supabase ✅');
      const r = await fetchGlobalRates();
      if (r) setGlobalUpdatedAt(r.updatedAt ?? null);
    } catch (e: any) {
      setStatus(e?.message || 'No pude guardar la tasa global');
    } finally {
      setIsBusy(false);
    }
  };

  // --- RENDERING ---

  if (!isAdminAuthed) {
    // === GATEKEEPER VIEW ===
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>

          <div className="text-center mb-8 relative z-10">
            <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Portality</h1>
            <p className="text-xs text-gray-500 mt-2">
              {isResettingPassword ? 'Restablecer Contraseña' : 'Acceso Administrativo Restringido'}
            </p>
          </div>

          <div className="space-y-4">
            {isResettingPassword ? (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                    <Lock size={12} /> Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 font-mono text-xs outline-none focus:border-emerald-500/50 transition-colors"
                      placeholder="••••••••"
                      disabled={isBusy}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 font-mono text-xs outline-none focus:border-emerald-500/50 transition-colors"
                      placeholder="••••••••"
                      disabled={isBusy}
                      autoComplete="new-password"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdatePassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={isBusy || !newPassword.trim() || !confirmPassword.trim()}
                  className="w-full py-4 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                >
                  <Save size={16} /> {isBusy ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </>
            ) : (
              <>
                {!isRecoveringPassword ? (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                        <Mail size={12} /> Email
                      </label>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="multiversagroup@gmail.com"
                        disabled={isBusy}
                        autoComplete="email"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                        <Key size={12} /> Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 font-mono text-xs outline-none focus:border-emerald-500/50 transition-colors"
                          placeholder="••••••••"
                          disabled={isBusy}
                          autoComplete="current-password"
                          onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAdminLogin}
                      disabled={isBusy || !adminEmail.trim() || !adminPassword.trim()}
                      className="w-full py-4 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                    >
                      <LogIn size={16} /> {isBusy ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>

                    <button
                      onClick={() => setIsRecoveringPassword(true)}
                      disabled={isBusy}
                      className="w-full py-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsRecoveringPassword(false);
                        setStatus('');
                      }}
                      className="mb-4 flex items-center gap-2 text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      <ArrowLeft size={12} /> Volver al login
                    </button>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block flex items-center gap-2">
                        <Mail size={12} /> Email para recuperación
                      </label>
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="multiversagroup@gmail.com"
                        disabled={isBusy}
                        autoComplete="email"
                        onKeyDown={(e) => e.key === 'Enter' && handleRecoverPassword()}
                      />
                      <p className="text-[10px] text-gray-500 mt-2">
                        Te enviaremos un enlace para restablecer tu contraseña.
                      </p>
                    </div>

                    <button
                      onClick={handleRecoverPassword}
                      disabled={isBusy || !adminEmail.trim()}
                      className="w-full py-4 rounded-xl bg-blue-500 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-2"
                    >
                      {isBusy ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </>
                )}
              </>
            )}

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
    <div className="min-h-screen bg-black text-white px-4 py-10 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Portality <span className="text-emerald-500">Unlocked</span></h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs text-gray-500 font-mono">{authEmail}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleAdminLogout}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* === COLUMN 1: RATES === */}
          <div className="space-y-5">
            <div className="p-6 rounded-[2rem] bg-[#111] border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-300">Tasa Global (Supabase)</h2>
                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-gray-500">
                  {globalUpdatedAt ? new Date(globalUpdatedAt).toLocaleTimeString() : 'Syncing...'}
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
                    <DollarSign size={12} className="text-blue-400" /> Precio USD (BCV)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={globalUsd || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (/^\d*\.?\d*$/.test(val)) {
                        setGlobalUsd(val as any);
                      }
                    }}
                    onBlur={() => setGlobalUsd(parseFloat(String(globalUsd)) || 0)}
                    className="w-full bg-transparent text-white font-mono font-bold text-2xl outline-none placeholder:text-gray-700"
                    placeholder="0.00"
                  />
                </div>
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
                    <Euro size={12} className="text-purple-400" /> Precio EUR (BCV)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={globalEur || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(',', '.');
                      if (/^\d*\.?\d*$/.test(val)) {
                        setGlobalEur(val as any);
                      }
                    }}
                    onBlur={() => setGlobalEur(parseFloat(String(globalEur)) || 0)}
                    className="w-full bg-transparent text-white font-mono font-bold text-2xl outline-none placeholder:text-gray-700"
                    placeholder="0.00"
                  />
                </div>

                <button
                  onClick={handleSaveGlobalRates}
                  disabled={isBusy}
                  className="w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                  <Save size={14} /> {isBusy ? 'Guardando...' : 'Publicar Tasas'}
                </button>

                {status && status.includes('Tasa') && (
                  <p className="text-center text-[10px] text-emerald-500 font-mono bg-emerald-500/10 py-2 rounded-lg">{status}</p>
                )}
              </div>
            </div>
          </div>

          {/* === COLUMN 2: LICENSES & USERS === */}
          <div className="space-y-5">
            <div className="p-6 rounded-[2rem] bg-[#111] border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-300">Usuarios Globales</h2>
                <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-500">
                  {profiles.length} REGISTRADOS
                </div>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {profiles.length === 0 ? (
                  <p className="text-[10px] text-gray-600 font-mono text-center py-8">No hay usuarios registrados aún.</p>
                ) : (
                  profiles.map((p) => (
                    <div key={p.machine_id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-white/80">{p.full_name || 'Sin Nombre'}</span>
                        <button 
                          onClick={() => {
                            setDeviceId(p.machine_id);
                            setStatus(`Usuario seleccionado: ${p.full_name || p.machine_id}`);
                          }}
                          className="text-[9px] bg-white/5 px-2 py-1 rounded text-gray-400 hover:bg-emerald-500 hover:text-black transition-all"
                        >
                          Cargar ID
                        </button>
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-[9px] text-emerald-500 font-mono">{p.machine_id}</span>
                        {p.email && <span className="text-[8px] text-gray-500">{p.email}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-[#111] border border-white/10 h-full">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 mb-6">Generador de Licencias</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Device ID (Machine Hash)</label>
                  <input
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-emerald-500/50"
                    placeholder="Pegar ID del cliente..."
                  />
                </div>

                <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                  <button
                    onClick={() => setPlan('monthly')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${plan === 'monthly' ? 'bg-emerald-500 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setPlan('lifetime')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${plan === 'lifetime' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Lifetime
                  </button>
                </div>

                {plan === 'monthly' && (
                  <div className="flex items-center gap-4 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] font-black text-gray-500 uppercase">Validez:</span>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={months}
                      onChange={(e) => setMonths(Math.max(1, Math.min(24, parseInt(e.target.value || '1', 10))))}
                      className="w-16 bg-transparent text-center font-mono font-bold border-b border-white/20 outline-none"
                    />
                    <span className="text-xs text-gray-400">meses</span>
                  </div>
                )}

                <div className="pt-4 border-t border-dashed border-gray-800">
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isBusy}
                    className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-black uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    Generar Token Firmado
                  </button>
                </div>

                {token && (
                  <div className="mt-4 animate-fade-in space-y-3">
                    <div className="relative group">
                      <textarea
                        readOnly
                        value={token}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        className="w-full h-24 bg-black/60 border border-emerald-500/30 rounded-xl p-3 font-mono text-[10px] text-emerald-500/80 outline-none resize-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        onClick={handleCopy}
                        className={`absolute top-2 right-2 p-2 rounded-lg transition-all shadow-lg ${copied ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white hover:bg-emerald-500 hover:text-black'}`}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    <button
                      onClick={handleCopy}
                      className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-black' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      {copied ? (
                        <><Check size={14} /> ¡Copiado!</>
                      ) : (
                        <><Copy size={14} /> Copiar Token de Licencia</>
                      )}
                    </button>
                  </div>
                )}

                {status && !status.includes('Tasa') && (
                  <p className="text-center text-[10px] text-gray-400 font-mono mt-2 border-t border-white/5 pt-2">{status}</p>
                )}

              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-[#111] border border-white/10">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 mb-6">Contratos Recientes</h2>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {contracts.length === 0 ? (
                  <p className="text-[10px] text-gray-600 font-mono text-center py-8">No hay contratos registrados aún.</p>
                ) : (
                  contracts.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-500">{c.machine_id}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${c.plan === 'lifetime' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {c.plan}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-gray-500">
                          Exp: {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                        </span>
                        <button
                          onClick={() => {
                            setDeviceId(c.machine_id);
                            setToken(c.token);
                            setCopied(false);
                          }}
                          className="text-[9px] text-emerald-500/50 hover:text-emerald-500 transition-colors"
                        >
                          Cargar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

                        <div className="p-6 rounded-[2rem] bg-[#111] border border-white/10">
                          <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 mb-6">Gestión de Trials</h2>
                           <div className="space-y-4">
                            <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 mb-2">
                              <button
                                onClick={() => setDeviceId('GLOBAL_USER')}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${deviceId === 'GLOBAL_USER' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                Asignar GLOBAL
                              </button>
                              <button
                                onClick={() => setDeviceId('')}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${deviceId !== 'GLOBAL_USER' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                Usuario Específico
                              </button>
                            </div>
            
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Device ID del Usuario</label>
                              <input
                                value={deviceId}
                                onChange={(e) => setDeviceId(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-blue-500/50"
                                placeholder="ID del cliente..."
                                disabled={deviceId === 'GLOBAL_USER'}
                              />
                            </div>                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Nueva Fecha de Expiración</label>
                  <input
                    type="date"
                    value={extendDate}
                    onChange={(e) => setExtendDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-500/50 text-white"
                  />
                </div>
                <button
                  onClick={handleExtendTrial}
                  disabled={isBusy || !deviceId || !extendDate}
                  className="w-full py-3 rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-400 font-black uppercase tracking-widest text-xs hover:bg-blue-500 hover:text-white transition-all disabled:opacity-30"
                >
                  {isBusy ? 'Procesando...' : 'Extender Trial / Forzar Licencia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


