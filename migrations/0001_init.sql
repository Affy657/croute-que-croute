CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  closes_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events (id),
  pseudo TEXT NOT NULL,
  pseudo_key TEXT NOT NULL,
  token TEXT NOT NULL,
  best INTEGER NOT NULL DEFAULT 0,
  best_at INTEGER,
  banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (event_id, pseudo_key)
);

CREATE UNIQUE INDEX players_token ON players (token);
CREATE INDEX players_board ON players (event_id, banned, best DESC, best_at);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players (id),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  score INTEGER
);

CREATE INDEX runs_player ON runs (player_id);
