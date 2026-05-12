// ─────────────────────────────────────────────────────────────────────────────
// Routes / Auth
//
// Register, login, and "who am I" endpoints. Passwords are bcrypt-hashed and
// the cost factor is configurable via env.BCRYPT_ROUNDS. A successful register
// also seeds a row in user_settings so the FK is satisfied on first GET.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../database/connection');
const env = require('../config/env');
const { signToken, requireAuth } = require('../middleware/auth');
const { bad, sanitizeStr } = require('../middleware/validate');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  try {
    const email = sanitizeStr(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || '');
    const name = sanitizeStr(req.body.name, 80);

    if (!EMAIL_RE.test(email)) return bad(res, 'Valid email required');
    if (password.length < 6) return bad(res, 'Password must be at least 6 characters');
    if (!name) return bad(res, 'Name required');

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = 'u' + crypto.randomBytes(9).toString('hex');
    const hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(id, email, hash, name);
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id);

    const user = { id, email, name };
    return res.status(201).json({ token: signToken(user), user });
  } catch (e) {
    console.error('register', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = sanitizeStr(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return bad(res, 'Email and password required');

    const row = db.prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?').get(email);
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const user = { id: row.id, email: row.email, name: row.name };
    return res.json({ token: signToken(user), user });
  } catch (e) {
    console.error('login', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.userId);
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: row });
});

module.exports = router;
