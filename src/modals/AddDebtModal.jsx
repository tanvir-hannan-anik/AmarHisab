// ─────────────────────────────────────────────────────────────────────────────
// Modals / AddDebtModal
//
// Add or edit a debt entry (borrowed or lent). Shares useModalShell and
// FieldError with the other modals via window globals defined in AddTxModal.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateDebt } = React;

function AddDebtModal({ initial, onClose, onSave, defaultType = 'borrowed' }) {
  const edit = !!initial;
  const [type, setType] = useStateDebt((initial && initial.type) || defaultType);
  const [name, setName] = useStateDebt((initial && initial.name) || '');
  const [amount, setAmount] = useStateDebt(initial ? String(initial.amt) : '');
  const [date, setDate] = useStateDebt(
    initial ? (initial.date || '').slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useStateDebt((initial && initial.note) || '');
  const [errors, setErrors] = useStateDebt({});
  const [saving, setSaving] = useStateDebt(false);

  useModalShell(onClose);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'নাম লিখুন';
    else if (name.trim().length > 50) e.name = 'নাম ছোট রাখুন';
    const n = parseInt(amount, 10);
    if (!amount.trim()) e.amount = 'পরিমাণ লিখুন';
    else if (!n || n <= 0) e.amount = 'বৈধ পরিমাণ লিখুন';
    else if (n > 9999999) e.amount = 'পরিমাণ অনেক বেশি';
    if (!date) e.date = 'তারিখ লিখুন';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const n = parseInt(amount, 10);
      const payload = {
        id: edit ? initial.id : 'd' + Date.now(),
        type, name: name.trim(), amt: n,
        date: new Date(date).toISOString(),
        note: note.trim(),
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
          <div className="ah-modal-title">{edit ? 'দেনা-পাওনা সম্পাদনা' : 'দেনা-পাওনা যোগ করুন'}</div>
          <button className="ah-icon-btn" onClick={onClose} aria-label="বন্ধ করুন" style={{width: 32, height: 32}}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        <div className="ah-modal-body">
          <div className="ah-segment">
            <button className={type==='borrowed' ? 'active' : ''} onClick={() => setType('borrowed')}>আমি ধার নিয়েছি</button>
            <button className={type==='lent' ? 'active' : ''} onClick={() => setType('lent')}>আমি ধার দিয়েছি</button>
          </div>

          <div className="ah-field">
            <label className="ah-field-label">ব্যক্তির নাম</label>
            <input
              className={'ah-input' + (errors.name ? ' err' : '')}
              placeholder="যেমন: রহিম ভাই"
              value={name}
              maxLength={50}
              onChange={e => { setName(e.target.value); if (errors.name) setErrors({...errors, name: undefined}); }}
              autoFocus
            />
            <FieldError msg={errors.name}/>
          </div>

          <div className="ah-field">
            <label className="ah-field-label">টাকার পরিমাণ</label>
            <div style={{position: 'relative'}}>
              <span style={{position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 22, color: '#9AA3AC', fontWeight: 500}}>৳</span>
              <input
                className={'ah-input ah-input-amount' + (errors.amount ? ' err' : '')}
                style={{paddingLeft: 48}}
                placeholder="০"
                inputMode="numeric"
                value={amount}
                onChange={e => { setAmount(e.target.value.replace(/[^0-9]/g, '')); if (errors.amount) setErrors({...errors, amount: undefined}); }}
              />
            </div>
            <FieldError msg={errors.amount}/>
          </div>

          <div className="ah-field">
            <label className="ah-field-label">তারিখ</label>
            <input type="date" className={'ah-input' + (errors.date ? ' err' : '')}
              value={date}
              onChange={e => { setDate(e.target.value); if (errors.date) setErrors({...errors, date: undefined}); }}
            />
            <FieldError msg={errors.date}/>
          </div>

          <div className="ah-field">
            <label className="ah-field-label">নোট (ঐচ্ছিক)</label>
            <input
              className="ah-input"
              placeholder="যেমন: মাস শেষে ফেরত"
              value={note}
              maxLength={120}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="ah-modal-foot">
          <button className="ah-btn ah-btn-ghost" onClick={onClose} disabled={saving}>বাতিল</button>
          <button className="ah-btn ah-btn-primary" onClick={submit} disabled={saving}>
            {saving ? '...সংরক্ষণ' : 'সংরক্ষণ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}

window.AddDebtModal = AddDebtModal;
