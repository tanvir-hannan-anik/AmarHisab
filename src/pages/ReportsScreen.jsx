// ─────────────────────────────────────────────────────────────────────────────
// Pages / ReportsScreen
//
// Range-filtered spend report (week/month/year/all). Exports the visible rows
// as CSV with a UTF-8 BOM so Excel renders Bengali text correctly.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateRep, useMemo: useMemoRep } = React;

function ReportsScreen({ state }) {
  const { txs } = state;
  const [range, setRange] = useStateRep('month');

  const filtered = useMemoRep(() => {
    const now = new Date();
    return txs.filter(t => {
      const td = new Date(t.date);
      if (range === 'week') {
        const w = new Date(); w.setDate(now.getDate() - 7);
        return td >= w;
      }
      if (range === 'month') {
        const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
        return td >= m;
      }
      if (range === 'year') {
        const y = new Date(now.getFullYear(), 0, 1);
        return td >= y;
      }
      return true;
    });
  }, [txs, range]);

  const total = filtered.reduce((s, t) => s + t.amt, 0);

  const catBreakdown = useMemoRep(() => {
    const map = {};
    filtered.forEach(t => { map[t.cat] = (map[t.cat] || 0) + t.amt; });
    return CATEGORIES.map(c => ({ ...c, value: map[c.id] || 0 }))
      .filter(c => c.value > 0).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const exportCSV = () => {
    const rows = [['তারিখ', 'বিবরণ', 'শ্রেণী', 'পরিমাণ']];
    [...filtered].sort((a, b) => b.date.localeCompare(a.date)).forEach(t => {
      const c = CAT_BY_ID[t.cat] || CAT_BY_ID.other;
      rows.push([t.date.slice(0, 10), t.desc, c.bn, t.amt]);
    });
    const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `amar-hisab-${range}-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.toast.success('CSV ডাউনলোড হয়েছে');
  };

  return (
    <div className="ah-content-inner">
      <div className="ah-tab-row" style={{flexWrap: 'wrap'}}>
        <button className={range==='week' ? 'active' : ''} onClick={() => setRange('week')}>সাপ্তাহিক</button>
        <button className={range==='month' ? 'active' : ''} onClick={() => setRange('month')}>মাসিক</button>
        <button className={range==='year' ? 'active' : ''} onClick={() => setRange('year')}>বার্ষিক</button>
        <button className={range==='all' ? 'active' : ''} onClick={() => setRange('all')}>সব</button>
      </div>

      <div className="ah-stat-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
        <StatCard label="মোট খরচ" value={total} icon="trending-down" tone="red"
          meta={<span>{toBn(filtered.length)}টি লেনদেন</span>}/>
        <StatCard label="দৈনিক গড়"
          value={Math.round(total / Math.max(1, new Set(filtered.map(t => t.date.slice(0, 10))).size))}
          icon="calendar" tone="blue" meta={<span>প্রতি দিন</span>}/>
        <StatCard label="সর্বোচ্চ" value={filtered.reduce((m, t) => Math.max(m, t.amt), 0)}
          icon="trending-up" tone="warn" meta={<span>একটি লেনদেন</span>}/>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">শ্রেণী অনুযায়ী খরচ</div>
            <div className="ah-card-sub">বিস্তারিত বিশ্লেষণ</div>
          </div>
          <button className="ah-btn ah-btn-ghost" onClick={exportCSV} disabled={filtered.length === 0}>
            <Icon name="arrow-down" size={14}/> CSV ডাউনলোড
          </button>
        </div>
        {catBreakdown.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="piechart" size={24}/></div>
            <div className="ah-empty-title">কোন লেনদেন পাওয়া যায়নি</div>
            <div className="ah-empty-sub">অন্য সময়সীমা বাছাই করুন</div>
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
                      {c.bn}
                      <span style={{fontSize: 11, color: '#9AA3AC', fontWeight: 500}}>· {toBn(Math.round(p))}%</span>
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
