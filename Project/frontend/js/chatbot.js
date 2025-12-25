// frontend/js/chatbot.js
// Upgraded SympCheck chat logic — fits the Premium UI HTML you provided.
// Typing indicator: ChatGPT-style bubble with animated dots (Option B).
(function () {
  "use strict";

  const API = (typeof window.SYMP_CHECK_API_URL !== "undefined")
    ? window.SYMP_CHECK_API_URL
    : "http://localhost:3001/api/chat";

  // DOM refs (match your HTML)
  const messagesEl = document.getElementById("messages");
  const chatBody = document.getElementById("chatBody");
  const chatbot = document.getElementById("chatbot");
  const openBtn = document.getElementById("openBtn");
  const closeBtn = document.getElementById("closeBtn");
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("chatInput");
  const triageBadge = document.getElementById("triageBadge");
  const newChatBtn = document.getElementById("newChatBtn");

  // State
  let history = safeParse("chatHistory") || [];
  let initialized = false;
  let usingMock = false;

  // Helpers
  function safeParse(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveHistory() {
    try {
      localStorage.setItem("chatHistory", JSON.stringify(history));
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => { if (chatBody) chatBody.scrollTop = chatBody.scrollHeight; });
  }

  // Build a message node. role = "user"|"bot" (bot = assistant)
  function appendMessageNode(role, text, opts = {}) {
    if (!messagesEl) return null;
    const node = document.createElement("div");
    node.className = `message ${role}` + (opts.typing ? " typing" : "");
    if (opts.html) node.innerHTML = text;
    else node.textContent = text;
    messagesEl.appendChild(node);
    scrollToBottom();
    return node;
  }

  // Typing bubble (ChatGPT-style)
  function makeTypingNode() {
    if (!messagesEl) return null;
    const node = document.createElement("div");
    node.className = "message bot typing";
    node.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(node);
    scrollToBottom();
    return node;
  }
function setTriage(triage) {
  if (!triageBadge) return;

  // Reset classes
  triageBadge.className = "triage-badge";

  if (!triage || !triage.triage_level) {
    triageBadge.textContent = "No triage yet";
    return;
  }

  const lvl = triage.triage_level;
  let label = "Unknown";

  switch (lvl) {
    case "self_care": label = "Self-care"; break;
    case "routine": label = "Routine"; break;
    case "urgent": label = "Urgent"; break;
    case "emergency": label = "Emergency"; break;
  }

  triageBadge.textContent = label;

  // add correct level class
  triageBadge.classList.add(`triage-${lvl}`);
}

  // Render the saved history (used by openChat)
  function renderHistory() {
    if (!messagesEl) return;
    messagesEl.innerHTML = "";
    // find last triage in history (assistant messages may include triage)
    let lastTriage = null;
    history.forEach(entry => {
      const role = (entry.role === "assistant") ? "bot" : (entry.role === "user" ? "user" : "bot");
      appendMessageNode(role, entry.content || "");
      if (entry.triage) lastTriage = entry.triage;
    });
    setTriage(lastTriage);
  }

  // Minimal welcome if empty
  function showWelcomeOnce() {
    if (initialized) return;
    initialized = true;
    if (!history || history.length === 0) {
      appendMessageNode("bot", "Heeyyy there! 👋 What's on your mind today?");
      setTriage(null);
      history = history || [];
      saveHistory();
    }
  }

  // Fetch with retries and timeout (25s)
  async function fetchWithRetries(url, opts = {}, retries = 3) {
    const timeoutMs = 25000;
    for (let i = 0; i < retries; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const r = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        if (!r.ok) throw Object.assign(new Error("HTTP " + r.status), { status: r.status });
        const json = await r.json();
        return json;
      } catch (err) {
        clearTimeout(id);
        if (i === retries - 1) throw err;
        await new Promise(res => setTimeout(res, 700 * Math.pow(2, i))); // backoff
      }
    }
  }

  // Send a user message -> show typing -> call API -> append assistant reply
  async function sendMessage() {
    const text = input?.value?.trim();
    if (!text) return;
    // local echo and save
    appendMessageNode("user", text);
    history.push({ role: "user", content: text });
    saveHistory();
    input.value = "";
    input.focus();

    // typing indicator
    const typingNode = makeTypingNode();
    sendBtn.disabled = true;

    try {
      const body = { messages: history };
      let data;
      try {
        data = await fetchWithRetries(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }, 3);
      } catch (err) {
        // fallback mock
        console.warn("API unavailable, using mock response:", err);
        usingMock = true;
        data = {
          content: `Mock reply: I heard "${text}". (No live API)`,
          triage: { triage_level: "self_care" }
        };
      }

      // remove typing indicator
      if (typingNode && typingNode.parentNode) typingNode.remove();

      const replyText = data?.content || data?.message || "Sorry, I couldn't respond.";
      appendMessageNode("bot", replyText);

      // save assistant message WITH triage if present
      const assistantEntry = { role: "assistant", content: replyText };
      if (data?.triage) assistantEntry.triage = data.triage;
      history.push(assistantEntry);
      saveHistory();

      // update badge with triage (if available)
      if (data?.triage) setTriage(data.triage);
    } catch (err) {
      if (typingNode && typingNode.parentNode) typingNode.remove();
      appendMessageNode("bot", "Server error. Please try again.");
      console.error("sendMessage error:", err);
    } finally {
      sendBtn.disabled = false;
    }
  }

  // Reset local chat
  function resetChatLocal() {
    history = [];
    messagesEl.innerHTML = "";
    initialized = false;
    saveHistory();
    setTriage(null);
    showWelcomeOnce();
  }

  // Event bindings (single binding)
  function bindEvents() {
    if (openBtn) openBtn.addEventListener("click", openChat);
    if (closeBtn) closeBtn.addEventListener("click", closeChat);
    if (newChatBtn) newChatBtn.addEventListener("click", () => {
      // attempt to notify backend new-chat (best-effort)
      const newChatUrl = (typeof window.SYMP_CHECK_NEW_CHAT_URL !== "undefined") ? window.SYMP_CHECK_NEW_CHAT_URL : "/api/new-chat";
      fetch(newChatUrl, { method: "POST" }).catch(() => {});
      resetChatLocal();
    });
    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
    if (input) input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Open/close helpers
  function openChat() {
    if (!chatbot) return;
    chatbot.classList.add("open");
    chatbot.setAttribute("aria-hidden", "false");
    renderHistory();
    showWelcomeOnce();
    input?.focus();
    scrollToBottom();
  }
  function closeChat() {
    if (!chatbot) return;
    chatbot.classList.remove("open");
    chatbot.setAttribute("aria-hidden", "true");
  }

  // On load: normalize history entries (ensure shape), bind events, minimal welcome
  function boot() {
    // normalize history entries to have {role,content,triage?}
    history = Array.isArray(history) ? history.map(h => {
      return { role: h.role, content: h.content, triage: h.triage || null };
    }) : [];

    bindEvents();
    showWelcomeOnce();

    // do not auto-render full history until user opens chat; keep light initial load
    // but if you pass ?openchat=true, open automatically:
    if (location.search && location.search.includes("openchat=true")) {
      openChat();
    }
    // expose diagnostics
    window.SympCheckDiag = () => ({ api: API, historyCount: history.length, usingMock });
    // expose methods
    window.openChat = openChat;
    window.closeChat = closeChat;
    window.resetSymp = resetChatLocal;
  }

  // Start
  boot();
})();
