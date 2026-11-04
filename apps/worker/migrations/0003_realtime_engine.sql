PRAGMA foreign_keys = OFF;

-- Preserve any Phase 01 prototype rows while replacing the legacy meme foreign
-- key with the canonical Phase 03 meme_assets identity.
ALTER TABLE votes RENAME TO legacy_votes;
ALTER TABLE submissions RENAME TO legacy_submissions;
DROP INDEX idx_votes_round_submission;
DROP INDEX idx_submissions_round;

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  meme_asset_id TEXT NOT NULL REFERENCES meme_assets(id) ON DELETE RESTRICT,
  command_id TEXT NOT NULL UNIQUE,
  submitted_at TEXT NOT NULL,
  UNIQUE (round_id, player_id)
);

CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  voter_player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  command_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  UNIQUE (round_id, voter_player_id)
);

ALTER TABLE sessions ADD COLUMN created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN state_version INTEGER NOT NULL DEFAULT 0 CHECK (state_version >= 0);
ALTER TABLE sessions ADD COLUMN state_json TEXT CHECK (state_json IS NULL OR json_valid(state_json));
ALTER TABLE sessions ADD COLUMN finished_at TEXT;

ALTER TABLE rounds ADD COLUMN phase_started_at TEXT;
ALTER TABLE rounds ADD COLUMN finalized_at TEXT;
ALTER TABLE rounds ADD COLUMN eligible_voter_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(eligible_voter_ids_json));

ALTER TABLE audit_events ADD COLUMN command_id TEXT;
CREATE UNIQUE INDEX idx_audit_command_id ON audit_events(command_id) WHERE command_id IS NOT NULL;
CREATE INDEX idx_submissions_round ON submissions(round_id, submitted_at);
CREATE INDEX idx_votes_round_submission ON votes(round_id, submission_id);
CREATE INDEX idx_sessions_created_by ON sessions(created_by, created_at);

PRAGMA foreign_keys = ON;
