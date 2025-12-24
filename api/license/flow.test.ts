// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import createHandler from './create';
import verifyHandler from './verify';

// Mock Response
class MockResponse {
  statusCode: number = 0;
  headers: Record<string, string> = {};
  body: any = null;

  setHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  
  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.body = JSON.stringify(data);
    return this;
  }

  end(data: any) {
    this.body = data;
  }
}

// Mock Request
class MockRequest {
  method: string;
  headers: Record<string, string> = {};
  body: any;
  callbacks: Record<string, Function> = {};

  constructor(method: string, body: any, headers: Record<string, string> = {}) {
    this.method = method;
    this.body = JSON.stringify(body);
    this.headers = headers;
  }

  on(event: string, callback: Function) {
    this.callbacks[event] = callback;
    if (event === 'data') {
       callback(this.body);
    }
    if (event === 'end') {
       // Trigger end immediately for simplicity in test
       setTimeout(() => callback(), 0); 
    }
  }
}

describe('License API Flow', () => {
  const SECRET_KEY = 'test-secret-key-123';
  const PORTAL_KEY = 'portal-secret';

  beforeEach(() => {
    process.env.LICENSE_SIGNING_KEY = SECRET_KEY;
    process.env.PORTAL_KEY = PORTAL_KEY;
  });

  it('should generate a valid token and verify it', async () => {
    // 1. CREATE
    const createReq = new MockRequest('POST', {
      deviceId: 'machine-123',
      plan: 'lifetime'
    }, {
      'x-portal-key': PORTAL_KEY
    });
    const createRes = new MockResponse();

    await createHandler(createReq as any, createRes as any);

    expect(createRes.statusCode).toBe(200);
    const createData = JSON.parse(createRes.body);
    expect(createData.token).toBeDefined();
    expect(createData.plan).toBe('lifetime');

    const token = createData.token;

    // 2. VERIFY
    const verifyReq = new MockRequest('POST', {
      deviceId: 'machine-123',
      token: token
    });
    const verifyRes = new MockResponse();

    await verifyHandler(verifyReq as any, verifyRes as any);

    expect(verifyRes.statusCode).toBe(200);
    const verifyData = JSON.parse(verifyRes.body);
    
    expect(verifyData.valid).toBe(true);
    expect(verifyData.plan).toBe('lifetime');
    expect(verifyData.features).toContain('voice');
  });

  it('should reject a token with mismatched deviceId', async () => {
    // 1. CREATE for Machine A
    const createReq = new MockRequest('POST', {
      deviceId: 'machine-A',
      plan: 'monthly'
    }, {
      'x-portal-key': PORTAL_KEY
    });
    const createRes = new MockResponse();
    await createHandler(createReq as any, createRes as any);
    const token = JSON.parse(createRes.body).token;

    // 2. VERIFY for Machine B
    const verifyReq = new MockRequest('POST', {
      deviceId: 'machine-B',
      token: token
    });
    const verifyRes = new MockResponse();

    await verifyHandler(verifyReq as any, verifyRes as any);

    const verifyData = JSON.parse(verifyRes.body);
    expect(verifyData.valid).toBe(false);
    expect(verifyData.error).toContain('Device Identity Mismatch'); // Check specific error message
  });
});
