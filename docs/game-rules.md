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

Sau reveal, Admin hoặc Judge đề cử một submission thuộc vòng hiện tại. Có thể chọn `null` cho vòng trống/stop. Phiên manual chờ Admin xác nhận công bố trước khi server lưu winner, score events và chuyển sang `RESULT`. Audience không vote. Phiên automated cũ giữ hành vi công bố ngay khi chọn.

## Community Mode

- Eligibility được snapshot khi đóng submission; disconnect không làm mất quyền vote hoặc dữ liệu đã gửi.
- Mỗi voter một vote và không được vote submission của mình.
- Deadline voting do server/DO alarm chốt. Phiên manual tạo kết quả tạm, quay về `REVEAL` và chờ Admin xác nhận công bố; không phát winner/điểm sớm.
- Winner là submission có nhiều vote hợp lệ nhất.
- `EARLIEST_SUBMISSION` chọn lựa chọn cuối được gửi đến server sớm nhất khi hòa (thay meme cập nhật thời điểm này), sau đó dùng UUID để ổn định tuyệt đối.
- `RANDOM` dùng lựa chọn deterministic từ round ID và candidate IDs, nên recovery cho cùng kết quả.
- `TALENT_DECIDES` đưa tie về reveal không deadline để Admin/Judge quyết định.
- Không có submission thì winner `null`. Không có vote thì mọi submission hòa và áp dụng tie-breaker đã cấu hình.

## Điểm

Điểm winner và participation lấy từ preset. Finalization chỉ chạy một lần, ghi `score_events` và cập nhật player score trong cùng D1 batch. Phiên manual chỉ restart vòng chưa công bố và không cho reset phá lịch sử. Điều chỉnh điểm phải có lý do, xác nhận và audit; không cho tổng điểm âm. Phiên automated cũ giữ restart/reset của Phase 04.

## Quyền điều khiển

- Player: submit, vote, ping/ready.
- Display: chỉ nhận snapshot.
- Judge: đề cử winner khi hợp lệ; không được công bố hoặc sửa điểm.
- Admin: start, advance, pause, resume, stop, reveal, mở/đóng voting, restart vòng chưa công bố, chọn/đổi đề cử có lý do, xác nhận công bố, điều chỉnh điểm có audit và điều khiển projector intermission.

Mọi command sai role, phase hoặc deadline đều bị từ chối mà không tăng version.

Phiên mới mặc định `manualControl: true`: question/reveal/result/leaderboard không tự advance; submission timeout khóa nhận bài nhưng chờ Admin reveal. Voting timeout tính kết quả tạm. Mode có thể đổi trước vòng tại lobby/question/leaderboard. Xem [admin-control.md](admin-control.md) để vận hành và dùng Dry Run.

## Kết nối và lỗi

- Player reconnect bằng token bí mật đã hash trong D1 và nhận snapshot mới.
- Admin/Display/Judge lấy connection ticket mới rồi reconnect; socket cũ không phải nguồn sự thật.
- Nhiều tab của một player dùng chung identity. Player chỉ offline khi tab cuối ngắt.
- Hibernation giữ WebSocket và attachment; engine khôi phục snapshot từ DO storage/D1.
- Alarm và finalization có thể được gọi lặp nhưng guard version/deadline/command ngăn kết quả hoặc điểm trùng.
- Phase 08 giới hạn 50 người/phòng và từ chối biệt danh trùng sau chuẩn hóa Unicode, khoảng trắng và chữ hoa/thường. Danh tính và snapshot join cùng một transaction; nickname không phải credential để reconnect.
- Admin có command đồng bộ/khôi phục timer có audit, không xóa bài/vote/điểm hoặc mở lại deadline đã hết. Đóng tab thừa khi chạm giới hạn ba socket/danh tính.

Xem [realtime-engine.md](realtime-engine.md) để biết event contract, timing và recovery chi tiết.
