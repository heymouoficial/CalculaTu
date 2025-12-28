import type { Connect, Plugin } from 'vite';

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

export function devChatApiPlugin(config?: { apiKey?: string }): Plugin {
    return {
        name: 'dev-chat-api',
        configureServer(server) {
            console.log('[DevPlugin] 🚀 Chat API Plugin LOADED (Gemini 2.5 Optimized)');

            server.middlewares.use(async (req, res, next) => {
                if (!req.url?.startsWith('/api/chat')) return next();
                if (req.method !== 'POST') return next();

                try {
                    const body = await parseBody(req);
                    const { message, systemContext, history } = body;

                    if (!config?.apiKey) {
                        return json(res, 500, { error: 'Missing API Key' });
                    }

                    // Lógica DIRECTA con Identidad Centralizada (Sincronizada)
                    const SAVARA_SYSTEM_PROMPT = `Eres Savara, la asistente inteligente de CalculaTú.
                    Tu tono es cálido, profesional y conciso, pero informativo cuando se requiere.
                    Responde siempre en español. Sé útil.
                    
                    SOBRE CALCULATÚ: App venezolana de compras. Convierte Bs/USD/EUR con tasa BCV.
                    PROMOCIÓN: Pro GRATIS hasta 1 de Enero 2026.
                    CREADOR: Moisés Vera.`;

                    const finalSystemInstruction = systemContext
                        ? `${SAVARA_SYSTEM_PROMPT}\n\nCONTEXTO DINÁMICO:\n${systemContext}`
                        : SAVARA_SYSTEM_PROMPT;

                    const contents = [
                        ...(history || []).map((h: any) => ({
                            role: h.role === 'model' ? 'model' : 'user',
                            parts: [{ text: String(h.parts?.[0]?.text || h.text || '') }]
                        })),
                        { role: 'user', parts: [{ text: message }] }
                    ];

                    // USANDO MODELO 2.5 FLASH (Dashboard User)
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.apiKey}`;

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents,
                            systemInstruction: { parts: [{ text: finalSystemInstruction }] },
                            generationConfig: { temperature: 0.9, maxOutputTokens: 8192 }
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        console.error('[DevPlugin] API ERROR:', data);
                        return json(res, response.status, { error: 'API Error', details: data });
                    }

                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No obtuve respuesta.";
                    return json(res, 200, { text });

                } catch (error: any) {
                    return json(res, 500, { error: 'Internal Error', details: error.message });
                }
            });
        }
    };
}