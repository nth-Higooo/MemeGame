# Chiến lược kiểm thử

## Tầng kiểm thử

- Unit (Vitest): Zod contract, phase transition, eligibility, scoring, tie-break, timer math.
- Worker unit tests: Hono routes and cryptographic helpers. Real Worker/D1/R2/Durable Object integration runs through the browser E2E suites; no Workers Vitest pool is configured.
- Component: tương tác form, focus, reduced motion và trạng thái lỗi.
- E2E (Playwright): player mobile Chrome/Safari emulation, admin desktop, projector display.

## Quality gate

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Không dùng snapshot khổng lồ cho game state. Test theo behavior và invariant. Timer test dùng fake clock ở unit/integration; chỉ vài E2E kiểm tra đồng hồ thật.

## Journey bắt buộc trước production

1. Admin login/tạo phòng; 2 player join và reconnect không nhân bản.
2. Talent round: submit → reveal → talent winner → result.
3. Community round: submit → anonymous reveal → self-vote bị chặn → duplicate vote bị chặn → deterministic winner.
4. Client refresh ở từng phase nhận đúng snapshot/version.
5. Admin pause/resume/retry sau lỗi persistence mô phỏng.
6. Keyboard-only admin, screen-reader labels cơ bản và reduced-motion.
7. 50 WebSocket connection có heartbeat/reconnect hợp lý và không broadcast secret/private state.

## Phase 01

Shared contract và Worker health/404 routes có unit test. Smoke test local dùng Wrangler để xác nhận `/api/health` cùng ba SPA route trên một origin. Playwright journey đã cấu hình cho mobile Chrome, mobile Safari và desktop Chrome; browser binaries được cài riêng bằng `pnpm exec playwright install`.

## Visual QA Phase 02

`pnpm visual:check` chụp player 320×700, display 1600×900, admin 1440×1000 và dev showcase. Script fail nếu route không trả 200, có horizontal overflow hoặc browser console error. Có thể dùng Playwright Chromium đã cài hoặc đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` tới Chrome/Edge hệ thống. Output nằm trong `artifacts/phase02` và bị Git ignore.

## Phase 03 content checks

Vitest covers shared Zod defaults/import rejection, image magic-byte detection, upload-limit parsing, PBKDF2 verification, and signed-session tamper rejection. Apply both migrations to a disposable local Wrangler D1 database before release. Manual CMS smoke testing covers bootstrap/login, animated GIF preview, upload, filters, archive safety, question reorder, both preset modes, export, and each duplicate import strategy.

## Phase 04 engine checks

Reducer tests cover the full phase graph, authoritative deadlines, empty rounds, zero-vote/equal-vote resolution, late and duplicate submissions, self/duplicate votes, Talent authorization, repeated finalization, pause/resume, restart/reset, reconnect identity, and late joins. Worker tests cover signed connection-ticket tamper resistance. Apply all three migrations locally and run a Wrangler dry-run so Durable Object/alarm/WebSocket types are bundled against the selected compatibility date.

## Phase 05 player journeys

`pnpm test:player` uses `playwright.player.config.ts` with Android Chrome and iPhone WebKit projects against a real local Worker and isolated `.wrangler/player-e2e` database. The suite provisions its content through secure CMS APIs; no game mocks or route interception are used. See [player-experience.md](player-experience.md) for database preparation. Original tiny GIF fixtures contain no third-party assets. Coverage includes both modes, join/restore, multiple tabs/reconnect, replacement, protected media, own-vote prevention, vote lock, result/summary, automatic timeout, and invalid rooms. Browser engine emulation does not replace physical-device testing.

## Phase 06 presentation journeys

`pnpm test:display` runs real-backend journeys at 1280×720, 1920×1080, and desktop WebKit. It covers QR/link rendering, fullscreen in Chromium, every display phase, early-media denial, display-command rejection, aggregate voting status, reduced-motion static frames, refresh/reconnect, and fallback sizing. Setup and rehearsal instructions are in [presentation-display.md](presentation-display.md). Screenshots live in ignored `artifacts/phase06`.

## Phase 07 Admin / Judge journeys

Prepare the isolated database once (or after adding migrations), from the repository root:

```bash
pnpm exec playwright install chromium webkit
pnpm build
pnpm --filter @misthy/worker exec wrangler d1 migrations apply DB --local --persist-to ../../.wrangler/player-e2e
pnpm test:admin
```

The Admin config reuses the isolated player Worker on port 8790 and its test-only secrets. It provisions original GIFs/questions/presets via the secure CMS and runs complete Talent/Community events in desktop Chrome and 1024 px WebKit. No game network mocks are used. Coverage includes admin login/create/configuration, Judge-only nominations and revocation, pause/resume, projector intermission, anonymous projections, self/duplicate votes, provisional overrides, versioned confirmed publication, audited score corrections, completion, and Dry Run state/audit isolation. Screenshots are written to ignored `artifacts/phase07`.

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for system Chrome if needed. On Windows, set `XDG_CONFIG_HOME` to a writable temporary directory when Wrangler cannot write its normal global config/log path. Test credentials are local fixtures, never production configuration. Do not run the three real-backend suites simultaneously: they share a port and disposable database.

Reducer tests verify manual deadlines, no premature scoring, Judge publication rejection, stale versions, repeat finalization, and score corrections. Browser engine tests do not establish physical tablet/projector performance or 50-player load capacity.
