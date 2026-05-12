// Small validation helpers — kept tiny on purpose, no schema library.

function asInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}

function isISODate(s) {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && d.toISOString().length > 0;
}

function bad(res, msg) {
  return res.status(400).json({ error: msg });
}

function sanitizeStr(s, max = 200) {
  return String(s == null ? '' : s).trim().slice(0, max);
}

module.exports = { asInt, isISODate, bad, sanitizeStr };
