# Tiến độ

Cập nhật: 2026-11-01 (Asia/Bangkok)

## Phase 01 — Foundation

Trạng thái: **đã triển khai code, chưa xác minh build do môi trường thiếu Node/package manager**.

Đã hoàn thành:

- Monorepo pnpm với `apps/web`, `apps/worker`, `packages/shared` và TypeScript strict.
- Shared Zod contract cho session code, game mode/phase, public snapshot và WebSocket handshake/sync.
- React/Vite UI shell tiếng Việt cho home, player, display và admin; liquid-glass design tokens, responsive layouts, safe area và reduced-motion.
- Typed locale catalog với tiếng Việt là mặc định; cấu trúc sẵn sàng thêm catalog ngôn ngữ khác.
- Component `Button` theo shadcn/ui composition và glass primitives dùng lại được.
- Hono Worker có security headers, `/api/health`, WebSocket routing theo mã phòng và static asset fallback.
- `GameSession` Durable Object dùng WebSocket hibernation API, size/input validation, ping/pong và persisted initial snapshot.
- Cấu hình Static Assets, D1, R2, Durable Object migration và observability.
- D1 migration ban đầu với constraint chống duplicate submission/vote và audit table.
- Vitest contract test mẫu và Playwright multi-device config.
- Toàn bộ tài liệu nền bắt buộc và `.env.example`.

## Chưa làm / Phase tiếp theo

Phase 02 chỉ bắt đầu trong phiên phát triển kế tiếp:

- Admin authentication/password hashing/cookie/CSRF/rate limit.
- API tạo session; player join, reconnect token và lobby presence.
- Chuyển phần copy chi tiết còn lại vào locale catalog trước khi thêm ngôn ngữ thứ hai.
- Kết nối UI vào WebSocket thật, client clock offset, reconnect backoff và state store.
- Worker integration test harness và E2E journey thật.

Các phase 03–06 được mô tả trong `requirements.md`.

## Known issues / quyết định cần chốt

- `wrangler.jsonc` còn placeholder D1 database ID; chỉ thay sau khi tạo tài nguyên Cloudflare.
- UI Phase 01 dùng dữ liệu minh họa; chưa phải gameplay hoạt động.
- `ADMIN_BOOTSTRAP_PASSWORD` chỉ là định hướng setup Phase 02; cần thiết kế one-time bootstrap, không giữ secret lâu dài.
- Cần xác minh version compatibility của dependency bằng clean install và lockfile trên máy có Node.
- Cần xác nhận công thức điểm (đề xuất winner +100) trước Phase 04.
- Chưa có asset MisThy thật; chỉ dùng abstract gradient/emoji để tránh quyền sử dụng hình ảnh chưa rõ.

## Verification log

- `rg --files`: thành công trước khi code; repository ban đầu chỉ có `.git`.
- Git status: chạy bằng executable ở vị trí cài đặt phổ biến; toàn bộ file Phase 01 đang ở trạng thái untracked vì repository chưa có commit.
- Node/npm/pnpm/Wrangler: không có trong PATH.
- `pnpm install`, typecheck, unit test, build, Playwright, Wrangler dry-run: **chưa chạy**, không được coi là pass.
