# Database and content storage

## Storage ownership

- Cloudflare D1 stores identity, content metadata, relationships, sessions, rounds, players, submissions, votes, and score history.
- Cloudflare R2 stores uploaded GIF, WebP, PNG, and JPEG bytes. D1 stores the immutable, server-generated object key.
- Durable Object storage holds authoritative room snapshots and recovery checkpoints, mirrored into D1.

Never use an uploaded filename as an R2 key. Phase 03 uses `memes/YYYY/MM/<uuid>.<verified-extension>`.

## Migrations

- `0001_initial.sql`: session/gameplay foundation (`sessions`, legacy session-scoped `admins`, `players`, legacy `memes`, `rounds`, `submissions`, `votes`, `audit_events`).
- `0002_content_management.sql`: canonical `admin_users`, `meme_assets`, `questions`, `question_meme_assets`, `game_presets`, `preset_questions`, `score_events`, and login-attempt audit data. It also adds preset/question timing references to gameplay tables.
- `0003_realtime_engine.sql`: versioned session snapshots, creator/finalization metadata, canonical meme-asset submissions/votes with command IDs, voter eligibility, and command audit uniqueness. Phase 01 prototype submission/vote rows are retained as `legacy_submissions` and `legacy_votes`.
- `0004_talent_judging.sql`: per-session `judge_grants` with salted PBKDF2 credentials and `judge_sessions` with SHA-256 token digests, expiry, and cascading revocation. No raw Judge password or session token is stored.
- `0005_operational_indexes.sql`: personal submission/vote/score lookups, login-time expression index, recent sessions and Judge-session expiry. Existing schemas/data remain intact; integration tests verify query-plan usage.
- `0006_seed_preset_meme_collections.sql`: forward-only repair attaching the original placeholder meme assets to the second sample question. Admin session initialization requires every included question to retain at least one selected meme.
- `0007_repair_empty_preset_question_collections.sql`: for the sample preset, copies its existing non-archived meme collection to any linked question with no usable collection. Existing question and meme rows remain intact.

```bash
pnpm db:migrate:local
pnpm --filter @misthy/worker db:migrate:remote
```

Run the remote command only after selecting the intended database and taking a backup. Never edit a migration that has run remotely; add a numbered forward migration.

## Content model

`meme_assets` contains searchable metadata and an optional R2 reference. `PLACEHOLDER` seed rows intentionally have no binary object and remain `DRAFT`. `questions` can reference one attachment and an ordered allowed-meme collection. `game_presets` contains mode, individual/team flag, duration, voting/scoring rules, tie-breaker, and an ordered question collection.

Phase 03 implements `INDIVIDUAL`; API validation rejects reserved `TEAM` presets. Referenced assets are archived instead of deleted. Questions in presets and presets assigned to sessions cannot be deleted.

Gameplay uniqueness remains enforced by `(round_id, player_id)` for submissions and `(round_id, voter_player_id)` for votes. `score_events` is append-only scoring history.

Manual-session provisional results live in the validated versioned session snapshot until Admin publication. Publication persists winner and score events in one batch. Audited score corrections append `ADMIN_CORRECTION` events with actor, reason, and command ID; command audit payloads include before/after scores. Published manual rounds cannot be destructively restarted/reset. The UI shows only the latest 100 audit entries; older entries remain in D1.

Phase 08 joins insert identity and update the authoritative snapshot in the same DO-serialized D1 batch; failed joins leave no orphan identity. New duplicate nicknames are rejected after Unicode/case/whitespace normalization in the authority. Historical duplicates are retained. Scoring batches and content queries are chunked to respect D1 query/parameter budgets. See [QA report](phase08-qa.md).

## Authentication data

Passwords use PBKDF2-SHA-256 with a unique 128-bit salt and 100,000 iterations through Workers Web Crypto. Cloudflare Workers rejects PBKDF2 counts above 100,000. The platform ceiling is lower than current general-purpose password-hashing recommendations; use a long, unique Admin password and keep D1 protected. Admin sessions are eight-hour HMAC-SHA-256 signed HttpOnly cookies. Failed logins are rate-limited by email plus a SHA-256 IP digest.

## Import/export

Content pack schema version 1 exports questions, presets, order, rules, and asset IDs, but not R2 binaries or secrets. Import validates everything first and supports `REJECT`, `SKIP`, and `REGENERATE` duplicate strategies. Every referenced meme asset must already exist in the target D1 database.
