import { supabase } from './supabaseClient';
import { RATES } from '../constants';

export type GlobalRates = {
  USD: number;
  EUR: number;
  prevUSD?: number;
  prevEUR?: number;
  updatedAt?: string | null
};

// Cache configuration for Modo Bunker (24 hours)
const RATES_CACHE_KEY = 'calculatu_rates_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedRates {
  rates: GlobalRates;
  cachedAt: number;
}

function getCachedRates(): CachedRates | null {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (!cached) return null;
    const data: CachedRates = JSON.parse(cached);
    // Check if cache is still valid (< 24h)
    if (Date.now() - data.cachedAt < CACHE_TTL_MS) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedRates(rates: GlobalRates): void {
  try {
    const data: CachedRates = { rates, cachedAt: Date.now() };
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be full or unavailable
  }
}

/**
 * Fetch global rates with offline-first cache support (Modo Bunker)
 */
export async function fetchGlobalRates(): Promise<GlobalRates | null> {
  // Try fetching from Supabase
  if (supabase) {
    try {
      // Fetch latest rate
      const { data: latest, error: err1 } = await supabase
        .from('exchange_rates')
        .select('usd, eur, updated_at')
        .eq('id', 1)
        .single();

      // Fetch previous rate from history to calculate delta
      const { data: history, error: err2 } = await supabase
        .from('exchange_rates_history')
        .select('usd, eur')
        .order('created_at', { ascending: false })
        .limit(2);

      if (!err1 && latest) {
        // Find a previous rate that is different from current to show movement
        const prev = history?.find(h => h.usd !== latest.usd) || history?.[1];

        const rates: GlobalRates = {
          USD: Number(Number(latest.usd).toFixed(2)) || RATES.USD,
          EUR: Number(Number(latest.eur).toFixed(2)) || RATES.EUR,
          prevUSD: prev ? Number(Number(prev.usd).toFixed(2)) : undefined,
          prevEUR: prev ? Number(Number(prev.eur).toFixed(2)) : undefined,
          updatedAt: (latest as any).updated_at ?? null,
        };
        // Update cache on successful fetch
        setCachedRates(rates);

        // --- LAZY UPDATE TRIGGER ---
        triggerLazyUpdateIfStale(rates.updatedAt);

        return rates;
      }
    } catch {
      // Network error - fall through to cache
    }
  }

  // Modo Bunker: Use cached rates if available
  const cached = getCachedRates();
  if (cached) {
    console.log('[Modo Bunker] Using cached rates from', new Date(cached.cachedAt).toLocaleString());
    return cached.rates;
  }

  return null;
}

/**
 * Triggers the Edge Function if the current rate is older than the latest BCV publication window.
 * VET windows: 8:00 AM and 1:30 PM.
 */
async function triggerLazyUpdateIfStale(lastUpdatedAt: string | null | undefined) {
  if (!lastUpdatedAt) return;

  // VET is UTC-4
  const now = new Date();
  const lastUpdate = new Date(lastUpdatedAt);

  // Helper to get a Date object for a specific hour/min today in VET (converted to local)
  const getTodayVET = (hours: number, minutes: number) => {
    const d = new Date();
    // VET is UTC-4. To get 8:00 AM VET, we need 12:00 UTC.
    d.setUTCHours(hours + 4, minutes, 0, 0);
    return d;
  };

  const window1 = getTodayVET(8, 0);   // 8:00 AM VET
  const window2 = getTodayVET(13, 30); // 1:30 PM VET

  const needsUpdate =
    (now > window1 && lastUpdate < window1) ||
    (now > window2 && lastUpdate < window2);

  if (needsUpdate) {
    console.log('[Rates] Rate is stale (BCV window passed). Triggering update...');
    try {
      // We use the supabase object's internal functions.invoke helper
      if (supabase) {
        await (supabase as any).functions.invoke('bcv-rates');
        console.log('[Rates] Lazy update triggered successfully');
      }
    } catch (err) {
      console.error('[Rates] Failed to trigger lazy update:', err);
    }
  }
}

/**
 * Force refresh rates from Supabase, bypassing cache
 * Used when user manually requests an update
 */
export async function forceRefreshRates(): Promise<GlobalRates | null> {
  // Clear existing cache first
  try {
    localStorage.removeItem(RATES_CACHE_KEY);
  } catch { /* ignore */ }

  if (!supabase) return null;

  try {
    // Before fetching, trigger the update to ensure DB has latest
    await (supabase as any).functions.invoke('bcv-rates').catch(() => { });

    const { data: latest, error: err1 } = await supabase
      .from('exchange_rates')
      .select('usd, eur, updated_at')
      .eq('id', 1)
      .single();

    const { data: history, error: err2 } = await supabase
      .from('exchange_rates_history')
      .select('usd, eur')
      .order('created_at', { ascending: false })
      .limit(2);

    if (!err1 && latest) {
      const prev = history?.find(h => h.usd !== latest.usd) || history?.[1];

      const rates: GlobalRates = {
        USD: Number(Number(latest.usd).toFixed(2)),
        EUR: Number(Number(latest.eur).toFixed(2)),
        prevUSD: prev ? Number(Number(prev.usd).toFixed(2)) : undefined,
        prevEUR: prev ? Number(Number(prev.eur).toFixed(2)) : undefined,
        updatedAt: (latest as any).updated_at ?? null,
      };
      setCachedRates(rates);
      return rates;
    }
  } catch (err) {
    console.error('[Rates] Refresh error:', err);
  }

  return null;
}

export async function upsertGlobalRates(params: { USD: number; EUR: number; source?: string }) {
  if (!supabase) throw new Error('Supabase not configured');

  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Not authenticated');

  // RLS enforces admin email
  const { error } = await supabase.from('exchange_rates').upsert(
    {
      id: 1,
      usd: Number(params.USD.toFixed(2)),
      eur: Number(params.EUR.toFixed(2)),
      source: params.source || 'manual',
      updated_by: session.user.id,
    },
    { onConflict: 'id' }
  );

  if (error) throw new Error(error.message);
}

export async function getAuthEmail(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

/**
 * Sign in with email and password
 * @returns The authenticated user's email
 */
export async function signInWithPassword(email: string, password: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Provide user-friendly error messages
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Email o contraseña incorrectos');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Por favor verifica tu email antes de iniciar sesión');
    }
    throw new Error(error.message);
  }

  if (!data.user?.email) {
    throw new Error('No se pudo obtener el email del usuario');
  }

  return data.user.email;
}

/**
 * Reset password - sends recovery email
 */
export async function resetPassword(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/portality`,
  });

  if (error) {
    if (error.message.includes('rate limit')) {
      throw new Error('Demasiados intentos. Por favor espera unos minutos.');
    }
    throw new Error(error.message);
  }
}

/**
 * Update password after recovery (user must be authenticated via recovery token)
 */
export async function updatePassword(newPassword: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    if (error.message.includes('same')) {
      throw new Error('La nueva contraseña debe ser diferente a la anterior');
    }
    throw new Error(error.message);
  }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

/**
 * CORE Intelligence: Fetch system-wide stats for admin context
 */
export async function fetchCoreStats() {
  if (!supabase) return null;
  try {
    const { data: usersCount } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    const { data: activeContracts } = await supabase.from('contracts').select('count', { count: 'exact', head: true }).eq('status', 'active');
    const { data: recentGrowth } = await supabase.from('profiles').select('created_at').order('created_at', { ascending: false }).limit(5);

    return {
      totalUsers: usersCount || 0,
      activeSubscriptions: activeContracts || 0,
      recentActivity: recentGrowth?.map(u => u.created_at) || [],
      systemStatus: 'OPERATIONAL',
      platform: 'Multiversa Core V1'
    };
  } catch (err) {
    console.error('[CoreStats] Error:', err);
    return null;
  }
}

/**
 * Fetch historical rates for visualization
 */
export async function fetchHistoricalRates(limit: number = 30) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('exchange_rates_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[HistoricalRates] Error:', err);
    return [];
  }
}







