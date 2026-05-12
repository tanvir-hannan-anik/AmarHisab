// ─────────────────────────────────────────────────────────────────────────────
// Pages / RemindersScreen
//
// Aggregates active reminders from app state: aging debts (>7 days) and budget
// warnings (>=80% / over). Pure derivation — no separate stored list.
// ─────────────────────────────────────────────────────────────────────────────

function RemindersScreen({ state }) {
  const { debts, txs, budget } = state;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const spent = txs.filter(t => new Date(t.date) >= monthStart).reduce((s, t) => s + t.amt, 0);
  const pct = budget ? Math.min(999, (spent / budget) * 100) : 0;
  const daysLeft = Math.max(0, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate());

  const items = [];
  debts.forEach(d => {
    const age = Math.floor((today - new Date(d.date)) / (1000 * 60 * 60 * 24));
    if (age >= 7) {
      items.push({
        id: 'r-' + d.id,
        title: d.type === 'borrowed'
          ? `${d.name}-কে ৳${fmtTk(d.amt)} ফেরত দেওয়া বাকি`
          : `${d.name}-এর কাছ থেকে ৳${fmtTk(d.amt)} পাবেন`,
        sub: `${toBn(age)} দিন আগে · ${d.note || (d.type === 'borrowed' ? 'ধার নেওয়া' : 'ধার দেওয়া')}`,
        tone: d.type === 'borrowed' ? 'warn' : 'mint',
        icon: 'handshake',
      });
    }
  });
  if (pct >= 80 && pct < 100) {
    items.push({
      id: 'r-budget-warn',
      title: 'বাজেট সীমার কাছাকাছি',
      sub: `${toBn(Math.round(pct))}% খরচ হয়েছে · ${toBn(daysLeft)} দিন বাকি`,
      tone: 'warn', icon: 'bell',
    });
  }
  if (pct >= 100) {
    items.push({
      id: 'r-budget-over',
      title: 'বাজেট অতিক্রান্ত!',
      sub: `সীমার চেয়ে ৳${fmtTk(spent - budget)} বেশি`,
      tone: 'red', icon: 'bell',
    });
  }

  return (
    <div className="ah-content-inner">
      <div className="ah-card">
        <div className="ah-card-head">
          <div>
            <div className="ah-card-title">সক্রিয় রিমাইন্ডার</div>
            <div className="ah-card-sub">গুরুত্বপূর্ণ স্মরণ ও সতর্কতা</div>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-ic"><Icon name="bell" size={24}/></div>
            <div className="ah-empty-title">কোন রিমাইন্ডার নেই</div>
            <div className="ah-empty-sub">আপনার সবকিছু ঠিক আছে</div>
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
