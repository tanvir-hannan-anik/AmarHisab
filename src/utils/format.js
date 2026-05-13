// ─────────────────────────────────────────────────────────────────────────────
// Utils / Format
//
// Pure helper functions: Bengali numerals, currency formatting, date labels,
// per-name avatar palette, and transaction grouping. No React, no DOM, no I/O.
// Importable from any other module via `window.X`.
// ─────────────────────────────────────────────────────────────────────────────

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];

// Convert ASCII digits → Bengali. Accepts numbers, strings, or null.
function toBn(num) {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

// Indian/Bangladeshi grouping: Bengali digits in bn mode, English digits in en mode.
function fmtTk(num) {
  const n = Math.round(Math.abs(num));
  if (window.AHLang === 'en') return n.toLocaleString('en-IN');
  return toBn(n.toLocaleString('en-IN'));
}

// Full date: "৫ মে, ২০২৬" (bn) or "May 5, 2026" (en).
function fmtDateBn(iso) {
  const d = new Date(iso);
  if (window.AHLang === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  return `${toBn(d.getDate())} ${months[d.getMonth()]}, ${toBn(d.getFullYear())}`;
}

// Day group header: "Today · Monday" (en) or "আজ · সোমবার" (bn).
function fmtDayHead(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (window.AHLang === 'en') {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (sameDay(d, today)) return 'Today · ' + days[d.getDay()];
    if (sameDay(d, yest)) return 'Yesterday · ' + days[d.getDay()];
    return `${d.getDate()} ${months[d.getMonth()]} · ${days[d.getDay()]}`;
  }
  const days = ['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'];
  const months = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্ট','অক্টো','নভে','ডিসে'];
  if (sameDay(d, today)) return 'আজ · ' + days[d.getDay()];
  if (sameDay(d, yest)) return 'গতকাল · ' + days[d.getDay()];
  return `${toBn(d.getDate())} ${months[d.getMonth()]} · ${days[d.getDay()]}`;
}

// Stable color picker for person avatars — same name always gets the same hue.
function avatarColor(name) {
  const palette = ['#1F6FB2','#4FB38A','#E0545B','#E8A93A','#7B4FB8','#D946A8','#3B8FD9','#2E7A58'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function initials(name) {
  return name.trim().charAt(0);
}

// ISO date helper used by sample data builders and ad-hoc tests.
const daysAgo = (n, h = 12, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

// Bucket transactions by YYYY-MM-DD, sort newest-day-first, then newest-tx-first
// within each day, and compute a per-day total. Used by the history view.
function groupTxByDay(txs) {
  const groups = {};
  for (const t of txs) {
    const k = t.date.slice(0, 10);
    if (!groups[k]) groups[k] = [];
    groups[k].push(t);
  }
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, items]) => ({
      day,
      items: items.sort((a, b) => b.date.localeCompare(a.date)),
      total: items.reduce((s, x) => s + x.amt, 0),
    }));
}

Object.assign(window, {
  toBn, fmtTk, fmtDateBn, fmtDayHead,
  avatarColor, initials, daysAgo, groupTxByDay,
});
