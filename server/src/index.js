// ─────────────────────────────────────────────────────────────────────────────
// Server entry
//
// Sets up middleware, mounts routes, and starts listening. Order matters:
//   1. JSON body parsing + CORS
//   2. Rate limiters (general + per-route for auth)
//   3. Routes
//   4. Static frontend (optional, controlled by env.SERVE_STATIC)
//   5. 404 + error handler
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// CORS — explicit allow-list from env (comma-separated), or "*" for dev.
const allowed = env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: true,
}));

// Generic per-IP rate limit, applied to every /api/* request.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Tighter limit on auth endpoints to discourage brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// API
app.use('/api/auth',         authLimiter, require('./routes/auth.routes'));
app.use('/api/transactions',              require('./routes/transactions.routes'));
app.use('/api/debts',                     require('./routes/debts.routes'));
app.use('/api/budgets',                   require('./routes/budgets.routes'));
app.use('/api/settings',                  require('./routes/settings.routes'));
app.use('/api/ai',                        require('./routes/ai.routes'));

// Static frontend (single-process deploy). Disable with SERVE_STATIC=0.
if (env.SERVE_STATIC) {
  const staticDir = path.resolve(__dirname, '..', '..');
  app.use(express.static(staticDir, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    },
  }));
}

// 404 (must come after routes + static)
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error fallback (must be 4-arg)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('unhandled', err);
  if (err && /CORS/i.test(err.message)) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, () => {
  console.log(`✓ Amar Hisab server listening on http://localhost:${env.PORT}`);
  console.log(`  API base: http://localhost:${env.PORT}/api`);
  if (env.SERVE_STATIC) {
    console.log(`  App:      http://localhost:${env.PORT}/`);
  }
});
