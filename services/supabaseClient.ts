import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnv(key: string): string | undefined {
  // Vite replaces import.meta.env at build time
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return import.meta?.env?.[key];
}

export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;



