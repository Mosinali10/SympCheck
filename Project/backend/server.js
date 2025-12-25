// server.js (ESM, v1 REST, fixed new-chat endpoint)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

// Serve Static Frontend Files
const FRONTEND_PATH = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_PATH));

// Config
const API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const MODEL = (process.env.GEMINI_MODEL || "models/gemini-2.5-flash").trim();
const VER = (process.env.GENAI_API_VER || "v1").trim();

console.log("Gemini key:", API_KEY ? API_KEY.slice(0, 6) + "...(hidden)" : "MISSING");
console.log("Gemini model:", MODEL);
console.log("Gemini API ver:", VER);

// Red flags
const RED_FLAGS = [
  /chest pain/i,
  /pressure in (my|the) chest/i,
  /trouble breathing|shortness of breath|difficulty breathing/i,
  /fainting|passed out/i,
  /vision loss|weakness on one side|slurred speech/i,
  /stiff neck.*fever/i,
  /severe headache/i,
  /uncontrolled bleeding|vomiting blood|black stools/i,
  /severe dehydration|no urination/i,
  /anaphylaxis|swollen lips|swollen tongue/i,
  /pregnant.*(bleeding|severe pain)/i,
  /suicidal|want to harm myself|kill myself/i,
];
const hasRedFlags = (t = "") => RED_FLAGS.some((re) => re.test(t));

// System prompt
const SYSTEM_PROMPT = `
You are SympCheck, a friendly, caring health assistant who chats naturally and comfortingly 🤗
Tone:
- 1–2 short friendly sentences
- one emoji max per message
- ask one follow-up question
- comforting tone, WhatsApp style
- NEVER give diagnoses or medicines
Formatting:
- End reply with <triage>{...}</triage>
`;

// Helpers
function extractTriageFromContent(content = "") {
  const m = content.match(/<triage>([\s\S]*?)<\/triage>/i);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
function stripTriageTag(content = "") {
  return content.replace(/<triage>[\s\S]*?<\/triage>/i, "").trim();
}

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ⭐ MUST-HAVE ENDPOINT — FIX FOR 404
app.post("/api/new-chat", (req, res) => {
  return res.json({ ok: true, message: "New chat started" });
});

// Chat
app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const { messages = [] } = req.body;

    // Emergency screen
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && hasRedFlags(lastUser.content || "")) {
      return res.json({
        role: "assistant",
        content: "This isn’t medical advice. Possible emergency signs. Please seek urgent medical care now.",
        triage: {
          triage_level: "emergency",
          red_flags_detected: ["possible emergency keyword detected"],
          next_questions: [],
          advice_short: "Seek urgent medical care now.",
          when_to_seek_help: "Immediately."
        }
      });
    }

    // ⭐ SYSTEM PROMPT FIXED -> role MUST be system
    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      })),
    ];

    const url = `https://generativelanguage.googleapis.com/${VER}/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;
    const body = { contents };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Upstream error:", r.status, data);
      return res.status(r.status).json(data);
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const full = parts.map((p) => p.text || "").join("");
    const triage = extractTriageFromContent(full);

    res.json({
      role: "assistant",
      content: stripTriageTag(full) || "Sorry, I couldn’t generate a response.",
      triage: triage || null,
    });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ role: "assistant", content: "Server error. Please try again." });
  }
});

// Health Plan Generation Endpoint
app.post("/api/generate-health-plan", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const { profile } = req.body;
    const PLAN_PROMPT = `
      You are a professional clinical nutritionist and fitness coach. 
      Generate a 7-day Health Matrix for the following profile:
      - Age: ${profile.age}
      - Sex: ${profile.sex}
      - Weight: ${profile.weight}
      - Height: ${profile.height}
      - Activity: ${profile.activity}
      - Goal: ${profile.goal}
      - Dietary: ${profile.diet}

      Return ONLY a JSON object with this structure:
      {
        "nutrition": { "strategy": "...", "daily_calories": "...", "key_foods": [] },
        "workout": { "strategy": "...", "weekly_routine": [ { "day": "Day 1", "activity": "..." } ] },
        "clinical_note": "..."
      }
    `;

    const contents = [{ role: "user", parts: [{ text: PLAN_PROMPT }] }];
    const url = `https://generativelanguage.googleapis.com/${VER}/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    const full = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Robust JSON extraction
    const jsonMatch = full.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : "{}";

    res.json(JSON.parse(cleanJson));

  } catch (err) {
    console.error("Plan error:", err);
    res.status(500).json({ error: "Failed to generate health plan." });
  }
});

// Serve index.html for all other routes (Single Page App support)
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ SympCheck Ecosystem LIVE on http://localhost:${PORT}`);
});
