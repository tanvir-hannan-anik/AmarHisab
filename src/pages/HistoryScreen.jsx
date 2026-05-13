// ─────────────────────────────────────────────────────────────────────────────
// Pages / HistoryScreen
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateHist, useMemo: useMemoHist } = React;

function HistoryScreen({ state, onEditTx, onDeleteTx }) {
  const { txs } = state;
  const [filter, setFilter] = useStateHist('all');
  const [period, setPeriod] = useStateHist('month');
  const [search, setSearch] = useStateHist('');

  const lang = window.AHLang || 'bn';
  const s = window.AHStrings[lang] || window.AHStrings.bn;
  const catLabel = (c) => lang === 'en' ? (c.en || c.bn) : c.bn;
  const num = (n) => lang === 'en' ? String(n) : toBn(n);

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

  const total = filtered.reduce((a, t) => a + t.amt, 0);
  const grouped = useMemoHist(() => groupTxByDay(filtered), [filtered]);

  return (
    <div className="ah-content-inner">
      <div className="ah-tab-row">
        <button className={period==='week' ? 'active' : ''} onClick={() => setPeriod('week')}>{s.h_weekly}</button>
        <button className={period==='month' ? 'active' : ''} onClick={() => setPeriod('month')}>{s.h_monthly}</button>
        <button className={period==='all' ? 'active' : ''} onClick={() => setPeriod('all')}>{s.h_all}</button>
      </div>

      <div className="ah-stat-grid ah-history-stats">
        <StatCard label={s.h_total_spend} value={total} icon="trending-down" tone="red"
          meta={<span>{window.t('h_tx_count', { n: num(filtered.length) })}</span>}/>
        <StatCard label={s.h_daily_avg} value={Math.round(total / Math.max(1, grouped.length))}
          icon="calendar" tone="blue"
          meta={<span>{window.t('h_days', { n: num(grouped.length) })}</span>}/>
        <StatCard label={s.h_max} value={filtered.reduce((m, t) => Math.max(m, t.amt), 0)}
          icon="trending-up" tone="warn" meta={<span>{s.h_max_day}</span>}/>
      </div>

      <div className="ah-card" style={{marginTop: 20}}>
        <div className="ah-card-head" style={{flexWrap: 'wrap', gap: 12, marginBottom: 16}}>
          <div>
            <div className="ah-card-title">{s.h_all_tx}</div>
            <div className="ah-card-sub">{s.h_filter_hint}</div>
          </div>
          <div className="ah-search">
            <Icon name="search" size={16}/>
            <input placeholder={s.h_search_ph} value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="ah-filter-bar">
          <button className={'ah-filter ' + (filter==='all' ? 'active' : '')} onClick={() => setFilter('all')}>{s.h_all_types}</button>
          {CATEGORIES.map(c => (
            <button key={c.id} className={'ah-filter ' + (filter===c.id ? 'active' : '')} onClick={() => setFilter(c.id)}>
              <span>{c.em}</span> {catLabel(c)}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="inbox" size={24}/></div>
            <div className="ah-empty-title">{s.h_no_tx}</div>
            <div className="ah-empty-sub">{s.h_no_tx_sub}</div>
          </div>
        ) : (
          <div>
            {grouped.map(({ day, items, total: dayTotal }) => (
              <div key={day}>
                <div className="ah-tx-day-head">
                  <span>{fmtDayHead(day)}</span>
                  <span className="total">−৳{fmtTk(dayTotal)}</span>
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
