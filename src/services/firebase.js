// ─────────────────────────────────────────────────────────────────────────────
// Services / Firebase
//
// Thin wrapper around firebase-auth + firestore that the rest of the app talks
// to. When src/config/firebase.js has empty fields the wrapper degrades to a
// no-op layer so Guest Mode keeps working exactly as before.
//
// Data model:
//   users/{uid}                         — profile doc { name, email, photoBase64, updatedAt }
//   users/{uid}/state/app               — full app state { txs, debts, budget, catBudgets, settings, updatedAt }
//
// All Firestore writes use merge:true so concurrent writes from another tab
// don't blow away unrelated fields.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const cfg = window.AH_FIREBASE_CONFIG || {};
  const ok = !!(cfg.apiKey && cfg.projectId && cfg.appId);

  let app = null, auth = null, db = null, initError = null;

  if (ok) {
    try {
      app = firebase.initializeApp(cfg);
      auth = firebase.auth();
      db   = firebase.firestore();
      // Persist sessions across tabs/refreshes (default for web — kept explicit).
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

      // If we landed here from a signInWithRedirect round-trip (e.g. mobile
      // Google sign-in), resolve it so any error code is surfaced. The
      // onAuthStateChanged listener will pick up the user separately.
      auth.getRedirectResult().catch((e) => {
        if (e && e.code && e.code !== 'auth/no-auth-event') {
          console.warn('redirect sign-in error', e);
        }
      });
    } catch (e) {
      initError = e;
      console.error('Firebase init failed:', e);
    }
  }

  function isConfigured() { return ok && !initError && !!auth; }

  function currentUser() { return auth ? auth.currentUser : null; }

  function onAuthStateChanged(cb) {
    if (!isConfigured()) { cb(null); return () => {}; }
    return auth.onAuthStateChanged(cb);
  }

  // Map Firebase auth error codes to short Bengali messages for inline display.
  function authErrorMessage(e) {
    const code = (e && e.code) || '';
    switch (code) {
      case 'auth/invalid-email':           return 'ইমেইল ঠিকানা সঠিক নয়';
      case 'auth/user-disabled':           return 'এই অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে';
      case 'auth/user-not-found':          return 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই';
      case 'auth/wrong-password':          return 'পাসওয়ার্ড মিলছে না';
      case 'auth/invalid-credential':      return 'ইমেইল বা পাসওয়ার্ড ভুল';
      case 'auth/email-already-in-use':    return 'এই ইমেইল ইতিমধ্যে ব্যবহৃত';
      case 'auth/weak-password':           return 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে';
      case 'auth/too-many-requests':       return 'অনেক চেষ্টা — কিছুক্ষণ পরে আবার চেষ্টা করুন';
      case 'auth/network-request-failed':  return 'নেটওয়ার্কে সমস্যা — সংযোগ পরীক্ষা করুন';
      case 'auth/operation-not-allowed':   return 'এই লগইন অপশন কনসোলে চালু করা নেই';
      case 'auth/popup-closed-by-user':    return 'Google উইন্ডো বন্ধ করা হয়েছে — আবার চেষ্টা করুন';
      case 'auth/cancelled-popup-request': return 'আরেকটি লগইন উইন্ডো খোলা আছে';
      case 'auth/account-exists-with-different-credential':
        return 'এই ইমেইলে অন্য পদ্ধতিতে অ্যাকাউন্ট আছে — সেই পদ্ধতিতে লগইন করুন';
      case 'auth/unauthorized-domain':
        return 'এই ডোমেইন Firebase কনসোলে অনুমোদিত নয়';
      default: return (e && e.message) || 'কিছু একটা ভুল হয়েছে';
    }
  }

  async function signUp(email, password, name) {
    if (!isConfigured()) throw new Error('Firebase not configured');
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (name) {
      try { await cred.user.updateProfile({ displayName: name }); } catch (e) { /* non-fatal */ }
    }
    return cred.user;
  }

  async function signIn(email, password) {
    if (!isConfigured()) throw new Error('Firebase not configured');
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  // Sign in with the Google account the user is already logged into in this
  // browser / on this phone. Tries popup first (fast on desktop and most
  // mobile browsers); if the browser blocks the popup, falls back to a full
  // redirect — control returns to the app via getRedirectResult on next load.
  async function signInWithGoogle() {
    if (!isConfigured()) throw new Error('Firebase not configured');
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await auth.signInWithPopup(provider);
      return result.user;
    } catch (e) {
      const code = e && e.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        // Popup unavailable (in-app browser, iOS PWAs, etc.) — full redirect.
        await auth.signInWithRedirect(provider);
        return null;
      }
      throw e;
    }
  }

  async function sendPasswordReset(email) {
    if (!isConfigured()) throw new Error('Firebase not configured');
    return auth.sendPasswordResetEmail(email);
  }

  async function signOut() {
    if (!isConfigured()) return;
    return auth.signOut();
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  async function loadProfile(uid) {
    if (!isConfigured() || !uid) return null;
    const ref = db.collection('users').doc(uid);
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
  }

  async function saveProfile(uid, profile) {
    if (!isConfigured() || !uid) return;
    const ref = db.collection('users').doc(uid);
    await ref.set({
      name: profile.name || '',
      email: profile.email || '',
      photoBase64: profile.photoBase64 || '',
      photoURL: profile.photoURL || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // ── App state (txs, debts, budget, catBudgets, settings) ──────────────────
  async function loadAppState(uid) {
    if (!isConfigured() || !uid) return null;
    const ref = db.collection('users').doc(uid).collection('state').doc('app');
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
  }

  async function saveAppState(uid, state) {
    if (!isConfigured() || !uid) return;
    const ref = db.collection('users').doc(uid).collection('state').doc('app');
    const payload = {
      txs: Array.isArray(state.txs) ? state.txs : [],
      debts: Array.isArray(state.debts) ? state.debts : [],
      budget: Number.isFinite(state.budget) ? state.budget : 0,
      catBudgets: state.catBudgets && typeof state.catBudgets === 'object' ? state.catBudgets : {},
      settings: state.settings && typeof state.settings === 'object' ? state.settings : {},
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(payload, { merge: true });
  }

  // Debounced state pusher so rapid-fire UI edits (e.g. typing a budget) don't
  // hammer Firestore. Coalesces all changes within 800ms into a single write.
  let pushTimer = null, lastPushPromise = Promise.resolve();
  function queueStatePush(uid, getState) {
    if (!isConfigured() || !uid) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      lastPushPromise = saveAppState(uid, getState()).catch(e => {
        console.warn('Firestore state push failed', e);
      });
    }, 800);
  }
  function flushStatePush(uid, getState) {
    if (!isConfigured() || !uid) return Promise.resolve();
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    return saveAppState(uid, getState()).catch(e => {
      console.warn('Firestore state flush failed', e);
    });
  }

  window.AHFirebase = {
    isConfigured,
    currentUser,
    onAuthStateChanged,
    signUp, signIn, signInWithGoogle, signOut, sendPasswordReset,
    loadProfile, saveProfile,
    loadAppState, saveAppState,
    queueStatePush, flushStatePush,
    authErrorMessage,
  };
})();
