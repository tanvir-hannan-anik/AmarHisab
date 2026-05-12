// ─────────────────────────────────────────────────────────────────────────────
// Pages / DebtScreen
//
// Lists all borrowed and lent debts with a net summary card, type filter, and
// edit/settle actions on each row.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateDebtScr } = React;

function DebtScreen({ state, openModal, onEditDebt, onSettleDebt }) {
  const { debts } = state;
  const [tab, setTab] = useStateDebtScr('all');

  const filtered = tab === 'all' ? debts : debts.filter(d => d.type === tab);
  const totalBorrowed = debts.filter(d => d.type === 'borrowed').reduce((s, d) => s + d.amt, 0);
  const totalLent = debts.filter(d => d.type === 'lent').reduce((s, d) => s + d.amt, 0);
  const net = totalLent - totalBorrowed;

  return (
    <div className="ah-content-inner">
      <div className="ah-debt-grid ah-debt-summary-grid">
        <div className="ah-debt-card borrowed">
          <div className="lab">আমি ধার নিয়েছি</div>
          <div className="val"><span className="tk">৳</span>{fmtTk(totalBorrowed)}</div>
          <div className="sub">{toBn(debts.filter(d => d.type === 'borrowed').length)} জন ব্যক্তির কাছে দিতে হবে</div>
        </div>
        <div className="ah-debt-card lent">
          <div className="lab">আমি ধার দিয়েছি</div>
          <div className="val"><span className="tk">৳</span>{fmtTk(totalLent)}</div>
          <div className="sub">{toBn(debts.filter(d => d.type === 'lent').length)} জন ব্যক্তির কাছ থেকে পাব</div>
        </div>
        <div className="ah-stat" style={{justifyContent: 'center', padding: '22px 24px'}}>
          <div className="ah-stat-head">
            <div className="ah-stat-lab">নেট পাওনা</div>
            <div className={'ah-stat-icon ' + (net >= 0 ? 'mint' : 'red')}><Icon name="handshake" size={18}/></div>
          </div>
          <div className="ah-stat-val" style={{color: net >= 0 ? '#4FB38A' : '#E0545B'}}>
            <span className="tk">৳</span>{fmtTk(Math.abs(net))}
          </div>
          <div className="ah-stat-meta">
            {net >= 0 ? 'মোট পাওনা বেশি' : 'মোট দেনা বেশি'}
          </div>
        </div>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head" style={{marginBottom: 14}}>
          <div>
            <div className="ah-card-title">দেনা-পাওনার তালিকা</div>
            <div className="ah-card-sub">আপনার সকল ব্যক্তিগত লেনদেন</div>
          </div>
          <button className="ah-btn ah-btn-primary" onClick={() => openModal('debt')}>
            <Icon name="plus" size={16}/> নতুন যোগ করুন
          </button>
        </div>

        <div className="ah-tab-row">
          <button className={tab==='all' ? 'active' : ''} onClick={() => setTab('all')}>সব</button>
          <button className={tab==='borrowed' ? 'active' : ''} onClick={() => setTab('borrowed')}>ধার নেওয়া</button>
          <button className={tab==='lent' ? 'active' : ''} onClick={() => setTab('lent')}>ধার দেওয়া</button>
        </div>

        {filtered.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="handshake" size={24}/></div>
            <div className="ah-empty-title">কোন দেনা-পাওনা নেই</div>
            <div className="ah-empty-sub">নতুন ধার-পরিচালনা যোগ করুন</div>
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
