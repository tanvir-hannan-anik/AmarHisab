// ─────────────────────────────────────────────────────────────────────────────
// Components / Widgets
//
// Small reusable presentational pieces shared across screens:
//   - StatCard    a labeled metric card with icon and meta line
//   - TxRow       one transaction row with hover edit/delete actions
//   - PersonRow   one debt row with avatar, amount, edit/settle actions
//
// They take their formatters from window globals so no imports are needed.
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, tone, meta }) {
  return (
    <div className="ah-stat">
      <div className="ah-stat-head">
        <div className="ah-stat-lab">{label}</div>
        <div className={'ah-stat-icon ' + tone}><Icon name={icon} size={18}/></div>
      </div>
      <div className="ah-stat-val"><span className="tk">৳</span>{fmtTk(value)}</div>
      <div className="ah-stat-meta">{meta}</div>
    </div>
  );
}

function fmtTimeBn(iso) {
  const t = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (window.AHLang === 'en') return t;
  return t
    .replace(/[0-9]/g, d => ['০','১','২','৩','৪','৫','৬','৭','৮','৯'][+d])
    .replace('AM', 'পূর্বাহ্ণ')
    .replace('PM', 'অপরাহ্ণ');
}

function TxRow({ tx, onEdit, onDelete }) {
  const c = CAT_BY_ID[tx.cat] || CAT_BY_ID.other;
  return (
    <div className="ah-tx-item">
      <div className="ah-tx-ic" style={{background: c.bg, color: c.color}}>{c.em}</div>
      <div className="ah-tx-body">
        <div className="ah-tx-name">{tx.desc}</div>
        <div className="ah-tx-meta">
          <span>{window.AHLang === 'en' ? (c.en || c.bn) : c.bn}</span><span className="sep">·</span>
          <span>{fmtTimeBn(tx.date)}</span>
        </div>
      </div>
      <div className="ah-tx-amt expense">−৳{fmtTk(tx.amt)}</div>
      {(onEdit || onDelete) && (
        <div className="ah-tx-actions">
          {onEdit && (
            <button className="ah-tx-act" aria-label={window.t('w_edit')} onClick={() => onEdit(tx)}>
              <Icon name="edit" size={14}/>
            </button>
          )}
          {onDelete && (
            <button className="ah-tx-act danger" aria-label={window.t('w_delete')} onClick={() => onDelete(tx)}>
              <Icon name="trash" size={14}/>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PersonRow({ debt, onSettle, onEdit }) {
  return (
    <div className="ah-person">
      <div className="ah-person-av" style={{background: avatarColor(debt.name)}}>{initials(debt.name)}</div>
      <div className="ah-person-body">
        <div className="ah-person-nm">{debt.name}</div>
        <div className="ah-person-meta">{fmtDateBn(debt.date)}{debt.note ? ' · ' + debt.note : ''}</div>
      </div>
      <div className={'ah-person-amt ' + (debt.type === 'borrowed' ? 'borrow' : 'lent')}>
        {debt.type === 'borrowed' ? '−' : '+'}৳{fmtTk(debt.amt)}
      </div>
      <div className="ah-person-actions">
        {onEdit && (
          <button className="ah-tx-act" aria-label={window.t('w_edit')} onClick={() => onEdit(debt)}>
            <Icon name="edit" size={14}/>
          </button>
        )}
        {onSettle && <button className="ah-person-action" onClick={() => onSettle(debt.id)}>{window.t('w_settle')}</button>}
      </div>
    </div>
  );
}

Object.assign(window, { StatCard, TxRow, PersonRow });
