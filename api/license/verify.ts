import { jwtVerify } from 'jose';
import { json, readJson } from './_utils';

type VerifyBody = {
  token?: string;
  deviceId?: string;
};

function getEnv(name: string): string | undefined {
  return process.env[name];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const secret = getEnv('LICENSE_SIGNING_KEY');
  if (!secret) return json(res, 500, { error: 'LICENSE_SIGNING_KEY is not set' });

  const body = (await readJson(req)) as VerifyBody;
  const token = String(body.token || '').trim();
  const deviceId = String(body.deviceId || '').trim();
  if (!token) return json(res, 400, { valid: false, error: 'token is required' });
  if (!deviceId) return json(res, 400, { valid: false, error: 'deviceId is required' });

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const sub = String(payload.sub || '');
    if (sub !== deviceId) return json(res, 200, { valid: false, error: 'Token no corresponde a este dispositivo' });

    const plan = payload.plan === 'lifetime' ? 'lifetime' : 'monthly';
    const exp = typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : null;

    return json(res, 200, { valid: true, plan, expiresAt: exp });
  } catch (e: any) {
    return json(res, 200, { valid: false, error: 'Token inválido o expirado' });
  }
}






