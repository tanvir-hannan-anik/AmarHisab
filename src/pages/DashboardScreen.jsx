// ─────────────────────────────────────────────────────────────────────────────
// Pages / DashboardScreen
//
// The home view. Shows the hero balance card (current month), four stat cards,
// the weekly bar chart + category donut, recent transactions, and a quick
// debts-and-payments summary.
// ─────────────────────────────────────────────────────────────────────────────

const { useMemo: useMemoDash } = React;

function DashboardScreen({ state, openModal, onEditTx, onDeleteTx, onEditDebt, onSettleDebt }) {
  const { budget, txs, debts, monthLabel } = state;

  const monthStart = useMemoDash(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const monthTxs = useMemoDash(() => txs.filter(t => new Date(t.date) >= monthStart), [txs, monthStart]);

  const spent = monthTxs.reduce((s, t) => s + t.amt, 0);
  const remaining = budget - spent;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const totalBorrowed = debts.filter(d => d.type === 'borrowed').reduce((s, d) => s + d.amt, 0);
  const totalLent = debts.filter(d => d.type === 'lent').reduce((s, d) => s + d.amt, 0);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaySpent = txs.filter(t => new Date(t.date) >= today).reduce((s, t) => s + t.amt, 0);

  // Bar chart data for the last 7 days, today flagged.
  const weekData = useMemoDash(() => {
    const days = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setDate(end.getDate() + 1);
      const v = txs
        .filter(t => { const td = new Date(t.date); return td >= d && td < end; })
        .reduce((s, t) => s + t.amt, 0);
      arr.push({ label: days[d.getDay()], value: v, today: i === 0 });
    }
    return arr;
  }, [txs]);

  // Per-category spend for this month, descending.
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
            <div className="ah-hero-eyebrow">বর্তমান ব্যালেন্স · {monthLabel}</div>
            <div className="ah-hero-amount"><span className="tk">৳</span>{fmtTk(remaining)}</div>
            <div className="ah-hero-sub">
              {remaining >= 0
                ? `মাসিক বাজেট থেকে ৳${fmtTk(remaining)} বাকি আছে`
                : `বাজেট অতিক্রম হয়েছে ৳${fmtTk(-remaining)}`}
            </div>
          </div>
          <button className="ah-month-pill" onClick={() => openModal('budget')}>
            <Icon name="target" size={14}/>
            বাজেট সম্পাদনা
          </button>
        </div>

        <div className="ah-hero-bar">
          <div className="ah-hero-bar-labels">
            <span>৳{fmtTk(spent)} খরচ হয়েছে</span>
            <span>৳{fmtTk(budget)} বাজেট</span>
          </div>
          <div className="ah-hero-bar-track">
            <div className={'ah-hero-bar-fill ' + barClass} style={{width: pct + '%'}}/>
          </div>
        </div>

        <div className="ah-hero-foot">
          <div className="ah-hero-stat">
            <div className="lab">আজকের খরচ</div>
            <div className="val">৳{fmtTk(todaySpent)}</div>
          </div>
          <div className="ah-hero-stat">
            <div className="lab">দৈনিক গড়</div>
            <div className="val">৳{fmtTk(Math.round(spent / Math.max(1, new Date().getDate())))}</div>
          </div>
          <div className="ah-hero-stat">
            <div className="lab">বাজেট ব্যবহার</div>
            <div className="val">{toBn(Math.round(pct))}%</div>
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="ah-stat-grid">
        <StatCard
          label="মোট খরচ" value={spent} icon="trending-down" tone="red"
          meta={<><span className="delta up">↑ {toBn(Math.round(pct))}%</span> <span>বাজেটের</span></>}
        />
        <StatCard
          label="মাসিক বাজেট" value={budget} icon="target" tone="blue"
          meta={<span>{monthLabel}</span>}
        />
        <StatCard
          label="আমি ধার নিয়েছি" value={totalBorrowed} icon="arrow-down" tone="warn"
          meta={<span>{toBn(debts.filter(d => d.type === 'borrowed').length)} জন ব্যক্তির কাছে</span>}
        />
        <StatCard
          label="আমি ধার দিয়েছি" value={totalLent} icon="arrow-up" tone="mint"
          meta={<span>{toBn(debts.filter(d => d.type === 'lent').length)} জন ব্যক্তিকে</span>}
        />
      </div>

      {/* CHARTS + CATEGORY */}
      <div className="ah-cols">
        <div className="ah-card">
          <div className="ah-card-head">
            <div>
              <div className="ah-card-title">সাপ্তাহিক খরচ</div>
              <div className="ah-card-sub">গত ৭ দিনের খরচের চিত্র</div>
            </div>
            <button className="ah-card-link" onClick={() => state.setTab && state.setTab('history')}>
              বিস্তারিত <Icon name="arrow-right" size={14}/>
            </button>
          </div>
          <WeeklyBarChart data={weekData}/>
        </div>

        <div className="ah-card">
          <div className="ah-card-head">
            <div>
              <div className="ah-card-title">খরচের ধরন</div>
              <div className="ah-card-sub">এই মাসে শ্রেণী অনুযায়ী</div>
            </div>
          </div>
          {catBreakdown.length === 0 ? (
            <div className="ah-empty">
              <div className="ah-empty-ic"><Icon name="piechart" size={24}/></div>
              <div className="ah-empty-title">এখনো কোন খরচ নেই</div>
              <div className="ah-empty-sub">আপনার প্রথম খরচ যোগ করুন</div>
            </div>
          ) : (
            <div className="ah-donut-row">
              <div className="ah-donut-wrap">
                <DonutChart data={catBreakdown.map(c => ({ value: c.value, color: c.color }))} size={150} thickness={20}/>
                <div className="ah-donut-center">
                  <div className="lab">মোট</div>
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
                          {c.bn}
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
              <div className="ah-card-title">সাম্প্রতিক হিসাব</div>
              <div className="ah-card-sub">সর্বশেষ লেনদেনসমূহ</div>
            </div>
            <button className="ah-card-link" onClick={() => state.setTab && state.setTab('history')}>
              সব দেখুন <Icon name="arrow-right" size={14}/>
            </button>
          </div>
          <div className="ah-tx-list">
            {recent.map(t => <TxRow key={t.id} tx={t} onEdit={onEditTx} onDelete={onDeleteTx}/>)}
          </div>
        </div>

        <div className="ah-card">
          <div className="ah-card-head">
            <div>
              <div className="ah-card-title">দেনা-পাওনা</div>
              <div className="ah-card-sub">সাম্প্রতিক ধার-পরিচালনা</div>
            </div>
            <button className="ah-card-link" onClick={() => state.setTab && state.setTab('debts')}>
              সব দেখুন <Icon name="arrow-right" size={14}/>
            </button>
          </div>

          <div className="ah-debt-grid">
            <div className="ah-debt-card borrowed">
              <div className="lab">আমি ধার নিয়েছি</div>
              <div className="val"><span className="tk">৳</span>{fmtTk(totalBorrowed)}</div>
              <div className="sub">{toBn(debts.filter(d => d.type === 'borrowed').length)} জন ব্যক্তির কাছে</div>
            </div>
            <div className="ah-debt-card lent">
              <div className="lab">আমি ধার দিয়েছি</div>
              <div className="val"><span className="tk">৳</span>{fmtTk(totalLent)}</div>
              <div className="sub">{toBn(debts.filter(d => d.type === 'lent').length)} জন ব্যক্তিকে</div>
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
