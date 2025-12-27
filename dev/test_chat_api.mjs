import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error('❌ ERROR: VITE_OPENAI_API_KEY or OPENAI_API_KEY not found in .env.local');
    process.exit(1);
}

console.log(`🔍 Testing API with key: ${apiKey.slice(0, 8)}...`);

async function testOpenAI() {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Say "API is working!"' }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ API Error:', response.status, error);
            return;
        }

        const data = await response.json();
        console.log('✅ Response:', data.choices[0].message.content);
    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
}

testOpenAI();
