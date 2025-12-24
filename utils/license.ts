import { useAppStore } from '../store/useAppStore';

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export async function autoActivateTrial(machineId: string): Promise<void> {
  const state = useAppStore.getState();
  const { license, setLicense } = state;

  // If already active and NOT a trial, don't overwrite
  if (license.active && license.tier !== 'trial') {
    return;
  }

  // If already has an expiration date (even if expired or active), don't restart the trial
  if (license.expiresAt) {
    return;
  }

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
