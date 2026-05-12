// ─────────────────────────────────────────────────────────────────────────────
// Components / AIAdvice
//
// Dashboard card that summarises the user's recent activity via the Groq-backed
// /api/ai/advice endpoint. Renders three blocks — overall summary, observations,
// recommendations — in Bengali, with skeleton/error/empty fallbacks.
//
// To avoid spamming Groq, the advice is keyed by a hash of the input summary
// and cached in localStorage; revisiting the dashboard re-uses the cached
// response unless the inputs changed or the user clicks "রিফ্রেশ".
//
// Side-effect: broadcasts an `ah:ai-advice` event so NotificationDrawer can
// surface the AI insights alongside its budget/debt reminders.
// ─────────────────────────────────────────────────────────────────────────────

const { useState: useStateAI, useEffect: useEffectAI, useMemo: useMemoAI, useRef: useRefAI } = React;

const AH_AI_CACHE_KEY = 'ah:ai-advice:v1';
const AH_AI_EVENT = 'ah:ai-advice';

function ahAiHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

// Build a compact summary of the user's recent finances. Kept small so the
// LLM payload stays cheap and the cache key stays stable across cosmetic edits.
function ahAiBuildSummary(state) {
  const { txs = [], debts = [], budget = 0, monthLabel = '' } = state || {};
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthTxs = txs.filter(t => new Date(t.date) >= monthStart);
  const totalSpent = monthTxs.reduce((s, t) => s + t.amt, 0);

  const catMap = {};
  monthTxs.forEach(t => { catMap[t.cat] = (catMap[t.cat] || 0) + t.amt; });
  const topCategories = (window.CATEGORIES || [])
    .map(c => ({ name: c.bn, id: c.id, amount: catMap[c.id] || 0 }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(c => ({ ...c, percent: totalSpent ? Math.round((c.amount / totalSpent) * 100) : 0 }));

  const borrowedFrom = debts
    .filter(d => d.type === 'borrowed')
    .map(d => ({ name: d.name, amount: d.amt }))
    .slice(0, 6);
  const lentTo = debts
    .filter(d => d.type === 'lent')
    .map(d => ({ name: d.name, amount: d.amt }))
    .slice(0, 6);

  const recentTxs = [...monthTxs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map(t => ({
      desc: t.desc,
      amount: t.amt,
      category: (window.CAT_BY_ID && window.CAT_BY_ID[t.cat] && window.CAT_BY_ID[t.cat].bn) || t.cat,
      date: t.date.slice(0, 10),
    }));

  return {
    monthLabel,
    budget,
    totalSpent,
    remaining: budget - totalSpent,
    transactionCount: monthTxs.length,
    topCategories,
    borrowedFrom,
    lentTo,
    recentTxs,
  };
}

function ahAiReadCache(key) {
  try {
    const raw = localStorage.getItem(AH_AI_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && obj.key === key ? obj.data : null;
  } catch (e) { return null; }
}

function ahAiWriteCache(key, data) {
  try {
    localStorage.setItem(AH_AI_CACHE_KEY, JSON.stringify({ key, data, t: Date.now() }));
  } catch (e) { /* quota — ignore */ }
}

function ahAiBroadcast(data) {
  const notifs = [];
  if (data && Array.isArray(data.highlights)) {
    data.highlights.slice(0, 3).forEach((text, i) => {
      notifs.push({
        id: 'ai-h-' + i, tone: 'info', icon: 'sparkles',
        title: 'AI বিশ্লেষণ', sub: text,
      });
    });
  }
  if (data && Array.isArray(data.recommendations)) {
    data.recommendations.slice(0, 3).forEach((text, i) => {
      notifs.push({
        id: 'ai-r-' + i, tone: 'mint', icon: 'lightbulb',
        title: 'AI পরামর্শ', sub: text,
      });
    });
  }
  window.dispatchEvent(new CustomEvent(AH_AI_EVENT, {
    detail: { notifs, advice: data || null },
  }));
}

function AISkeleton() {
  return (
    <div className="ah-ai-skel" aria-hidden="true">
      <div className="ah-ai-skel-line w90"/>
      <div className="ah-ai-skel-line w70"/>
      <div className="ah-ai-skel-grid">
        <div>
          <div className="ah-ai-skel-line w40"/>
          <div className="ah-ai-skel-line w80"/>
          <div className="ah-ai-skel-line w60"/>
          <div className="ah-ai-skel-line w75"/>
        </div>
        <div>
          <div className="ah-ai-skel-line w40"/>
          <div className="ah-ai-skel-line w70"/>
          <div className="ah-ai-skel-line w85"/>
          <div className="ah-ai-skel-line w55"/>
        </div>
      </div>
    </div>
  );
}

function AIAdvice({ state }) {
  const summary = useMemoAI(() => ahAiBuildSummary(state), [state.txs, state.debts, state.budget, state.monthLabel]);
  const cacheKey = useMemoAI(() => ahAiHash(JSON.stringify(summary)), [summary]);
  const hasData = summary.transactionCount > 0 || summary.borrowedFrom.length > 0 || summary.lentTo.length > 0;

  const initial = ahAiReadCache(cacheKey);
  const [advice, setAdvice] = useStateAI(initial);
  const [loading, setLoading] = useStateAI(false);
  const [error, setError] = useStateAI(null);
  const debounceRef = useRefAI(null);
  const reqIdRef = useRefAI(0);

  // Re-broadcast cached advice on mount so the notification drawer picks it up.
  useEffectAI(() => {
    if (initial) ahAiBroadcast(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runFetch = async (force) => {
    if (!hasData) {
      setAdvice(null); setLoading(false); setError(null);
      ahAiBroadcast(null);
      return;
    }
    if (!force) {
      const cached = ahAiReadCache(cacheKey);
      if (cached) {
        setAdvice(cached); setLoading(false); setError(null);
        ahAiBroadcast(cached);
        return;
      }
    }
    const myId = ++reqIdRef.current;
    setLoading(true); setError(null);
    try {
      const data = await window.AHApi.ai.getAdvice(summary);
      if (reqIdRef.current !== myId) return; // a newer request superseded us
      setAdvice(data);
      ahAiWriteCache(cacheKey, data);
      ahAiBroadcast(data);
    } catch (e) {
      if (reqIdRef.current !== myId) return;
      setError(e && e.message ? e.message : 'AI পরামর্শ আনতে সমস্যা হয়েছে');
    } finally {
      if (reqIdRef.current === myId) setLoading(false);
    }
  };

  useEffectAI(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(false), 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <div className="ah-card ah-ai-card">
      <div className="ah-card-head">
        <div className="ah-ai-head-l">
          <span className="ah-ai-mark" aria-hidden="true"><Icon name="sparkles" size={16}/></span>
          <div>
            <div className="ah-card-title">AI পরামর্শ</div>
            <div className="ah-card-sub">আপনার আর্থিক অভ্যাসের বুদ্ধিমান বিশ্লেষণ</div>
          </div>
        </div>
        <button
          className="ah-card-link ah-ai-refresh"
          onClick={() => runFetch(true)}
          disabled={loading || !hasData}
          title="পুনরায় বিশ্লেষণ"
        >
          <span className={'ah-ai-refresh-ic ' + (loading ? 'spin' : '')}>
            <Icon name="refresh" size={14}/>
          </span>
          {loading ? 'বিশ্লেষণ চলছে…' : 'রিফ্রেশ'}
        </button>
      </div>

      {/* Body */}
      {!hasData && (
        <div className="ah-empty">
          <div className="ah-empty-ic"><Icon name="sparkles" size={24}/></div>
          <div className="ah-empty-title">বিশ্লেষণের জন্য আরও তথ্য দরকার</div>
          <div className="ah-empty-sub">কিছু লেনদেন বা দেনা-পাওনা যোগ করুন</div>
        </div>
      )}

      {hasData && loading && !advice && <AISkeleton/>}

      {hasData && error && !loading && (
        <div className="ah-ai-error">
          <div className="ah-ai-error-ic"><Icon name="bell" size={18}/></div>
          <div className="ah-ai-error-body">
            <div className="ah-ai-error-title">AI পরামর্শ আনা যায়নি</div>
            <div className="ah-ai-error-sub">{error}</div>
          </div>
          <button className="ah-btn ah-btn-ghost" onClick={() => runFetch(true)}>
            আবার চেষ্টা
          </button>
        </div>
      )}

      {hasData && advice && (
        <div className="ah-ai-body">
          {advice.summary && (
            <div className="ah-ai-summary">
              <span className="ah-ai-quote">“</span>
              {advice.summary}
            </div>
          )}

          <div className="ah-ai-cols">
            {Array.isArray(advice.highlights) && advice.highlights.length > 0 && (
              <div className="ah-ai-section">
                <div className="ah-ai-section-title">
                  <span className="ic"><Icon name="piechart" size={14}/></span>
                  পর্যবেক্ষণ
                </div>
                <ul className="ah-ai-list">
                  {advice.highlights.map((h, i) => (
                    <li key={i}>
                      <span className="dot"/>{h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(advice.recommendations) && advice.recommendations.length > 0 && (
              <div className="ah-ai-section rec">
                <div className="ah-ai-section-title">
                  <span className="ic ok"><Icon name="lightbulb" size={14}/></span>
                  পরামর্শ
                </div>
                <ul className="ah-ai-list rec">
                  {advice.recommendations.map((r, i) => (
                    <li key={i}>
                      <span className="check"><Icon name="check" size={12}/></span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.AIAdvice = AIAdvice;
