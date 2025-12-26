import { useAppStore } from '../store/useAppStore';
import { supabase } from '../services/supabaseClient';

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export async function autoActivateTrial(machineId: string): Promise<void> {
  const state = useAppStore.getState();
  const { license, setLicense } = state;

  // 1. Check if we have a remote contract first (Remote-First Sync)
  if (supabase) {
    try {
      // 1.1 First check if the user is an admin in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('machine_id', machineId)
        .maybeSingle();

      if (profile?.role === 'admin') {
        setLicense({
          active: true,
          tier: 'lifetime',
          expiresAt: null,
          token: 'ADMIN_AUTO_SYCHRONIZED',
          featureToken: {
            uic: machineId,
            features: ['voice'],
            expiresAt: null,
            token: 'ADMIN_AUTO_SYCHRONIZED'
          }
        });
        return;
      }

      // 1.2 Check for specific machine contract
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('machine_id', machineId)
        .eq('status', 'active')
        .maybeSingle();

      if (data && !error) {
        setLicense({
          active: true,
          tier: data.plan as any,
          expiresAt: data.expires_at,
          token: data.token,
          featureToken: {
            uic: machineId,
            features: ['voice'],
            expiresAt: data.expires_at,
            token: data.token
          }
        });
        return;
      }

      // 1.3 Fallback: Check for GLOBAL_USER active contract (Universal Master Key)
      const { data: globalContract } = await supabase
        .from('contracts')
        .select('*')
        .eq('machine_id', 'GLOBAL_USER')
        .eq('status', 'active')
        .maybeSingle();

      if (globalContract) {
        setLicense({
          active: true,
          tier: globalContract.plan as any,
          expiresAt: globalContract.expires_at,
          token: globalContract.token,
          featureToken: {
            uic: machineId,
            features: ['voice'],
            expiresAt: globalContract.expires_at,
            token: globalContract.token
          }
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
