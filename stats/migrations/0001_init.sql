CREATE TABLE readings (
  source TEXT NOT NULL,
  metric TEXT NOT NULL,
  dim TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (source, metric, dim, date)
);
CREATE TABLE items (
  source TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT,
  url TEXT,
  date TEXT,
  PRIMARY KEY (source, id)
);
CREATE TABLE syncs (
  source TEXT PRIMARY KEY,
  last_ok TEXT,
  last_try TEXT,
  error TEXT
);
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT
);
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE tokens (
  source TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  meta TEXT
);
CREATE TABLE release_map (
  source TEXT NOT NULL,
  item TEXT NOT NULL,
  release TEXT NOT NULL,
  PRIMARY KEY (source, item)
);
