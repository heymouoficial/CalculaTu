import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, KeyRound, Fingerprint, ShieldCheck, DollarSign, Euro, LogIn, LogOut, Save, Lock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { fetchGlobalRates, getAuthEmail, signInAdmin, verifyOtp, signOut, upsertGlobalRates } from '../services/ratesService';

type CreateResponse = {
  token: string;
  deviceId: string;
  plan: 'monthly' | 'lifetime';
  expiresAt: string | null;
};

type VerifyResponse =
  | { valid: true; plan: 'monthly' | 'lifetime'; expiresAt: string | null }
  | { valid: false; error?: string };

function copyToClipboard(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

export const Portality: React.FC = () => {
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
  const [adminOtp, setAdminOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [globalUsd, setGlobalUsd] = useState<number>(0);
  const [globalEur, setGlobalEur] = useState<number>(0);
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState<string | null>(null);

  const canGenerate = useMemo(() => !!deviceId.trim() && (!!portalKey.trim() || true), [deviceId, portalKey]);
  const isAdminAuthed = authEmail === 'multiversagroup@gmail.com';

  useEffect(() => {
    // Check session on mount
    getAuthEmail().then(setAuthEmail).catch(() => setAuthEmail(null));
    // Fetch rates regardless, but maybe only show them if auth
    fetchGlobalRates()
      .then((r) => {
        if (!r) return;
        setGlobalUsd(r.USD);
        setGlobalEur(r.EUR);
        setGlobalUpdatedAt(r.updatedAt ?? null);
      })
      .catch(() => { });
  }, []);

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
      setToken((data as CreateResponse).token);
      setStatus(`OK • ${plan.toUpperCase()} • exp: ${(data as CreateResponse).expiresAt || '—'}`);
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

  const handleCopy = () => {
    if (!token) return;
    copyToClipboard(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAdminLogin = async () => {
    setIsBusy(true);
    setStatus('');
    try {
      if (!isOtpSent) {
        await signInAdmin(adminEmail.trim());
        setIsOtpSent(true);
        setStatus('Se envió un código/link a tu correo. Revisa tu bandeja.');
      } else {
        await verifyOtp(adminEmail.trim(), adminOtp.trim());
        const email = await getAuthEmail();
        setAuthEmail(email);
        setIsOtpSent(false);
        setAdminOtp('');
        setStatus(email ? `Login OK: ${email}` : 'Login OK');
      }
    } catch (e: any) {
      setStatus(e?.message || 'Login falló');
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
            <p className="text-xs text-gray-500 mt-2">Acceso Administrativo Restringido</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Admin Email</label>
              <input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="admin@multiversa.com"
                disabled={isOtpSent}
              />
            </div>

            {isOtpSent && (
              <div className="animate-fade-in-up">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 block">Código de Verificación (OTP)</label>
                <input
                  value={adminOtp}
                  onChange={(e) => setAdminOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-emerald-900/10 border border-emerald-500/30 rounded-xl px-4 py-3 font-mono text-center text-lg tracking-widest outline-none focus:border-emerald-500 transition-colors"
                  type="text"
                  autoFocus
                />
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  Hemos enviado un código temporal a tu correo.
                </p>
              </div>
            )}

            <button
              onClick={handleAdminLogin}
              disabled={isBusy || !adminEmail.trim() || (isOtpSent && !adminOtp.trim())}
              className="w-full py-4 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2"
            >
              {isBusy ? 'Procesando...' : (isOtpSent ? 'Verificar Acceso' : 'Solicitar Acceso')}
            </button>

            {status && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono text-center">
                {status}
              </div>
            )}

            {isOtpSent && !isBusy && (
              <button
                onClick={() => { setIsOtpSent(false); setStatus(''); }}
                className="w-full py-2 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                Cancelar / Cambiar Email
              </button>
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
                    type="number"
                    step="0.01"
                    value={globalUsd || ''}
                    onChange={(e) => setGlobalUsd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-white font-mono font-bold text-2xl outline-none placeholder:text-gray-700"
                    placeholder="0.00"
                  />
                </div>
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 mb-2">
                    <Euro size={12} className="text-purple-400" /> Precio EUR (BCV)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={globalEur || ''}
                    onChange={(e) => setGlobalEur(parseFloat(e.target.value) || 0)}
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

          {/* === COLUMN 2: LICENSES === */}
          <div className="space-y-5">
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
                  <div className="mt-4 animate-fade-in relative group">
                    <textarea
                      readOnly
                      value={token}
                      className="w-full h-24 bg-black/60 border border-emerald-500/30 rounded-xl p-3 font-mono text-[10px] text-emerald-500/80 outline-none resize-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-2 bg-emerald-500 text-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )}

                {status && !status.includes('Tasa') && (
                  <p className="text-center text-[10px] text-gray-400 font-mono mt-2 border-t border-white/5 pt-2">{status}</p>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


