import { SignJWT } from 'jose';
import { json, readJson } from './_utils';

type CreateBody = {
  deviceId?: string;
  plan?: 'monthly' | 'lifetime';
  months?: number;
};

function getEnv(name: string): string | undefined {
  return process.env[name];
}

function requirePortalKey(req: any): boolean {
  const expected = getEnv('PORTAL_KEY');
  if (!expected) return true; // allow if not configured
  const provided = String(req.headers['x-portality-key'] || req.headers['x-portal-key'] || '');
  return provided && provided === expected;
}

function computeExpiry(plan: 'monthly' | 'lifetime', months?: number): Date | null {
  if (plan === 'lifetime') {
    return new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
  }
  const m = Math.max(1, Math.min(24, Number.isFinite(months as any) ? Number(months) : 1));
  return new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!requirePortalKey(req)) return json(res, 401, { error: 'Unauthorized' });

  const secret = getEnv('LICENSE_SIGNING_KEY');
  if (!secret) return json(res, 500, { error: 'LICENSE_SIGNING_KEY is not set' });

  const body = (await readJson(req)) as CreateBody;
  const deviceId = String(body.deviceId || '').trim();
  const plan = (body.plan === 'lifetime' ? 'lifetime' : 'monthly') as 'monthly' | 'lifetime';

  if (!deviceId) return json(res, 400, { error: 'deviceId is required' });

  const expiresAt = computeExpiry(plan, body.months);
  const payload = {
    plan,
    deviceId,
  };

  const encoder = new TextEncoder();
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setSubject(deviceId)
    .setExpirationTime(expiresAt ? Math.floor(expiresAt.getTime() / 1000) : undefined as any)
    .sign(encoder.encode(secret));

  return json(res, 200, {
    token: jwt,
    deviceId,
    plan,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });
}






