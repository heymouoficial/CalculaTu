import { jwtVerify } from 'jose';

// --- Utils Inlined ---
function json(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readJson(req: any): Promise<any> {
  const raw = await readBody(req);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
// ---------------------

type VerifyBody = {
  token?: string;
  deviceId?: string;
};

function getEnv(name: string): string | undefined {
  return process.env[name];
}

// NOTE: This is a placeholder for a real auth system.
// In a real app, you'd check a session or a proper admin API key.
function requireAdminAccess(req: any): boolean {
  try {
    // TEMPORARY: Allow access from localhost for development
    const host = req.headers['host'] || '';
    if (host.includes('localhost')) {
      return true;
    }
    const expected = getEnv('PORTAL_KEY');
    if (!expected) return true; // Allow if not configured
    const provided = String(req.headers['x-portality-key'] || req.headers['x-portal-key'] || '').trim();
    return provided === expected;
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const secret = getEnv('LICENSE_SIGNING_KEY');
    if (!secret) return json(res, 500, { error: 'LICENSE_SIGNING_KEY is not set' });

    const body = (await readJson(req)) as VerifyBody;
    const token = String(body.token || '').trim();
    const deviceId = String(body.deviceId || '').trim();

    if (!token) return json(res, 400, { valid: false, error: 'token is required' });
    if (!deviceId) return json(res, 400, { valid: false, error: 'deviceId is required' });

    console.log(`[license/verify] Verifying token for device: ${deviceId}`);

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    const sub = String(payload.sub || '');
    if (sub !== deviceId) {
      console.warn(`[license/verify] Device mismatch. Token sub: ${sub}, Request deviceId: ${deviceId}`);
      return json(res, 200, { valid: false, error: 'Token no corresponde a este dispositivo (Device Identity Mismatch)' });
    }

    const plan = payload.plan === 'lifetime' ? 'lifetime' : 'monthly';
    const exp = typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : null;

    // Extract features from payload (default to ['voice'] for Pro plans)
    const features = Array.isArray(payload.features) ? payload.features as string[] : ['voice'];

    console.log(`[license/verify] Token valid. Plan: ${plan}, Exp: ${exp}`);

    return json(res, 200, { valid: true, plan, expiresAt: exp, features });
  } catch (e: any) {
    console.error('[license/verify] Validation failed:', e.message);
    return json(res, 200, { valid: false, error: 'El token es inválido o expiró.' });
  }
}
