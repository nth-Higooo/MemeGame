# Admin control and Talent judging

Phase 07 connects `/admin/:sessionCode` and the optional protected `/judge/:sessionCode` to the real Worker. New sessions use manual event control; existing automated sessions remain compatible.

## Prepare an event

1. Apply all migrations with `pnpm db:migrate:local`, then run `pnpm dev` (or `pnpm dev:single-origin`).
2. Bootstrap the owner in `/admin/MT2026/content` if needed. Remove the production bootstrap secret after setup. Upload original, web-ready assets and author questions, collections, and an individual-mode preset in Content Studio.
3. Sign in at `/admin/MT2026`. This route can create a new room even if `MT2026` does not exist. Select a preset/question pack, meme category, mode, durations, scoring, and tie-break rule. Each question must retain at least one allowed meme after filtering.
4. Create the game. Its questions, assets, and settings are copied into the session; later CMS edits do not rewrite the live game. Share the player QR and open the clean `/display/CODE` link on the projector.
5. Optionally provision a separate Talent name, then open the clean `/judge/CODE` URL. No Talent password is required. Re-provisioning the Talent grant revokes previous Talent sessions.

The session selector lists up to 100 recent sessions. Reloading or reconnecting restores the authoritative snapshot. Connected player counts combine multiple tabs under one identity.

## Run manually

`LOBBY → QUESTION → SUBMITTING → REVEAL → VOTING (Community only) → RESULT → LEADERBOARD → next QUESTION / FINISHED`.

- Start the event, present the question, then open submissions. Submission/voting deadlines come from the server, not the operator's browser.
- A submission deadline closes acceptance but holds the phase until the Admin reveals. This gives the host time to speak without exposing memes early.
- Pause/resume controls the server deadline. An already expired submission window cannot be reopened by pausing/resuming.
- Reveal shows anonymous memes to players/projector. Admin sees authors and vote counts; public clients do not receive early totals or the provisional winner.
- Talent Mode: Admin records the talent's choice, or the separately authenticated Judge nominates one submission. Nomination is provisional. Only Admin can confirm and publish.
- Community Mode: Admin opens voting. Each eligible participant can cast one non-self vote; the server rejects duplicates. Closing voting or reaching its deadline aggregates valid votes into a provisional result. Configured deterministic tie-break rules apply, or `TALENT_DECIDES` requests a selection. Zero votes count as a tie; empty rounds have no winner.
- Review the proposal and confirm publication. Only publication records the final winner and awards preset points. The winner remains on screen for 30 seconds, then the server automatically opens the leaderboard; Admin may still advance manually when needed.
- Stop round proposes no winner and still requires publication. Existing submissions receive configured participation points when finalized.

Mode changes are accepted in lobby, question, or leaderboard before submissions open. Unpublished rounds can restart. Published rounds cannot restart, and manual sessions cannot reset destructively; create a new event instead. Correct scores through audited adjustments.

## Corrections and projector control

Changing a provisional winner requires an explicit confirmation and a reason. Publishing, overrides, and score adjustments require the version shown in the confirmation dialog; stale dialogs must be reopened. Score corrections require a reason, cannot make totals negative, and append `ADMIN_CORRECTION` events rather than rewriting history. Repeated command IDs are acknowledged without scoring again.

The audit panel shows the latest 100 records; D1 retains the complete command history, actor, command ID, reasons, and before/after scores. Talent grant rotation is audited.

Projector intermission replaces the presentation with its lobby/QR view without changing the game phase. Timer pause is a separate control. Restore presentation to resume showing the current phase; refresh preserves this setting.

## Preview / Dry Run

Dry Run copies the selected content into browser memory, creates two simulated participants, and uses the same pure reducer for controls, submissions, voting, and scoring. It disconnects the live Admin socket while active. It does not create sessions, upload media, send live commands, or write scores/audits. Exit to reconnect to the live room. Refresh discards the rehearsal. This preview does not simulate real network latency or multiple devices.

## Permissions and secrets

Admin uses the existing eight-hour HttpOnly session cookie, active-account checks, CSRF headers, and same-origin validation. Talent uses a separate eight-hour HttpOnly cookie scoped to `/api/judge` and a hashed server-side session token. Opening `/judge/CODE` creates that session only when Admin has provisioned an active grant for the manual room; there is no password challenge. Anyone who knows the room code can open the Talent view while that grant is active, so enable it only for the event window and keep Admin publication review enabled. Talent cannot create sessions, edit content, publish results, override winners, or change scores.

WebSocket tickets travel in subprotocols and expire after 60 seconds for connection establishment. Established privileged sockets retain their authenticated expiry and are checked for active identity/session on commands and broadcasts, including after hibernation. Judge logout deletes the exact session; subsequent privileged activity closes its socket. No privileged credentials belong in display URLs, query strings, local storage, or logs. R2 remains private; Judge media is authorized only for the currently visible phase.

## Verify

See [testing](testing.md) for isolated database preparation and `pnpm test:admin`. Both modes run against real D1/R2/DO in Chrome and tablet-sized WebKit. Tests cover nominee-only Judge permissions, hidden provisional results, self/duplicate vote rejection, confirmed publication, overrides, corrections, projector intermission, Judge logout, and Dry Run isolation. Physical projector/tablet verification and production deployment remain separate tasks.
