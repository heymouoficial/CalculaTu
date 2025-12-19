import { supabase } from './supabaseClient';

export type GlobalRates = { USD: number; EUR: number; updatedAt?: string | null };

export async function fetchGlobalRates(): Promise<GlobalRates | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('usd, eur, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    USD: Number(data.usd),
    EUR: Number(data.eur),
    updatedAt: (data as any).updated_at ?? null,
  };
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

export async function signInAdmin(email: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    }
  });
  if (error) throw new Error(error.message);
}

export async function verifyOtp(email: string, token: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}



