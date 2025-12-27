
require('dotenv').config({ path: '../.env.local' });

const https = require('https');

const key = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!key) {
    console.error("No API Key found in env.");
    process.exit(1);
}

console.log(`Testing Key: ${key.slice(0, 6)}...${key.slice(-4)}`);

const data = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
        { role: "user", content: "Hola, ¿estás funcionando?" }
    ]
});

const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('BODY:');
        console.log(body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
