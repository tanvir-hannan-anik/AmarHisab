// ─────────────────────────────────────────────────────────────────────────────
// Config / Env
//
// Loads .env once (if present), validates critical vars, and exports a frozen
// config object the rest of the app reads from. Keeps process.env access in
// one place — easier to test and to swap for a secret manager later.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
// dotenv defaults to process.cwd(), but `npm start` from the project root
// makes cwd = repo root, not server/. Point it at server/.env explicitly so
// the file is found regardless of which directory node is launched from.
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const env = Object.freeze({
  PORT: parseInt(process.env.PORT || '4000', 10),

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '30d',

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  DB_PATH: process.env.DB_PATH || './data/amar-hisab.db',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  SERVE_STATIC: process.env.SERVE_STATIC !== '0',

  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  NODE_ENV: process.env.NODE_ENV || 'development',
});

if (!env.JWT_SECRET || env.JWT_SECRET.startsWith('replace-')) {
  console.warn('⚠️  JWT_SECRET is missing or default — set it in server/.env before production use.');
}

module.exports = env;
