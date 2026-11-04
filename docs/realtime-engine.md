# Realtime game engine

## Session ownership

Every six-character session code maps through `GAME_SESSIONS.idFromName(code)` to one isolated `GameSession` Durable Object. The object serializes all mutations for that room. The pure reducer in `packages/game-engine` contains rules and has no Cloudflare or database dependencies.

## State machine

```text
LOBBY
  → QUESTION
  → SUBMITTING
  → REVEAL
  → VOTING          (Community Mode)
  → RESULT
  → LEADERBOARD
  → QUESTION        (when another question exists)
  → FINISHED
```

New sessions default to `manualControl: true`. Talent Mode stops in `REVEAL` until Admin/Judge sends `SELECT_WINNER`, which creates a provisional result. Community Mode snapshots voter eligibility when submissions close and computes a provisional result at the voting deadline (or Admin close). Only Admin `PUBLISH_RESULT` finalizes scores and enters `RESULT`. Existing sessions without the manual flag retain Phase 04 automation.

Only these transitions are accepted. `START`, `ADVANCE`, `SKIP`, `PAUSE`, `RESUME`, `RESTART_ROUND`, and `RESET_SESSION` require the Admin role. Judge can only select a winner. Display is read-only. Player can only submit or vote for its authenticated player identity.

Pause is orthogonal to the required phase set: the current phase is retained, remaining milliseconds are persisted, `phaseEndsAt` is cleared, and the alarm is removed. Resume creates a new authoritative deadline from the saved remainder.

## Timing

The server persists `phaseStartedAt` and an absolute UTC millisecond `phaseEndsAt`. Clients receive `serverTime` with each snapshot and render locally from the offset; the server does not broadcast timer ticks.

One Durable Object alarm is scheduled for the current deadline. Alarms are idempotent: the handler checks that the stored deadline is due before advancing. The next transition persists a new deadline and replaces the alarm. Talent selection, lobby, pause, finished state, and manual tie decisions have no alarm.

Legacy automated presentation durations are five seconds for question/reveal and eight seconds for result/leaderboard. Manual sessions leave these phases untimed. Submission and voting durations come from the copied question/configuration. Manual submission expiry persists `deadlineExpired` and holds the phase until explicit reveal; it removes the alarm and rejects late submissions even after pause/resume. Manual voting expiry returns to reveal with a private proposal. The persisted flag makes repeated alarms safe.

## Identity and connections

HTTP endpoints issue HMAC-signed, 60-second connection tickets. Tickets are supplied as the second WebSocket subprotocol, avoiding URL/query logging. The Worker validates tickets before routing to the Durable Object; the object validates again before accepting the hibernating socket.

The socket attachment contains role, subject ID, connection time, and optional authenticated-session expiry/hash. It survives hibernation. Admin active-account and Judge grant/session checks run on upgrade, ready, commands, and broadcasts. Player presence is derived from all active attachments, so closing one of several tabs does not mark the player offline.

Roles receive projected snapshots:

- Player: personal submitted/voted flags; author identities remain hidden before results.
- Display: public anonymous reveal.
- Admin: full operational snapshot and vote counts.
- Judge: winner-selection view without admin controls.

## Commands and idempotency

Client frames are validated by `clientMessageSchema` and use `{ type: "COMMAND", command: ... }`. Every mutation has a UUID `commandId`. The last 1,000 accepted IDs are stored in the Durable Object snapshot. Repeating an accepted ID returns `COMMAND_ACK` with `duplicate: true` and does not write or score again.

D1 adds a second line of defense: submission and vote command IDs are unique, and each round permits one submission/player and one vote/voter. A new command ID cannot bypass these rules. Late commands are checked against the server deadline, not the client clock.

Phase 05 adds `REPLACE_MEME`: before the submission deadline, the authenticated author may update their existing submission. It retains the submission ID, updates server receipt time and command ID, and remains idempotent. Votes cannot be replaced. Complete D1-backed mutations are serialized through an event queue to prevent multiple browser tabs from racing across D1 awaits.

## Winner rules

- Zero submissions: winner is `null`; the round still progresses.
- One or more submissions with zero votes: all are tied.
- `EARLIEST_SUBMISSION`: earliest server receipt wins; UUID is the final stable tie-break.
- `RANDOM`: a deterministic selection derived from round ID and sorted candidate IDs.
- `TALENT_DECIDES`: a Community tie returns to an untimed reveal and waits for Admin/Judge selection.
- Repeated finalization is ignored by command idempotency and the persisted `finalizedAt` guard.

Winner and participation score events are written with the final round result. Manual sessions prohibit restarting published rounds or destructive reset. Unpublished restart clears only round data; audited corrections remain. Legacy automated restart/reset behavior remains compatible.

## Phase 07 operator commands

- `SELECT_WINNER`: Admin/Judge nomination in Talent Mode or a talent-decided tie. Existing proposals require explicit Admin override.
- `PUBLISH_RESULT`: Admin only, `confirmed: true`, required `expectedVersion`; publishes a pending proposal once.
- `OVERRIDE_WINNER`: Admin only, submission ID or null, reason (5–300 characters), explicit confirmation and required current version. Only changes an unpublished proposal.
- `ADJUST_SCORE`: Admin only, player ID, integer delta bounded to ±10,000, reason, confirmation and current version. Total stays between zero and one billion. Writes an `ADMIN_CORRECTION` score event.
- `SET_MODE`: Admin only, Talent/Community mode before submissions (lobby/question/leaderboard).
- `SET_SCREEN`: Admin only, `AUTO` or `INTERMISSION`; persists projector presentation independently from game phase/timer.
- `ADMIN_ACTION STOP_ROUND`: proposes a no-winner result for review; publication still required. `ADVANCE` handles explicit reveal/vote close and presentation transitions.

All commands use shared Zod schemas and idempotency IDs. Version preconditions are checked after duplicate-ID acknowledgement so retrying a successfully applied command remains safe. Private proposal/tie fields, including tied candidate IDs, are projected only to Admin/Judge. Talent-decided Community nominations must choose among tied leaders; another choice requires a reasoned Admin override after nomination. Admin sees submissions during collection; players/display receive them only at reveal. Publication, override and score-correction dialogs reject stale state.

## Persistence and recovery

Important state is stored in both Durable Object storage and `sessions.state_json` in D1. Each mutation writes a D1 batch containing the session snapshot plus round/submission/vote/audit/score history, then writes Durable Object storage and schedules the alarm.

After hibernation, attachments restore connection identity and Durable Object storage restores the engine. The session ID is kept as a separate recovery key. If the engine snapshot is invalid, or a partial write leaves D1 at a higher version, the object repairs its local snapshot from D1. Reconnecting clients always receive a fresh role-projected `STATE_SYNC` rather than relying on missed events.

Cloudflare alarms are at-least-once, so deadline processing is deliberately safe to repeat. No `setInterval` or timer loop is used, allowing WebSocket hibernation.

## HTTP surface

- `POST /api/admin/sessions` — authenticated admin creates a session from a preset.
- `POST /api/sessions/:code/join` — creates a lobby player and returns reconnect token plus connection ticket.
- `POST /api/sessions/:code/reconnect` — exchanges a reconnect token for a new connection ticket.
- `POST /api/sessions/:code/display-ticket` — returns a read-only display ticket.
- `POST /api/admin/sessions/:code/ticket` — authenticated Admin/Display ticket issuance; Judge requests rejected.
- `GET /api/admin/sessions` and `GET /api/admin/sessions/:code/audit` — protected session management and recent audit history.
- `POST /api/admin/sessions/:code/judge` — provision/rotate a separate Judge credential for manual sessions.
- `POST /api/judge/:code/login`, `/ticket`, `/logout` — separate protected Judge session and connection-ticket lifecycle.
- `GET /ws/:code` with protocols `misthy-v1, <ticket>` — hibernating WebSocket upgrade.
- `GET /api/sessions/:code` — public room name/status validation.
- `GET /api/sessions/:code/content` — bearer-authenticated current-phase asset metadata and personal participation totals.
- `GET /api/sessions/:code/content/:assetId` — bearer-authenticated media only when the asset is visible in the current phase.

Reconnect tokens are returned only once and stored in D1 as SHA-256 digests. Connection tickets and reconnect tokens must not be logged.
