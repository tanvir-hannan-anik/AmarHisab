// ─────────────────────────────────────────────────────────────────────────────
// Pages / ReportsScreen
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateRep, useMemo: useMemoRep } = React;

function ReportsScreen({ state }) {
  const { txs } = state;
  const [range, setRange] = useStateRep('month');

  const lang = window.AHLang || 'bn';
  const s = window.AHStrings[lang] || window.AHStrings.bn;
  const catLabel = (c) => lang === 'en' ? (c.en || c.bn) : c.bn;
  const num = (n) => lang === 'en' ? String(n) : toBn(n);

  const filtered = useMemoRep(() => {
    const now = new Date();
    return txs.filter(t => {
      const td = new Date(t.date);
      if (range === 'week') { const w = new Date(); w.setDate(now.getDate() - 7); return td >= w; }
      if (range === 'month') { const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0); return td >= m; }
      if (range === 'year') { return td >= new Date(now.getFullYear(), 0, 1); }
      return true;
    });
  }, [txs, range]);

  const total = filtered.reduce((a, t) => a + t.amt, 0);

  const catBreakdown = useMemoRep(() => {
    const map = {};
    filtered.forEach(t => { map[t.cat] = (map[t.cat] || 0) + t.amt; });
    return CATEGORIES.map(c => ({ ...c, value: map[c.id] || 0 }))
      .filter(c => c.value > 0).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const exportCSV = () => {
    const rows = [[s.r_csv_date, s.r_csv_desc, s.r_csv_cat, s.r_csv_amt]];
    [...filtered].sort((a, b) => b.date.localeCompare(a.date)).forEach(t => {
      const c = CAT_BY_ID[t.cat] || CAT_BY_ID.other;
      rows.push([t.date.slice(0, 10), t.desc, catLabel(c), t.amt]);
    });
    const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `amar-hisab-${range}-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.toast.success(s.r_csv_done);
  };

  return (
    <div className="ah-content-inner">
      <div className="ah-tab-row" style={{flexWrap: 'wrap'}}>
        <button className={range==='week' ? 'active' : ''} onClick={() => setRange('week')}>{s.r_weekly}</button>
        <button className={range==='month' ? 'active' : ''} onClick={() => setRange('month')}>{s.r_monthly}</button>
        <button className={range==='year' ? 'active' : ''} onClick={() => setRange('year')}>{s.r_yearly}</button>
        <button className={range==='all' ? 'active' : ''} onClick={() => setRange('all')}>{s.r_all}</button>
      </div>

      <div className="ah-stat-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
        <StatCard label={s.r_total_spend} value={total} icon="trending-down" tone="red"
          meta={<span>{window.t('r_tx_count', { n: num(filtered.length) })}</span>}/>
        <StatCard label={s.r_daily_avg}
          value={Math.round(total / Math.max(1, new Set(filtered.map(t => t.date.slice(0, 10))).size))}
          icon="calendar" tone="blue" meta={<span>{s.r_per_day}</span>}/>
        <StatCard label={s.r_max} value={filtered.reduce((m, t) => Math.max(m, t.amt), 0)}
          icon="trending-up" tone="warn" meta={<span>{s.r_single_tx}</span>}/>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">{s.r_cat_title}</div>
            <div className="ah-card-sub">{s.r_cat_sub}</div>
          </div>
          <button className="ah-btn ah-btn-ghost" onClick={exportCSV} disabled={filtered.length === 0}>
            <Icon name="arrow-down" size={14}/> {s.r_csv}
          </button>
        </div>
        {catBreakdown.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="piechart" size={24}/></div>
            <div className="ah-empty-title">{s.r_empty}</div>
            <div className="ah-empty-sub">{s.r_empty_sub}</div>
          </div>
        ) : (
          <div className="ah-cat-list">
            {catBreakdown.map(c => {
              const p = (c.value / total) * 100;
              return (
                <div className="ah-cat-item" key={c.id}>
                  <div className="ah-cat-row">
                    <div className="ah-cat-name">
                      <span className="ah-cat-emoji" style={{background: c.bg, color: c.color}}>{c.em}</span>
                      {catLabel(c)}
                      <span style={{fontSize: 11, color: '#9AA3AC', fontWeight: 500}}>· {num(Math.round(p))}%</span>
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
        )}
      </div>
    </div>
  );
}

window.ReportsScreen = ReportsScreen;
