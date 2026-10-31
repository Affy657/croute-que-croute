CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES profiles (id),
  client_hash TEXT,
  created_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX sessions_player ON sessions (player_id);

INSERT INTO sessions (token_hash, player_id, client_hash, created_at)
SELECT token, id, client_id, created_at FROM profiles;

ALTER TABLE profiles ADD COLUMN progress TEXT;
