# Player experience — Phase 05

`/play/:sessionCode` uses real HTTP responses and role-projected WebSocket state. No gameplay mock is imported by this route. Admin/Display remain independent shells for a later phase.

## Join and restore

The room name/status is validated before enabling join. A successful join returns an anonymous player and a random reconnect token. The player client saves that token under `misthy-player:<code>` in localStorage so refresh and additional tabs restore the same identity. It is a bearer credential: do not log it or share it. If browser storage is blocked, identity survives only within the current tab. No password or production secret is stored in the browser.

Each connection exchanges the reconnect token over HTTP for a short-lived WebSocket ticket. Tickets are passed through native WebSocket subprotocols. An invalid reconnect token clears the stored identity and returns to join; network failures retain identity and retry.

## Connectivity and time

Reconnect uses exponential backoff from 500 ms to 15 seconds. The client reacquires a ticket on each attempt, handles online events, limits HTTP/handshake waits to 15 seconds, and closes silent connections after missing heartbeat responses. Ping every 25 seconds is for connection health and clock offset, not timer broadcasts.

Countdown renders from `phaseEndsAt - (Date.now() + offset)`. At zero, player actions become disabled immediately and a message explains that the client is awaiting the server transition. Paused/disconnected state also disables actions. The server independently validates every deadline and role.

An in-flight command blocks repeat taps. On reconnect it is retried with the same UUID, so a lost ACK cannot create duplicate submissions or votes. Confirmation dialogs are bound to the phase start time and disappear when the phase changes. Refresh restores the latest submitted/voted flags and selected meme from the server.

## Phase screens

- Lobby confirms nickname, connected count, and instructions.
- Question presents the real prompt, optional attachment, and deadline countdown.
- Submitting displays the question's allowed asset collection, title/tag search, preview, selection, confirmation, and replacement before deadline.
- Reveal asks players to follow the shared display and wait for voting or Talent decision.
- Community voting shows anonymous submissions, disables the player's own submission, checks voter eligibility, and locks after confirmation.
- Result shows the winning meme, public winner identity, and updated personal score.
- Leaderboard/final screen sorts scores and shows server-derived totals for submitted rounds, votes, and wins.

## Media and accessibility

R2 remains private. Player asset requests carry the reconnect token in the Authorization header. The Worker verifies room membership and the phase's visible asset IDs. Upcoming questions, hidden submissions, and early vote totals are not returned. GIF blobs are fetched near the viewport and their object URLs are revoked on unmount. Reduced-motion users opt into playing animated media. Forms, buttons, dialogs, focus, and touch targets reuse the existing glass design system; copy lives in the Vietnamese player catalog.

## Verification

The dedicated Playwright suite starts a local Worker on port 8790, creates original GIF fixtures through the CMS, and creates sessions through authenticated APIs. It uses real D1/R2/DO/WebSocket behavior with no HTTP or WebSocket interception. Test state is separate from normal local development under `.wrangler/player-e2e`.

From the repository root:

```bash
pnpm build
pnpm --filter @misthy/worker exec wrangler d1 migrations apply DB --local --persist-to ../../.wrangler/player-e2e
pnpm exec playwright install chromium webkit
pnpm test:player
```

Alternatively, when invoking Wrangler directly at the root, use `pnpm exec wrangler d1 migrations apply DB --local --config apps/worker/wrangler.jsonc --persist-to .wrangler/player-e2e`. System Chrome is supported through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Screenshots are saved under ignored `artifacts/phase05`.
