# MisThy Meme Party

Ứng dụng party game thời gian thực: người chơi chọn meme/GIF cho một tình huống, sau đó talent hoặc cộng đồng chọn cú chốt hay nhất.

## Yêu cầu

- Node.js 22.13 trở lên.
- pnpm 10.20.0.
- Tài khoản Cloudflare chỉ cần khi tạo tài nguyên hoặc deploy; phát triển local không cần đăng nhập.

## Cài đặt

PowerShell:

```powershell
npm install --global pnpm@10.20.0
pnpm install --frozen-lockfile
Copy-Item .env.example apps/worker/.dev.vars
pnpm db:migrate:local
pnpm dev
```

macOS/Linux:

```bash
npm install --global pnpm@10.20.0
pnpm install --frozen-lockfile
cp .env.example apps/worker/.dev.vars
pnpm db:migrate:local
pnpm dev
```

- Web: `http://localhost:5173`
- Worker/API: `http://localhost:8787`
- Health qua Vite proxy: `http://localhost:5173/api/health`.
- Routes: `/play/MT2026`, `/display/MT2026`, `/admin/MT2026`.
- Content Studio: `/admin/MT2026/content` (first visit can bootstrap the owner using `ADMIN_BOOTSTRAP_PASSWORD`).

`pnpm dev` chạy Vite và Wrangler song song; Vite proxy `/api` và `/ws` sang Worker. Để kiểm tra đúng mô hình một origin như production, chạy:

```bash
pnpm dev:single-origin
```

Sau đó mở UI và API cùng tại `http://localhost:8787`.

## Kiểm tra và build

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Playwright cần cài browser một lần:

```bash
pnpm exec playwright install
pnpm test:e2e
```

`pnpm build` tạo frontend tại `apps/web/dist` rồi chạy Wrangler dry-run để xác nhận một bundle triển khai gồm static assets và API. Khi đã tạo D1/R2 production và thay placeholder binding, dùng `pnpm deploy`.

Các route demo trong Phase 01 là UI shell bằng dữ liệu mẫu. Xem [tiến độ](docs/progress.md) trước khi phát triển tiếp.

## Content storage

Phase 03 stores structured content in D1 and image bytes in private R2. The default upload cap is 10 MiB (`MAX_UPLOAD_BYTES`). JSON export contains questions and presets, not image binaries. See [database](docs/database.md) and [deployment](docs/deployment.md).

## Realtime engine

Phase 04 provides session creation, join/reconnect, role tickets, and a hibernating WebSocket engine. Phase 05 connects `/play/:sessionCode` to that engine; Admin/Display gameplay workflows remain shells. Apply all migrations before using the API:

```bash
pnpm db:migrate:local
pnpm dev
```

The Worker exposes `POST /api/admin/sessions`, `POST /api/sessions/:code/join`, reconnect/display ticket endpoints, and `/ws/:code`. WebSockets use subprotocols returned by the ticket APIs. See [realtime engine](docs/realtime-engine.md) for contracts, timing, and recovery behavior.

Create a content pack in Content Studio, then create a session with the authenticated API. Open `/play/<returned-code>` to join. The room must be in `LOBBY` for a new player; returning players reconnect automatically. See [player experience](docs/player-experience.md) for the flow and exact real-backend E2E commands (`pnpm test:player`).
