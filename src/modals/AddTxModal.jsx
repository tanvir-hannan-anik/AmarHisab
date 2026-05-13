// ─────────────────────────────────────────────────────────────────────────────
// Modals / AddTxModal
//
// Used for both adding a new transaction and editing an existing one. Pass an
// `initial` prop to pre-fill the form. The save handler receives the payload
// and an `isEdit` boolean so the parent can decide insert vs. replace.
//
// Also declares two helpers that the other modals reuse via window:
//   - useModalShell(onClose) — Escape-to-close + body-scroll lock
//   - FieldError({ msg })    — inline error label under a form field
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateTx, useEffect: useEffectTx } = React;

function useModalShell(onClose) {
  useEffectTx(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="ah-field-error" role="alert">{msg}</div>;
}

function AddTxModal({ initial, onClose, onSave, defaultType = 'expense' }) {
  const edit = !!initial;
  const [type, setType] = useStateTx((initial && initial.kind) || defaultType);
  const [amount, setAmount] = useStateTx(initial ? String(initial.amt) : '');
  const [desc, setDesc] = useStateTx((initial && initial.desc) || '');
  const [cat, setCat] = useStateTx((initial && initial.cat) || 'food');
  const [date, setDate] = useStateTx(
    initial ? (initial.date || '').slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [errors, setErrors] = useStateTx({});
  const [saving, setSaving] = useStateTx(false);

  useModalShell(onClose);

  const validate = () => {
    const e = {};
    const n = parseInt(amount, 10);
    if (!amount.trim()) e.amount = window.t('mtx_err_amount');
    else if (!n || n <= 0) e.amount = window.t('mtx_err_invalid');
    else if (n > 9999999) e.amount = window.t('mtx_err_large');
    if (!date) e.date = window.t('mtx_err_date');
    else if (new Date(date) > new Date()) e.date = window.t('mtx_err_future');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const n = parseInt(amount, 10);
      const baseTime = initial && initial.date
        ? new Date(initial.date).toTimeString().slice(0, 8)
        : new Date().toTimeString().slice(0, 8);
      const payload = {
        id: edit ? initial.id : 't' + Date.now(),
        cat,
        desc: desc.trim() || CAT_BY_ID[cat].bn,
        amt: n,
        date: new Date(date + 'T' + baseTime).toISOString(),
        kind: type,
      };
      await onSave(payload, edit);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ah-modal-overlay" onClick={onClose}>
      <div className="ah-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ah-modal-head">
          <div className="ah-modal-title">{edit ? window.t('mtx_title_edit') : window.t('mtx_title_add')}</div>
          <button className="ah-icon-btn" onClick={onClose} aria-label={window.t('mtx_close')} style={{width: 32, height: 32}}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        <div className="ah-modal-body">
          <div className="ah-segment">
            <button className={type==='expense' ? 'active' : ''} onClick={() => setType('expense')}>{window.t('mtx_expense')}</button>
            <button className={type==='income' ? 'active' : ''} onClick={() => setType('income')}>{window.t('mtx_income')}</button>
          </div>

          <div className="ah-field">
            <label className="ah-field-label">{window.t('mtx_amount_label')}</label>
            <div style={{position: 'relative'}}>
              <span style={{position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 22, color: '#9AA3AC', fontWeight: 500}}>৳</span>
              <input
                className={'ah-input ah-input-amount' + (errors.amount ? ' err' : '')}
                style={{paddingLeft: 48}}
                placeholder="০"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amount}
                onChange={e => { setAmount(e.target.value.replace(/[^0-9]/g, '')); if (errors.amount) setErrors({...errors, amount: undefined}); }}
                autoFocus
              />
            </div>
            <FieldError msg={errors.amount}/>
          </div>

          <div className="ah-field">
            <label className="ah-field-label">{window.t('mtx_cat_label')}</label>
            <div className="ah-cat-grid">
              {CATEGORIES.map(c => {
                const cl = (window.AHLang === 'en') ? (c.en || c.bn) : c.bn;
                return (
                  <button key={c.id} className={'ah-cat-pick ' + (cat===c.id ? 'active' : '')} onClick={() => setCat(c.id)}>
                    <span className="em" style={{background: c.bg, color: c.color}}>{c.em}</span>
                    <span className="nm">{cl}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ah-field">
            <label className="ah-field-label">{window.t('mtx_desc_label')}</label>
            <input
              className="ah-input"
              placeholder={window.t('mtx_desc_ph')}
              value={desc}
              maxLength={80}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="ah-field">
            <label className="ah-field-label">{window.t('mtx_date_label')}</label>
            <input
              type="date"
              className={'ah-input' + (errors.date ? ' err' : '')}
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => { setDate(e.target.value); if (errors.date) setErrors({...errors, date: undefined}); }}
            />
            <FieldError msg={errors.date}/>
          </div>
        </div>
        <div className="ah-modal-foot">
          <button className="ah-btn ah-btn-ghost" onClick={onClose} disabled={saving}>{window.t('mtx_cancel')}</button>
          <button className="ah-btn ah-btn-primary" onClick={submit} disabled={saving}>
            {saving ? window.t('mtx_saving') : window.t('mtx_save')}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddTxModal, useModalShell, FieldError });
