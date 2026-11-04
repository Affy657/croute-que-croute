ALTER TABLE profiles ADD COLUMN google_hash TEXT;

CREATE UNIQUE INDEX profiles_google ON profiles (google_hash) WHERE google_hash IS NOT NULL;

CREATE TABLE google_states (
  state_hash TEXT PRIMARY KEY,
  player_id TEXT,
  client_hash TEXT,
  expires_at INTEGER NOT NULL
) WITHOUT ROWID;
