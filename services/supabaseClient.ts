import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Direct access to import.meta.env ensures Vite can replace them at build time
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true // CRITICAL: detects #access_token from Magic Links
      }
    })
    : null;



