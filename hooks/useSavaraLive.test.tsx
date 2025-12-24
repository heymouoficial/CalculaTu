import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSavaraLive } from './useSavaraLive';
import { useAppStore } from '../store/useAppStore';

// Mock the store
vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

describe('useSavaraLive', () => {
  let mockAddItem: any;
  let mockItems: any[];

  beforeEach(() => {
    // Setup Store Mock defaults
    mockAddItem = vi.fn();
    mockItems = [
      { id: '1', name: 'Manzanas', price: 2, currency: 'USD', quantity: 1 }
    ];
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        addItem: mockAddItem,
        items: mockItems,
        rates: { USD: 50, EUR: 55 },
        userName: 'TestUser',
        setUserName: vi.fn(),
        machineId: 'test-id',
      };
      return selector(state);
    });

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

    // Mock AudioWorkletNode
    global.AudioWorkletNode = vi.fn(function() {
        return {
            port: { onmessage: null }
        };
    }) as any;
    
    // Mock WebSocket (Default)
    const MockWebSocket = vi.fn(function() {
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
  });

  describe('Error Handling', () => {
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

  describe('Synchronization (FR3)', () => {
    it('should handle get_shopping_list tool call', async () => {
        // 1. Setup Mock WebSocket
        let wsInstance: any;
        const MockWebSocket = vi.fn(function() {
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
        (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({});
    
        const { result } = renderHook(() => useSavaraLive());
    
        await act(async () => {
          await result.current.connect("Instruction");
        });
        
        // 2. Simulate Tool Call from Gemini
        const toolCallData = {
          toolCall: {
            functionCalls: [
              {
                id: 'call_123',
                name: 'get_shopping_list',
                args: {}
              }
            ]
          }
        };
    
        await act(async () => {
          if (wsInstance.onmessage) {
             await wsInstance.onmessage({ data: JSON.stringify(toolCallData) });
          }
        });
    
        // 3. Verify Response sent back to WS
        expect(wsInstance.send).toHaveBeenCalled();
        
        // We need to find the toolResponse message
        const toolResponseMsg = wsInstance.send.mock.calls.find((call: any[]) => {
            const parsed = JSON.parse(call[0]);
            return parsed.toolResponse !== undefined;
        });
    
        expect(toolResponseMsg).toBeDefined();
        const response = JSON.parse(toolResponseMsg[0]);
        const functionResponse = response.toolResponse.functionResponses[0];
        
        expect(functionResponse.name).toBe('get_shopping_list');
                expect(functionResponse.response.items).toHaveLength(1);
                expect(functionResponse.response.items[0].name).toBe('Manzanas');
              });
        
            it('should handle add_shopping_item tool call with quantity', async () => {
              // 1. Setup Mock WebSocket
              let wsInstance: any;
              const MockWebSocket = vi.fn(function() {
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
              (navigator.mediaDevices.getUserMedia as any).mockResolvedValue({});
          
              const { result } = renderHook(() => useSavaraLive());
          
              await act(async () => {
                await result.current.connect("Instruction");
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
          });
        
        });
        