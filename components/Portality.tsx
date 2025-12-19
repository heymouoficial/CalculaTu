import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, KeyRound, Fingerprint, ShieldCheck, DollarSign, Euro, LogIn, LogOut, Save } from 'lucide-react';
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
    getAuthEmail().then(setAuthEmail).catch(() => setAuthEmail(null));
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

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Portality</h1>
            <p className="text-xs text-gray-500">Emisión/validación de licencias por huella digital (deviceId)</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* === SUPABASE ADMIN (GLOBAL RATES) === */}
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-300">Supabase • Tasa Global</h2>
                <p className="text-[10px] text-gray-500 font-mono">
                  {globalUpdatedAt ? `Última actualización: ${new Date(globalUpdatedAt).toLocaleString('es-VE')}` : '—'}
                </p>
              </div>
              {authEmail ? (
                <button
                  onClick={handleAdminLogout}
                  disabled={isBusy}
                  className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-gray-300 text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                >
                  <LogOut size={14} /> Salir
                </button>
              ) : (
                <button
                  onClick={handleAdminLogin}
                  disabled={isBusy || !adminEmail.trim() || (isOtpSent && !adminOtp.trim())}
                  className="px-3 py-2 rounded-2xl bg-emerald-500 text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                >
                  <LogIn size={14} /> {isOtpSent ? 'Verificar' : 'Login'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-black/40 border border-white/10 rounded-2xl">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <DollarSign size={12} className="text-blue-400" /> USD
                </label>
                <input
                  type="number"
                  value={globalUsd}
                  onChange={(e) => setGlobalUsd(parseFloat(e.target.value) || 0)}
                  className="mt-2 w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                />
              </div>
              <div className="p-3 bg-black/40 border border-white/10 rounded-2xl">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Euro size={12} className="text-purple-400" /> EUR
                </label>
                <input
                  type="number"
                  value={globalEur}
                  onChange={(e) => setGlobalEur(parseFloat(e.target.value) || 0)}
                  className="mt-2 w-full bg-transparent text-white font-mono font-bold text-lg outline-none"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="email"
                className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-xs outline-none focus:border-emerald-500/50"
                type="email"
                disabled={isOtpSent || isAdminAuthed}
              />
              {isOtpSent && (
                <div className="flex gap-2">
                  <input
                    value={adminOtp}
                    onChange={(e) => setAdminOtp(e.target.value)}
                    placeholder="Código de verificación (OTP)"
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-xs outline-none focus:border-emerald-500/50"
                    type="text"
                  />
                  <button
                    onClick={() => setIsOtpSent(false)}
                    className="px-4 py-2 text-[10px] text-gray-500 underline"
                  >
                    Cambiar Email
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] text-gray-500 font-mono">
                Sesión: <span className={isAdminAuthed ? 'text-emerald-400' : 'text-gray-400'}>{authEmail || '—'}</span>
              </p>
              <button
                onClick={handleAdminLogin}
                disabled={!isAdminAuthed || isBusy}
                className="px-4 py-2 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                title={!isAdminAuthed ? 'Requiere login como multiversagroup@gmail.com' : 'Publicar cambios'}
              >
                <Save size={14} /> Publicar
              </button>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
              <Fingerprint size={14} className="text-emerald-400" /> Device ID (huella)
            </div>
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-sm outline-none focus:border-emerald-500/50"
              placeholder="M-XXXXXXXXXX"
            />
            <p className="mt-2 text-[10px] text-gray-500">Tip: en el dispositivo del cliente, copia el Machine ID desde la pestaña Licencia.</p>
          </div>

          <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
              <KeyRound size={14} className="text-emerald-400" /> Portal Key (admin)
            </div>
            <input
              value={portalKey}
              onChange={(e) => setPortalKey(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-sm outline-none focus:border-emerald-500/50"
              placeholder="PORTAL_KEY (Vercel env)"
              type="password"
            />
          </div>

          <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPlan('monthly')}
                className={`py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${plan === 'monthly' ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/5'
                  }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setPlan('lifetime')}
                className={`py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${plan === 'lifetime' ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-black/40 text-gray-300 border-white/10 hover:bg-white/5'
                  }`}
              >
                Lifetime
              </button>
            </div>

            {plan === 'monthly' && (
              <div className="mt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Meses</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={months}
                  onChange={(e) => setMonths(Math.max(1, Math.min(24, parseInt(e.target.value || '1', 10))))}
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-sm outline-none focus:border-emerald-500/50"
                />
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || isBusy}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs disabled:opacity-40"
              >
                Generar Token
              </button>
              <button
                onClick={handleVerify}
                disabled={!token.trim() || !deviceId.trim() || isBusy}
                className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-black uppercase tracking-widest text-xs disabled:opacity-40"
              >
                Verificar
              </button>
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Token</label>
              <div className="mt-2 flex gap-2">
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-4 py-3 font-mono text-xs outline-none focus:border-emerald-500/50"
                  placeholder="Aquí aparece el JWT..."
                />
                <button
                  onClick={handleCopy}
                  disabled={!token.trim()}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 disabled:opacity-40"
                  title="Copiar"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              {status && <p className="mt-3 text-[11px] text-gray-400 font-mono">{status}</p>}
            </div>
          </div>
        </div>

        <p className="mt-8 text-[10px] text-gray-600 font-mono">
          Requiere variables en Vercel: <strong>LICENSE_SIGNING_KEY</strong>, opcional <strong>PORTAL_KEY</strong>, y Supabase: <strong>VITE_SUPABASE_URL</strong> + <strong>VITE_SUPABASE_ANON_KEY</strong>.
        </p>
      </div>
    </div>
  );
};


