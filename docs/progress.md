# Tiến độ

Cập nhật: 2026-11-01 (Asia/Bangkok)

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

Phase 03 chỉ bắt đầu trong phiên phát triển kế tiếp:

- Admin authentication/password hashing/cookie/CSRF/rate limit.
- API tạo session; player join, reconnect token và lobby presence.
- Kết nối UI vào WebSocket thật, client clock offset, reconnect backoff và state store.
- Chuyển copy chi tiết còn lại vào locale catalog trước khi thêm ngôn ngữ thứ hai.

## Known issues / quyết định cần chốt

- `wrangler.jsonc` dùng UUID rỗng hợp lệ làm placeholder D1 database ID; phải thay khi tạo tài nguyên production.
- UI Phase 02 chỉ dùng mock data; không có backend gameplay, voting hoặc scoring.
- `ADMIN_BOOTSTRAP_PASSWORD` chỉ là định hướng Phase 03; cần thiết kế one-time bootstrap.
- Cần xác nhận công thức điểm trước Phase 05.
- Chưa dùng asset MisThy thật; mock meme dùng abstract pastel art/emoji để tránh quyền hình ảnh chưa rõ.
- Playwright WebKit browser bundle chưa cài; visual QA và Chromium E2E dùng Chrome hệ thống qua `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
