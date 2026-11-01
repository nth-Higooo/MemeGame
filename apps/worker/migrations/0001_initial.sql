PRAGMA foreign_keys = ON;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (length(code) = 6),
  name TEXT NOT NULL,
  default_mode TEXT NOT NULL CHECK (default_mode IN ('TALENT_MODE', 'COMMUNITY_MODE')),
  status TEXT NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'ACTIVE', 'PAUSED', 'FINISHED', 'ARCHIVED')),
  active_round_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (session_id, display_name)
);

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reconnect_token_hash TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 32),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE memes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/gif', 'image/webp', 'image/jpeg', 'image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  mode TEXT NOT NULL CHECK (mode IN ('TALENT_MODE', 'COMMUNITY_MODE')),
  prompt TEXT NOT NULL CHECK (length(prompt) BETWEEN 1 AND 280),
  phase TEXT NOT NULL DEFAULT 'PROMPT',
  phase_ends_at TEXT,
  winner_submission_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  UNIQUE (session_id, round_number)
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  meme_id TEXT NOT NULL REFERENCES memes(id),
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (round_id, player_id)
);

CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  voter_player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (round_id, voter_player_id)
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('ADMIN', 'PLAYER', 'SYSTEM')),
  actor_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_players_session ON players(session_id);
CREATE INDEX idx_rounds_session ON rounds(session_id, round_number);
CREATE INDEX idx_submissions_round ON submissions(round_id);
CREATE INDEX idx_votes_round_submission ON votes(round_id, submission_id);
CREATE INDEX idx_audit_session_created ON audit_events(session_id, created_at);
