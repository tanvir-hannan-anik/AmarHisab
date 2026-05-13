// ─────────────────────────────────────────────────────────────────────────────
// Pages / DashboardScreen
// ─────────────────────────────────────────────────────────────────────────────

const { useMemo: useMemoDash } = React;

function DashboardScreen({ state, openModal, onEditTx, onDeleteTx, onEditDebt, onSettleDebt }) {
  const { budget, txs, debts, monthLabel } = state;
  const lang = window.AHLang || 'bn';
  const s = (window.AHStrings[lang] || window.AHStrings.bn);
  const catLabel = (c) => lang === 'en' ? (c.en || c.bn) : c.bn;
  const num = (n) => lang === 'en' ? String(n) : toBn(n);

  const monthStart = useMemoDash(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const monthTxs = useMemoDash(() => txs.filter(t => new Date(t.date) >= monthStart), [txs, monthStart]);

  const spent = monthTxs.reduce((a, t) => a + t.amt, 0);
  const remaining = budget - spent;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const totalBorrowed = debts.filter(d => d.type === 'borrowed').reduce((a, d) => a + d.amt, 0);
  const totalLent = debts.filter(d => d.type === 'lent').reduce((a, d) => a + d.amt, 0);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaySpent = txs.filter(t => new Date(t.date) >= today).reduce((a, t) => a + t.amt, 0);

  const weekData = useMemoDash(() => {
    const days = lang === 'en'
      ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      : ['রবি','সোম','মঙ্গল','বুধ','বৃহঃ','শুক্র','শনি'];
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setDate(end.getDate() + 1);
      const v = txs
        .filter(t => { const td = new Date(t.date); return td >= d && td < end; })
        .reduce((a, t) => a + t.amt, 0);
      arr.push({ label: days[d.getDay()], value: v, today: i === 0 });
    }
    return arr;
  }, [txs, lang]);

  const catBreakdown = useMemoDash(() => {
    const map = {};
    monthTxs.forEach(t => { map[t.cat] = (map[t.cat] || 0) + t.amt; });
    return CATEGORIES.map(c => ({ ...c, value: map[c.id] || 0 }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthTxs]);

  const recent = useMemoDash(() => [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [txs]);
  const barClass = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : '';

  return (
    <div className="ah-content-inner">
      {/* HERO BALANCE */}
      <div className="ah-hero">
        <div className="ah-hero-top">
          <div>
            <div className="ah-hero-eyebrow">{s.d_balance_eyebrow} · {monthLabel}</div>
            <div className="ah-hero-amount"><span className="tk">৳</span>{fmtTk(remaining)}</div>
            <div className="ah-hero-sub">
              {remaining >= 0
                ? window.t('d_budget_remaining', { amt: fmtTk(remaining) })
                : window.t('d_budget_exceeded', { amt: fmtTk(-remaining) })}
            </div>
          </div>
          <button className="ah-month-pill" onClick={() => openModal('budget')}>
            <Icon name="target" size={14}/>
            {s.d_edit_budget}
          </button>
        </div>

        <div className="ah-hero-bar">
          <div className="ah-hero-bar-labels">
            <span>{window.t('d_spent_label', { amt: fmtTk(spent) })}</span>
            <span>{window.t('d_budget_label', { amt: fmtTk(budget) })}</span>
          </div>
          <div className="ah-hero-bar-track">
            <div className={'ah-hero-bar-fill ' + barClass} style={{width: pct + '%'}}/>
          </div>
        </div>

        <div className="ah-hero-foot">
          <div className="ah-hero-stat">
            <div className="lab">{s.d_today_spend}</div>
            <div className="val">৳{fmtTk(todaySpent)}</div>
          </div>
          <div className="ah-hero-stat">
            <div className="lab">{s.d_daily_avg}</div>
            <div className="val">৳{fmtTk(Math.round(spent / Math.max(1, new Date().getDate())))}</div>
          </div>
          <div className="ah-hero-stat">
            <div className="lab">{s.d_budget_use}</div>
            <div className="val">{num(Math.round(pct))}%</div>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="ah-stat-grid">
        <StatCard
          label={s.d_total_spend} value={spent} icon="trending-down" tone="red"
          meta={<><span className="delta up">↑ {num(Math.round(pct))}%</span> <span>{s.d_of_budget}</span></>}
        />
        <StatCard
          label={s.d_monthly_budget} value={budget} icon="target" tone="blue"
          meta={<span>{monthLabel}</span>}
        />
        <StatCard
          label={s.d_borrowed} value={totalBorrowed} icon="arrow-down" tone="warn"
          meta={<span>{window.t('d_borrowed_from', { n: num(debts.filter(d => d.type === 'borrowed').length) })}</span>}
        />
        <StatCard
          label={s.d_lent} value={totalLent} icon="arrow-up" tone="mint"
          meta={<span>{window.t('d_lent_to', { n: num(debts.filter(d => d.type === 'lent').length) })}</span>}
        />
      </div>

      {/* CHARTS + CATEGORY */}
      <div className="ah-cols">
        <div className="ah-card">
          <div className="ah-card-head">
            <div>
              <div className="ah-card-title">{s.d_weekly_chart}</div>
              <div className="ah-card-sub">{s.d_weekly_chart_sub}</div>
            </div>
            <button className="ah-card-link" onClick={() => state.setTab && state.setTab('history')}>
              {s.d_details} <Icon name="arrow-right" size={14}/>
            </button>
          </div>
          <WeeklyBarChart data={weekData}/>
        </div>

        <div className="ah-card">
          <div className="ah-card-head">
            <div>
              <div className="ah-card-title">{s.d_cat_breakdown}</div>
              <div className="ah-card-sub">{s.d_cat_breakdown_sub}</div>
            </div>
          </div>
          {catBreakdown.length === 0 ? (
            <div className="ah-empty">
              <div className="ah-empty-ic"><Icon name="piechart" size={24}/></div>
              <div className="ah-empty-title">{s.d_no_spend}</div>
              <div className="ah-empty-sub">{s.d_add_first}</div>
            </div>
          ) : (
            <div className="ah-donut-row">
              <div className="ah-donut-wrap">
                <DonutChart data={catBreakdown.map(c => ({ value: c.value, color: c.color }))} size={150} thickness={20}/>
                <div className="ah-donut-center">
                  <div className="lab">{s.d_total}</div>
                  <div className="val">৳{fmtTk(spent)}</div>
                </div>
              </div>
              <div className="ah-cat-list">
                {catBreakdown.slice(0, 5).map(c => {
                  const p = (c.value / spent) * 100;
                  return (
                    <div className="ah-cat-item" key={c.id}>
                      <div className="ah-cat-row">
                        <div className="ah-cat-name">
                          <span className="ah-cat-emoji" style={{background: c.bg, color: c.color}}>{c.em}</span>
                          {catLabel(c)}
                        </div>
                        <div className="ah-cat-val">৳{fmtTk(c.value)}</div>
                      </div>
                      <div className="ah-cat-bar">
                        <div className="ah-cat-bar-fill" style={{width: p + '%', background: c.color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI ADVICE */}
      <AIAdvice state={state}/>

      {/* RECENT TXS + DEBTS QUICK */}
      <div className="ah-cols">
        <div className="ah-card">
          <div className="ah-card-head">
            <div>
              <div className="ah-card-title">{s.d_recent_tx}</div>
              <div className="ah-card-sub">{s.d_recent_tx_sub}</div>
            </div>
            <button className="ah-card-link" onClick={() => state.setTab && state.setTab('history')}>
              {s.d_see_all} <Icon name="arrow-right" size={14}/>
            </button>
          </div>
          <div className="ah-tx-list">
            {recent.map(t => <TxRow key={t.id} tx={t} onEdit={onEditTx} onDelete={onDeleteTx}/>)}
          </div>
        </div>

        <div className="ah-card">
          <div className="ah-card-head">
            <div>
              <div className="ah-card-title">{s.d_debts_title}</div>
              <div className="ah-card-sub">{s.d_debts_sub}</div>
            </div>
            <button className="ah-card-link" onClick={() => state.setTab && state.setTab('debts')}>
              {s.d_see_all} <Icon name="arrow-right" size={14}/>
            </button>
          </div>

          <div className="ah-debt-grid">
            <div className="ah-debt-card borrowed">
              <div className="lab">{s.d_borrowed}</div>
              <div className="val"><span className="tk">৳</span>{fmtTk(totalBorrowed)}</div>
              <div className="sub">{window.t('d_borrowed_from', { n: num(debts.filter(d => d.type === 'borrowed').length) })}</div>
            </div>
            <div className="ah-debt-card lent">
              <div className="lab">{s.d_lent}</div>
              <div className="val"><span className="tk">৳</span>{fmtTk(totalLent)}</div>
              <div className="sub">{window.t('d_lent_to', { n: num(debts.filter(d => d.type === 'lent').length) })}</div>
            </div>
          </div>

          <div className="ah-people-list">
            {[...debts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(d => (
              <PersonRow key={d.id} debt={d} onEdit={onEditDebt} onSettle={onSettleDebt}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
