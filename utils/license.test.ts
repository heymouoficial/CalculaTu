// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { autoActivateTrial } from './license';
import { useAppStore } from '../store/useAppStore';

// Mock Supabase
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          }))
        }))
      }))
    }))
  }
}));

describe('autoActivateTrial', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      license: {
        active: false,
        tier: 'trial',
        expiresAt: null,
      }
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should activate a 24h trial if no license exists (and temp trial expired)', async () => {
    // Set time to 2027 to ensure isTemporaryFreeTrialActive() returns false (expiry is 2026)
    vi.setSystemTime(new Date('2027-01-01T12:00:00Z'));

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
    // Set time to 2027
    vi.setSystemTime(new Date('2027-01-01T12:00:00Z'));
    
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
