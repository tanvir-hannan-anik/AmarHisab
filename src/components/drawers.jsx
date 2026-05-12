// ─────────────────────────────────────────────────────────────────────────────
// Components / Drawers
//
// Right-side overlay drawers triggered from the topbar:
//   - NotificationDrawer   budget alerts + aged debt reminders
//   - SearchDrawer         live search across transactions and debts
//
// Both close on Escape and on overlay click; the search drawer also auto-
// focuses its input.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateDrw, useEffect: useEffectDrw, useMemo: useMemoDrw, useRef: useRefDrw } = React;

function NotificationDrawer({ open, onClose, state }) {
  const { debts, txs, budget } = state;

  // AIAdvice broadcasts an `ah:ai-advice` event whenever it has fresh insights.
  // We keep a local copy so the notification list can include them alongside
  // budget/debt alerts.
  const [aiNotifs, setAiNotifs] = useStateDrw([]);
  useEffectDrw(() => {
    const onAdvice = (e) => {
      const list = (e.detail && Array.isArray(e.detail.notifs)) ? e.detail.notifs : [];
      setAiNotifs(list);
    };
    window.addEventListener('ah:ai-advice', onAdvice);
    return () => window.removeEventListener('ah:ai-advice', onAdvice);
  }, []);

  const items = useMemoDrw(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const spent = txs.filter(t => new Date(t.date) >= monthStart).reduce((s, t) => s + t.amt, 0);
    const pct = budget ? (spent / budget) * 100 : 0;
    const out = [];

    if (pct >= 100) {
      out.push({
        id: 'n-budget-over', tone: 'red', icon: 'bell',
        title: 'বাজেট অতিক্রান্ত!',
        sub: `সীমার চেয়ে ৳${fmtTk(spent - budget)} বেশি খরচ হয়েছে`,
      });
    } else if (pct >= 80) {
      out.push({
        id: 'n-budget-warn', tone: 'warn', icon: 'bell',
        title: 'বাজেট সীমার কাছাকাছি',
        sub: `${toBn(Math.round(pct))}% খরচ হয়েছে`,
      });
    }
    debts.forEach(d => {
      const age = Math.floor((today - new Date(d.date)) / (1000 * 60 * 60 * 24));
      if (age >= 7) {
        out.push({
          id: 'n-' + d.id,
          tone: d.type === 'borrowed' ? 'warn' : 'mint',
          icon: 'handshake',
          title: d.type === 'borrowed'
            ? `${d.name}-কে ৳${fmtTk(d.amt)} ফেরত দেওয়া বাকি`
            : `${d.name}-এর কাছ থেকে ৳${fmtTk(d.amt)} পাবেন`,
          sub: `${toBn(age)} দিন আগে`,
        });
      }
    });
    return [...out, ...aiNotifs];
  }, [debts, txs, budget, aiNotifs]);

  useEffectDrw(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ah-drawer-overlay" onClick={onClose}>
      <div className="ah-drawer" onClick={e => e.stopPropagation()}>
        <div className="ah-drawer-head">
          <div className="ah-modal-title">নোটিফিকেশন</div>
          <button className="ah-icon-btn" onClick={onClose} style={{width: 32, height: 32}}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        <div className="ah-drawer-body">
          {items.length === 0 ? (
            <div className="ah-empty">
              <div className="ah-empty-ic"><Icon name="bell" size={24}/></div>
              <div className="ah-empty-title">কোন নতুন নোটিফিকেশন নেই</div>
              <div className="ah-empty-sub">আপনি আপ-টু-ডেট</div>
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
    </div>
  );
}

function SearchDrawer({ open, onClose, state }) {
  const { txs, debts } = state;
  const [q, setQ] = useStateDrw('');
  const inputRef = useRefDrw(null);

  useEffectDrw(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 80);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  const txMatches = useMemoDrw(() => {
    if (!q.trim()) return [];
    const term = q.trim().toLowerCase();
    return txs.filter(t => {
      const c = CAT_BY_ID[t.cat];
      return t.desc.toLowerCase().includes(term)
        || (c && c.bn.includes(q.trim()))
        || String(t.amt).includes(term);
    }).slice(0, 20);
  }, [q, txs]);

  const debtMatches = useMemoDrw(() => {
    if (!q.trim()) return [];
    const term = q.trim().toLowerCase();
    return debts.filter(d =>
      d.name.toLowerCase().includes(term) ||
      (d.note || '').toLowerCase().includes(term) ||
      String(d.amt).includes(term)
    ).slice(0, 10);
  }, [q, debts]);

  if (!open) return null;
  return (
    <div className="ah-drawer-overlay" onClick={onClose}>
      <div className="ah-drawer" onClick={e => e.stopPropagation()}>
        <div className="ah-drawer-head">
          <div className="ah-search" style={{flex: 1, maxWidth: 'unset'}}>
            <Icon name="search" size={16}/>
            <input
              ref={inputRef}
              placeholder="খুঁজুন..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <button className="ah-icon-btn" onClick={onClose} style={{width: 32, height: 32}}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        <div className="ah-drawer-body">
          {!q.trim() ? (
            <div className="ah-empty">
              <div className="ah-empty-ic"><Icon name="search" size={24}/></div>
              <div className="ah-empty-title">খুঁজুন</div>
              <div className="ah-empty-sub">লেনদেন, ব্যক্তি বা পরিমাণ লিখুন</div>
            </div>
          ) : (txMatches.length === 0 && debtMatches.length === 0) ? (
            <div className="ah-empty">
              <div className="ah-empty-ic"><Icon name="inbox" size={24}/></div>
              <div className="ah-empty-title">কিছু পাওয়া যায়নি</div>
            </div>
          ) : (
            <>
              {txMatches.length > 0 && (
                <>
                  <div className="ah-search-section">লেনদেন</div>
                  <div className="ah-tx-list">
                    {txMatches.map(t => <TxRow key={t.id} tx={t}/>)}
                  </div>
                </>
              )}
              {debtMatches.length > 0 && (
                <>
                  <div className="ah-search-section" style={{marginTop: 14}}>দেনা-পাওনা</div>
                  <div className="ah-people-list">
                    {debtMatches.map(d => <PersonRow key={d.id} debt={d}/>)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NotificationDrawer, SearchDrawer });
