# Kiến trúc

## Mục tiêu

Hệ thống ưu tiên độ trễ thấp, khôi phục kết nối và chi phí bằng 0 hoặc thấp cho 20–50 người/phòng. Worker phục vụ cả API và static assets để frontend/API cùng origin. Mọi quyết định ảnh hưởng kết quả trò chơi nằm ở server.

## Cấu trúc

```text
apps/web       React UI: play, display, admin
apps/worker    Hono API + GameSession Durable Object
packages/game-engine  Pure state machine, scoring, role projections, rehearsal
packages/shared  Zod schemas và TypeScript contracts
```

Luồng chính:

1. Browser tải bundle từ Workers Static Assets.
2. API CRUD bền vững đọc/ghi D1; file media đã kiểm tra nằm trong R2.
3. Mỗi mã phòng ánh xạ ổn định tới một `GameSession` Durable Object.
4. Durable Object tuần tự hóa command, quản lý timer và phát state mới qua WebSocket hibernation.
5. Snapshot/checkpoint quan trọng được ghi vào Durable Object storage và D1. D1 là lịch sử nghiệp vụ; DO là authority của phiên đang chạy.

## Ranh giới authority

- Client chỉ gửi ý định: ready, submit, vote, admin command.
- DO xác thực identity, phase, deadline, quyền và idempotency trước mutation.
- Countdown dùng `phaseEndsAt` theo thời gian server. Client chỉ nội suy để hiển thị.
- State có `version` tăng đơn điệu. Khi reconnect, client yêu cầu snapshot mới thay vì replay tùy ý.
- Database constraint là lớp bảo vệ cuối cho một submission/người/vòng và một vote/người/vòng.

## Khả năng phục hồi

- WebSocket hibernation giảm thời gian CPU khi phòng không có message.
- DO alarm chuyển phase đúng hạn ngay cả khi không có client online; handler kiểm tra deadline để an toàn với alarm at-least-once.
- Mỗi command có idempotency UUID và audit event. Submission/vote còn có unique constraint trong D1.
- Rollback nghiệp vụ không xóa lịch sử: admin tạo command bù hoặc khôi phục checkpoint, tăng revision và phát snapshot mới.

Phase 04 lưu snapshot versioned trong cả Durable Object storage và `sessions.state_json`. Khi thức dậy sau hibernation, snapshot D1 có version cao hơn sẽ sửa lại DO storage. Metadata socket được `serializeAttachment` để giữ identity qua hibernation. Chi tiết tại [realtime-engine.md](realtime-engine.md).

Phase 07 adds manual session orchestration: timed input windows lead to an unpublished proposal; only an explicit Admin confirmation persists final scoring. The browser-only Dry Run uses the same reducer without Worker writes. Admin/Judge authentication is separate; privilege checks survive socket hibernation. See [admin-control.md](admin-control.md).

## Bảo mật

Admin đăng nhập qua password đã hash và nhận cookie `HttpOnly`, `Secure`, `SameSite=Strict`. Session/reconnect token chỉ lưu dạng hash trong D1. Upload đi qua API, kiểm tra magic bytes, MIME, kích thước, chiều ảnh và giới hạn tốc độ trước khi ghi R2. Các phần này được triển khai ở Phase 03–06.

## Mở rộng mini-game

Game engine nên tách `GameDefinition` (phase graph, commands, public projections, scoring) khỏi transport và persistence. Meme Party là definition đầu tiên; session/identity/reconnect vẫn dùng chung cho mini-game sau.

`packages/game-engine` hiện chứa reducer Phase 04 thuần TypeScript; Worker chịu trách nhiệm auth, D1, alarm và broadcast. Ranh giới này cho phép test transition không cần Cloudflare runtime và giữ đường mở rộng cho mini-game sau.
