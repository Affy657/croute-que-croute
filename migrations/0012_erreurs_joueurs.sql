CREATE TABLE client_errors (
  id INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  stack TEXT NOT NULL,
  trail TEXT NOT NULL,
  device TEXT NOT NULL,
  count INTEGER NOT NULL,
  session TEXT NOT NULL,
  page TEXT NOT NULL,
  version TEXT NOT NULL,
  platform TEXT NOT NULL,
  standalone INTEGER NOT NULL,
  ua TEXT NOT NULL
);

CREATE INDEX client_errors_at ON client_errors (created_at);
CREATE INDEX client_errors_group ON client_errors (fingerprint);
