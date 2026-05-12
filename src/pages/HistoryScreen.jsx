// ─────────────────────────────────────────────────────────────────────────────
// Pages / HistoryScreen
//
// Full transaction history with period (week/month/all) tabs, category filter
// pills, and text search. Renders grouped-by-day with per-day totals.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateHist, useMemo: useMemoHist } = React;

function HistoryScreen({ state, onEditTx, onDeleteTx }) {
  const { txs } = state;
  const [filter, setFilter] = useStateHist('all');
  const [period, setPeriod] = useStateHist('month');
  const [search, setSearch] = useStateHist('');

  const filtered = useMemoHist(() => {
    const now = new Date();
    return txs.filter(t => {
      if (filter !== 'all' && t.cat !== filter) return false;
      if (search && !t.desc.toLowerCase().includes(search.toLowerCase())) return false;
      const td = new Date(t.date);
      if (period === 'week') {
        const w = new Date(); w.setDate(now.getDate() - 7);
        return td >= w;
      }
      if (period === 'month') {
        const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
        return td >= m;
      }
      return true;
    });
  }, [txs, filter, period, search]);

  const total = filtered.reduce((s, t) => s + t.amt, 0);
  const grouped = useMemoHist(() => groupTxByDay(filtered), [filtered]);

  return (
    <div className="ah-content-inner">
      <div className="ah-tab-row">
        <button className={period==='week' ? 'active' : ''} onClick={() => setPeriod('week')}>সাপ্তাহিক</button>
        <button className={period==='month' ? 'active' : ''} onClick={() => setPeriod('month')}>মাসিক</button>
        <button className={period==='all' ? 'active' : ''} onClick={() => setPeriod('all')}>সব</button>
      </div>

      <div className="ah-stat-grid ah-history-stats">
        <StatCard label="মোট খরচ" value={total} icon="trending-down" tone="red"
          meta={<span>{toBn(filtered.length)}টি লেনদেন</span>}/>
        <StatCard label="দৈনিক গড়" value={Math.round(total / Math.max(1, grouped.length))}
          icon="calendar" tone="blue" meta={<span>{toBn(grouped.length)} দিনে</span>}/>
        <StatCard label="সর্বোচ্চ" value={filtered.reduce((m, t) => Math.max(m, t.amt), 0)}
          icon="trending-up" tone="warn" meta={<span>একদিনের সর্বোচ্চ</span>}/>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head" style={{flexWrap: 'wrap', gap: 12, marginBottom: 16}}>
          <div>
            <div className="ah-card-title">সকল লেনদেন</div>
            <div className="ah-card-sub">তারিখ ও ধরন অনুযায়ী ফিল্টার করুন</div>
          </div>
          <div className="ah-search">
            <Icon name="search" size={16}/>
            <input placeholder="খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="ah-filter-bar">
          <button className={'ah-filter ' + (filter==='all' ? 'active' : '')} onClick={() => setFilter('all')}>সব ধরন</button>
          {CATEGORIES.map(c => (
            <button key={c.id} className={'ah-filter ' + (filter===c.id ? 'active' : '')} onClick={() => setFilter(c.id)}>
              <span>{c.em}</span> {c.bn}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="inbox" size={24}/></div>
            <div className="ah-empty-title">কোন লেনদেন পাওয়া যায়নি</div>
            <div className="ah-empty-sub">ফিল্টার পরিবর্তন করুন বা নতুন হিসাব যোগ করুন</div>
          </div>
        ) : (
          <div>
            {grouped.map(({ day, items, total }) => (
              <div key={day}>
                <div className="ah-tx-day-head">
                  <span>{fmtDayHead(day)}</span>
                  <span className="total">−৳{fmtTk(total)}</span>
                </div>
                <div className="ah-tx-list">
                  {items.map(t => <TxRow key={t.id} tx={t} onEdit={onEditTx} onDelete={onDeleteTx}/>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.HistoryScreen = HistoryScreen;
