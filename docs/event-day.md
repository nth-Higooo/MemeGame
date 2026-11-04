# Event Day — checklist vận hành

Người phụ trách: một Admin chính, một người giữ màn hình/âm thanh, một người hỗ trợ Wi-Fi và người chơi. Ghi tên, số liên lạc nội bộ, giờ mở phòng và giới hạn 50 người vào run sheet riêng. Tài liệu này là checklist thủ công; các mục chưa đánh dấu chưa được xác minh bởi bộ test local.

## Trước sự kiện 1–2 ngày

- [ ] Chốt một bản phát hành; không sửa code/dependency trong lúc diễn tập hoặc đang chơi. Ghi commit và phiên bản deployment có thể rollback.
- [ ] Chạy `pnpm install --frozen-lockfile`, `pnpm check`, rồi các suite Player, Display, Admin và QA theo [testing](testing.md). Đọc giới hạn và kết quả tại [Phase 08 QA](phase08-qa.md).
- [ ] Chạy `pnpm audit --prod --audit-level moderate` trước release. Không bỏ qua advisory mới chỉ vì lần kiểm tra trước sạch; cập nhật bản vá có kiểm thử hoặc giữ quyết định no-go.
- [ ] Xác minh D1/R2 đúng tài khoản, đúng môi trường; thay database ID placeholder. Không dùng dữ liệu test hoặc test secrets ở production.
- [ ] Sao lưu D1 trước migration. Ví dụ từ root: `pnpm exec wrangler d1 export DB --config apps/worker/wrangler.jsonc --remote --output <secure-backup-path.sql>`. Giữ bản sao ngoài repo; file chứa dữ liệu và credential hashes.
- [ ] Áp dụng tất cả migration, gồm `0005_operational_indexes.sql`, trước khi phát hành Worker. Không chỉnh sửa migration đã chạy. Kiểm tra `/api/health` và một thao tác CMS thật sau phát hành.
- [ ] Đặt secret Admin đủ mạnh, HTTPS và thời gian máy chính xác; xóa/rotate bootstrap secret sau tạo owner. Không gửi cookie/ticket/password qua URL, screenshot, log, hoặc group chat.
- [ ] Kiểm tra quota/số dư trong Cloudflare Dashboard cho Workers, Durable Objects, D1, R2. Bài QA chạy local không chứng minh quota production còn đủ; không chạy load test vào production.
- [ ] Chọn nội dung gốc/đã được phép sử dụng. Mở từng GIF trên điện thoại và projector thật; thử cả ảnh dọc/ngang, attachment câu hỏi, GIF dài và asset lớn nhất.
- [ ] Ưu tiên GIF nhỏ, ngắn, ít frame; kích thước upload mặc định tối đa 10 MiB không phải kích thước nên dùng cho mọi meme. Đo trên Wi-Fi của địa điểm với bộ asset thật.
- [ ] Tạo pack hoàn chỉnh trong Content Studio: đúng thứ tự câu hỏi, mỗi câu có meme, preset individual, thời gian, điểm tham gia/thắng, tie-breaker. Archive nội dung thử nghiệm.
- [ ] Chạy Dry Run toàn bộ kịch bản cả Talent và Community. Dry Run ở bộ nhớ trình duyệt, không mô phỏng mạng thật và không thay đổi phiên live.
- [ ] Diễn tập có thiết bị thật: iPhone Safari, Android Chrome, tablet Admin và máy/projector. Kiểm tra 320 px, safe area, phông tiếng Việt, zoom 200%, keyboard, focus modal, tương phản trên projector, reduced motion và GIF opt-in.
- [ ] Thử mất mạng/reconnect, refresh lúc gửi bài/voting, Admin mất kết nối, projector mất kết nối và một vòng không có submission. Xác minh kết quả đã công bố vẫn giữ nguyên.
- [ ] Chốt điều kiện go/no-go: không lỗi mất dữ liệu/điểm trùng/lộ bài sớm; 50 người hoạt động ổn định; độ trễ thực tế chấp nhận được; còn quota và có đường mạng dự phòng. Chưa đáp ứng thì hoãn hoặc giảm quy mô có thông báo.

## Trước mở cửa 60 phút

- [ ] Cắm nguồn cho laptop/projector/router; tắt sleep và thông báo cá nhân, cắm sạc điện thoại Admin, chuẩn bị dây/cổng chuyển và hotspot dự phòng.
- [ ] Dùng extended display, mở `/display/CODE` trên màn hình ngoài, chọn fullscreen bằng **F**. Dùng màn hình laptop riêng cho `/admin/CODE`.
- [ ] Chỉ mở một tab Admin chính; tối đa ba tab mỗi danh tính, mười tab Display mỗi phòng. Đóng tab thử để presence dễ đọc.
- [ ] Tạo phòng live mới từ pack đã chốt. Sửa CMS sau khi tạo không thay đổi nội dung đã copy của phòng.
- [ ] Kiểm tra mode, điểm và thời lượng. Nếu có Talent, tạo credential riêng cho `/judge/CODE`, đăng nhập thử, giữ link projector sạch và không kèm token.
- [ ] Quét QR bằng điện thoại trên mạng khách. URL phải là HTTPS có thể truy cập; QR chứa `localhost` chỉ hoạt động trên máy chủ, không dùng cho khách.
- [ ] Giữ phòng ở `LOBBY` cho tới khi đủ người. Nhắc dùng tên khác nhau và giữ nguyên trình duyệt đã join; xóa dữ liệu site sẽ mất token ẩn danh.
- [ ] Đảm bảo host/Wi-Fi đủ cho 20–50 máy; cho người hỗ trợ giữ một điện thoại quan sát Player và trạng thái kết nối.
- [ ] Mở sẵn run sheet với danh sách câu hỏi, giờ nghỉ, tie policy, người quyết định winner và người được quyền xác nhận điểm.

## Mỗi vòng

1. Đọc câu hỏi ở `QUESTION`; kiểm tra mode trước khi mở nhận meme. Mode chỉ đổi tại lobby/question/leaderboard.
2. Mở submission. Theo dõi số người đã gửi, đồng hồ và ảnh lỗi. Không yêu cầu người chơi spam nút; retry cùng command ID không tạo bài trùng.
3. Có sự cố thì pause sớm. Deadline đã hết không mở lại bằng pause/resume. Hết giờ chỉ khóa nhận bài; Admin chủ động reveal.
4. Reveal cho projector; không chia sẻ màn hình Admin vì Admin thấy tác giả và vote totals riêng.
5. Talent: Talent đề cử bằng Judge hoặc Admin ghi nhận. Community: mở voting; mỗi người một vote, không vote mình. Deadline/đóng vote tạo kết quả tạm.
6. Nếu hòa dùng đúng preset. Với Talent tie-break chỉ chọn một meme thuộc nhóm đang hòa; chọn ngoài nhóm phải tạo đề cử rồi override có lý do.
7. Kiểm tra meme, người thắng và điểm. Chỉ Admin bấm xác nhận công bố. Hộp thoại báo stale phải đóng/mở lại; không xác nhận dựa trên snapshot cũ.
8. Override đề cử cần xác nhận và lý do. Kết quả đã công bố không sửa ngược; dùng điều chỉnh điểm có audit nếu cần bù điểm.
9. Chuyển bảng điểm rồi vòng tiếp. Kết thúc kiểm tra thứ hạng, điểm và participation summary trên Player.

## Có sự cố trong chương trình

- [ ] Giữ bình tĩnh, thông báo ngắn gọn cho người chơi. Nếu Admin còn hoạt động, pause timer; bật projector intermission riêng. Intermission **không** tự pause timer.
- [ ] Giữ nguyên tab/danh tính. Không reset database, xóa DO storage, xóa phòng hoặc tạo danh tính mới để "sửa" reconnect.
- [ ] Làm theo [troubleshooting](troubleshooting.md); ghi giờ, room code, phase, request ID và mã lỗi. Không chụp developer tools có credential.
- [ ] Sau khi dịch vụ khỏe lại, reconnect rồi dùng **Đồng bộ & khôi phục timer**. Đây là command có audit, giữ bài/vote/điểm và đồng bộ alarm với deadline đã lưu; không kéo dài deadline.
- [ ] Nếu cần làm lại, chỉ restart vòng chưa công bố; vòng đã công bố phải giữ lịch sử. Dừng vòng tạo đề cử không winner, vẫn cần xác nhận; điểm tham gia vẫn theo preset.
- [ ] Khi mất D1/R2 kéo dài hoặc quota cạn, dừng event thay vì công bố điểm đoán. Tiếp tục đúng phòng sau khi khắc phục; nếu buộc tạo event mới, giữ event cũ và ghi rõ lý do.

## Sau chương trình

- [ ] Chốt `FINISHED`, kiểm tra audit/score events, ghi lại mọi correction và quyết định khi hòa.
- [ ] Logout Admin/Judge, rotate credential Talent nếu link đã được chia sẻ; đóng cửa sổ trình chiếu.
- [ ] Sao lưu dữ liệu theo chính sách nội bộ, giới hạn người được đọc, xóa token/screenshot nhạy cảm khỏi tài liệu hỗ trợ.
- [ ] Kiểm tra số request, CPU, D1 rows read/written và R2 operations trong Dashboard; ghi bài học và lỗi còn lại.
- [ ] Chỉ xóa asset không tham chiếu qua CMS. Nếu có log `R2_CLEANUP_REQUIRED`, đối chiếu object UUID trong bucket với D1 trước khi xóa thủ công; không xóa bucket theo prefix chung.
