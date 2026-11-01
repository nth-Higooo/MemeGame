# Dữ liệu

## Chọn nơi lưu

- D1: session metadata, admin/player identity, round history, submissions, votes, meme metadata và audit log.
- Durable Object storage: state/checkpoint nhỏ của phòng đang hoạt động và alarm metadata.
- R2: binary meme/GIF với object key ngẫu nhiên; không dùng filename người upload làm key.

Migration đầu tiên nằm tại `apps/worker/migrations/0001_initial.sql`.

## Quan hệ chính

`sessions` có nhiều `players`, `rounds`, `admins` và `audit_events`. Mỗi `round` có `submissions`; mỗi `submission` tham chiếu `player` và `meme`. `votes` tham chiếu voter và submission.

Các unique constraint quan trọng:

- `sessions.code`: mã phòng duy nhất.
- `(round_id, player_id)` trong submissions: chống gửi trùng.
- `(round_id, voter_player_id)` trong votes: chống vote trùng.
- `reconnect_token_hash`: một token không ánh xạ hai player.

## Quy ước

- ID là UUID/ULID tạo phía server, lưu `TEXT`.
- Timestamp là UTC ISO-8601 với mili giây.
- Boolean D1 là `INTEGER` 0/1 có `CHECK`.
- JSON chỉ dùng cho audit payload; dữ liệu cần query phải có cột riêng.
- Token và password không lưu plaintext. Password dùng Web Crypto-compatible password hashing strategy được chốt trong Phase 02; reconnect/session token dùng SHA-256/HMAC phù hợp mục đích.

## Transaction và consistency

DO xử lý một command tại một thời điểm. Mutation nghiệp vụ ghi D1 trong transaction/batch có điều kiện, sau đó cập nhật checkpoint và broadcast. Nếu broadcast thất bại, client reconnect nhận snapshot. Nếu persistence thất bại, mutation không được công bố là thành công.

Không sửa migration đã chạy. Mỗi thay đổi schema tạo file số thứ tự mới và ghi backward/forward behavior trong pull request hoặc progress log.
