import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTemporaryFreeTrialActive, autoActivateTrial } from './license';
import { useAppStore } from '../store/useAppStore';

// Mock Supabase to return null for contracts/profiles by default
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}));

describe('Free Access Time-Bomb Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useAppStore.getState().clearLicense();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isTemporaryFreeTrialActive', () => {
    it('should be active before Jan 1, 2026', () => {
      vi.setSystemTime(new Date('2025-12-31T23:59:59Z'));
      expect(isTemporaryFreeTrialActive()).toBe(true);
    });

    it('should be inactive on or after Jan 1, 2026', () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      expect(isTemporaryFreeTrialActive()).toBe(false);
    });
  });

  describe('autoActivateTrial with Temporary Pass', () => {
    it('should set the special 2026 free pass if active', async () => {
      vi.setSystemTime(new Date('2025-12-27T12:00:00Z'));
      const machineId = 'M-TEST-FREE';
      
      await autoActivateTrial(machineId);
      
      const state = useAppStore.getState();
      expect(state.license.active).toBe(true);
      expect(state.license.token).toBe('TEMP_FREE_PASS_2026');
      expect(state.license.expiresAt).toBe('2026-01-01T00:00:00Z');
      expect(state.license.featureToken?.features).toContain('voice');
    });

    it('should NOT overwrite an existing lifetime license even during free trial', async () => {
      vi.setSystemTime(new Date('2025-12-27T12:00:00Z'));
      const existingLicense = {
        active: true,
        tier: 'lifetime' as const,
        expiresAt: null,
        token: 'LIFETIME-TOKEN',
        featureToken: null
      };
      useAppStore.getState().setLicense(existingLicense);
      
      await autoActivateTrial('M-TEST-FREE');
      
      const state = useAppStore.getState();
      expect(state.license.tier).toBe('lifetime');
      expect(state.license.token).toBe('LIFETIME-TOKEN');
    });

    it('should NOT overwrite an existing pro license during free trial', async () => {
      vi.setSystemTime(new Date('2025-12-27T12:00:00Z'));
      const existingLicense = {
        active: true,
        tier: 'pro' as const,
        expiresAt: '2026-05-01T00:00:00Z',
        token: 'PRO-TOKEN',
        featureToken: null
      };
      useAppStore.getState().setLicense(existingLicense);
      
      await autoActivateTrial('M-TEST-FREE');
      
      const state = useAppStore.getState();
      expect(state.license.tier).toBe('pro');
      expect(state.license.token).toBe('PRO-TOKEN');
    });
  });
});
