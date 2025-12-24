import React, { useState } from 'react';
import { Shield, ArrowRight, User, KeyRound } from 'lucide-react';

const ADMIN_EMAIL = 'multiversagroup@gmail.com';
const ADMIN_PASS = 'temp_password_123'; // Placeholder password
const ADMIN_PIN = '1234'; // Placeholder PIN

export const PortalView: React.FC = () => {
  const [authStep, setAuthStep] = useState<'pin' | 'login' | 'dashboard'>('pin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setAuthStep('login');
      setError('');
    } else {
      setError('PIN incorrecto');
      setPin('');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      setAuthStep('dashboard');
      setError('');
    } else {
      setError('Credenciales de administrador incorrectas.');
    }
  };

  if (authStep === 'pin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-6 p-8 bg-black/30 rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mb-2">
              <Shield size={32} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold">Acceso a Portality</h1>
            <p className="text-sm text-gray-400">Introduce tu PIN de seguridad para continuar.</p>
          </div>
          <div className="flex flex-col items-center w-full">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
              className="w-48 bg-transparent border-b-2 border-gray-600 text-center text-4xl tracking-[1em] focus:border-purple-500 outline-none transition-colors"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50" disabled={pin.length !== 4}>
            Verificar <ArrowRight size={16} />
          </button>
        </form>
      </div>
    );
  }

  if (authStep === 'login') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <form onSubmit={handleLoginSubmit} className="flex flex-col items-center gap-6 p-8 bg-black/30 rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm">
          <div className="flex flex-col items-center gap-2 text-center">
             <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-2">
              <User size={32} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Login de Administrador</h1>
            <p className="text-sm text-gray-400">Acceso restringido.</p>
          </div>
          <div className="w-full space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-white/5 border-2 border-white/10 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-colors"
              defaultValue={ADMIN_EMAIL}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-white/5 border-2 border-white/10 rounded-lg px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-colors"
              autoFocus
            />
             {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all">
            Ingresar <KeyRound size={16} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-4">Portality Dashboard</h1>
      <p className="text-lg text-gray-400">Bienvenido al panel de administración.</p>
      {/* El contenido del dashboard irá aquí */}
    </div>
  );
};
