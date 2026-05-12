// ─────────────────────────────────────────────────────────────────────────────
// Services / API client
//
// Thin REST wrapper around the optional Express backend. Reads the auth token
// from localStorage on every call so a fresh login takes effect immediately
// without a page reload. All write helpers (syncPush/syncPut/syncDelete) are
// no-ops when no token is present and never throw — the app stays usable
// offline; the API is best-effort mirroring.
// ─────────────────────────────────────────────────────────────────────────────

// API base resolution:
//   1. Explicit override via window.__AH_API_BASE  (set this in dev when the
//      static frontend lives on a different port than the Express backend —
//      e.g. Live Server on :5500 with the API on :4000).
//   2. On localhost / 127.0.0.1 / file://: default to http://localhost:4000/api
//      so a vanilla `npm start` flow works without any config.
//   3. Anywhere else (Render, custom domain, mobile via LAN IP): use the
//      page's own origin + /api. The Express server (SERVE_STATIC=1) hosts
//      the frontend and the API on the same port, so same-origin is correct.
function ahResolveApiBase() {
  if (typeof window === 'undefined') return '/api';
  if (window.__AH_API_BASE) return window.__AH_API_BASE;
  const host = window.location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }
  return window.location.origin + '/api';
}
const AH_API_BASE = ahResolveApiBase();

function getApiToken() {
  return localStorage.getItem('ah:token') || null;
}

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getApiToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(AH_API_BASE + path, { ...opts, headers });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error((data && data.error) || ('HTTP ' + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function apiPing() {
  try {
    const r = await fetch(AH_API_BASE + '/health', { method: 'GET' });
    return r.ok;
  } catch (e) {
    return false;
  }
}

// ── Best-effort sync helpers (silent on failure) ─────────────────────────────
async function syncPush(kind, payload) {
  if (!getApiToken()) return;
  try {
    await apiFetch('/' + kind, { method: 'POST', body: JSON.stringify(payload) });
  } catch (e) { /* local data is the source of truth */ }
}

async function syncPut(kind, id, payload) {
  if (!getApiToken()) return;
  try {
    await apiFetch(`/${kind}/${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify(payload),
    });
  } catch (e) { /* swallow */ }
}

async function syncDelete(kind, id) {
  if (!getApiToken()) return;
  try {
    await apiFetch(`/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) { /* swallow */ }
}

// ── AI advice (no auth required, uses server-side Groq key) ──────────────────
async function aiGetAdvice(summary) {
  const data = await apiFetch('/ai/advice', {
    method: 'POST',
    body: JSON.stringify(summary || {}),
  });
  // Detect responses that came back 200 but aren't actually AI JSON — typically
  // happens when only the static frontend is deployed (no Express backend) and
  // the host rewrites unknown paths to index.html.
  if (!data || (data.raw !== undefined) || (typeof data.summary !== 'string' && !Array.isArray(data.highlights))) {
    const err = new Error('AI সার্ভার সংযোগ করা যায়নি — ব্যাকএন্ড চলছে কিনা যাচাই করুন');
    err.code = 'ai_unreachable';
    throw err;
  }
  return data;
}

window.AHApi = {
  base: AH_API_BASE,
  apiFetch, apiPing,
  syncPush, syncPut, syncDelete,
  ai: { getAdvice: aiGetAdvice },
};
