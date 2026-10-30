ALTER TABLE runs ADD COLUMN device TEXT;

ALTER TABLE profiles ADD COLUMN pc_best INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN pc_best_at INTEGER;
ALTER TABLE profiles ADD COLUMN pc_best_elapsed INTEGER;

CREATE INDEX profiles_pc_board ON profiles (banned, pc_best DESC, pc_best_at);
