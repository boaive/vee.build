-- VEE.BUILD: the one database (Cloudflare D1, SQLite).
-- Times are ISO 8601 strings in UTC. Ids are random UUIDs.

-- The one owner. There is no sign-up: the row is written by scripts/set-password.mjs.
CREATE TABLE admin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_changed_at TEXT NOT NULL
);

-- A signed-in browser. Only a SHA-256 of the cookie's token is kept.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  country TEXT,
  user_agent TEXT
);

-- Every sign-in attempt, for the lockout. Kept 30 days.
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  ip TEXT NOT NULL,
  ok INTEGER NOT NULL
);
CREATE INDEX login_attempts_ip_at ON login_attempts (ip, at);
CREATE INDEX login_attempts_at ON login_attempts (at);

CREATE TABLE enquiries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  form TEXT NOT NULL CHECK (form IN ('contact', 'partnership')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organisation TEXT,
  region TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  build_json TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
  read_at TEXT,
  -- A salted hash of the sender's IP: enough to rate-limit, not enough to identify.
  ip_hash TEXT,
  country TEXT
);
CREATE INDEX enquiries_created ON enquiries (created_at DESC);
CREATE INDEX enquiries_status ON enquiries (status, created_at DESC);
CREATE INDEX enquiries_email ON enquiries (email COLLATE NOCASE);
CREATE INDEX enquiries_ip ON enquiries (ip_hash, created_at);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  enquiry_id TEXT NOT NULL REFERENCES enquiries (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX notes_enquiry ON notes (enquiry_id, created_at);

-- Files attached to an enquiry (drawings, site photos, signed quotes). The bytes are in R2.
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  enquiry_id TEXT NOT NULL REFERENCES enquiries (id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX files_enquiry ON files (enquiry_id, created_at);

CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  enquiry_id TEXT REFERENCES enquiries (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  customer_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  quantities_json TEXT NOT NULL,
  rates_json TEXT NOT NULL,
  pricing_version INTEGER NOT NULL,
  lines_json TEXT NOT NULL,
  total INTEGER NOT NULL,
  per_sqft INTEGER NOT NULL,
  valid_until TEXT NOT NULL,
  terms TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE INDEX quotes_status ON quotes (status, updated_at DESC);
CREATE INDEX quotes_enquiry ON quotes (enquiry_id);

-- Every published price list. The highest version is the one the site shows.
CREATE TABLE pricing_versions (
  version INTEGER PRIMARY KEY,
  rates_json TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- What was done in the panel, and every sign-in. Kept a year.
CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  country TEXT
);
CREATE INDEX activity_at ON activity (at DESC);
