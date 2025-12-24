import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoActivateTrial } from './license';
import { useAppStore } from '../store/useAppStore';

describe('autoActivateTrial', () => {
  beforeEach(() => {
    // Clear localStorage and reset store
    localStorage.clear();
    useAppStore.setState({
      license: {
        active: false,
        tier: 'trial',
        expiresAt: null,
      }
    });
  });

  it('should activate a 24h trial if no license exists', async () => {
    const machineId = 'M-TEST123';
    await autoActivateTrial(machineId);
    
    const state = useAppStore.getState();
    expect(state.license.active).toBe(true);
    expect(state.license.tier).toBe('trial');
    expect(state.license.expiresAt).not.toBeNull();
    
    const expiresAt = new Date(state.license.expiresAt!);
    const now = new Date();
    const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  });

  it('should not overwrite an existing premium license', async () => {
    const existingLicense = {
      active: true,
      tier: 'lifetime' as const,
      expiresAt: '2099-01-01T00:00:00Z',
      token: 'premium-token'
    };
    useAppStore.setState({ license: existingLicense });
    
    await autoActivateTrial('M-TEST123');
    
    expect(useAppStore.getState().license).toEqual(existingLicense);
  });
});
