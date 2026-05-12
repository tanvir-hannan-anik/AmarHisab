// ─────────────────────────────────────────────────────────────────────────────
// Components / Notify
//
// Toast + Confirm dialog primitives mounted once at the app root.
//
//   window.toast.success/error/info(message)
//   window.confirmDialog({ title, message, okLabel, cancelLabel, tone })
//      → Promise<boolean>
//
// Implemented via tiny pub-sub buses so any code can fire a toast or open a
// confirm without prop-drilling refs through the component tree.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateNotify, useEffect: useEffectNotify } = React;

const __toastBus = {
  listeners: new Set(),
  emit(t) { this.listeners.forEach(fn => fn(t)); },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};

const __confirmBus = {
  listeners: new Set(),
  emit(req) { this.listeners.forEach(fn => fn(req)); },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};

window.toast = {
  show: (message, tone = 'info', timeout = 3200) => {
    __toastBus.emit({ id: 'tst' + Date.now() + Math.random(), message, tone, timeout });
  },
  success: (m) => window.toast.show(m, 'success'),
  error: (m) => window.toast.show(m, 'error', 4500),
  info: (m) => window.toast.show(m, 'info'),
};

window.confirmDialog = (opts) => new Promise((resolve) => {
  __confirmBus.emit({ ...opts, resolve });
});

function ToastHost() {
  const [items, setItems] = useStateNotify([]);
  useEffectNotify(() => {
    return __toastBus.on((t) => {
      setItems(prev => [...prev, t]);
      setTimeout(() => {
        setItems(prev => prev.filter(x => x.id !== t.id));
      }, t.timeout);
    });
  }, []);
  return (
    <div className="ah-toast-host" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={'ah-toast ' + t.tone}>
          <span className="ic" aria-hidden="true">
            {t.tone === 'success' ? <Icon name="check" size={16}/>
              : t.tone === 'error' ? <Icon name="x" size={16}/>
              : <Icon name="bell" size={16}/>}
          </span>
          <span className="msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function ConfirmHost() {
  const [req, setReq] = useStateNotify(null);
  useEffectNotify(() => {
    return __confirmBus.on((r) => setReq(r));
  }, []);
  useEffectNotify(() => {
    if (!req) return;
    const onKey = (e) => {
      if (e.key === 'Escape') resolve(false);
      else if (e.key === 'Enter') resolve(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req]);
  if (!req) return null;
  const tone = req.tone || 'default';
  const resolve = (ok) => {
    const r = req;
    setReq(null);
    r.resolve(ok);
  };
  return (
    <div className="ah-modal-overlay" onClick={() => resolve(false)}>
      <div className="ah-modal ah-confirm" style={{maxWidth: 380}} onClick={e=>e.stopPropagation()}>
        <div className="ah-modal-head">
          <div className="ah-modal-title">{req.title || 'নিশ্চিত করুন'}</div>
        </div>
        <div className="ah-modal-body">
          <p style={{margin:0, fontSize: 14, lineHeight: 1.55, color: 'var(--fg-2)'}}>
            {req.message}
          </p>
        </div>
        <div className="ah-modal-foot">
          <button className="ah-btn ah-btn-ghost" onClick={() => resolve(false)}>
            {req.cancelLabel || 'বাতিল'}
          </button>
          <button
            className={'ah-btn ' + (tone === 'danger' ? 'ah-btn-danger' : 'ah-btn-primary')}
            onClick={() => resolve(true)}
            autoFocus
          >
            {req.okLabel || 'নিশ্চিত'}
          </button>
        </div>
      </div>
    </div>
  );
}

window.ToastHost = ToastHost;
window.ConfirmHost = ConfirmHost;
