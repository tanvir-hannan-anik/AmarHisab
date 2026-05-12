// ─────────────────────────────────────────────────────────────────────────────
// Routes / Transactions
//
// CRUD over the `transactions` table, scoped per user. The POST uses an upsert
// keyed by id so the client can replay a sync without conflicting — useful for
// offline-first behavior.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { asInt, isISODate, bad, sanitizeStr } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

const VALID_CATS = new Set(['food','transport','education','rent','bills','health','shopping','other']);
const VALID_KINDS = new Set(['expense','income']);

function rowToApi(r) {
  return {
    id: r.id,
    cat: r.cat,
    desc: r.descr,
    amt: r.amount,
    kind: r.kind,
    date: r.occurred_at,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY occurred_at DESC, created_at DESC'
  ).all(req.userId);
  res.json(rows.map(rowToApi));
});

router.post('/', (req, res) => {
  const { id, cat, desc, amt, date, kind } = req.body || {};
  if (!id || typeof id !== 'string') return bad(res, 'id required');
  if (!VALID_CATS.has(cat)) return bad(res, 'invalid cat');
  const n = asInt(amt);
  if (!n || n <= 0) return bad(res, 'amount must be a positive integer');
  if (n > 9999999) return bad(res, 'amount too large');
  if (!isISODate(date)) return bad(res, 'invalid date');
  const k = VALID_KINDS.has(kind) ? kind : 'expense';
  const description = sanitizeStr(desc, 200) || cat;

  try {
    db.prepare(
      `INSERT INTO transactions (id, user_id, cat, descr, amount, kind, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         cat = excluded.cat,
         descr = excluded.descr,
         amount = excluded.amount,
         kind = excluded.kind,
         occurred_at = excluded.occurred_at,
         updated_at = datetime('now')
       WHERE transactions.user_id = excluded.user_id`
    ).run(id, req.userId, cat, description, n, k, date);
    const row = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, req.userId);
    res.status(201).json(rowToApi(row));
  } catch (e) {
    console.error('tx insert', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { cat, desc, amt, date, kind } = req.body || {};
  const existing = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  if (!VALID_CATS.has(cat)) return bad(res, 'invalid cat');
  const n = asInt(amt);
  if (!n || n <= 0) return bad(res, 'amount must be a positive integer');
  if (!isISODate(date)) return bad(res, 'invalid date');
  const k = VALID_KINDS.has(kind) ? kind : 'expense';
  const description = sanitizeStr(desc, 200) || cat;

  db.prepare(
    `UPDATE transactions
     SET cat = ?, descr = ?, amount = ?, kind = ?, occurred_at = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(cat, description, n, k, date, id, req.userId);
  const row = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, req.userId);
  res.json(rowToApi(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
