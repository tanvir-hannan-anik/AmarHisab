// ─────────────────────────────────────────────────────────────────────────────
// Routes / Settings
//
// Returns/updates the user's profile name + notification preferences. The
// upsert pattern keeps the row guaranteed to exist after register.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const db = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { bad, sanitizeStr } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const u = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.userId);
  const s = db.prepare('SELECT notify_budget, notify_debt, currency FROM user_settings WHERE user_id = ?').get(req.userId);
  res.json({
    name: u ? u.name : '',
    email: u ? u.email : '',
    notifyBudget: s ? !!s.notify_budget : true,
    notifyDebt: s ? !!s.notify_debt : true,
    currency: s ? s.currency : '৳',
  });
});

router.put('/', (req, res) => {
  const name = sanitizeStr(req.body.name, 80);
  if (!name) return bad(res, 'name required');
  const notifyBudget = req.body.notifyBudget === false ? 0 : 1;
  const notifyDebt = req.body.notifyDebt === false ? 0 : 1;
  const currency = sanitizeStr(req.body.currency, 8) || '৳';

  db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, req.userId);
  db.prepare(
    `INSERT INTO user_settings (user_id, notify_budget, notify_debt, currency)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       notify_budget = excluded.notify_budget,
       notify_debt = excluded.notify_debt,
       currency = excluded.currency,
       updated_at = datetime('now')`
  ).run(req.userId, notifyBudget, notifyDebt, currency);
  res.json({ ok: true });
});

module.exports = router;
