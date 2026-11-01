# Triển khai Cloudflare

## Tài nguyên

- Một Worker phục vụ Hono API, WebSocket Durable Object và static assets.
- Một D1 database `misthy-meme-party`.
- Một R2 bucket `misthy-meme-library`.
- Durable Object class `GameSession` dùng SQLite-backed storage.

Các dịch vụ này được chọn để MVP có thể nằm trong free tier hiện hành; luôn kiểm tra giới hạn Cloudflare tại thời điểm triển khai.

## Chuẩn bị

1. Cài Node.js 22.12+ và pnpm 10, chạy `pnpm install`.
2. `wrangler login` bằng tài khoản Cloudflare của dự án.
3. Tạo D1 và R2 bằng Wrangler/Dashboard.
4. Thay `REPLACE_WITH_D1_DATABASE_ID` trong `apps/worker/wrangler.jsonc`; giữ file ID không nhạy cảm trong Git.
5. Tạo secret bằng `wrangler secret put ADMIN_SESSION_SECRET` và bootstrap secret tương ứng. Không dùng `VITE_*` cho secret.
6. Chạy migration remote sau khi đã backup/kiểm tra môi trường.

## Build và deploy

```bash
pnpm typecheck
pnpm test
pnpm --filter @misthy/web build
pnpm --filter @misthy/worker db:migrate:remote
pnpm --filter @misthy/worker exec wrangler deploy
```

Worker config trỏ static directory tới `apps/web/dist` và ưu tiên Worker cho `/api/*`, `/ws/*`. Route frontend khác được static asset SPA fallback phục vụ; cần xác nhận hành vi fallback bằng preview trước production.

## Môi trường

Nên dùng Worker/D1/R2 riêng cho preview và production. Production bật observability, custom domain/HTTPS và alert theo error rate. Không deploy Phase 01: auth và gameplay engine chưa hoàn chỉnh.

## Rollback

Rollback Worker bằng Cloudflare version/deployment trước. Migration D1 cần forward-fix; không tự động down-migrate dữ liệu production. R2 object dùng key bất biến và metadata active flag để có thể thu hồi mà không xóa ngay.
