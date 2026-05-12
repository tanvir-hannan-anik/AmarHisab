// ─────────────────────────────────────────────────────────────────────────────
// Routes / Budgets
//
// Monthly budget + optional per-category caps. Storage is a single table keyed
// by (user_id, scope) where scope is "monthly" or a category id.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { asInt, bad } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT scope, amount FROM budgets WHERE user_id = ?').all(req.userId);
  const monthly = rows.find(r => r.scope === 'monthly');
  const categories = {};
  rows.filter(r => r.scope !== 'monthly').forEach(r => { categories[r.scope] = r.amount; });
  res.json({ monthly: monthly ? monthly.amount : 0, categories });
});

router.put('/:scope', (req, res) => {
  const scope = String(req.params.scope || '').slice(0, 32);
  const n = asInt(req.body.amount);
  if (!Number.isInteger(n) || n < 0) return bad(res, 'amount must be a non-negative integer');
  if (n > 99999999) return bad(res, 'amount too large');

  const id = `b-${req.userId}-${scope}`;
  db.prepare(
    `INSERT INTO budgets (id, user_id, scope, amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, scope) DO UPDATE SET amount = excluded.amount, updated_at = datetime('now')`
  ).run(id, req.userId, scope, n);
  res.json({ scope, amount: n });
});

router.post('/', (req, res) => {
  const n = asInt(req.body.amount);
  if (!Number.isInteger(n) || n < 0) return bad(res, 'amount must be a non-negative integer');
  const id = `b-${req.userId}-monthly`;
  db.prepare(
    `INSERT INTO budgets (id, user_id, scope, amount)
     VALUES (?, ?, 'monthly', ?)
     ON CONFLICT(user_id, scope) DO UPDATE SET amount = excluded.amount, updated_at = datetime('now')`
  ).run(id, req.userId, n);
  res.status(201).json({ scope: 'monthly', amount: n });
});

module.exports = router;
