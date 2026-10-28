CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX admins_token ON admins (token_hash);

CREATE TABLE admin_invites (
  token_hash TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
