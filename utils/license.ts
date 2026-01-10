import { useAppStore } from '../store/useAppStore';
import { supabase } from '../services/supabaseClient';

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export async function autoActivateTrial(machineId: string): Promise<void> {
  const state = useAppStore.getState();
  const { license, setLicense } = state;

  // 1. Remote-First Sync
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

      // 1.1.5 Fallback: Check if currently authenticated user is an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: adminByEmail } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', user.email)
          .eq('role', 'admin')
          .maybeSingle();

        if (adminByEmail) {
          setLicense({
            active: true,
            tier: 'lifetime',
            expiresAt: null,
            token: 'ADMIN_AUTH_VERIFIED',
            featureToken: {
              uic: machineId,
              features: ['voice'],
              expiresAt: null,
              token: 'ADMIN_AUTH_VERIFIED'
            }
          });
          return;
        }
      }

      // 1.2 Check for specific machine contract
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('machine_id', machineId)
        .eq('status', 'active')
        .maybeSingle();

      if (data && !error) {
        // Validation: Verify if the contract is still valid
        const isExpired = data.expires_at ? new Date() > new Date(data.expires_at) : false;

        if (!isExpired) {
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
        } else {
          // Contract expired, ensure local state reflects this
          if (license.active && license.token === data.token) {
            setLicense({ ...license, active: false });
          }
        }
      }
    } catch (e) {
      console.error('Error syncing remote contract:', e);
    }
  }

  // 2. Default Local Auto-Trial (Modo Bunker / First Run)
  // Only activate trial if no other active license exists
  if (license.active) return;
  if (license.expiresAt && new Date() > new Date(license.expiresAt)) return;

  const expiresAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

  setLicense({
    active: true,
    tier: 'trial',
    expiresAt,
  });
}
