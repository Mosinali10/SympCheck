// test-fetch-v1.mjs
// What it does: sends "ping" to Gemini v1 and prints the status + JSON response.

import 'dotenv/config';

const key = (process.env.GEMINI_API_KEY || '').trim();
if (!key) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

// Use the v1 endpoint and the -latest alias to avoid 404s
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(key)}`;

const body = {
  contents: [
    { role: 'user', parts: [{ text: 'ping' }] }
  ]
};

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

console.log('status:', res.status);
console.log(await res.text());