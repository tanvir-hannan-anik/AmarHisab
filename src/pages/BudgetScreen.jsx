// ─────────────────────────────────────────────────────────────────────────────
// Pages / BudgetScreen
// ─────────────────────────────────────────────────────────────────────────────

const { useMemo: useMemoBdgScr } = React;

function BudgetScreen({ state, openModal }) {
  const { budget, txs } = state;
  const lang = window.AHLang || 'bn';
  const s = window.AHStrings[lang] || window.AHStrings.bn;
  const catLabel = (c) => lang === 'en' ? (c.en || c.bn) : c.bn;
  const num = (n) => lang === 'en' ? String(n) : toBn(n);

  const monthStart = useMemoBdgScr(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }, []);
  const monthTxs = useMemoBdgScr(() => txs.filter(t => new Date(t.date) >= monthStart), [txs, monthStart]);
  const spent = monthTxs.reduce((a, t) => a + t.amt, 0);
  const remaining = budget - spent;
  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;

  const catSpend = CATEGORIES.map(c => ({
    ...c,
    spent: monthTxs.filter(t => t.cat === c.id).reduce((a, t) => a + t.amt, 0),
    limit: state.catBudgets[c.id] || 0,
  })).sort((a, b) => b.spent - a.spent);

  const daysLeft = Math.max(0, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate());

  return (
    <div className="ah-content-inner">
      <div className="ah-card">
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">{s.b_title}</div>
            <div className="ah-card-sub">{state.monthLabel}</div>
          </div>
          <button className="ah-btn ah-btn-primary" onClick={() => openModal('budget')}>
            <Icon name="edit" size={14}/> {s.b_edit}
          </button>
        </div>

        <div className="ah-budget-summary-grid">
          <div>
            <div className="ah-budget-lab">{s.b_total}</div>
            <div className="ah-budget-num">৳{fmtTk(budget)}</div>
          </div>
          <div>
            <div className="ah-budget-lab">{s.b_spent}</div>
            <div className="ah-budget-num" style={{color: '#E0545B'}}>৳{fmtTk(spent)}</div>
          </div>
          <div>
            <div className="ah-budget-lab">{s.b_remaining}</div>
            <div className="ah-budget-num" style={{color: remaining >= 0 ? '#4FB38A' : '#E0545B'}}>৳{fmtTk(Math.abs(remaining))}</div>
          </div>
        </div>

        <div style={{padding: '8px 0'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B737C', marginBottom: 8}}>
            <span>{window.t('b_used_pct', { pct: num(Math.round(pct)) })}</span>
            <span>{window.t('b_days_left', { n: num(daysLeft) })}</span>
          </div>
          <div className="ah-hero-bar-track" style={{height: 14, background: '#EDF0F3'}}>
            <div className={'ah-hero-bar-fill ' + (pct >= 100 ? 'over' : pct >= 80 ? 'warn' : '')} style={{width: pct + '%'}}/>
          </div>
        </div>

        {pct >= 80 && pct < 100 && (
          <div className="ah-budget-edit-row" style={{borderColor: '#E8A93A', background: '#FDF1D6'}}>
            <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
              <Icon name="bell" size={18}/>
              <div>
                <div style={{fontSize: 13.5, fontWeight: 600, color: '#7A5712'}}>{s.b_warn_title}</div>
                <div style={{fontSize: 12, color: '#7A5712', opacity: .8}}>{window.t('b_warn_msg', { pct: num(Math.round(pct)) })}</div>
              </div>
            </div>
          </div>
        )}
        {pct >= 100 && (
          <div className="ah-budget-edit-row" style={{borderColor: '#E0545B', background: '#FCE3E4'}}>
            <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
              <Icon name="bell" size={18}/>
              <div>
                <div style={{fontSize: 13.5, fontWeight: 600, color: '#8E2A2F'}}>{s.b_over_title}</div>
                <div style={{fontSize: 12, color: '#8E2A2F', opacity: .8}}>{window.t('b_over_msg', { amt: fmtTk(-remaining) })}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">{s.b_cat_title}</div>
            <div className="ah-card-sub">{s.b_cat_sub}</div>
          </div>
        </div>

        <div className="ah-cat-list">
          {catSpend.map(c => {
            const totalSpent = spent || 1;
            const p = (c.spent / totalSpent) * 100;
            return (
              <div className="ah-cat-item" key={c.id}>
                <div className="ah-cat-row">
                  <div className="ah-cat-name">
                    <span className="ah-cat-emoji" style={{background: c.bg, color: c.color}}>{c.em}</span>
                    {catLabel(c)}
                    <span style={{fontSize: 11, color: '#9AA3AC', fontWeight: 500}}>· {num(Math.round(p))}%</span>
                  </div>
                  <div className="ah-cat-val">৳{fmtTk(c.spent)}</div>
                </div>
                <div className="ah-cat-bar">
                  <div className="ah-cat-bar-fill" style={{width: p + '%', background: c.color}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.BudgetScreen = BudgetScreen;
