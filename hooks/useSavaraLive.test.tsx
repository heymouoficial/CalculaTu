import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSavaraLive } from './useSavaraLive';
import { useAppStore } from '../store/useAppStore';

// Mock the store
const { mockGetState } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: Object.assign(vi.fn(), { getState: mockGetState }),
}));

// Mock usageService
vi.mock('../services/usageService', () => ({
  syncVoiceUsage: vi.fn().mockResolvedValue(true),
  fetchVoiceUsage: vi.fn().mockResolvedValue({ usage: 0, limit: 1800 })
}));

describe('useSavaraLive', () => {
  let mockAddItem: any, mockRemoveItem: any, mockUpdateItem: any;
  let mockItems: any[];

  beforeEach(() => {
    // Setup Environment Mock
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key');
    (import.meta as any).env = { VITE_GEMINI_API_KEY: 'test-api-key' };

    // Setup Store Mock defaults
    mockAddItem = vi.fn();
    mockRemoveItem = vi.fn();
    mockUpdateItem = vi.fn();
    mockItems = [
      { id: '1', name: 'Manzanas', price: 2, currency: 'USD', quantity: 1 }
    ];

    const mockState = {
        addItem: mockAddItem,
        removeItem: mockRemoveItem,
        updateItem: mockUpdateItem,
        items: mockItems,
        rates: { USD: 50, EUR: 55 },
        userName: 'TestUser',
        setUserName: vi.fn(),
        machineId: 'test-id',
        voiceUsageSeconds: 0,
        incrementVoiceUsage: vi.fn(),
        fetchRemoteUsage: vi.fn().mockResolvedValue(undefined), // Mocked here
        license: { tier: 'monthly', active: true },
    };

    mockGetState.mockReturnValue(mockState);

    (useAppStore as any).mockImplementation((selector: (state: any) => any) => {
      return selector(mockState);
    });

    // Mock getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      writable: true,
    });

    // Mock AudioContext
    global.AudioContext = vi.fn(function () {
      return {
        audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) },
        createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
        createBuffer: vi.fn(),
        createBufferSource: vi.fn().mockReturnValue({ connect: vi.fn(), start: vi.fn() }),
        resume: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        state: 'running'
      };
    }) as any;

    // Mock AudioWorkletNode
    global.AudioWorkletNode = vi.fn(function () {
      return {
        port: { onmessage: null },
        disconnect: vi.fn()
      };
    }) as any;

    // Mock WebSocket (Default)
    const MockWebSocket = vi.fn(function () {
      return {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 0, // CONNECTING
        onopen: null,
        onerror: null,
        onclose: null,
        onmessage: null,
      };
    });
    (MockWebSocket as any).OPEN = 1;
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // vi.unstubEnv() might not be available, just letting the test environment handle teardown is often enough for envs if mocked correctly
    // or reset explicitly
    delete (import.meta as any).env.VITE_GEMINI_API_KEY;
  });

  describe('Error Handling', () => {
    it('should handle microphone permission denial', async () => {
      // Simulate permission denied error
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(permissionError);

      const { result } = renderHook(() => useSavaraLive());

      await act(async () => {
        await result.current.connect();
      });

      // Expect an error state to be present
      expect(result.current.error).not.toBeNull();
      // The hook checks for err.name === 'NotAllowedError' or message includes 'Permission denied'
      // It should return code: 'MIC_PERMISSION_DENIED'
      expect(result.current.error?.code).toBe('MIC_PERMISSION_DENIED');
    });

    it('should handle WebSocket connection error', async () => {
      // 1. Setup mock to capture the WS instance
      let wsInstance: any;
      (global.WebSocket as any).mockImplementation(function () {
        wsInstance = {
          send: vi.fn(),
          close: vi.fn(),
          readyState: 0,
          onopen: null,
          onerror: null,
          onclose: null,
          onmessage: null,
        };
        return wsInstance;
      });

      // 2. Allow getUserMedia to succeed
      (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({
         getTracks: () => [{ stop: vi.fn() }] // Return mock stream with tracks
      });

      const { result } = renderHook(() => useSavaraLive());

      await act(async () => {
        await result.current.connect();
      });

      // 3. Simulate WS Error
      expect(wsInstance).toBeDefined();
      await act(async () => {
        if (wsInstance.onerror) {
          wsInstance.onerror(new Error("Connection failed"));
        }
      });

      // 4. Assert Error State
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.code).toBe('CONNECTION_ERROR');
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Synchronization (FR3)', () => {
    it('should handle add_shopping_item tool call with quantity', async () => {
      // 1. Setup Mock WebSocket
      let wsInstance: any;
      const MockWebSocket = vi.fn(function () {
        wsInstance = {
          send: vi.fn(),
          close: vi.fn(),
          readyState: 1, // OPEN
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null
        };
        return wsInstance;
      });
      (MockWebSocket as any).OPEN = 1;
      global.WebSocket = MockWebSocket as any;

      // Allow getUserMedia
      (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      });

      const { result } = renderHook(() => useSavaraLive());

      await act(async () => {
        await result.current.connect();
      });

      // 2. Simulate Tool Call from Gemini
      const toolCallData = {
        toolCall: {
          functionCalls: [
            {
              id: 'call_456',
              name: 'add_shopping_item',
              args: {
                product_name: 'Harina',
                price: 2,
                currency: 'USD',
                quantity: 3
              }
            }
          ]
        }
      };

      await act(async () => {
        if (wsInstance.onmessage) {
          await wsInstance.onmessage({ data: JSON.stringify(toolCallData) });
        }
      });

      // 3. Verify addItem was called with correct quantity
      expect(mockAddItem).toHaveBeenCalled();
      const addedItem = mockAddItem.mock.calls[0][0];
      expect(addedItem.name).toBe('Harina');
      expect(addedItem.quantity).toBe(3);
    });

    it('should handle remove_shopping_item tool call', async () => {
      let wsInstance: any;
      (global.WebSocket as any).mockImplementation(function () { wsInstance = { send: vi.fn(), close: vi.fn(), readyState: 1, onmessage: null }; return wsInstance; });
      (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });

      const { result } = renderHook(() => useSavaraLive());
      await act(async () => { await result.current.connect(); });

      const toolCallData = { toolCall: { functionCalls: [{ id: 'call_789', name: 'remove_shopping_item', args: { product_name: 'Manzanas' } }] } };
      await act(async () => { if (wsInstance.onmessage) await wsInstance.onmessage({ data: JSON.stringify(toolCallData) }); });

      expect(mockRemoveItem).toHaveBeenCalledWith('1');
    });

    it('should handle update_shopping_item_quantity tool call', async () => {
      let wsInstance: any;
      (global.WebSocket as any).mockImplementation(function () { wsInstance = { send: vi.fn(), close: vi.fn(), readyState: 1, onmessage: null }; return wsInstance; });
      (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });

      const { result } = renderHook(() => useSavaraLive());
      await act(async () => { await result.current.connect(); });

      const toolCallData = { toolCall: { functionCalls: [{ id: 'call_abc', name: 'update_shopping_item_quantity', args: { product_name: 'Manzanas', new_quantity: 5 } }] } };
      await act(async () => { if (wsInstance.onmessage) await wsInstance.onmessage({ data: JSON.stringify(toolCallData) }); });

      expect(mockUpdateItem).toHaveBeenCalledWith('1', { ...mockItems[0], quantity: 5 });
    });
  });
});
