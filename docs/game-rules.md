# Luật chơi

## Vòng đời phiên

`LOBBY → PROMPT → SUBMITTING → REVEAL → (VOTING) → RESULT → PROMPT/FINISHED`.

Admin có thể chuyển sang `PAUSED`; server ghi phase trước đó và thời gian còn lại để resume. Client không tự chuyển phase khi đồng hồ về 0.

## Gửi meme

- Chỉ player đã join và còn hợp lệ trong vòng được submit khi phase là `SUBMITTING`.
- Mỗi player có tối đa một submission/vòng. MVP coi lần submit đầu đã xác nhận là cuối cùng; cho phép thay đổi có thể thêm qua cấu hình sau.
- Submission đến sau deadline server bị từ chối, kể cả UI vẫn đang đếm do lệch đồng hồ.
- Reveal ẩn danh và thứ tự được server shuffle ổn định cho cả client.

## TALENT_MODE

Sau reveal, talent chọn một submission. Admin có thể ghi quyết định nếu không có judge UI. Server kiểm tra submission thuộc vòng hiện tại, lưu audit event, tính điểm và chuyển `RESULT`. Audience không vote.

## COMMUNITY_MODE

- Chỉ player thuộc danh sách voter eligibility snapshot lúc mở `VOTING` được vote.
- Player không được vote submission của chính mình.
- Mỗi voter có một vote; unique constraint và command idempotency chống gửi lặp.
- Winner là submission có nhiều vote hợp lệ nhất.
- Nếu hòa, server chọn submission được gửi sớm hơn. Đây là tie-break deterministic, dễ giải thích và audit; có thể đổi bằng cấu hình trước sự kiện.

## Điểm

MVP đề xuất winner nhận 100 điểm, các player khác 0 điểm/vòng. Cách tính cuối cùng sẽ được xác nhận trước Phase 05 và cấu hình server-side.

## Trường hợp lỗi

- Player mất mạng: giữ submission/vote đã xác nhận; reconnect bằng token và nhận state mới.
- Admin mất mạng: vòng vẫn theo alarm server; admin mới đăng nhập nhận snapshot.
- Phase sai: admin pause, xem audit/checkpoint, dùng retry hoặc restore. Không chỉnh trực tiếp D1 trong lúc sự kiện đang chạy.
