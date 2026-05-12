-- Amar Hisab — SQLite schema
-- Each user owns rows in transactions / debts / budgets / settings.
-- Synthetic primary keys + foreign keys + indexes for the hot lookups.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  cat        TEXT NOT NULL,
  descr      TEXT NOT NULL,
  amount     INTEGER NOT NULL CHECK (amount > 0),
  kind       TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense','income')),
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_cat ON transactions(user_id, cat);

CREATE TABLE IF NOT EXISTS debts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('borrowed','lent')),
  name       TEXT NOT NULL,
  amount     INTEGER NOT NULL CHECK (amount > 0),
  occurred_at TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  settled    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_debt_user ON debts(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS budgets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  scope      TEXT NOT NULL,            -- 'monthly' or category id ('food', ...)
  amount     INTEGER NOT NULL CHECK (amount >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, scope)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id        TEXT PRIMARY KEY,
  notify_budget  INTEGER NOT NULL DEFAULT 1,
  notify_debt    INTEGER NOT NULL DEFAULT 1,
  currency       TEXT NOT NULL DEFAULT '৳',
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
