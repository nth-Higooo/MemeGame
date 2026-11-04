# Phase 08 — QA and production hardening

This phase reviews the complete application without deploying it. Functional acceptance and production sign-off are separate: local browser success does not establish production latency, venue networking, real media performance, remaining account quota, or the cloud scheduler's hibernation behavior.

## Test layers

- `pnpm test`: shared/reducer/auth/route tests plus `apps/worker/src/qa.integration.test.ts`. The integration harness runs actual Hono handlers, GameSession methods, migrations, SQLite constraints, indexes and transactions. D1/R2/DO-storage adapters inject deterministic failures. It reconstructs the real GameSession while retaining socket attachments and durable state; it does not emulate when the cloud decides to hibernate.
- `pnpm test:qa`: fixed **local-only** origin `http://127.0.0.1:8790`, one worker, no retries, at most 50 separate browser contexts. It runs 30 Talent players and 50 Community players against real local Wrangler/D1/R2/DO. All browser pages load the actual React Player UI and establish real app WebSockets. One submits through UI; concurrent peers use their actual browser app sockets with the shared command protocol. A second round verifies mode change.
- Existing `test:player`, `test:display`, `test:admin`: Chrome/WebKit journeys for mobile flows, projector isolation/reconnect, protected Judge access, override confirmation, corrections and Admin reconnect. `test:e2e` checks route shells against Vite, without a running API.

The browser probe is test code only; there are no production fault-injection routes, testing credentials, alternate authorities or game mocks in application routes. Original tiny GIF fixtures deliberately minimize disk/network use. Large animated GIF decoding and venue bandwidth require rehearsal with the actual curated library.

## Acceptance matrix

| #   | Scenario                         | Automated evidence                                                                                                                                                                                                   |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 30–50 concurrent players         | QA: 30 separate Talent browser contexts, 50 Community contexts, connected counts, concurrent submissions/votes, final scores, bounded metadata requests. Integration: durable cap, batch/parameter budgets.          |
| 2   | Late join                        | Integration and QA reject new identity after lobby. Original identities retain reconnect access.                                                                                                                     |
| 3   | Duplicate nickname               | Concurrent integration joins with normalized case/spacing return one success and one conflict, exactly one D1 player; QA duplicate rejected.                                                                         |
| 4   | Refresh during submission        | Player and QA preserve anonymous identity and submitted meme after reload.                                                                                                                                           |
| 5   | Reconnect during voting          | QA drops the first Community player's network/socket, reconnects to current voting state and accepts exactly one valid vote.                                                                                         |
| 6   | Admin disconnect                 | Admin E2E offline/online and reload restore authenticated controls; no state rollback.                                                                                                                               |
| 7   | Display disconnect               | Display E2E offline/online/reload restore read-only state and media.                                                                                                                                                 |
| 8   | Submit at deadline               | Integration sets server receipt time exactly to deadline before running alarm; rejected without a row. Reducer verifies late rejection after expiry and pause/resume.                                                |
| 9   | Duplicate submissions            | Reducer, integration retry across reconstruction, Player and QA new-ID rejection / same-ID idempotency.                                                                                                              |
| 10  | Duplicate votes                  | Player/Admin/QA reject a fresh duplicate; QA acknowledges the same command ID without recording another vote.                                                                                                        |
| 11  | Self-vote                        | Player disables its own card; Admin/QA submit the forbidden command directly and verify server rejection.                                                                                                            |
| 12  | Empty round                      | Integration tests both modes with null winner, no phantom points and idempotent publication.                                                                                                                         |
| 13  | Equal/zero votes                 | Reducer covers zero-vote/deterministic/talent-decided ties; QA Community creates one valid vote per submission and publishes once.                                                                                   |
| 14  | Talent selection                 | Admin/Judge E2E nomination remains private/unscored until Admin confirmation.                                                                                                                                        |
| 15  | Provisional override             | Admin E2E and reducer require reason, confirmation, current version; audit and score totals checked.                                                                                                                 |
| 16  | Mode between rounds              | QA changes mode at leaderboard and starts second round; reducer rejects mode changes once submission opens.                                                                                                          |
| 17  | GIF upload validation/failure    | Integration checks unauthorized/MIME mismatch/truncation/size/dimensions, successful original upload, R2 failure and failed D1 insert cleanup.                                                                       |
| 18  | D1/R2 operational errors         | Integration fails D1 reads/batches, R2 put/get/delete and checkpoint writes; checks safe 503, rollback, retry, cleanup warning and preserved scores/data.                                                            |
| 19  | DO hibernation/recovery          | Integration reconstructs GameSession with preserved attachment/storage, higher D1 version and lost alarm; same-ID retry cannot duplicate writes. Real cloud scheduler eviction remains a deployment rehearsal check. |
| 20  | Credentials/unauthorized actions | Auth/ticket tests cover tamper/expiry; integration expired Admin cookie/socket, invalid upgrade and forbidden player commands; Admin E2E Judge isolation/logout/revocation.                                          |

Reduced-motion/keyboard/media checks cover Vietnamese document language, keyboard join, visible/focusable controls, 44 px playback target, 320 px overflow, explicit GIF opt-in, media failure/retry, offscreen blob release/reload and static projector frames. This is targeted accessibility coverage, not a full WCAG audit. Complete the screen-reader, contrast, zoom and physical-device checklist in [Event Day](event-day.md).

## Resource and abuse limits

| Boundary         | Limit / behavior                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Room             | 50 players; joins serialized by the DO with D1 identity + snapshot in one atomic batch. New names use NFKC, folded whitespace and Vietnamese case normalization. Existing historic duplicate names are preserved.                                                                |
| Connections      | 3 open sockets per authenticated identity/role, 10 display sockets, 170 total per room; excess upgrades return 429 before allocating a socket.                                                                                                                                   |
| WebSocket frames | 8 KiB; 30 inbound frames per 10 s per socket. Counters live in serialized attachments across hibernation; overload closes 1013. A new socket gets a new budget; admission and HTTP limits provide further basic protection.                                                      |
| HTTP             | Bounded 10,000-entry per-isolate limiter: 65 joins/min/IP/room, 120 auth requests/min/IP, 3,000 other requests/min/IP; 429 includes Retry-After. These permit 50 users sharing venue NAT. Not a distributed DDoS barrier; isolate rotation resets HTTP counters.                 |
| Login            | Existing D1-backed five failed attempts per identity/IP per 15 min for Admin/Judge. Active-account, role, session and expiry checks still apply to commands and private media.                                                                                                   |
| Bodies/uploads   | General body cap 1 MiB. Multipart cap is configured upload bytes + 64 KiB metadata. Default upload 10 MiB; configuration clamped to 20 MiB. Known dimensions max 4096 px/side and 16 MP; GIF trailer required. Validation is not transcoding or a complete codec/malware parser. |
| Content queries  | Visible asset IDs chunked at 90 bound parameters, supporting a 200-meme question plus attachment within D1's 100-parameter limit.                                                                                                                                                |
| Scoring          | Changed player scores updated in groups of 20; participation inserts in groups of 10; 50-player finalization stays below 20 D1 statements and never awards twice.                                                                                                                |
| Media memory     | Player fetches near viewport and revokes blobs when cards move offscreen; Display uses bounded loading/constrained current-media cache. Admin has decode/fetch fallbacks and opt-in GIF playback under reduced motion.                                                           |
| Reconnect        | Bounded exponential backoff with ±20% jitter, fresh tickets and heartbeat. Server deadlines continue during disconnection.                                                                                                                                                       |

No paid limiter, queue, analytics service or cloud load generator was added. Tests make no remote cloud calls. Before deployment, verify current allowances in the Dashboard and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/); free allowances are not a guarantee against all overages or malicious traffic.

## Persistence, logging and recovery

D1 is committed first in an atomic batch. A D1 failure rejects the mutation and closes the socket transiently so the original command can retry. After a successful D1 commit, checkpoint/alarm failures are logged without pretending the transaction was rejected. Activation reconciles D1/DO versions and repairs the alarm. Warm state is cached in the DO; explicit Admin recovery discards that cache and reconciles mirrors. There is no external API for directly mutating session snapshots.

**Đồng bộ & khôi phục timer** is an Admin-only, audited command that preserves gameplay, scores and phase while repairing persistence timing and broadcasting a fresh snapshot. It does not reopen expired input. Existing safe pause/resume, stop and unpublished restart remain available; published manual history cannot be reset or restarted destructively. See [troubleshooting](troubleshooting.md).

Structured JSON logs contain timestamps, event/code, generated request ID, route template/status/duration, session ID, version and command type. They exclude raw errors, request bodies, query strings, nicknames, IPs, cookies, tokens and passwords. HTTP 503 responses carry a request ID and Retry-After. `CHECKPOINT_PENDING`, `ALARM_RECOVERY_REQUIRED`, `STORAGE_UNAVAILABLE` and `R2_CLEANUP_REQUIRED` indicate operator attention; the last includes only an asset UUID for private cleanup reconciliation. Do not enable raw header/body logging when investigating an incident.

Migration `0005_operational_indexes.sql` adds personal submission/vote/score lookup indexes, expression index for login time comparisons, recent sessions and Judge-session expiry. Tests run `EXPLAIN QUERY PLAN` for the relevant history/throttling queries. Existing round uniqueness, command IDs, audit chronology, reconnect hashes and content indexes are retained. Account data/audit retention should be reviewed after each event; this phase does not silently delete historical game records.

Cloudflare's [WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) describes serialized attachments surviving hibernation. The recovery test verifies that application boundary through controlled reconstruction. It does not claim actual cloud eviction was observed; the current official [runtime testing integration](https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/) provides runtime eviction helpers for a separately configured compatible test runner.

## Production dependency audit

The initial runtime dependency audit reported a high-severity [Zod collection-validation advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) and a moderate [Hono static-path advisory](https://github.com/advisories/GHSA-5r4p-p66f-jhc7). Shared Zod is now pinned to 4.6.6 and Worker Hono to 4.13.11, with the lockfile updated. The application uses Workers Static Assets rather than Hono serveStatic; the Hono patch was still applied to remove the affected dependency version.

`pnpm audit --prod --audit-level moderate` reports **no known vulnerabilities** after these updates (2026-11-05). That result covers the registry's known production advisories at check time, not a security proof or a complete development-tool audit. Frozen installation, strict contracts, integration tests, build and browser journeys are rechecked against the patched versions. The Zod update increases the main browser bundle to roughly 546 kB and Worker dry-run bundle to roughly 968 KiB (165 KiB gzip); the browser chunk advisory remains documented.

## Reproduce

From the repository root, after installing Node >=22.13 and pnpm 10.20:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm audit --prod --audit-level moderate
pnpm exec playwright install chromium webkit
pnpm exec wrangler d1 migrations apply DB --local --config apps/worker/wrangler.jsonc --persist-to .wrangler/player-e2e
pnpm test:qa
pnpm test:player
pnpm test:display
pnpm test:admin
pnpm test:e2e
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for system Chrome if needed. Set `XDG_CONFIG_HOME` to a writable temporary directory if Windows blocks Wrangler's normal log/config path. Run browser suites sequentially and keep source stable; all real-backend suites share a port/database. Browser metrics and screenshots are in ignored `artifacts/phase08`, with a metrics attachment in the Playwright results.

## Readiness decision

Production sign-off is **not granted** by this phase. Final local measurements and completed check counts are recorded in [progress](progress.md): all 46 unit/integration checks and 30 distinct browser cases pass, including correct 30/50-browser behavior. The final burst ACK P95 is 652 ms (30 Talent players) and 2,143 ms (50 Community players), exceeding the product's 500 ms target. Latencies reflect simultaneous bursts from many renderers plus local SQLite on one host, not an edge benchmark. Validate real media, venue devices/network, edge latency, quota/bindings and runtime eviction/recovery before approving an event release. Five concurrent rooms and a sustained multi-hour soak are not established by a one-room bounded run.
