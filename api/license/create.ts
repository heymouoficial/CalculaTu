import { SignJWT } from 'jose';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, readJson } from './_utils';

type CreateBody = {
  deviceId?: string;
  plan?: 'monthly' | 'lifetime';
  months?: number;
};

function getEnv(name: string): string | undefined {
  return process.env[name];
}

function requirePortalKey(req: VercelRequest): boolean {
  try {
    const expected = getEnv('PORTAL_KEY');
    if (!expected) {
      console.error('[requirePortalKey] PORTAL_KEY is NOT set in environment variables.');
      return false;
    }

    // Check headers
    // headers values can be string or string[]
    const headerVal = req.headers['x-portality-key'] || req.headers['x-portal-key'];
    const provided = (Array.isArray(headerVal) ? headerVal[0] : headerVal || '').trim();

    return provided === expected.trim();
  } catch (err) {
    console.error('Error checking portal key:', err);
    return false;
  }
}

function computeExpiry(plan: 'monthly' | 'lifetime', months?: number): Date | null {
  if (plan === 'lifetime') {
    return new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
  }
  const m = Math.max(1, Math.min(24, Number.isFinite(months) ? Number(months) : 1));
  return new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('[license/create] Request received');

    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Method not allowed' });
    }

    // Check Auth
    if (!requirePortalKey(req)) {
      console.warn('[license/create] Unauthorized access attempt');
      return json(res, 401, { error: 'Unauthorized' });
    }

    const secret = getEnv('LICENSE_SIGNING_KEY');
    if (!secret) {
      console.error('[license/create] LICENSE_SIGNING_KEY missing');
      return json(res, 500, { error: 'Server configuration error: LICENSE_SIGNING_KEY not set' });
    }

    // Parse Body
    let body: CreateBody;
    try {
      body = await readJson<CreateBody>(req);
    } catch (err) {
      console.error('[license/create] Error reading body:', err);
      return json(res, 400, { error: 'Invalid JSON body' });
    }

    const deviceId = String(body.deviceId || '').trim();
    const plan = (body.plan === 'lifetime' ? 'lifetime' : 'monthly') as 'monthly' | 'lifetime';

    console.log(`[license/create] Generating license for ${deviceId} (${plan})`);

    if (!deviceId) {
      return json(res, 400, { error: 'deviceId is required' });
    }

    const expiresAt = computeExpiry(plan, body.months);
    const payload = {
      plan,
      deviceId,
      features: ['voice'],
    };

    const encoder = new TextEncoder();
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setSubject(deviceId)
      .setExpirationTime(expiresAt ? Math.floor(expiresAt.getTime() / 1000) : '100y')
      .sign(encoder.encode(secret));

    console.log('[license/create] Success');

    return json(res, 200, {
      token: jwt,
      deviceId,
      plan,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('[license/create] CRITICAL ERROR:', error);
    return json(res, 500, {
      error: error?.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
