# Meme Party UI refinement

Scope: one Phase 02 UI follow-up, 2026-11-08. Preserve the existing cosmic glass
theme, server authority, media authorization, and Host layout.

## Audit and phase mapping

| Requested step | Existing state       | UI approach                                                           |
| -------------- | -------------------- | --------------------------------------------------------------------- |
| Join           | LOBBY                | Room, nickname, connected count and round roadmap                     |
| Prompt vote    | QUESTION             | Show the preset-selected prompt; no simulated vote                    |
| GIF selection  | SUBMITTING           | Existing authorized library, search, preview and confirmation         |
| Show memes     | REVEAL               | Prompt plus one anonymous meme; shared five-second presentation index |
| Winner vote    | VOTING               | Existing Community vote; Talent still chooses in Talent mode          |
| Round results  | RESULT / LEADERBOARD | Winning meme, personal score and ranking                              |
| Final results  | FINISHED             | Final ranking and participation summary                               |

Prompt alternatives and prompt-vote commands do not exist in the public contract.
QUESTION is the frontend integration point for a future server-backed prompt ballot.
This change uses the existing preset-selected prompt, as allowed by the brief.
No spectator role, external GIF provider, new timer authority or database migration
is introduced. The reveal index is presentation-only and does not advance phases.
Automatic Community mode retains its existing five-second REVEAL deadline;
longer showcases require the existing manual-control mode. Voting continues the
carousel. No guarantee that every entry is shown before automatic voting begins
is added by this UI-only change.

## Implementation order

A. Audit (complete); B. visible rename and sentence removal; C. player guidance
and feedback; D. focused display showcase; E. minimal host naming; F. checks and
live Player/Display/Host journeys. Record verification in progress.md.

## Files changed

- `apps/web/index.html`: page title and description.
- `apps/web/src/i18n/{index,player-vi,display-vi}.ts`: branding and Vietnamese copy.
- `apps/web/src/components/round-flow.tsx`: shared round roadmap.
- `apps/web/src/lib/reveal-position.ts`: shared presentation timing.
- `apps/web/src/pages/play-page.tsx`: guidance, reveal progress, selection/vote
  feedback, and round ranking.
- `apps/web/src/pages/display-page.tsx`: lobby roadmap, prompt context and focused reveal.
- `apps/web/src/pages/admin-page.tsx`: default new-session name only. Controls,
  layout, CMS, scoring, moderation and authentication are retained.
- `apps/web/src/styles.css`: responsive roadmap and showcase styling.
- `tests/display/display.spec.ts`: prompt visibility, single-meme reveal and stable stage.
- `docs/meme-party-refinement.md`, `docs/progress.md`: scope and verification.

## Local review

Run `pnpm db:migrate:local` then `pnpm dev:single-origin`. Create a room in Admin,
open its Player and Display links, and verify both Community and Talent modes:

1. Join on mobile; check nickname, room code, connected count and roadmap.
2. Start the round; read the preset-selected prompt, then open meme selection.
3. Search, preview, select and confirm a meme; verify Display hides it until reveal.
4. In manual mode, reveal for at least ten seconds with two submissions; verify
   the prompt stays visible, one meme is featured, and player progress follows.
5. Vote in Community mode; own-entry voting is disabled and confirmed votes lock.
6. Publish results; inspect winning meme, player scores, leaderboard and final summary.
7. Pause/reconnect/refresh; verify the server still controls all gameplay phases.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm test:player`, `pnpm test:display`, `pnpm test:admin`.
