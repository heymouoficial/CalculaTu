import type { Connect, Plugin } from 'vite';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';

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

// Simple in-memory session store for dev
let chatSession: any = null;

export function devChatApiPlugin(config?: { apiKey?: string }): Plugin {
    return {
        name: 'dev-chat-api',
        configureServer(server) {
            // POST /api/chat
            server.middlewares.use('/api/chat', async (req, res, next) => {
                if (req.method !== 'POST') return next();

                try {
                    const body = await parseBody(req);
                    const { message, systemContext, history } = body;

                    if (!message) {
                        return json(res, 400, { error: 'Message is required' });
                    }

                    // Check for API Key
                    if (!config?.apiKey) {
                        return json(res, 500, {
                            error: 'Missing API Key',
                            details: 'VITE_OPENAI_API_KEY is not defined in your .env.local file.'
                        });
                    }

                    // Create fresh session per request for dev consistency
                    const chatSession = createChatSession(config.apiKey);

                    const responseText = await sendMessageToGemini(chatSession, message, systemContext, history || []);
                    return json(res, 200, { text: responseText });
                } catch (error: any) {
                    console.error('[DEV Chat] Error processing chat request:', error.message, error.stack);
                    return json(res, 500, {
                        error: 'Failed to process chat request',
                        details: error.message || 'Unknown error'
                    });
                }
            });
        }
    };
}
