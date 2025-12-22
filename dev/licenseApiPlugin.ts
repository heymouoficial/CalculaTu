/**
 * Development-only mock for Vercel Serverless Functions
 * These APIs only work in production on Vercel, so we mock them for local dev
 */
import type { Connect, Plugin } from 'vite';
import { SignJWT, jwtVerify } from 'jose';

// Use a dev-only secret for local testing
const DEV_LICENSE_KEY = 'dev-secret-key-for-local-testing-only';

function computeExpiry(plan: 'monthly' | 'lifetime', months: number = 1): Date {
    if (plan === 'lifetime') {
        return new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
    }
    const m = Math.max(1, Math.min(24, months));
    return new Date(Date.now() + m * 30 * 24 * 60 * 60 * 1000);
}

async function parseBody(req: Connect.IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { resolve({}); }
        });
    });
}

function json(res: any, status: number, data: object) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}

export function devLicenseApiPlugin(): Plugin {
    return {
        name: 'dev-license-api',
        configureServer(server) {
            // POST /api/license/create
            server.middlewares.use('/api/license/create', async (req, res, next) => {
                if (req.method !== 'POST') return next();

                const body = await parseBody(req);
                const deviceId = String(body.deviceId || '').trim();
                const plan = (body.plan === 'lifetime' ? 'lifetime' : 'monthly') as 'monthly' | 'lifetime';
                const months = Number(body.months) || 1;

                if (!deviceId) {
                    return json(res, 400, { error: 'deviceId is required' });
                }

                const expiresAt = computeExpiry(plan, months);
                const payload = { plan, deviceId, features: ['voice'] };
                const encoder = new TextEncoder();

                try {
                    const jwt = await new SignJWT(payload)
                        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
                        .setIssuedAt()
                        .setSubject(deviceId)
                        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
                        .sign(encoder.encode(DEV_LICENSE_KEY));

                    console.log('[DEV] License created for:', deviceId, 'plan:', plan);

                    return json(res, 200, {
                        token: jwt,
                        deviceId,
                        plan,
                        expiresAt: expiresAt.toISOString(),
                    });
                } catch (err) {
                    console.error('[DEV] License creation error:', err);
                    return json(res, 500, { error: 'Failed to create license' });
                }
            });

            // POST /api/license/verify
            server.middlewares.use('/api/license/verify', async (req, res, next) => {
                if (req.method !== 'POST') return next();

                const body = await parseBody(req);
                const token = String(body.token || '').trim();
                const deviceId = String(body.deviceId || '').trim();

                if (!token) return json(res, 400, { valid: false, error: 'token is required' });
                if (!deviceId) return json(res, 400, { valid: false, error: 'deviceId is required' });

                try {
                    const { payload } = await jwtVerify(token, new TextEncoder().encode(DEV_LICENSE_KEY));
                    const sub = String(payload.sub || '');

                    if (sub !== deviceId) {
                        return json(res, 200, { valid: false, error: 'Token no corresponde a este dispositivo' });
                    }

                    const plan = payload.plan === 'lifetime' ? 'lifetime' : 'monthly';
                    const exp = typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : null;
                    const features = Array.isArray(payload.features) ? payload.features as string[] : ['voice'];

                    console.log('[DEV] License verified for:', deviceId);
                    return json(res, 200, { valid: true, plan, expiresAt: exp, features });
                } catch (err) {
                    return json(res, 200, { valid: false, error: 'Token inválido o expirado' });
                }
            });
        },
    };
}
