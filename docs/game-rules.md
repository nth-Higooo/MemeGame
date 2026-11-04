# Luật chơi

## Vòng đời phiên

`LOBBY → QUESTION → SUBMITTING → REVEAL → (VOTING) → RESULT → LEADERBOARD → QUESTION/FINISHED`.

Community Mode có phase `VOTING`; Talent Mode chờ Admin/Judge chọn winner tại `REVEAL`. Client không tự chuyển phase khi đồng hồ về 0. Pause giữ nguyên phase hiện tại và lưu thời gian còn lại thay vì tạo thêm một phase ngoài state machine.

## Gửi meme

- Chỉ player đã join trước khi game bắt đầu được submit trong `SUBMITTING`.
- Mỗi player tối đa một submission/vòng. `SUBMIT_MEME` tạo lựa chọn đầu tiên; `REPLACE_MEME` đổi meme trước deadline và giữ submission ID. Lặp lại cùng `commandId` được ACK idempotent; gửi lại `SUBMIT_MEME` với ID mới bị từ chối là duplicate.
- Server kiểm tra meme thuộc collection của câu hỏi và thời điểm nhận nhỏ hơn deadline tuyệt đối.
- Submission đến đúng hoặc sau deadline bị từ chối, kể cả UI vẫn còn đếm do lệch đồng hồ.
- Reveal ẩn danh cho Player/Display; Admin/Judge có projection theo quyền và danh tính chỉ công khai khi kết quả xuất hiện.

## Talent Mode

Sau reveal, Admin hoặc Judge chọn một submission thuộc vòng hiện tại. Có thể chọn `null` cho vòng trống/skip. Server lưu winner, score events và chuyển sang `RESULT`. Audience không vote.

## Community Mode

- Eligibility được snapshot khi đóng submission; disconnect không làm mất quyền vote hoặc dữ liệu đã gửi.
- Mỗi voter một vote và không được vote submission của mình.
- Deadline voting do server/DO alarm chốt.
- Winner là submission có nhiều vote hợp lệ nhất.
- `EARLIEST_SUBMISSION` chọn lựa chọn cuối được gửi đến server sớm nhất khi hòa (thay meme cập nhật thời điểm này), sau đó dùng UUID để ổn định tuyệt đối.
- `RANDOM` dùng lựa chọn deterministic từ round ID và candidate IDs, nên recovery cho cùng kết quả.
- `TALENT_DECIDES` đưa tie về reveal không deadline để Admin/Judge quyết định.
- Không có submission thì winner `null`. Không có vote thì mọi submission hòa và áp dụng tie-breaker đã cấu hình.

## Điểm

Điểm winner và participation lấy từ preset. Finalization chỉ chạy một lần, ghi `score_events` và cập nhật player score trong cùng D1 batch. Restart round xóa event của vòng và hoàn điểm; reset session xóa lịch sử vòng đang vận hành và đưa mọi điểm về 0.

## Quyền điều khiển

- Player: submit, vote, ping/ready.
- Display: chỉ nhận snapshot.
- Judge: chọn winner khi hợp lệ.
- Admin: start, advance, pause, resume, skip, restart round, reset session và chọn winner.

Mọi command sai role, phase hoặc deadline đều bị từ chối mà không tăng version.

## Kết nối và lỗi

- Player reconnect bằng token bí mật đã hash trong D1 và nhận snapshot mới.
- Admin/Display/Judge lấy connection ticket mới rồi reconnect; socket cũ không phải nguồn sự thật.
- Nhiều tab của một player dùng chung identity. Player chỉ offline khi tab cuối ngắt.
- Hibernation giữ WebSocket và attachment; engine khôi phục snapshot từ DO storage/D1.
- Alarm và finalization có thể được gọi lặp nhưng guard version/deadline/command ngăn kết quả hoặc điểm trùng.

Xem [realtime-engine.md](realtime-engine.md) để biết event contract, timing và recovery chi tiết.
