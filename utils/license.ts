import { useAppStore } from '../store/useAppStore';
import { supabase } from '../services/supabaseClient';

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export async function autoActivateTrial(machineId: string): Promise<void> {
  const state = useAppStore.getState();
  const { license, setLicense } = state;

  // 1. Check if we have a remote contract first (Remote-First Sync)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('machine_id', machineId)
        .eq('status', 'active')
        .maybeSingle();

      if (data && !error) {
        // If we found a contract, use its data (Extended Trial or Paid License)
        setLicense({
          active: true,
          tier: data.plan as any,
          expiresAt: data.expires_at,
          token: data.token
        });
        return;
      }
    } catch (e) {
      console.error('Error syncing remote contract:', e);
    }
  }

  // 2. Default Local Auto-Trial (Modo Bunker / First Run)
  if (license.active && license.tier !== 'trial') return;
  if (license.expiresAt) return;

  const expiresAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

  setLicense({
    active: true,
    tier: 'trial',
    expiresAt,
  });
}

export async function activateChristmasPromo(machineId: string): Promise<void> {
  const state = useAppStore.getState();
  const { setLicense, license } = state;

  // Don't downgrade a lifetime user
  if (license.tier === 'lifetime') return;

  const expiresAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

  setLicense({
    active: true,
    tier: 'pro',
    expiresAt,
  });
}
