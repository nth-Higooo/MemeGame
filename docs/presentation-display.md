# Presenting MisThy Meme Party — Phase 06

## Prepare the screen

1. Create a content pack and session through the existing admin APIs. Copy the returned six-character session code.
2. Open `/display/<code>` in Chrome, Edge, or Safari on the presentation computer. The display needs no admin login and cannot change game state.
3. Use a 1920×1080 or 1280×720 window for the primary 16:9 layout. A normal desktop browser works for rehearsal; no projector is required.
4. Press **F** or move the pointer and use the fullscreen icon at the upper right. **F** toggles fullscreen; **Esc** also exits through the browser. If the browser does not support the Fullscreen API, use its native fullscreen command (for example F11 on Windows).
5. Keep the cursor off the upper-right controls while presenting. They also remain reachable with the keyboard.

For a physical screen, connect HDMI/USB-C, choose **Extend** in the operating system's display settings, move the display browser window onto that screen, and enter fullscreen there. Keep the authenticated admin interface on the laptop screen. Mirroring also works, but viewers will see anything else shown on the laptop.

Use the application's public HTTPS origin when presenting to participants. The QR is generated locally from the display browser's origin and `/play/<code>`; it never uses a third-party QR service. A QR pointing to `localhost` or `127.0.0.1` is only useful for same-computer rehearsals. For LAN testing, use the computer's reachable LAN address and expose both frontend and Worker appropriately; phones must be able to reach that exact origin.

## What the audience sees

- Lobby: large session code, QR join link, current connected count, and recent nicknames.
- Question: introduction on the first round, large prompt, optional attachment, and server deadline.
- Submitting: prompt, submission count, and progress bar. No submitted meme is exposed.
- Reveal: the situation appears by itself in quotation marks beside the anonymous, stable-size GIF stage. The stage cycles every five seconds; the server reserves five seconds per submitted meme before automatically opening Community voting.
- Voting: anonymous memes, voting deadline, and aggregate participation count. Individual vote totals and submission authors remain hidden until results. Presentation header chrome, meme labels and thumbnail/page strips are omitted while media is on screen.
- Result: winner identity, winning meme, cumulative score, and a radial star-confetti burst. The server keeps this screen for 30 seconds before automatically opening the leaderboard.
- Leaderboard: the first three places are shown as a podium with names above gold, silver and bronze trophy icons. Remaining places use score order and advance every ten seconds in groups of eight.
- Finished: final ranking, leading player, and a brief celebration.

Only the server/admin drives game phases. The carousel and leaderboard pagination are presentation-only changes. Pause stops the displayed deadline and shows a pause notice. At zero the display waits for the next authoritative snapshot; it does not advance itself.

## Reconnect and media

The browser obtains a short-lived DISPLAY ticket and receives a fresh role-projected snapshot on every connection. It retries network failures with exponential backoff, checks connection health, and reacquires tickets. Refresh restores the current phase, scores, and deadlines without restoring any local game state. Disconnection retains the most recent picture with an unobtrusive reconnect notice.

R2 stays private. The display media endpoint verifies a signed DISPLAY ticket and checks that the requested asset is public in the current session phase. Early or unrelated assets receive 403; invalid/missing tickets receive 401. Tickets are carried in WebSocket subprotocols or the Authorization header, never image query strings.

GIFs are preloaded with four concurrent requests **after reveal is authorized**, then reused across reveal/voting/results. Preloading during submission would disclose hidden content and is deliberately prohibited. Fixed media slots and `object-fit: contain` prevent layout shifts and cropping. Unused blob URLs are revoked, and failed loads show a placeholder and retry action. Reconnect retries pending media.

Reduced-motion preference removes celebration effects and spatial transitions. GIFs are drawn once onto canvas so they remain static; the carousel still changes content without animated transitions. No audio plays automatically.

## Local rehearsal and verification

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:local
pnpm dev:single-origin
```

Create a real room through the authenticated `/admin/MT2026` dashboard, then open `http://localhost:8787/display/<code>`. Admin controls the phase and can show intermission independently of timer pause; see [Admin control](admin-control.md). Reconnect backoff includes ±20% jitter as of Phase 08.

Automated tests use the same isolated test database as the Phase 05 suite:

```bash
pnpm build
pnpm exec wrangler d1 migrations apply DB --local --config apps/worker/wrangler.jsonc --persist-to .wrangler/player-e2e
pnpm exec playwright install chromium webkit
pnpm test:display
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to installed Chrome. Tests create original GIF fixtures through CMS APIs and drive real Durable Objects/WebSockets. Projects cover 720p, 1080p, desktop WebKit, 4:3 and portrait fallback, fullscreen in Chromium, reduced motion, missing/early media authorization, reconnect/refresh, and rejection of display commands. Screenshots are saved to ignored `artifacts/phase06`.

No physical projector, mobile camera QR scan, or production deployment is claimed by these browser checks.
