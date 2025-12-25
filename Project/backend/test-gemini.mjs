// test-gemini.mjs
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const key = (process.env.GEMINI_API_KEY || '').trim();
if (!key) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

try {
  const genAI = new GoogleGenerativeAI(key); // latest SDK -> v1
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest' });

  const result = await model.generateContent('ping');
  console.log('OK:', result.response.text());
} catch (e) {
  console.error('ERROR:', e.status || '', e.message || e);
  if (e.cause) console.error('CAUSE:', e.cause);
}