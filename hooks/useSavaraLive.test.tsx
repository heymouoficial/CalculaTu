import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSavaraLive } from './useSavaraLive';

describe('useSavaraLive Error Handling', () => {
  beforeEach(() => {
    // Mock getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      writable: true,
    });
    
    // Mock AudioContext
    global.AudioContext = vi.fn(function() {
      return {
        audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) },
        createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
        createBuffer: vi.fn(),
        createBufferSource: vi.fn().mockReturnValue({ connect: vi.fn(), start: vi.fn() }),
        resume: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        state: 'running'
      };
    }) as any;
    
    // Mock WebSocket
    const MockWebSocket = vi.fn(function() {
        return {
            send: vi.fn(),
            close: vi.fn(),
            readyState: 0, // CONNECTING
        };
    });
    (MockWebSocket as any).OPEN = 1;
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle microphone permission denial', async () => {
    // Simulate permission denied error
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(permissionError);

    const { result } = renderHook(() => useSavaraLive());

    await act(async () => {
      await result.current.connect("Instruction");
    });

    // Expect an error state to be present
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe('MIC_PERMISSION_DENIED');
  });

  it('should handle WebSocket connection error', async () => {
    // 1. Setup mock to capture the WS instance
    let wsInstance: any;
    (global.WebSocket as any).mockImplementation(function() {
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
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({});

    const { result } = renderHook(() => useSavaraLive());

    await act(async () => {
      await result.current.connect("Instruction");
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
