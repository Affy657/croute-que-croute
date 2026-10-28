ALTER TABLE players ADD COLUMN run_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN best_elapsed INTEGER;
ALTER TABLE players ADD COLUMN client_id TEXT;

UPDATE players SET run_count = (SELECT COUNT(*) FROM runs WHERE runs.player_id = players.id AND runs.finished_at IS NOT NULL);

CREATE TABLE runs_v2 (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players (id),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  score INTEGER
) WITHOUT ROWID;

INSERT INTO runs_v2 (id, player_id, started_at, finished_at, score)
SELECT id, player_id, started_at, finished_at, score FROM runs;

DROP TABLE runs;
ALTER TABLE runs_v2 RENAME TO runs;
