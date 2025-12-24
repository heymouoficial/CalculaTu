import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore - License State', () => {
  it('should have license.tier defined as trial, freemium or lifetime by default', () => {
    const state = useAppStore.getState();
    expect(state.license).toHaveProperty('tier');
    expect(['trial', 'freemium', 'lifetime']).toContain(state.license.tier);
  });

  it('should have license.expiresAt defined as null by default', () => {
    const state = useAppStore.getState();
    expect(state.license).toHaveProperty('expiresAt');
    expect(state.license.expiresAt).toBeNull();
  });

  it('setLicense should update the license state', () => {
    const newLicense = {
      active: true,
      tier: 'lifetime' as const,
      expiresAt: '2026-01-31T23:59:59Z',
      token: 'test-token'
    };
    useAppStore.getState().setLicense(newLicense);
    expect(useAppStore.getState().license).toEqual(newLicense);
  });
});
