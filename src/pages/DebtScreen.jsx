// ─────────────────────────────────────────────────────────────────────────────
// Pages / DebtScreen
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateDebtScr } = React;

function DebtScreen({ state, openModal, onEditDebt, onSettleDebt }) {
  const { debts } = state;
  const [tab, setTab] = useStateDebtScr('all');

  const lang = window.AHLang || 'bn';
  const s = window.AHStrings[lang] || window.AHStrings.bn;
  const num = (n) => lang === 'en' ? String(n) : toBn(n);

  const filtered = tab === 'all' ? debts : debts.filter(d => d.type === tab);
  const totalBorrowed = debts.filter(d => d.type === 'borrowed').reduce((a, d) => a + d.amt, 0);
  const totalLent = debts.filter(d => d.type === 'lent').reduce((a, d) => a + d.amt, 0);
  const net = totalLent - totalBorrowed;

  return (
    <div className="ah-content-inner">
      <div className="ah-debt-grid ah-debt-summary-grid">
        <div className="ah-debt-card borrowed">
          <div className="lab">{s.db_borrowed}</div>
          <div className="val"><span className="tk">৳</span>{fmtTk(totalBorrowed)}</div>
          <div className="sub">{window.t('db_borrowed_sub', { n: num(debts.filter(d => d.type === 'borrowed').length) })}</div>
        </div>
        <div className="ah-debt-card lent">
          <div className="lab">{s.db_lent}</div>
          <div className="val"><span className="tk">৳</span>{fmtTk(totalLent)}</div>
          <div className="sub">{window.t('db_lent_sub', { n: num(debts.filter(d => d.type === 'lent').length) })}</div>
        </div>
        <div className="ah-stat" style={{justifyContent: 'center', padding: '22px 24px'}}>
          <div className="ah-stat-head">
            <div className="ah-stat-lab">{s.db_net}</div>
            <div className={'ah-stat-icon ' + (net >= 0 ? 'mint' : 'red')}><Icon name="handshake" size={18}/></div>
          </div>
          <div className="ah-stat-val" style={{color: net >= 0 ? '#4FB38A' : '#E0545B'}}>
            <span className="tk">৳</span>{fmtTk(Math.abs(net))}
          </div>
          <div className="ah-stat-meta">
            {net >= 0 ? s.db_net_positive : s.db_net_negative}
          </div>
        </div>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head" style={{marginBottom: 14}}>
          <div>
            <div className="ah-card-title">{s.db_list_title}</div>
            <div className="ah-card-sub">{s.db_list_sub}</div>
          </div>
          <button className="ah-btn ah-btn-primary" onClick={() => openModal('debt')}>
            <Icon name="plus" size={16}/> {s.db_add_new}
          </button>
        </div>

        <div className="ah-tab-row">
          <button className={tab==='all' ? 'active' : ''} onClick={() => setTab('all')}>{s.db_all}</button>
          <button className={tab==='borrowed' ? 'active' : ''} onClick={() => setTab('borrowed')}>{s.db_borrowed_tab}</button>
          <button className={tab==='lent' ? 'active' : ''} onClick={() => setTab('lent')}>{s.db_lent_tab}</button>
        </div>

        {filtered.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="handshake" size={24}/></div>
            <div className="ah-empty-title">{s.db_empty}</div>
            <div className="ah-empty-sub">{s.db_empty_sub}</div>
          </div>
        ) : (
          <div className="ah-people-list">
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(d => (
              <PersonRow key={d.id} debt={d} onEdit={onEditDebt} onSettle={onSettleDebt}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.DebtScreen = DebtScreen;
