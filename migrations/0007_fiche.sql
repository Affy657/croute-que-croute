ALTER TABLE profiles ADD COLUMN look TEXT;

CREATE INDEX runs_player ON runs (player_id, finished_at);
