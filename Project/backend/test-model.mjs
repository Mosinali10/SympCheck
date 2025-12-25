// test-model.mjs
// Sends "ping" to the model in .env and prints status + JSON.

import 'dotenv/config';

const key = (process.env.GEMINI_API_KEY || '').trim();
const model = (process.env.GEMINI_MODEL || 'models/gemini-2.5-flash').trim();
const ver = (process.env.GENAI_API_VER || 'v1').trim();

if (!key) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

const url = `https://generativelanguage.googleapis.com/${ver}/${model}:generateContent?key=${encodeURIComponent(key)}`;
const body = { contents: [{ role: 'user', parts: [{ text: 'ping' }] }] };

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

console.log('status:', res.status);
console.log(await res.text());