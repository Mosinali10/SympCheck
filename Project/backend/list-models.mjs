// list-models.mjs
// Prints models available to your API key (v1 and v1beta)

import 'dotenv/config';

const key = (process.env.GEMINI_API_KEY || '').trim();
if (!key) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

async function list(ver) {
  const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  const text = await res.text();
  console.log(`\n${ver} status:`, res.status);
  try {
    const data = JSON.parse(text);
    console.log((data.models || []).map(m => m.name));
  } catch {
    console.log(text);
  }
}

await list('v1');
await list('v1beta');