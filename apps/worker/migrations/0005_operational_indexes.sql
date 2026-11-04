-- Support personal participation queries and indexed time comparisons without rebuilding data.
CREATE INDEX idx_submissions_player ON submissions(player_id);
CREATE INDEX idx_votes_player ON votes(voter_player_id);
CREATE INDEX idx_score_player_reason ON score_events(player_id, reason);
CREATE INDEX idx_login_attempts_time ON admin_login_attempts(email, ip_hash, julianday(created_at));
CREATE INDEX idx_sessions_recent ON sessions(created_at DESC);
CREATE INDEX idx_judge_sessions_expiry ON judge_sessions(expires_at);
