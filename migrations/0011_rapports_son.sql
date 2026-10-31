CREATE TABLE sound_reports (
  id INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  kind TEXT NOT NULL,
  version TEXT NOT NULL,
  standalone INTEGER NOT NULL,
  ua TEXT NOT NULL,
  lines TEXT NOT NULL
);

CREATE INDEX sound_reports_at ON sound_reports (created_at);
