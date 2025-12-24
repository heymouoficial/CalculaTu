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

describe('useAppStore - Shopping Cart', () => {
  beforeEach(() => {
    useAppStore.getState().clearItems();
  });

  it('should increment quantity when adding the same item twice (upsert)', () => {
    const item = {
      id: '1',
      name: 'Harina PAN',
      price: 1.5,
      currency: 'USD' as const,
      quantity: 1
    };
    
    useAppStore.getState().addItem(item);
    useAppStore.getState().addItem({ ...item, id: '2' }); // Same item, different ID
    
    const items = useAppStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].name).toBe('Harina PAN');
  });

  it('should add different items as separate rows', () => {
    useAppStore.getState().addItem({
      id: '1',
      name: 'Harina PAN',
      price: 1.5,
      currency: 'USD' as const,
      quantity: 1
    });
    useAppStore.getState().addItem({
      id: '2',
      name: 'Arroz',
      price: 1.2,
      currency: 'USD' as const,
      quantity: 1
    });
    
    expect(useAppStore.getState().items).toHaveLength(2);
  });
});
