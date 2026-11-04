# Tiến độ

Cập nhật: 2026-11-04 (Asia/Bangkok)

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

Phase 07 starts in a separate development session:

- Kết nối Admin UI vào API và WebSocket thật; Player and Display integration are complete.
- Chuyển copy chi tiết còn lại vào locale catalog trước khi thêm ngôn ngữ thứ hai.

## Known issues / quyết định cần chốt

- `wrangler.jsonc` dùng UUID rỗng hợp lệ làm placeholder D1 database ID; phải thay khi tạo tài nguyên production.
- Player uses the live engine as of Phase 05; Display/Admin gameplay shells still use mock data.
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
