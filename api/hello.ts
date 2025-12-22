import { SignJWT } from 'jose';

export default async function handler(req: any, res: any) {
    try {
        // Basic test
        const secret = new TextEncoder().encode('test_secret');
        const token = await new SignJWT({ test: true })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            message: 'Hello from Vercel Functions!',
            jose_status: 'working',
            test_token: token.substring(0, 10) + '...'
        }));
    } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message, stack: err.stack }));
    }
}
