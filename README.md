# MisThy Meme Party

Ứng dụng party game thời gian thực: người chơi chọn meme/GIF cho một tình huống, sau đó talent hoặc cộng đồng chọn cú chốt hay nhất.

## Bắt đầu nhanh

Yêu cầu Node.js 22.12+ và pnpm 10.

```bash
pnpm install
cp .env.example apps/worker/.dev.vars
pnpm db:migrate:local
pnpm dev
```

- Web: `http://localhost:5173`
- Worker/API: `http://localhost:8787`
- Demo route: `/play/MT2026`, `/display/MT2026`, `/admin/MT2026`

Các route demo trong Phase 01 là UI shell bằng dữ liệu mẫu. Xem [tiến độ](docs/progress.md) trước khi phát triển tiếp.
