// ─────────────────────────────────────────────────────────────────────────────
// Services / Storage
//
// localStorage is the primary store. Data is loaded eagerly into React state on
// boot and persisted on every change via App.jsx effects. Auth credentials and
// the data-version stamp also live here; bumping AH_DATA_VERSION forces a wipe
// of all user data on next page load (auth is preserved).
//
// Sync helpers live in `services/api.js` — the storage layer is local-only.
// ─────────────────────────────────────────────────────────────────────────────

const AH_KEYS = {
  txs: 'ah:txs',
  debts: 'ah:debts',
  budget: 'ah:budget',
  catBudgets: 'ah:catBudgets',
  notifications: 'ah:notifications',
  settings: 'ah:settings',
  user: 'ah:user',
  token: 'ah:token',
  version: 'ah:version',
};

// Bump this string to force-wipe legacy data on next reload. Auth survives.
const AH_DATA_VERSION = '2';
(function migrateOrReset() {
  try {
    if (localStorage.getItem(AH_KEYS.version) === AH_DATA_VERSION) return;
    [
      AH_KEYS.txs, AH_KEYS.debts, AH_KEYS.budget,
      AH_KEYS.catBudgets, AH_KEYS.notifications, AH_KEYS.settings,
    ].forEach(k => localStorage.removeItem(k));
    localStorage.setItem(AH_KEYS.version, AH_DATA_VERSION);
  } catch (e) { /* private mode / disabled storage — ignore */ }
})();

function readJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v);
  } catch (e) {
    console.warn('storage read failed', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('storage write failed', key, e);
  }
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem(AH_KEYS.token) || null; }
function setToken(t) {
  if (t) localStorage.setItem(AH_KEYS.token, t);
  else localStorage.removeItem(AH_KEYS.token);
}
function getUser() { return readJSON(AH_KEYS.user, null); }
function setUser(u) { writeJSON(AH_KEYS.user, u); }
function clearAuth() {
  setToken(null);
  localStorage.removeItem(AH_KEYS.user);
}

// ── Loaders (seed once if empty, then return stored value) ───────────────────
function loadTxs(seed) {
  const v = readJSON(AH_KEYS.txs, null);
  if (v === null) { writeJSON(AH_KEYS.txs, seed); return seed; }
  return v;
}
function loadDebts(seed) {
  const v = readJSON(AH_KEYS.debts, null);
  if (v === null) { writeJSON(AH_KEYS.debts, seed); return seed; }
  return v;
}
function loadBudget(def) {
  const v = readJSON(AH_KEYS.budget, null);
  if (v === null) { writeJSON(AH_KEYS.budget, def); return def; }
  return Number(v) || def;
}
function loadCatBudgets() { return readJSON(AH_KEYS.catBudgets, {}); }
function loadNotifications() { return readJSON(AH_KEYS.notifications, []); }

// Settings merge ensures new fields (e.g. palette, profile photo) appear even
// on older saves. `isGuest=true` is the default until Firebase Auth fires; the
// auth listener flips it to false on sign-in and back to true on sign-out.
function loadSettings() {
  const defaults = {
    name: 'অতিথি ব্যবহারকারী',
    email: '',
    photoBase64: '',
    photoURL: '',
    uid: null,
    isGuest: true,
    currency: '৳',
    notifyBudget: true,
    notifyDebt: true,
    palette: ['#1F6FB2', '#4FB38A', '#DCEBF8'],
    lang: 'bn',
  };
  const stored = readJSON(AH_KEYS.settings, null);
  return stored ? { ...defaults, ...stored } : defaults;
}

// ── Savers ───────────────────────────────────────────────────────────────────
function saveTxs(v) { writeJSON(AH_KEYS.txs, v); }
function saveDebts(v) { writeJSON(AH_KEYS.debts, v); }
function saveBudget(v) { writeJSON(AH_KEYS.budget, v); }
function saveCatBudgets(v) { writeJSON(AH_KEYS.catBudgets, v); }
function saveNotifications(v) { writeJSON(AH_KEYS.notifications, v); }

// Emits an in-page event so subscribers in the same tab can react. The native
// `storage` event only fires across tabs, which would miss our own UI.
function saveSettings(v) {
  writeJSON(AH_KEYS.settings, v);
  window.dispatchEvent(new CustomEvent('ah:settings-change', { detail: v }));
}

function resetAll(seedTx, seedDebt, defBudget) {
  saveTxs(seedTx);
  saveDebts(seedDebt);
  saveBudget(defBudget);
  saveCatBudgets({});
  saveNotifications([]);
}

window.AHStorage = {
  KEYS: AH_KEYS,
  loadTxs, loadDebts, loadBudget, loadCatBudgets, loadNotifications, loadSettings,
  saveTxs, saveDebts, saveBudget, saveCatBudgets, saveNotifications, saveSettings,
  resetAll,
  getToken, setToken, getUser, setUser, clearAuth,
  // Re-exposed sync helpers from AHApi so legacy callers keep working.
  // The storage layer doesn't know how to make HTTP requests itself —
  // these are thin delegates.
  get apiFetch() { return window.AHApi.apiFetch; },
  get apiPing()  { return window.AHApi.apiPing; },
  get syncPush() { return window.AHApi.syncPush; },
  get syncPut()  { return window.AHApi.syncPut; },
  get syncDelete() { return window.AHApi.syncDelete; },
};
