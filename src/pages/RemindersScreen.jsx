// ─────────────────────────────────────────────────────────────────────────────
// Pages / RemindersScreen
// ─────────────────────────────────────────────────────────────────────────────

function RemindersScreen({ state }) {
  const { debts, txs, budget } = state;
  const lang = window.AHLang || 'bn';
  const s = window.AHStrings[lang] || window.AHStrings.bn;
  const num = (n) => lang === 'en' ? String(n) : toBn(n);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const spent = txs.filter(t => new Date(t.date) >= monthStart).reduce((a, t) => a + t.amt, 0);
  const pct = budget ? Math.min(999, (spent / budget) * 100) : 0;
  const daysLeft = Math.max(0, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate());

  const items = [];
  debts.forEach(d => {
    const age = Math.floor((today - new Date(d.date)) / (1000 * 60 * 60 * 24));
    if (age >= 7) {
      items.push({
        id: 'r-' + d.id,
        title: d.type === 'borrowed'
          ? window.t('rm_borrowed_remind', { name: d.name, amt: fmtTk(d.amt) })
          : window.t('rm_lent_remind', { name: d.name, amt: fmtTk(d.amt) }),
        sub: `${window.t('rm_days_ago', { n: num(age) })} · ${d.note || (d.type === 'borrowed' ? s.rm_borrowed_type : s.rm_lent_type)}`,
        tone: d.type === 'borrowed' ? 'warn' : 'mint',
        icon: 'handshake',
      });
    }
  });
  if (pct >= 80 && pct < 100) {
    items.push({
      id: 'r-budget-warn',
      title: s.rm_budget_near,
      sub: window.t('rm_budget_near_sub', { pct: num(Math.round(pct)), days: num(daysLeft) }),
      tone: 'warn', icon: 'bell',
    });
  }
  if (pct >= 100) {
    items.push({
      id: 'r-budget-over',
      title: s.rm_budget_over,
      sub: window.t('rm_budget_over_sub', { amt: fmtTk(spent - budget) }),
      tone: 'red', icon: 'bell',
    });
  }

  return (
    <div className="ah-content-inner">
      <div className="ah-card">
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">{s.rm_title}</div>
            <div className="ah-card-sub">{s.rm_sub}</div>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="bell" size={24}/></div>
            <div className="ah-empty-title">{s.rm_empty}</div>
            <div className="ah-empty-sub">{s.rm_empty_sub}</div>
          </div>
        ) : (
          <div className="ah-reminder-list">
            {items.map(it => (
              <div key={it.id} className="ah-reminder">
                <div className={'ah-stat-icon ' + it.tone}><Icon name={it.icon} size={18}/></div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div className="ah-reminder-title">{it.title}</div>
                  <div className="ah-reminder-sub">{it.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.RemindersScreen = RemindersScreen;
