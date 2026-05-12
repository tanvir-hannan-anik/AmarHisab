// ─────────────────────────────────────────────────────────────────────────────
// Modals / AuthModal
//
// Email-based login + signup, plus a "guest mode" escape hatch. Uses Firebase
// Auth via window.AHFirebase. Error codes are mapped to short Bengali strings
// in services/firebase.js → authErrorMessage.
//
// On successful auth, fires window dispatch `ah:auth-success` so App.jsx can
// drive guest→cloud data migration without coupling this modal to app state.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateAuth } = React;

function AuthModal({ onClose, defaultTab = 'login' }) {
  const [tab, setTab] = useStateAuth(defaultTab);
  const [name, setName] = useStateAuth('');
  const [email, setEmail] = useStateAuth('');
  const [password, setPassword] = useStateAuth('');
  const [showPw, setShowPw] = useStateAuth(false);
  const [errors, setErrors] = useStateAuth({});
  const [busy, setBusy] = useStateAuth(false);
  const [resetMsg, setResetMsg] = useStateAuth('');

  useModalShell(onClose);

  const configured = window.AHFirebase && window.AHFirebase.isConfigured();

  const validate = () => {
    const e = {};
    if (tab === 'signup' && !name.trim()) e.name = 'নাম লিখুন';
    if (!email.trim()) e.email = 'ইমেইল লিখুন';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'ইমেইল ঠিকানা সঠিক নয়';
    if (!password) e.password = 'পাসওয়ার্ড লিখুন';
    else if (password.length < 6) e.password = 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setResetMsg('');
    try {
      const user = tab === 'signup'
        ? await window.AHFirebase.signUp(email.trim(), password, name.trim())
        : await window.AHFirebase.signIn(email.trim(), password);

      window.dispatchEvent(new CustomEvent('ah:auth-success', {
        detail: { uid: user.uid, email: user.email, name: user.displayName || name.trim() || '', mode: tab },
      }));
      window.toast.success(tab === 'signup' ? 'অ্যাকাউন্ট তৈরি হয়েছে' : 'লগইন সফল');
      onClose();
    } catch (err) {
      const msg = window.AHFirebase.authErrorMessage(err);
      setErrors({ form: msg });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !busy) submit();
  };

  const handleGoogle = async () => {
    setBusy(true);
    setErrors({});
    setResetMsg('');
    try {
      const user = await window.AHFirebase.signInWithGoogle();
      // user is null when we fell back to redirect — page is about to reload.
      if (user) {
        window.dispatchEvent(new CustomEvent('ah:auth-success', {
          detail: { uid: user.uid, email: user.email, name: user.displayName || '', mode: 'google' },
        }));
        window.toast.success('Google দিয়ে লগইন সফল');
        onClose();
      }
    } catch (err) {
      if (err && err.code === 'auth/popup-closed-by-user') {
        setBusy(false);
        return; // user cancelled — no error toast, just reset state
      }
      setErrors({ form: window.AHFirebase.authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setResetMsg('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ ...errors, email: 'রিসেট লিংক পাঠাতে বৈধ ইমেইল দিন' });
      return;
    }
    try {
      setBusy(true);
      await window.AHFirebase.sendPasswordReset(email.trim());
      setResetMsg('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে');
    } catch (err) {
      setErrors({ form: window.AHFirebase.authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ah-modal-overlay" onClick={onClose}>
      <div className="ah-modal ah-auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ah-modal-head">
          <div>
            <div className="ah-modal-title">
              {tab === 'login' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
            </div>
            <div className="ah-modal-sub">
              {tab === 'login'
                ? 'ক্লাউডে আপনার হিসাব সিঙ্ক করুন — যেকোনো ডিভাইস থেকে অ্যাক্সেস'
                : 'বিনামূল্যে অ্যাকাউন্ট খুলুন এবং সব ডিভাইসে আপনার ডেটা পান'}
            </div>
          </div>
          <button className="ah-icon-btn" onClick={onClose} aria-label="বন্ধ করুন" style={{width: 32, height: 32}}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        {!configured && (
          <div className="ah-modal-body">
            <div className="ah-auth-warning">
              <div className="ah-auth-warning-ic"><Icon name="bell" size={18}/></div>
              <div>
                <div className="ah-auth-warning-title">Firebase সেট আপ করা নেই</div>
                <div className="ah-auth-warning-sub">
                  <code>src/config/firebase.js</code> এ আপনার Firebase কনফিগ যোগ করুন।
                  ততক্ষণ পর্যন্ত অতিথি মোডে অ্যাপ ব্যবহার করতে পারবেন।
                </div>
              </div>
            </div>
            <div className="ah-modal-foot">
              <button className="ah-btn ah-btn-primary" onClick={onClose} style={{width: '100%'}}>
                অতিথি মোডে চালিয়ে যান
              </button>
            </div>
          </div>
        )}

        {configured && (
          <>
            <div className="ah-modal-body">
              <div className="ah-segment ah-auth-tabs">
                <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setErrors({}); setResetMsg(''); }}>
                  লগইন
                </button>
                <button className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setErrors({}); setResetMsg(''); }}>
                  সাইন আপ
                </button>
              </div>

              <button
                type="button"
                className="ah-auth-google"
                onClick={handleGoogle}
                disabled={busy}
              >
                <span className="ah-auth-google-ic"><Icon name="google" size={18}/></span>
                <span className="ah-auth-google-label">
                  {tab === 'signup' ? 'Google দিয়ে সাইন আপ' : 'Google দিয়ে লগইন'}
                </span>
              </button>

              <div className="ah-auth-divider"><span>অথবা</span></div>

              {tab === 'signup' && (
                <div className="ah-field">
                  <label className="ah-field-label">আপনার নাম</label>
                  <input
                    className={'ah-input' + (errors.name ? ' err' : '')}
                    placeholder="যেমন: রাহুল আহমেদ"
                    value={name}
                    maxLength={60}
                    onChange={e => { setName(e.target.value); if (errors.name) setErrors({ ...errors, name: undefined }); }}
                    onKeyDown={onKeyDown}
                    autoFocus
                  />
                  <FieldError msg={errors.name}/>
                </div>
              )}

              <div className="ah-field">
                <label className="ah-field-label">ইমেইল</label>
                <input
                  className={'ah-input' + (errors.email ? ' err' : '')}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                  onKeyDown={onKeyDown}
                  autoFocus={tab === 'login'}
                />
                <FieldError msg={errors.email}/>
              </div>

              <div className="ah-field">
                <label className="ah-field-label">পাসওয়ার্ড</label>
                <div className="ah-auth-pw-wrap">
                  <input
                    className={'ah-input' + (errors.password ? ' err' : '')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    placeholder={tab === 'signup' ? 'অন্তত ৬ অক্ষরের পাসওয়ার্ড' : 'আপনার পাসওয়ার্ড'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                    onKeyDown={onKeyDown}
                  />
                  <button
                    type="button"
                    className="ah-auth-pw-toggle"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
                  >
                    <Icon name={showPw ? 'x' : 'search'} size={14}/>
                  </button>
                </div>
                <FieldError msg={errors.password}/>
              </div>

              {tab === 'login' && (
                <button type="button" className="ah-auth-forgot" onClick={handleReset} disabled={busy}>
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              )}

              {errors.form && (
                <div className="ah-auth-error" role="alert">
                  <Icon name="bell" size={14}/> {errors.form}
                </div>
              )}
              {resetMsg && (
                <div className="ah-auth-info" role="status">
                  <Icon name="check" size={14}/> {resetMsg}
                </div>
              )}
            </div>

            <div className="ah-modal-foot ah-auth-foot">
              <button className="ah-btn ah-btn-ghost" onClick={onClose} disabled={busy}>
                অতিথি মোডে চালিয়ে যান
              </button>
              <button className="ah-btn ah-btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'অপেক্ষা করুন…' : (tab === 'signup' ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

window.AuthModal = AuthModal;
