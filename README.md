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
- Route: `/play/MT2026`, `/display/MT2026`, `/admin/MT2026`.

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
