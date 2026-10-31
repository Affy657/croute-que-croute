CREATE TABLE links (
  code_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES profiles (id),
  expires_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX links_player ON links (player_id);
