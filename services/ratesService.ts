import { supabase } from './supabaseClient';

export type GlobalRates = { USD: number; EUR: number; updatedAt?: string | null };

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
 * 1. Try Supabase first
 * 2. Update localStorage cache if successful
 * 3. Fall back to cache if Supabase fails
 */
export async function fetchGlobalRates(): Promise<GlobalRates | null> {
  // Try fetching from Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('usd, eur, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const rates: GlobalRates = {
          USD: Number(data.usd),
          EUR: Number(data.eur),
          updatedAt: (data as any).updated_at ?? null,
        };
        // Update cache on successful fetch
        setCachedRates(rates);
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
 * Force refresh rates from Supabase, bypassing cache
 * Used when user manually requests an update
 */
export async function forceRefreshRates(): Promise<GlobalRates | null> {
  // Clear existing cache first
  try {
    localStorage.removeItem(RATES_CACHE_KEY);
    console.log('[Rates] Cache cleared, fetching fresh rates...');
  } catch {
    // ignore
  }

  // Force fetch from Supabase
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('usd, eur, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const rates: GlobalRates = {
        USD: Number(data.usd),
        EUR: Number(data.eur),
        updatedAt: (data as any).updated_at ?? null,
      };
      // Update cache with fresh data
      setCachedRates(rates);
      console.log('[Rates] Fresh rates loaded:', rates);
      return rates;
    }
    console.error('[Rates] Error fetching:', error);
  } catch (err) {
    console.error('[Rates] Network error:', err);
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
      usd: params.USD,
      eur: params.EUR,
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
  if (!supabase) return;
  await supabase.auth.signOut();
}






