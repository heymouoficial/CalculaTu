// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLicenseStore } from './useLicenseStore';
import { generateKeyPair, SignJWT, exportSPKI } from 'jose';
import { webcrypto } from 'node:crypto';

// Polyfill window and localStorage for Zustand persist in Node env
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

if (typeof window === 'undefined') {
    (global as any).window = {};
}
Object.defineProperty(global.window, 'localStorage', { value: localStorageMock });

// Ensure crypto is available (Node 19+ has global crypto, but just in case)
if (!global.crypto) {
    (global as any).crypto = webcrypto;
}

describe('useLicenseStore', () => {
  let privateKey: any;
  let publicKey: any;
  let publicKeyPem: string;

  beforeEach(async () => {
    useLicenseStore.getState().clearLicense();
    localStorageMock.clear();
    
    // Generate keys for testing
    const kp = await generateKeyPair('ES256');
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;
    publicKeyPem = await exportSPKI(publicKey);
  });

  it('should validate a correct token', async () => {
    const machineId = 'TEST_MACHINE_ID';
    const token = await new SignJWT({ 
        sub: machineId, 
        email: 'test@example.com',
        plan: 'pro'
    })
    .setProtectedHeader({ alg: 'ES256' })
    .setExpirationTime('1y')
    .sign(privateKey);

    const result = await useLicenseStore.getState().setLicense(token, machineId, publicKeyPem);
    
    expect(result.success).toBe(true);
    expect(useLicenseStore.getState().isPremium).toBe(true);
    expect(useLicenseStore.getState().machineId).toBe(machineId);
  });

  it('should reject token with wrong machine_id', async () => {
    const machineId = 'TEST_MACHINE_ID';
    const token = await new SignJWT({ 
        sub: 'OTHER_MACHINE', 
        email: 'test@example.com' 
    })
    .setProtectedHeader({ alg: 'ES256' })
    .setExpirationTime('1y')
    .sign(privateKey);

    const result = await useLicenseStore.getState().setLicense(token, machineId, publicKeyPem);
    
    expect(result.success).toBe(false);
    expect(useLicenseStore.getState().isPremium).toBe(false);
  });
  
  it('should reject expired token', async () => {
    const machineId = 'TEST_MACHINE_ID';
    const token = await new SignJWT({ 
        sub: machineId, 
        email: 'test@example.com' 
    })
    .setProtectedHeader({ alg: 'ES256' })
    .setExpirationTime('-1h') // Expired
    .sign(privateKey);

    const result = await useLicenseStore.getState().setLicense(token, machineId, publicKeyPem);
    
    expect(result.success).toBe(false);
  });
});