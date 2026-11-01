PRAGMA foreign_keys = ON;

-- Phase 03 canonical CMS identity. The Phase 01 `admins` table remains for
-- backwards compatibility with session-scoped prototypes.
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),
  role TEXT NOT NULL DEFAULT 'EDITOR' CHECK (role IN ('OWNER', 'EDITOR')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE meme_assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  object_key TEXT UNIQUE,
  content_type TEXT CHECK (content_type IN ('image/gif', 'image/webp', 'image/png', 'image/jpeg')),
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size > 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  category TEXT NOT NULL DEFAULT 'general' CHECK (length(category) BETWEEN 1 AND 40),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  source_type TEXT NOT NULL DEFAULT 'R2' CHECK (source_type IN ('R2', 'PLACEHOLDER')),
  alt_text TEXT NOT NULL DEFAULT '' CHECK (length(alt_text) <= 240),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT,
  CHECK (source_type = 'PLACEHOLDER' OR object_key IS NOT NULL)
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 280),
  image_asset_id TEXT REFERENCES meme_assets(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  submission_duration_seconds INTEGER NOT NULL DEFAULT 45 CHECK (submission_duration_seconds BETWEEN 10 AND 300),
  voting_duration_seconds INTEGER NOT NULL DEFAULT 30 CHECK (voting_duration_seconds BETWEEN 5 AND 180),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE question_meme_assets (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  meme_asset_id TEXT NOT NULL REFERENCES meme_assets(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (question_id, meme_asset_id)
);

CREATE TABLE game_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
  mode TEXT NOT NULL CHECK (mode IN ('TALENT_MODE', 'COMMUNITY_MODE')),
  play_mode TEXT NOT NULL DEFAULT 'INDIVIDUAL' CHECK (play_mode IN ('INDIVIDUAL', 'TEAM')),
  round_duration_seconds INTEGER NOT NULL DEFAULT 45 CHECK (round_duration_seconds BETWEEN 10 AND 300),
  voting_rules_json TEXT NOT NULL CHECK (json_valid(voting_rules_json)),
  scoring_json TEXT NOT NULL CHECK (json_valid(scoring_json)),
  tie_breaker TEXT NOT NULL DEFAULT 'EARLIEST_SUBMISSION' CHECK (tie_breaker IN ('EARLIEST_SUBMISSION', 'RANDOM', 'TALENT_DECIDES')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE preset_questions (
  preset_id TEXT NOT NULL REFERENCES game_presets(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (preset_id, question_id),
  UNIQUE (preset_id, position)
);

ALTER TABLE sessions ADD COLUMN preset_id TEXT REFERENCES game_presets(id) ON DELETE SET NULL;
ALTER TABLE rounds ADD COLUMN question_id TEXT REFERENCES questions(id) ON DELETE SET NULL;
ALTER TABLE rounds ADD COLUMN submission_duration_seconds INTEGER NOT NULL DEFAULT 45 CHECK (submission_duration_seconds BETWEEN 10 AND 300);
ALTER TABLE rounds ADD COLUMN voting_duration_seconds INTEGER NOT NULL DEFAULT 30 CHECK (voting_duration_seconds BETWEEN 5 AND 180);
ALTER TABLE players ADD COLUMN team_id TEXT;

CREATE TABLE score_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_id TEXT REFERENCES rounds(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  team_id TEXT,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 120),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (player_id IS NOT NULL OR team_id IS NOT NULL)
);

CREATE TABLE admin_login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  ip_hash TEXT NOT NULL,
  succeeded INTEGER NOT NULL DEFAULT 0 CHECK (succeeded IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_meme_assets_search ON meme_assets(status, category, title);
CREATE INDEX idx_questions_position ON questions(status, position);
CREATE INDEX idx_question_assets_order ON question_meme_assets(question_id, position);
CREATE INDEX idx_presets_status ON game_presets(status, updated_at);
CREATE INDEX idx_preset_questions_order ON preset_questions(preset_id, position);
CREATE INDEX idx_score_events_session ON score_events(session_id, created_at);
CREATE INDEX idx_login_attempts_lookup ON admin_login_attempts(email, ip_hash, created_at);

-- Original placeholder metadata only. These records intentionally have no R2
-- object; replace them through the CMS upload flow before activating a pack.
INSERT INTO meme_assets (id, title, tags_json, category, status, source_type, alt_text)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'Ủa alo?', '["bất ngờ","reaction"]', 'reaction', 'DRAFT', 'PLACEHOLDER', 'Minh họa placeholder biểu cảm bất ngờ'),
  ('00000000-0000-4000-8000-000000000102', 'Hết cứu', '["bất lực","reaction"]', 'reaction', 'DRAFT', 'PLACEHOLDER', 'Minh họa placeholder biểu cảm bất lực'),
  ('00000000-0000-4000-8000-000000000103', 'Quá dữ', '["slay","reaction"]', 'reaction', 'DRAFT', 'PLACEHOLDER', 'Minh họa placeholder biểu cảm tự tin');

INSERT INTO questions (id, text, position, submission_duration_seconds, voting_duration_seconds, status)
VALUES
  ('00000000-0000-4000-8000-000000000201', 'Khi admin bảo “chương trình hôm nay đơn giản lắm”...', 0, 45, 30, 'DRAFT'),
  ('00000000-0000-4000-8000-000000000202', 'Khi bạn nói “chơi ván cuối” lúc 2 giờ sáng...', 1, 40, 25, 'DRAFT');

INSERT INTO question_meme_assets (question_id, meme_asset_id, position)
SELECT '00000000-0000-4000-8000-000000000201', id, row_number() OVER (ORDER BY id) - 1
FROM meme_assets WHERE source_type = 'PLACEHOLDER';

INSERT INTO game_presets (id, name, description, mode, play_mode, round_duration_seconds, voting_rules_json, scoring_json, tie_breaker, status)
VALUES (
  '00000000-0000-4000-8000-000000000301',
  'Birthday Community — Bản nháp',
  'Preset mẫu dùng placeholder nguyên bản; thay asset trước khi kích hoạt.',
  'COMMUNITY_MODE',
  'INDIVIDUAL',
  45,
  '{"allowSelfVote":false,"votesPerPlayer":1,"audienceVoting":true}',
  '{"winnerPoints":100,"participationPoints":0}',
  'EARLIEST_SUBMISSION',
  'DRAFT'
);

INSERT INTO preset_questions (preset_id, question_id, position)
VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 0),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000202', 1);
