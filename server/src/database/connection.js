// ─────────────────────────────────────────────────────────────────────────────
// Database / Connection
//
// SQLite connection (better-sqlite3) with synchronous API. WAL mode and foreign
// keys are turned on. The schema is idempotent — every CREATE uses IF NOT
// EXISTS — so this runs safely on every boot.
//
// The DB file lives at the path given by env.DB_PATH (default: server/data/).
// ─────────────────────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');

// Resolve DB path relative to the server root (server/) so values like
// "./data/amar-hisab.db" keep working regardless of where node is invoked.
const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const DB_PATH = path.isAbsolute(env.DB_PATH)
  ? env.DB_PATH
  : path.join(SERVER_ROOT, env.DB_PATH);

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
