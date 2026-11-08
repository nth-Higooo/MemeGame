# Tiến độ

## 2026-11-08 — Copy, icon and solid-chip refinement

- Replaced visible “cú chốt/chốt meme” wording with direct labels such as
  “Chọn meme”, “Gửi meme” and “Meme thắng vòng này” across Player, Display,
  Admin status copy and the design showcase.
- Removed the long Home introduction and redundant Player join/question notes.
  Home now uses a short two-line heading and three Lucide icons for the core
  flow. The generated-looking mock character illustration was removed from
  Home and replaced in reusable mock cards with existing Lucide icons. Live
  gameplay continues to render authorized meme media from the room library.
- Tag filters and shared status/media chips now use solid fills, no borders and
  raised shadows. Selected tags use the berry action color. The same treatment
  applies on light and dark screens; touch targets remain at least 44 px.
- Updated affected Playwright assertions. `pnpm typecheck`, `pnpm lint`,
  `pnpm test` (56 tests), `pnpm build` and `pnpm format:check` passed. The
  existing ~544 kB main-chunk advisory and nonfatal Wrangler log warning remain.
- Targeted Home journey passed in desktop Chrome. Player journeys passed 8/8
  in Chrome and WebKit. The broader 9-case shell run executed all cases but its
  preview teardown stalled on Windows, so it is not recorded as passed.
- Inspected the final desktop Home and mobile Player-selection screenshots for
  copy density, icon composition, chip state and horizontal fit. No generated
  image service, new image asset, dependency, backend or database change was used.

## 2026-11-08 — Meme Party UI refinement (Phase 02 follow-up)

- Audit, implementation order, changed-file list, state mapping and local review
  steps: [meme-party-refinement.md](meme-party-refinement.md).
- Renamed visible branding, HTML title/description and the default new-session
  name to Meme Party. Removed the requested waiting sentence from the display
  and locale catalog. Existing user-created room names remain user content.
- Player: round roadmap, selected-prompt explanation, library guidance,
  selected-meme feedback, shared reveal progress, locked vote feedback and
  round ranking. Existing join/search/preview/confirmation/final-summary flows
  retain their server-backed behavior.
- Display: lobby roadmap and prompt context during reveal/results; one featured
  anonymous meme during REVEAL, with thumbnails retained for VOTING. Presentation
  timing is shared with Player; phase transitions remain server-owned.
- Host layout, controls, authentication, scoring and CMS are unchanged. No
  backend, schema, transport or dependency changes were introduced. Pre-existing
  migration 0007, Worker regression test and database documentation edits are preserved.
- Prompt voting is not supported by the current contract; this UI uses the
  existing preset-selected prompt. Automatic Community reveal still lasts five
  seconds; use existing manual control for a longer showcase.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (56 tests),
  `pnpm build` and `pnpm format:check` passed. Build retains the existing main
  chunk advisory (~549 kB) and nonfatal Wrangler log-file permission warning.
- Display Playwright: 6/6 passed at 720p, 1080p and WebKit/fallback viewports.
  Updated assertions verify prompt context, no reveal thumbnails and stable
  stage geometry. Player: 8/8 passed in Chrome/WebKit. Admin/Judge: 4/4 passed
  in Chrome/WebKit, including complete Talent and Community journeys. WebKit
  Host cases ran slowly (1.3 and 1.1 minutes) but completed successfully.
- Browser startup initially failed because sandbox access to Wrangler's local
  registry was denied; rerun outside the sandbox was approved. Test migrations
  applied only to the disposable local `.wrangler/player-e2e` database.
- Inspected the current 720p reveal and mobile selection screenshots. Media
  fixtures are tiny original GIFs, not evidence of event-media quality. No
  production deployment or physical-device/projector verification performed.

## 2026-11-07 — Production Admin session-creation 400 investigation

- Traced the Admin create flow to `POST /api/admin/sessions`; `admin-api.ts`
  maps a `null` from `createGameSession()` to HTTP 400 `invalid_preset` with the
  generic “Preset không tồn tại hoặc không có câu hỏi.” message.
- Found a reproducible sample-pack integrity defect: migration 0002 attaches
  placeholder memes only to question `...0201`, while preset `...0301` includes
  questions `...0201` and `...0202`. Admin submits selected `assetIds`, and
  session initialization rejects the whole pack when any included question
  has no selected meme. The generic 400 therefore also masks this collection
  failure. Added forward migration 0006 to attach existing non-archived
  placeholder assets to the second sample question; it preserves existing
  rows and is safe to reapply.
- Added an integration regression test asserting both questions in the seeded
  preset hydrate with selected meme assets. `qa.integration.test.ts`: 17/17
  passed. Full `pnpm test`: 56 tests passed. `pnpm typecheck`, targeted ESLint,
  and `pnpm build` passed; Wrangler emitted a local log-file permission warning
  during dry-run but exited successfully.
- Production D1 contents could not be queried during this investigation:
  Wrangler’s stored auth token was expired and refresh failed because the
  Cloudflare auth service was unreachable. The production preset row and its
  live `preset_questions`/`question_meme_assets` rows therefore remain
  unverified at that point; do not treat the local migration fixture alone as
  proof of production contents. The operator later supplied a read-only query
  result confirming the preset/question rows.
- Follow-up production query (operator supplied): preset `...0301` is `ACTIVE`
  and has three linked `DRAFT` questions. The two seed questions each have
  three available memes; production question `6d22b7a8-e782-40cf-b1ee-7443f6ddb7e7`
  has zero. `wrangler d1 migrations apply` reports no pending migrations,
  consistent with migration 0006 already having run. Added migration 0007 to
  attach the preset's existing non-archived meme set to any linked question
  lacking one; it does not delete or rewrite existing content. Extended the
  regression test to reproduce this third-question case.

Cập nhật: 2026-11-05 (Asia/Bangkok)

## Phase 01 — Foundation

Trạng thái: **hoàn thành**.

- Monorepo pnpm với React/Vite web, Hono Worker, shared contracts và game-engine boundary.
- TypeScript strict, ESLint, Prettier, Vitest, Playwright và frozen lockfile.
- Cloudflare Static Assets, D1, R2 và SQLite-backed Durable Object bindings.
- `/api/health`, ba role route, D1 migration và tài liệu nền.
- Verification Phase 01: clean install, lint, typecheck, 4 unit tests, Vite build, Wrangler dry-run, D1 local migration và single-origin smoke test đều pass.

## Phase 02 — Liquid Glass Design System

Trạng thái: **hoàn thành**.

Đã hoàn thành:

- Semantic design tokens cho pastel colors, typography, spacing, touch size, radius, shadow, glass surfaces, focus và spring easing.
- Pastel ambient background có noise/light field nhẹ; tự tắt chuyển động theo reduced motion.
- Reusable `GlassCard`, `GlassButton`, `GlassModal`, `GlassNavbar`, `GlassInput`, `GlassBadge`, `MemeCard`, `FeedbackState` và `AmbientBackground`.
- Regular/subtle/solid/clear surface variants; reduced-transparency và increased-contrast fallbacks.
- Player mobile layout với search/filter, two-column meme grid, selection state và safe-area bottom action bar. Đã kiểm tra viewport 320×700.
- Display fullscreen 16:9 với prompt hierarchy, progress, countdown và anonymous meme preview. Đã kiểm tra 1600×900.
- Admin desktop/tablet shell với floating sidebar/header, stats, active round và player list. Đã kiểm tra 1440×1000.
- Loading, empty, error và disconnected states có label/icon/action rõ ràng.
- Mock round, meme và player data tách tại `apps/web/src/data/mock-data.ts`.
- Dev-only showcase tại `/dev/design-system`.
- Reusable visual QA script `pnpm visual:check` và ảnh local trong `artifacts/phase02`.
- `docs/design-system.md` ghi token, component contract, layout và verification workflow.

## Verification Phase 02

- Web TypeScript strict typecheck: pass.
- ESLint: pass, 0 warnings.
- Browser visual QA bằng system Chrome: player, display, admin và showcase đều HTTP 200.
- Không có horizontal overflow ở bốn viewport đại diện.
- Không có browser console error sau khi thêm inline favicon.
- Screenshots được xem thủ công để kiểm tra hierarchy, crop, CTA, projector scale và dashboard density.
- Full strict typecheck: pass cho shared, game-engine, web và worker.
- Vitest: pass 4/4 tests; web/game-engine hiện chưa có unit test nên dùng `--passWithNoTests`.
- Vite production build: pass, 2,181 modules transformed.
- Wrangler 4.156.0 dry-run: pass; bundle nhận đủ Assets, D1, R2 và Durable Object bindings.

## Phase 02 visual redesign — Celestial Pastel Glass

Hoàn thành refinement theo art direction mới, vẫn giữ nguyên route, stack và mock-only behavior:

- Thay gradient orb background bằng celestial scene có cloud, sparkle, star và grain SVG/CSS nội bộ.
- Curated palette Candy Pink, Soft Lilac, Cloud Blue, Peach, Periwinkle, Mint, Warm White và Midnight Indigo; primary action dùng solid indigo.
- Giảm radius/spacing/typography trên mobile; glass chỉ còn ở navigation, action bar, modal và floating toolbar.
- Meme card dùng sáu minh họa vector mock riêng, bỏ emoji làm hệ illustration chính; media không có overlay che nội dung.
- Player được compose lại cho 320/375/390 px với prompt solid, game timer, grid hai cột và safe-area action bar.
- Display được compose như stage 16:9 nền twilight tại 720p/1080p, không dùng layout admin hoặc mobile navigation.
- Admin chuyển từ statistic-card grid sang creative control studio với summary strip, round control, player list và display preview.
- Dev showcase mở rộng cho light/dark environment, palette, typography, surface hierarchy, control states, timer, illustration và system states.
- Thêm reusable `CelestialBackground`, `DecorativeCloud`, `DecorativeSparkle`, `QuestionCard`, `CountdownTimer`, `ConnectionIndicator`, `FloatingActionBar` và `MemeGrid`.
- Không thêm dependency hoặc asset ngoài; attachment nhận được không chứa bốn ảnh reference, nên kiểm tra art direction dựa trên mô tả trong brief.

Verification redesign:

- Prettier format check: pass.
- TypeScript strict typecheck: pass.
- ESLint: pass, 0 warnings.
- Vitest: pass 4/4 tests; web/game-engine chưa có unit test nên dùng `--passWithNoTests`.
- Production build và Wrangler dry-run: pass; Vite transform 2.187 modules và bundle nhận đủ Assets/D1/R2/Durable Object bindings.
- Visual QA bằng system Chrome: 7/7 case HTTP 200, không horizontal overflow, không browser console error.
- Đã xem thủ công screenshot Player 320×568, Display 1280×720, Admin 1440×900 và full showcase để kiểm tra hierarchy, crop, spacing và atmosphere.
- Playwright shell journey bằng Chrome hệ thống: pass 6/6 cho mobile Chrome và desktop Chrome.
- WebKit/mobile Safari chưa chạy vì Playwright browser bundle chưa cài; chạy `pnpm exec playwright install` trước khi xác minh project này.

## Phase tiếp theo

Phase 08 implementation and acceptance review are recorded below. Stop after this phase; deployment and production sign-off remain separate. Physical-device/projector verification, venue/edge latency and media rehearsal, cloud runtime eviction verification, multi-room/soak testing, and a second locale remain pending.

## Known issues / quyết định cần chốt

- `wrangler.jsonc` dùng UUID rỗng hợp lệ làm placeholder D1 database ID; phải thay khi tạo tài nguyên production.
- Player, Display, Admin, and optional Judge now use the live engine. Only the design showcase and explicit browser-only Dry Run use simulated content/state.
- Rotate or remove `ADMIN_BOOTSTRAP_PASSWORD` after the first production owner is created.
- Preset quyết định winner/participation points; cần product review trước production event.
- Chưa dùng asset MisThy thật; mock meme dùng abstract pastel art/emoji để tránh quyền hình ảnh chưa rõ.
- WebKit is installed for Phase 05 browser testing; physical mobile devices remain unverified.

## Phase 03 — Database and Content Management

Status: **complete**.

- Added D1 migration `0002_content_management.sql` for canonical admin identity, meme assets, questions/collections, presets, ordering, score events, and login-attempt auditing. Phase 01 gameplay tables remain compatible.
- Added original metadata-only placeholder seeds; no copyrighted production media is bundled.
- Implemented one-time owner bootstrap, PBKDF2 password storage, signed HttpOnly sessions, login throttling, mutation CSRF/origin checks, and protected admin APIs.
- Implemented R2 upload with configurable 10 MiB default, MIME allowlist, GIF/PNG/WebP/JPEG signature checks, unique keys, metadata search/edit, authenticated preview, archive, and safe hard delete.
- Implemented question/preset CRUD, ordering, preview, individual-mode validation, durations, voting/scoring rules, and tie-breakers.
- Implemented schema-versioned JSON import/export with Zod validation, clear reference errors, and reject/skip/regenerate duplicate handling.
- Added `/admin/:sessionCode/content` for bootstrap/login, animated preview, content authoring, lifecycle actions, and import/export. Gameplay logic remains out of scope.
- Added tests for content schemas, media signatures/limits, password verification, and session signing.

Verification:

- Prettier, ESLint, and strict TypeScript checks pass.
- Vitest passes 12 tests total (5 shared, 7 Worker); web/game-engine currently have no unit files.
- Both D1 migrations apply locally; Phase 03 executed 28 SQL commands successfully.
- Vite production build and Wrangler deployment dry-run pass with Static Assets, D1, R2, and Durable Object bindings.
- Chrome smoke check: Content Studio login returns HTTP 200 at 1440×1000 with no horizontal overflow; `/api/health` returns 200. The unauthenticated auth probe correctly returns 401.

Known limitations:

- JSON export excludes R2 binaries; referenced destination assets must already exist.
- Team mode is reserved but rejected; individual mode is implemented first.
- The CMS does not transcode media; curators upload web-ready originals.
- Phase 03 itself did not include gameplay; the later Phase 04 section records the completed engine.

## Phase 04 — Realtime Game Engine

Status: **complete**.

- Added the exact `LOBBY → QUESTION → SUBMITTING → REVEAL → VOTING → RESULT → LEADERBOARD → FINISHED` server-authoritative graph as a transport-independent reducer.
- Added shared Zod contracts for Player/Display/Admin/Judge roles, versioned snapshots, signed connection identity, structured commands, acknowledgements, errors, and persisted state.
- Added authenticated session creation, public lobby join, hashed reconnect tokens, display tickets, and protected Admin/Judge ticket issuance.
- Replaced the placeholder socket shell with native Durable Object WebSocket Hibernation, serialized attachments, role-aware projections, fresh reconnect snapshots, connection presence derived across multiple tabs, and isolated objects by session code.
- Added absolute server deadlines and one DO alarm per timed phase. No timer ticks, `setInterval`, or frequent countdown broadcasts are used.
- Added idempotent submission/vote/finalization commands, server deadline enforcement, voter eligibility snapshots, self-vote prevention, deterministic equal/zero-vote handling, and empty-round behavior.
- Added admin pause/resume/skip/restart/reset plus Talent selection and Community voting/scoring.
- Added D1 migration `0003_realtime_engine.sql`, versioned D1/DO snapshots, canonical submission/vote command IDs, round winners, score events, and command audit history.
- Added recovery from a higher-version D1 snapshot after a partial DO write and alarm-safe repeated deadline processing.
- Documented the engine, timing, identity, projection, tie-break, persistence, and recovery model in `docs/realtime-engine.md` and `docs/game-rules.md`.

Verification:

- Prettier, ESLint, and strict TypeScript checks pass.
- Vitest passes 25 tests: 8 shared-contract, 8 engine, and 9 Worker tests.
- Migration `0003_realtime_engine.sql` applies locally with 21 commands.
- Vite production build and Wrangler deployment dry-run pass with Assets, D1, R2, and the `GameSession` Durable Object binding.
- Local Wrangler smoke test passes bootstrap/login, session creation, player join, Player/Display/Admin ticket issuance, hibernating WebSocket upgrade, role snapshot, Admin `START`, command ACK, state broadcast, and alarm transition from `QUESTION` to `SUBMITTING` with a future absolute deadline.

Known limitations:

- Phase 04 deliberately exposes APIs/contracts only; the role UIs are not connected yet.
- Display tickets are available to anyone who knows an active session code; they are read-only and short-lived.
- Reconnect tokens are bearer credentials returned once. Production clients must store them carefully and never log them.
- Team play remains out of scope; engine scoring is individual.

## Phase 05 — Player Experience

Status: **complete**.

- Replaced the player mock gallery with real room validation, anonymous join, nickname confirmation, and persistent reconnect identity.
- Added real lobby, question, submission selection/replacement, reveal, Community voting, result, leaderboard, and final participation screens.
- Added a validated WebSocket client with exponential reconnect, fresh tickets, bounded request/handshake waits, heartbeat health, server clock offset, version-aware snapshots, and idempotent retry of pending commands.
- Added own-submission identity and voter eligibility fields to player projections without exposing hidden authors or early vote counts.
- Added deadline-safe `REPLACE_MEME` and D1 upsert preserving the submission identity; normal duplicate submissions and all duplicate votes remain rejected.
- Serialized complete DO mutations around D1 awaits for multiple-tab correctness.
- Added phase-scoped bearer-authenticated asset metadata/media endpoints and database-derived personal participation counts. R2 remains private.
- Added near-viewport GIF loading, blob URL cleanup, reduced-motion opt-in playback, search/tags, preview/confirmation dialogs, and paused/expired/loading/error/disconnected states.
- Moved player copy into the Vietnamese locale catalog and documented the client protocol in `docs/player-experience.md`.
- Added real-backend Playwright tests covering both game modes, refresh, reconnect, multiple tabs, replacement, self-vote blocking, locked vote, results, final totals, automatic deadline expiry, room validation, and protected media.

Verification and remaining scope:

- Strict typecheck, ESLint, and formatting checks pass; Vitest passes 26 tests (8 shared, 9 engine, 9 Worker).
- Real-backend player E2E passes 8/8 on Android Chrome and iPhone WebKit; existing shell journeys pass 9/9 across mobile Chrome, mobile Safari, and desktop Chrome.
- All three migrations apply to the isolated E2E database. Vite production build and Wrangler dry-run pass. Vite reports a 509 kB main-chunk size advisory; route splitting remains a later optimization.
- Android Chrome and iPhone WebKit journeys run against an isolated local D1/R2/DO instance; screenshot inspection includes a 320 px player gallery.
- No new D1 migration is needed; existing submission uniqueness is retained.
- Frontend Admin/Display live workflows remain for later phases.
- Restoring identity requires browser storage; clearing site data loses the anonymous participant credential.
- Physical iOS/Android device testing and a production deployment are not performed in this phase.

## Phase 06 — Presentation Display

Status: **complete**.

- Implemented the live `/display/:sessionCode` route from the completed Phase 04/05 branch (`ft/real-time-engine`), on `ft/presentation-display`; `main` had only early schemas and was left intact.
- Added a locally generated QR join link, lobby presence, first-round animated introduction, large question/attachment, server-synchronized countdown, and submission progress.
- Added anonymous reveal carousel, Community voting participation/countdown, Talent waiting, winner announcement, paginated animated leaderboard, and final celebration.
- Added read-only reconnecting DISPLAY client with short-lived tickets, snapshot restoration, clock offset, backoff, heartbeat, and network/pause/expired states.
- Added phase-scoped signed-ticket display media access and aggregate vote participation without exposing early authors or individual vote totals.
- Preloads authorized GIFs in a bounded queue, reuses stable media slots across reveal/voting/results, revokes blobs, supports retry, and uses static first frames under reduced motion.
- Added 16:9 720p/1080p styling, fallback sizes, keyboard/fullscreen presentation, low-profile controls, and Vietnamese copy.
- Added lazy display loading so QR/presentation code does not load on the player route.
- Added real-backend Playwright coverage and the external-screen/rehearsal guide in `docs/presentation-display.md`.

Verification:

- Strict TypeScript, ESLint, formatting, 26 unit tests, Vite production build, and Wrangler dry-run pass.
- Presentation E2E: 6/6 across 720p, 1080p, and desktop WebKit; shell regression E2E: 9/9 across mobile Chrome/Safari and desktop Chrome.
- Inspected browser screenshots for lobby/QR, anonymous reveal, and final celebration. Fullscreen is tested through the browser API in Chromium; no physical projector is needed.
- Existing shared app bundle retains a roughly 512 kB size advisory; presentation/QR code loads separately in a roughly 43 kB chunk.

Remaining scope: physical projector/mobile-camera verification, production deployment, and live Admin workflows. Display carousel timing never changes the server phase. No new D1 migration is required.

## Phase 07 — Admin Control and Talent Judging

Status: **complete**. This session stops after Phase 07.

- Replaced the Admin mock shell with authenticated login, recent-session switching, game creation from CMS packs/libraries, preset overrides, clean QR/display links, connection monitoring, full phase controls, and server-synchronized pause/resume.
- New sessions default to manual control: submission expiry locks acceptance and waits for reveal; Talent nominations and server-aggregated Community outcomes remain provisional until versioned Admin confirmation. Legacy automated sessions remain compatible.
- Added mode changes before rounds, empty/stop handling, preset tie resolution, reasoned confirmed provisional overrides, audited leaderboard corrections, and persistent projector intermission control. Published rounds cannot restart or reset destructively.
- Added a separately authenticated `/judge/:sessionCode` interface with PBKDF2 credentials, throttled login, HttpOnly cookies, hashed revocable sessions, nominee-only commands, and phase-protected media. Admin privileges are checked against active identities; privileged socket checks survive hibernation.
- Added forward migration `0004_talent_judging.sql`; no new binding or production secret is needed. Applied locally to the isolated test database (5 SQL commands).
- Added browser-only Dry Run with copied content, simulated participants, and the same reducer; live sockets disconnect during rehearsal and live state/audits remain untouched.
- Added Vietnamese operator copy, desktop/tablet layouts, lazy Admin/Judge loading, and documented workflows/security in `docs/admin-control.md`. Updated architecture, requirements, database, game rules, realtime contracts, deployment, testing, and README.
- Modified implementation areas: `apps/web` routing, Admin/Judge UI/client/catalog/styles and projector intermission; `apps/worker` auth/APIs/session persistence and Judge migration; `packages/shared` contracts; `packages/game-engine` rules/tests; Playwright Admin config/journeys and compatibility fixtures; workspace manifests/lockfile and documentation.

Verification:

- Frozen dependency install, formatting, strict TypeScript, ESLint, 30 Vitest tests (8 shared, 13 engine, 9 Worker), Vite production build, and Wrangler dry-run pass.
- Real-backend Admin E2E: 4/4 across desktop Chrome and tablet-sized WebKit, covering both complete modes, private proposals, Judge permission/revocation, self/duplicate-vote rejection, confirmed publication, reasoned override/correction, projector control, and Dry Run isolation.
- Regression E2E: Player 8/8, Display 6/6, route shells 9/9. Shell tests run against Vite alone and emit expected unavailable-API proxy messages; real-backend suites exercise the Worker separately.
- Inspected Admin screenshot at 1440 px; browser screenshots are stored in ignored `artifacts/phase07`. Tests use original tiny GIF fixtures. Browser emulation does not establish physical tablet/projector behavior.

Known limitations / remaining work:

- No production deployment or physical-device verification performed. Measure 50-player performance before the event.
- Existing main bundle retains a roughly 509 kB Vite size advisory; Admin, Display, and QR code load as separate chunks.
- Session/audit panels show up to 100 recent entries; the content picker uses the CMS's existing 250-asset listing. D1 retains full history; large-library pagination is future work.
- Dry Run is a local rehearsal, not a network/load simulator; refreshing discards it. Published winner history stays immutable; subsequent corrections adjust scores with audit.

Phase 07 changed files:

- Web configuration/routing: `apps/web/package.json`, `apps/web/src/app.tsx`, `apps/web/src/styles.css`.
- Web UI/client/copy: `apps/web/src/pages/admin-page.tsx`, `apps/web/src/pages/content-admin-page.tsx`, `apps/web/src/pages/display-page.tsx`, `apps/web/src/lib/admin-session.ts`, `apps/web/src/i18n/index.ts`, `apps/web/src/i18n/admin-vi.ts`.
- Worker: `apps/worker/src/admin-api.ts`, `apps/worker/src/auth.ts`, `apps/worker/src/game-session.ts`, `apps/worker/src/index.ts`, `apps/worker/src/judge-api.ts`, `apps/worker/src/session-api.ts`, `apps/worker/src/session-service.ts`, `apps/worker/migrations/0004_talent_judging.sql`.
- Shared/engine: `packages/shared/src/index.ts`, `packages/shared/src/realtime.ts`, `packages/game-engine/src/index.ts`, `packages/game-engine/src/index.test.ts`.
- Workspace/tests: `package.json`, `pnpm-lock.yaml`, `playwright.admin.config.ts`, `tests/admin/admin.spec.ts`, `tests/player/player.spec.ts`, `tests/display/display.spec.ts`, `tests/e2e/shell.spec.ts`.
- Documentation: `README.md`, `docs/admin-control.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/game-rules.md`, `docs/progress.md`, `docs/realtime-engine.md`, `docs/requirements.md`, `docs/testing.md`.

## Phase 08 — Quality Assurance and Production Hardening

Status: **Phase 08 complete**. **Production sign-off is not granted.** This work stops after Phase 08; no production deployment was performed.

Implemented:

- Atomic DO-serialized identity/snapshot joins, 50-player admission cap, normalized duplicate nickname rejection, per-identity/tab/room connection limits and hibernation-safe message budgets.
- Bounded best-effort per-isolate HTTP rate limiting, request/upload caps, image dimension/trailer checks and configurable upload cap clamped to 20 MiB. No paid cloud limiter/service or production fault-injection endpoint was added.
- Sanitized structured request/game/recovery logs and correlated 503 responses. D1/R2 failures fail safely; failed upload cleanup emits an asset-UUID warning for reconciliation.
- Fixed production dependency advisories by pinning Zod 4.6.6 and Hono 4.13.11. Updated frozen lockfile installs successfully; `pnpm audit --prod --audit-level moderate` reports no known vulnerabilities as of 2026-11-05. The first audit had one high and one moderate advisory; neither is suppressed.
- Warm state caching, single presence calculation per broadcast and precomputed vote totals; D1/DO reconciliation on activation or audited Admin recovery. Checkpoint/alarm failures after D1 commit no longer falsely reject accepted mutations.
- Reduced content refetch fan-out from every state version to phase/round boundaries, bounded media lifetime offscreen, explicit media failure/retry, reduced-motion Admin/Judge playback and jittered reconnect across roles.
- Player errors are scoped to the active phase/round so rejected-action messages do not linger into the next round; concurrency tests verify the next phase has no stale alert.
- D1 scoring updates/inserts chunked for 50 players and visible-content queries chunked for 200 memes plus attachment. New migration `0005_operational_indexes.sql` applied to the isolated local database (7 SQL commands); query-plan checks cover personal history/login throttling indexes.
- Added actual-SQLite integration/failure-injection tests and bounded local Playwright QA with 30 Talent / 50 Community browser contexts, reconnect, duplicate/late actions, ties, scoring and mode changes. Added Admin offline/online/reload coverage and keyboard/reduced-motion/media-lifecycle checks.
- Detailed 20-scenario matrix, limits, measured caveats and reproduction commands in `docs/phase08-qa.md`; manual checklist in `docs/event-day.md`; incident guide in `docs/troubleshooting.md`.

Local concurrency evidence (latest complete concurrency run):

| Mode      | Independent browser players | Commands measured | ACK P50  | ACK P95  | Maximum  | Content metadata requests |
| --------- | --------------------------- | ----------------- | -------- | -------- | -------- | ------------------------- |
| Talent    | 30                          | 29                | 350 ms   | 652 ms   | 672 ms   | 210                       |
| Community | 50                          | 99                | 1,015 ms | 2,143 ms | 2,341 ms | 452                       |

Both runs preserved all expected submissions/votes/scores with no browser page errors and bounded request counts. Every player used the actual React app and a separate browser context. Tests ran on localhost with original tiny GIFs, not remote Cloudflare resources; no cloud quota was consumed. Raw metrics/screenshots are ignored under `artifacts/phase08`. Bursts from 30/50 renderers share a host with local SQLite, so these timings are not an edge benchmark. The 500 ms P95 product target is **not established**, and the measured burst P95 exceeds it.

Verification / remaining acceptance:

- `pnpm check` passes formatting, strict typecheck, ESLint, 46 unit/integration tests (8 shared, 13 engine, 25 Worker), Vite build and Wrangler dry-run against patched dependencies. Frozen install and production dependency audit pass. The first sandboxed dry-run logged a global log-path permission error despite bundling successfully; the rerun with writable `XDG_CONFIG_HOME` completed without that error.
- All 30 distinct browser cases pass: QA 3/3, Player 8/8, Display 6/6, Admin 4/4 and route shells 9/9. Player/Admin/Display cover Chrome and WebKit; bounded concurrent runs use desktop Chrome with separate mobile-sized contexts. The final player-only error-clearing change was rechecked with the 30/50-client QA suite and all eight Player journeys.
- Inspected final browser screenshots; negative-action alerts no longer linger into the next round. Media failure/retry, offscreen release/reload, keyboard join and reduced-motion playback pass at 320 px. Shell-only tests emit expected unavailable-API proxy messages; the real-backend suites run separately against Wrangler.
- Controlled GameSession reconstruction preserves attachments, repairs a higher-version D1 checkpoint and lost alarm, and deduplicates replay. Actual cloud scheduler hibernation/eviction was not observed; deployed runtime verification remains pending.
- No production readiness claim: latency target, physical Safari/Android/tablet/projector, real GIF bandwidth/decoding, quota/binding validation and runtime eviction require sign-off. Five simultaneous rooms and long-running soak are unverified. The security-updated Zod increases the main bundle to ~546 kB; Vite's chunk advisory remains. Worker dry-run is ~968 KiB / 165 KiB gzip.
- HTTP limiting is per-isolate best effort and resets on rotation; socket counters are per connection, so reconnect starts a new message window. Authoritative admission limits remain per room. This is basic abuse protection, not distributed DDoS mitigation.

Phase 08 changed files:

- Shared/engine: `packages/shared/src/limits.ts`, `packages/shared/src/index.ts`, `packages/shared/src/realtime.ts`, `packages/game-engine/src/index.ts`.
- Dependency/environment updates: `packages/shared/package.json`, `apps/worker/package.json`, `pnpm-lock.yaml`, `.env.example`.
- Worker: `apps/worker/src/index.ts`, `apps/worker/src/protection.ts`, `apps/worker/src/observability.ts`, `apps/worker/src/game-session.ts`, `apps/worker/src/session-api.ts`, `apps/worker/src/session-service.ts`, `apps/worker/src/admin-api.ts`, `apps/worker/src/media.ts`, `apps/worker/migrations/0005_operational_indexes.sql`.
- Integration/auth tests: `apps/worker/src/qa-harness.test-support.ts`, `apps/worker/src/qa.integration.test.ts`, `apps/worker/src/realtime-auth.test.ts`.
- Web: `apps/web/src/components/operator-media.tsx`, `apps/web/src/lib/reconnect-delay.ts`, `apps/web/src/lib/player-session.ts`, `apps/web/src/lib/display-session.ts`, `apps/web/src/lib/admin-session.ts`, `apps/web/src/pages/play-page.tsx`, `apps/web/src/pages/admin-page.tsx`, `apps/web/src/i18n/player-vi.ts`, `apps/web/src/i18n/admin-vi.ts`.
- Browser tooling/tests: `package.json`, `playwright.qa.config.ts`, `tests/qa/concurrency.spec.ts`, `tests/admin/admin.spec.ts`.
- Documentation: `README.md`, `docs/phase08-qa.md`, `docs/event-day.md`, `docs/troubleshooting.md`, `docs/progress.md`, `docs/requirements.md`, `docs/testing.md`, `docs/database.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/realtime-engine.md`, `docs/game-rules.md`, `docs/design-system.md`, `docs/player-experience.md`, `docs/presentation-display.md`.

## Phase 09 — Free-tier Cloud Deployment and Handover

Status: **operator has deployed the Worker; first Admin bootstrap currently returns HTTP 503. Production acceptance and sign-off remain pending.** The operator confirmed remote D1/R2 access, migrations are up to date, and the Worker is reachable at its workers.dev hostname. No production readiness claim is made.

Completed locally:

- Added `apps/worker/wrangler.production.json` for one Worker serving the SPA/API, SQLite Durable Objects, D1, private R2, upload limit, and exact plus wildcard Worker-first API/WebSocket routes. Operator-supplied bindings are stored in local config; the operator reports the guarded preflight verifies D1/R2 access. The operator has since deployed the Worker.
- Added config validation, explicit free-plan/R2 acknowledgements, read-only existing-resource preflight, migration/deployment gates, production route/health verifier, and a local production-profile rehearsal command. These scripts never activate billing or create resources. `production:check` validates only local config; `production:preflight` checks remote resource access.
- Added a main-branch GitHub Actions deployment workflow using a protected `production` environment and scoped API token. It now supports automatic pushes to `main`, keeps an explicit manual migration/deploy path, and stops automatic releases when remote D1 reports unapplied or unrecognized migration state. Application secrets remain in Cloudflare Worker configuration.
- Added production two-mode browser acceptance coverage for Admin, player, display, R2 upload/download/cache behavior, and refresh/persistence, plus operational security tests for production config gates, encrypted backup tampering, path traversal, and restore authentication.
- Added encrypted, checksum-verified D1/results/R2 backup collection and local-only authenticated unpack. The scripts do not import into cloud; the operator-reviewed disaster restore workflow is documented.
- Replaced README setup/deployment instructions and added Admin, Player, Event Day, Troubleshooting, and Backup/Restore guides. Documented Windows PowerShell and Ubuntu procedures, rollback, resource limits, quotas, and known restore limitations.
- Fixed exact `/api` and `/ws` path handling so the Static Assets worker-first routes pass through Hono as their wildcard counterparts do.

Cloudflare findings on 2026-11-05 (Asia/Bangkok):

- Wrangler OAuth login and read-only account identity inspection succeeded. The initial D1 list was empty before the operator provisioned a database. The operator's latest `wrangler d1 info DB --config apps/worker/wrangler.production.json` confirms the configured ID points to `misthy-meme-db` (21 tables, ~360 kB, recent reads/writes). The production config's local `database_name` is now aligned with that remote name. This database has data and must be backed up before migration; it is not a fresh empty database.
- Initial read-only R2 calls returned Cloudflare error **10042**. The operator later completed R2 activation and reported the guarded production preflight succeeded: configured D1 and R2 bindings are now accessible. No billing settings were changed by the agent.
- The operator's D1 info confirms the existing database is `misthy-meme-db` (21 tables, ~360 kB, with recent reads/writes). The production config now uses this D1 name and the operator's existing ID. The configured R2 bucket is `misthy-meme-assets`. The operator reports no unapplied migrations. Treat D1 as data-bearing; retain a verified encrypted backup before future migrations. The operator deployed the Worker; deployment was not performed by this agent.
- The official free quotas and links are recorded in `docs/deployment.md`; recheck before event use because plan limits can change. No paid plan upgrade was selected.

Verification:

- Wrangler CLI help confirmed the current `d1 info`, `r2 bucket info/object put`, secret, and rollback command shapes. The config's static asset Worker-first exact/wildcard routes and single Worker topology are statically validated.
- The first `production:preflight` failure hid the safe underlying cause behind a generic wrapper. Updated it to report actionable R2/D1 preflight failures without echoing raw Wrangler output or config values; updated the `production:check` success text to explicitly say remote resources were not checked.
- Corrected first-deploy secret ordering in the deployment guide and GitHub workflow gate: deploy the Worker, then promptly add the two Admin secrets through Wrangler prompts before opening the event. Cloudflare documents that `secret put` deploys a new Worker version and the first Worker must exist.
- Follow-up `pnpm check` passes formatting, lint, strict TypeScript, 55 Vitest tests (8 shared, 13 engine, 28 Worker, 6 operations), frontend build, and standard Wrangler dry-run. Vite reports the known ~546 kB main chunk advisory. ESLint ignores generated production dry-run bundles.
- `pnpm production:build` passes against the dedicated production config (968.66 KiB total / 165.27 KiB gzip); all expected static assets, SQLite DO, D1/R2 bindings, upload cap, and worker-first routes appear in Wrangler dry-run. The dry-run is local and does not contact Cloudflare.
- `pnpm production:rehearse` passes 2/2 local Playwright production-profile acceptance cases for Talent and Community, including Admin login/content/media, player joins/submissions/voting, display WebSocket updates, winner publication, and refresh persistence. It used local Wrangler D1/R2/DO simulators and the installed Chrome browser; no cloud quota was consumed. Its initial attempt exposed and fixed missing migrations in the isolated rehearsal D1. Windows runtime teardown can log an access-denied/crash warning after the test cases pass; no server stays bound to port 8790 after cleanup.
- The agent's non-interactive environment could not read the operator's Wrangler auth profile. The operator ran the remote D1 migration-list command and Wrangler reported no migrations to apply. Tail logs show the deployed `/api/admin/auth/bootstrap` route returns 503. The `admin_users` table exists with the expected schema and currently contains zero rows. First-admin creation, HTTPS/WebSocket acceptance, cloud media behavior, GitHub Actions execution, and production quota telemetry remain unverified.
- Local 30/50 player QA is not evidence of Cloudflare edge latency or quota usage. Production readiness is **not claimed**.

Phase 09 changed areas include production Wrangler config, `scripts/production*.mjs`, backup/verification/rehearsal scripts, `playwright.production.config.ts`, `tests/production`, `tests/ops`, package scripts, production GitHub workflows, `.gitignore`, README, and deployment/admin/player/event/troubleshooting/backup documentation.

Outstanding handoff steps:

1. In the authenticated operator shell, inspect unapplied migration files and stop if they conflict with the existing 21-table schema.
2. Quiesce writes; create and authenticate an encrypted D1/results/R2 backup. Keep the encrypted archive and passphrase separately.
3. After review, apply only the migrations appropriate for this database, build/deploy the Worker, immediately set the two Admin secrets, create/verify the first Admin owner, and record the generated URL.
4. Run both-mode production acceptance with disposable test records, remove test content, verify Admin/player/display/Judge flows and reconnect persistence, then publish the verified URL.

### Current bootstrap diagnosis follow-up (2026-11-05)

- The operator's Workers tail correlated request `POST /api/admin/auth/bootstrap` to HTTP 503. Remote read-only D1 checks show `admin_count = 0` and the expected `admin_users` columns, so the failed attempt did not create an Admin and the table is not missing.
- Added fixed, non-sensitive `admin_bootstrap_stage` logs before the count query, request validation, PBKDF2 password hashing, and insert. The operator's latest tail reached `hash_password` then failed before insert. Cloudflare's workerd PBKDF2 ceiling is 100,000 iterations; the prior 120,000 default caused the bootstrap failure.
- Changed new password hashes to 100,000 PBKDF2-SHA-256 iterations and documented the Cloudflare ceiling/security tradeoff. The operator's D1 reports zero Admin rows. Check existing Judge grants for hashes above 100,000 before considering them usable on Workers; those credentials would need to be reset.
- Checks after the hash update: `pnpm format:check`, `pnpm lint`, and `pnpm typecheck` pass. `pnpm production:build` exits successfully, bundles the frontend, and lists the expected production bindings; Wrangler still prints an EPERM warning while trying to write its local log file. No tests were run for this fix.

### GitHub automatic deployment follow-up (2026-11-05)

- Updated `.github/workflows/deploy.yml` to trigger on pushes to `main` (including merge commits), while preserving the confirmation-gated manual dispatch path.
- Automatic path runs a read-only D1 migration-state guard and deploys only when Wrangler confirms there are no pending migrations. Database migrations stay on the manually confirmed path so a fresh backup/review is required before schema changes.
- Added `pnpm production:check-migrations` and its safe-output checker. Added GitHub Environment setup instructions for binding variables, persistent plan/R2 acknowledgements, the auto-deploy opt-in, readiness of `ADMIN_SESSION_SECRET`, scoped API token, and optional post-deploy origin verification.
- Verification: `pnpm format:check`, `pnpm lint`, and `pnpm typecheck` pass. No GitHub Environment variables/secrets were configured by the agent, no workflow was dispatched, and no GitHub Actions/Cloudflare deployment was run from this change. No tests were run.

## Phase 02 visual follow-up — Dreamy Peachy Cosmic × Pink Glass UI

Date: 2026-11-05 (Asia/Bangkok). Visual-only follow-up; the Phase 09 deployment
work and production configuration are unchanged. Plan: [peachy-theme.md](peachy-theme.md).

Phase A — completed:

- Centralized semantic background, accent, glass, border, glow, action, input and
  status tokens. Added the requested Berry Lipstick, Pink Mist, Soft Blush, Light
  Caramel and Jasmine values, retaining all six supporting palette colors.
- Rebalanced the existing `CelestialBackground` (the application's cosmic
  background) with larger pink/peach haze, warm corner reflections, jasmine stars
  and lightweight CSS holographic ovals. No bitmap or external dependency added.
- Added pink/peach/dark `GlassCard` variants, warm buttons/badges/inputs, stronger
  keyboard outlines, modal inheritance and opaque accessibility fallbacks.

Phase B — completed:

- Player: blush reading surfaces, berry CTAs/timer, pink-peach-lavender selection
  outline, safe-area sticky submit bar and warm result/finished cards.
- Display: midnight stage, warm blooms, readable dark panels, pink room code,
  holographic progress/winner outline, pastel ranking and jasmine particles.
- Admin, Judge, CMS and authentication: dark glass, warm reflected light, blush
  text, pink/peach controls and jasmine status badges. Native form controls follow
  the dark color scheme. Long pages retain a midnight base beneath fixed scenery.
- Home and development showcase now share the palette; mock SVG illustrations
  consume CSS tokens. Showcase includes all reference colors and seven surfaces.
  New copy is in the Vietnamese locale catalog.
- Small shared buttons, compact brand links and the authentication toggle now
  meet 44 px sizing. QR backgrounds and media pixels remain untinted.
- Backend game logic, WebSocket contracts, APIs, database schema, dependencies,
  deployment configuration and existing features are unchanged.

Phase C — verification:

- Strict `pnpm typecheck`, `pnpm test` (55 tests), ESLint and `pnpm build` pass.
  The final build includes Vite and Wrangler dry-run with the expected local
  bindings. The existing main-chunk size advisory remains (~547 kB).
- Player journeys: 8/8 pass in Chrome/WebKit. Display: 6/6 pass at 720p, 1080p and
  WebKit, including reduced-motion media. Route shells: 9/9 pass in mobile
  Chrome, mobile Safari and desktop Chrome.
- Supplemental browser inspection captured 24 screens: Home, showcase/dialog,
  Admin/Judge authentication, dark confirmation/high-contrast, all Content Studio
  tabs, Player join/lobby/selection and Display lobby/submitting.
  Checked 320/375/390 px Player, 1024 px tablet, 1440 px desktop,
  1280×720 and 1920×1080 stage layouts without horizontal overflow or page errors.
  Screenshots were manually inspected. Artifacts are ignored under
  `artifacts/peachy-theme`; real-backend journey screenshots remain under
  `artifacts/phase05`, `phase06` and `phase07`.
- Checked 29 solid-surface text/action/status color pairs: minimum 4.70:1.
  Keyboard focus and Escape-to-close, shared 44 px button targets, reduced-motion
  cloud/interaction behavior and reduced-transparency/increased-contrast opaque
  fallbacks pass in Chrome. This is scoped contrast evidence, not a complete
  screen-reader or every-background-pixel accessibility certification.
- Local QA used disposable local Wrangler data. Initial supplemental live-page
  capture through the Vite proxy did not complete authentication; the final run
  uses the app's single-origin local Worker and passes. The showcase remains on
  the development server.
- Admin/Judge journeys: 4/4 pass in Chrome and WebKit on the clean final rerun.
  Windows-owned preview-server teardown initially stalled after cases completed;
  a repeated run also had one WebKit Community failure during asset rebuilding.
  The successful rerun used stable built assets, the existing local Worker and a
  temporary config inheriting the original Admin projects/tests with `webServer: []`.
  Route-shell verification likewise passed with `PLAYWRIGHT_SKIP_WEBSERVER=1`
  against its already-running preview server. No assertions were skipped or changed.

Remaining limitations:

- No known unstyled active route remains in this color-update scope. Historical
  unused mock-layout CSS is retained; no functionality was removed for cleanup.
- Physical Safari/Android/tablet/projector and venue-lighting verification remain
  pending. Tiny original GIF fixtures validate behavior/layout, not real event
  media quality. No production deployment or production sign-off was performed.

## 2026-11-06 — Vietnamese typography follow-up

Scope: apply the selected Bricolage Grotesque + Be Vietnam Pro pairing to the
existing warm cosmic UI. This is a single typography follow-up to Phase 02;
gameplay, transport, deployment configuration and package dependencies are unchanged.

- `--font-display` now uses Bricolage Grotesque for semantic headings, brand text
  and focal prompts. Real weight 800 and automatic optical sizing support the
  playful visual direction. Home/stage spacing leaves room for Vietnamese marks.
- `--font-sans` uses Be Vietnam Pro for body copy, controls, forms, timers and
  room codes, with real normal weights 400–900 and system fallbacks.
- Fourteen unmodified Latin/Vietnamese WOFF2 files total 294,020 bytes before
  demand-based loading. They are bundled locally with Vite hashes and
  `font-display: swap`; source URLs and SHA-256 checksums are recorded alongside
  them. Both full SIL OFL copyright/license notices ship in `public/font-licenses`.
- The development showcase names both families and includes stacked Vietnamese
  diacritics, Đ and digits. New specimen copy is in `i18n/theme-vi.ts`.

Verification:

- `pnpm typecheck`, `pnpm test` (55 tests), `pnpm lint`, `pnpm format:check` and
  `pnpm build` pass. The existing ~548 kB main-JS chunk advisory remains.
- Shell journeys: 9/9 pass across Chrome and WebKit. Live Player: 8/8 pass.
  Live Display: 6/6 pass at 720p/1080p and WebKit fallback sizes.
- Font-specific browser inspection passes in Chrome and WebKit: both subsets
  load for display weight 800 and all six UI weights; requests are local and
  successful. Chrome's actual rendered-font inspection confirms the Vietnamese
  sample uses the custom fonts without system glyph fallback. All 14 asset
  checksums match their provenance manifest.
- Home screenshots at 320/375/390/1440 px have no horizontal overflow. Both
  browsers retain visible text and a fitting 320 px layout with font downloads
  blocked. Home/showcase/font evidence is in ignored `artifacts/typography`;
  live journey screenshots remain in `artifacts/phase05`, `phase06`, `phase07`.

Physical device/projector verification remains outside this local check. Only
normal font faces are bundled; other scripts use the system fallback. No
production deployment was performed.
