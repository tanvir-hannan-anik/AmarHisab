// ─────────────────────────────────────────────────────────────────────────────
// Modals / BudgetModal
//
// Sets the monthly budget. Shows quick-pick chips for common amounts and
// validates the manual entry. Shares useModalShell + FieldError via window.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateBdg } = React;

function BudgetModal({ current, onClose, onSave }) {
  const [amount, setAmount] = useStateBdg(String(current || ''));
  const [error, setError] = useStateBdg('');
  useModalShell(onClose);

  const submit = () => {
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { setError('বৈধ পরিমাণ লিখুন'); return; }
    if (n > 99999999) { setError('পরিমাণ অনেক বেশি'); return; }
    onSave(n);
    onClose();
  };

  return (
    <div className="ah-modal-overlay" onClick={onClose}>
      <div className="ah-modal" onClick={e => e.stopPropagation()} style={{maxWidth: 400}} role="dialog" aria-modal="true">
        <div className="ah-modal-head">
          <div className="ah-modal-title">মাসিক বাজেট নির্ধারণ</div>
          <button className="ah-icon-btn" onClick={onClose} aria-label="বন্ধ করুন" style={{width: 32, height: 32}}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        <div className="ah-modal-body">
          <p style={{margin: 0, fontSize: 13, color: '#6B737C', lineHeight: 1.55}}>
            এই মাসে আপনি সর্বোচ্চ কত টাকা খরচ করতে চান? আমরা আপনাকে সীমার কাছাকাছি পৌঁছালে জানাব।
          </p>
          <div className="ah-field">
            <label className="ah-field-label">বাজেট পরিমাণ</label>
            <div style={{position: 'relative'}}>
              <span style={{position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 22, color: '#9AA3AC', fontWeight: 500}}>৳</span>
              <input
                className={'ah-input ah-input-amount' + (error ? ' err' : '')}
                style={{paddingLeft: 48}}
                inputMode="numeric"
                value={amount}
                onChange={e => { setAmount(e.target.value.replace(/[^0-9]/g, '')); if (error) setError(''); }}
                autoFocus
              />
            </div>
            <FieldError msg={error}/>
          </div>
          <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
            {[10000, 15000, 20000, 25000, 30000].map(v => (
              <button key={v} className="ah-filter" onClick={() => { setAmount(String(v)); setError(''); }}>৳ {fmtTk(v)}</button>
            ))}
          </div>
        </div>
        <div className="ah-modal-foot">
          <button className="ah-btn ah-btn-ghost" onClick={onClose}>বাতিল</button>
          <button className="ah-btn ah-btn-primary" onClick={submit}>নিশ্চিত করুন</button>
        </div>
      </div>
    </div>
  );
}

window.BudgetModal = BudgetModal;
