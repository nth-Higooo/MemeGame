# Tiến độ

Cập nhật: 2026-11-01 (Asia/Bangkok)

## Phase 01 — Foundation

Trạng thái: **hoàn thành và đã xác minh acceptance criteria**.

Đã hoàn thành:

- Monorepo pnpm với `apps/web`, `apps/worker`, `packages/shared`, `packages/game-engine` và TypeScript strict.
- ESLint flat config, Prettier, Vitest, Playwright, frozen lockfile và quality-gate scripts.
- Shared Zod contract cho session code, game mode/phase, public snapshot và WebSocket handshake/sync.
- React/Vite UI shell tiếng Việt cho home, player, display và admin; liquid-glass design tokens, responsive layouts, safe area và reduced-motion.
- Typed locale catalog với tiếng Việt là mặc định; cấu trúc sẵn sàng thêm catalog ngôn ngữ khác.
- Component `Button` theo shadcn/ui composition và glass primitives dùng lại được.
- Hono Worker có security headers, `/api/health`, WebSocket routing theo mã phòng và static asset fallback.
- `GameSession` Durable Object dùng WebSocket hibernation API, size/input validation, ping/pong và persisted initial snapshot.
- Cấu hình Static Assets, D1, R2, SQLite-backed Durable Object declarative exports và observability theo convention Cloudflare hiện hành.
- D1 migration ban đầu với constraint chống duplicate submission/vote và audit table.
- Vitest tests cho shared contracts và Worker health/404; Playwright multi-device config và SPA smoke journeys.
- Toàn bộ tài liệu nền bắt buộc và `.env.example`.

## Chưa làm / Phase tiếp theo

Phase 02 chỉ bắt đầu trong phiên phát triển kế tiếp:

- Admin authentication/password hashing/cookie/CSRF/rate limit.
- API tạo session; player join, reconnect token và lobby presence.
- Chuyển phần copy chi tiết còn lại vào locale catalog trước khi thêm ngôn ngữ thứ hai.
- Kết nối UI vào WebSocket thật, client clock offset, reconnect backoff và state store.
- Worker integration test harness cho Durable Object và E2E gameplay journey thật.

Các phase 03–06 được mô tả trong `requirements.md`.

## Known issues / quyết định cần chốt

- `wrangler.jsonc` dùng UUID rỗng hợp lệ làm placeholder D1 database ID; phải thay sau khi tạo tài nguyên Cloudflare production.
- UI Phase 01 dùng dữ liệu minh họa; chưa phải gameplay hoạt động.
- `ADMIN_BOOTSTRAP_PASSWORD` chỉ là định hướng setup Phase 02; cần thiết kế one-time bootstrap, không giữ secret lâu dài.
- Cần xác nhận công thức điểm (đề xuất winner +100) trước Phase 04.
- Chưa có asset MisThy thật; chỉ dùng abstract gradient/emoji để tránh quyền sử dụng hình ảnh chưa rõ.

## Verification log

- Dependency install: thành công bằng Node.js 26.13.0 LTS portable và pnpm 10.20.0; `pnpm-lock.yaml` đã tạo và frozen reinstall thành công.
- `pnpm lint`: pass, 0 warnings.
- TypeScript strict typecheck: pass cho shared, game-engine, web và worker.
- Vitest: pass 4/4 tests; web/game-engine hiện chưa có unit test nên dùng `--passWithNoTests`.
- Production build: Vite build pass; Wrangler 4.156.0 dry-run pass và nhận đủ Assets, D1, R2, Durable Object bindings.
- D1 local migration: `0001_initial.sql` pass, 15 commands.
- Single-origin smoke test qua `wrangler dev`: `/api/health`, `/play/MT2026`, `/display/MT2026`, `/admin/MT2026` đều trả HTTP 200.
- Playwright browser binaries chưa được tải trong môi trường này; suite/config đã tạo nhưng `pnpm test:e2e` chưa chạy.
