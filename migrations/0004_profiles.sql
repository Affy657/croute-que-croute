PRAGMA defer_foreign_keys = true;

ALTER TABLE events ADD COLUMN opens_at INTEGER;
UPDATE events SET opens_at = created_at;

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  pseudo TEXT NOT NULL,
  pseudo_key TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  client_id TEXT,
  best INTEGER NOT NULL DEFAULT 0,
  best_at INTEGER,
  best_elapsed INTEGER,
  run_count INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX profiles_board ON profiles (banned, best DESC, best_at);

CREATE TABLE entries (
  event_id INTEGER NOT NULL REFERENCES events (id),
  player_id TEXT NOT NULL REFERENCES profiles (id),
  best INTEGER NOT NULL DEFAULT 0,
  best_at INTEGER,
  best_elapsed INTEGER,
  run_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, player_id)
) WITHOUT ROWID;

CREATE INDEX entries_board ON entries (event_id, best DESC, best_at);

INSERT INTO profiles (id, pseudo, pseudo_key, token, client_id, best, best_at, best_elapsed, run_count, banned, created_at)
SELECT p.id, p.pseudo, p.pseudo_key, p.token, p.client_id, p.best, p.best_at, p.best_elapsed, p.run_count, p.banned, p.created_at
FROM players p
WHERE p.event_id = (SELECT MAX(q.event_id) FROM players q WHERE q.pseudo_key = p.pseudo_key);

INSERT INTO entries (event_id, player_id, best, best_at, best_elapsed, run_count)
SELECT event_id, id, best, best_at, best_elapsed, run_count FROM players WHERE id IN (SELECT id FROM profiles);

CREATE TABLE runs_v3 (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES profiles (id),
  event_id INTEGER,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  score INTEGER
) WITHOUT ROWID;

INSERT INTO runs_v3 (id, player_id, event_id, started_at, finished_at, score)
SELECT r.id, r.player_id, p.event_id, r.started_at, r.finished_at, r.score
FROM runs r JOIN players p ON p.id = r.player_id
WHERE r.player_id IN (SELECT id FROM profiles);

DROP TABLE runs;
ALTER TABLE runs_v3 RENAME TO runs;
DROP TABLE players;

CREATE INDEX events_closes ON events (closes_at);
