// ─────────────────────────────────────────────────────────────────────────────
// Routes / Debts
//
// CRUD over the `debts` table. DELETE is a soft-delete (settled = 1) so the
// row stays available for future reporting / analytics.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { asInt, isISODate, bad, sanitizeStr } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

const VALID_TYPES = new Set(['borrowed', 'lent']);

function rowToApi(r) {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    amt: r.amount,
    date: r.occurred_at,
    note: r.note || '',
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM debts WHERE user_id = ? AND settled = 0 ORDER BY occurred_at DESC, created_at DESC`
  ).all(req.userId);
  res.json(rows.map(rowToApi));
});

router.post('/', (req, res) => {
  const { id, type, name, amt, date, note } = req.body || {};
  if (!id || typeof id !== 'string') return bad(res, 'id required');
  if (!VALID_TYPES.has(type)) return bad(res, 'invalid type');
  const n = asInt(amt);
  if (!n || n <= 0) return bad(res, 'amount must be a positive integer');
  if (n > 9999999) return bad(res, 'amount too large');
  if (!isISODate(date)) return bad(res, 'invalid date');
  const cleanName = sanitizeStr(name, 80);
  const cleanNote = sanitizeStr(note, 200);
  if (!cleanName) return bad(res, 'name required');

  try {
    db.prepare(
      `INSERT INTO debts (id, user_id, type, name, amount, occurred_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         name = excluded.name,
         amount = excluded.amount,
         occurred_at = excluded.occurred_at,
         note = excluded.note,
         updated_at = datetime('now')
       WHERE debts.user_id = excluded.user_id`
    ).run(id, req.userId, type, cleanName, n, date, cleanNote);
    const row = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(id, req.userId);
    res.status(201).json(rowToApi(row));
  } catch (e) {
    console.error('debt insert', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { type, name, amt, date, note } = req.body || {};
  const existing = db.prepare('SELECT id FROM debts WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  if (!VALID_TYPES.has(type)) return bad(res, 'invalid type');
  const n = asInt(amt);
  if (!n || n <= 0) return bad(res, 'amount must be a positive integer');
  if (!isISODate(date)) return bad(res, 'invalid date');
  const cleanName = sanitizeStr(name, 80);
  const cleanNote = sanitizeStr(note, 200);
  if (!cleanName) return bad(res, 'name required');

  db.prepare(
    `UPDATE debts
     SET type = ?, name = ?, amount = ?, occurred_at = ?, note = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(type, cleanName, n, date, cleanNote, id, req.userId);
  const row = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(id, req.userId);
  res.json(rowToApi(row));
});

// Soft-delete: a "settled" debt vanishes from the active list but stays in the
// table. The frontend treats this as removal.
router.delete('/:id', (req, res) => {
  const info = db.prepare(
    `UPDATE debts SET settled = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

module.exports = router;
