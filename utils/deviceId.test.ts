import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOrCreateUIC } from './deviceId';

// Mock TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

describe('getOrCreateUIC', () => {
  beforeEach(() => {
    // Force generation by simulating empty storage
    // Mock indexedDB to be missing so it falls through
    vi.stubGlobal('indexedDB', undefined);

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {
      ...global.window,
      indexedDB: undefined,
      localStorage: localStorageMock,
      navigator: {
        userAgent: 'TestAgent',
        language: 'en-US',
        languages: ['en-US'],
      },
      screen: {
        width: 100,
        height: 100,
      },
      // We expect the new implementation to use crypto
      crypto: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer)
        }
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should use SHA-256 for device fingerprinting', async () => {
    const digestSpy = vi.spyOn(window.crypto.subtle, 'digest');

    await getOrCreateUIC();

    expect(digestSpy).toHaveBeenCalled();
    const [algo, data] = digestSpy.mock.calls[0];
    expect(algo).toBe('SHA-256');
    expect(data.constructor.name).toBe('Uint8Array');
  });
});
