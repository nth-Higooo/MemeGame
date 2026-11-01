# Yêu cầu sản phẩm

## Người dùng và giao diện

- Người chơi dùng `/play/:sessionCode` trên Safari/Chrome mobile để vào phòng, duyệt meme, gửi lựa chọn và vote khi hợp lệ.
- Màn hình `/display/:sessionCode` trình chiếu 16:9, không lộ danh tính submission trước khi kết quả cho phép.
- Admin dùng `/admin/:sessionCode` trên desktop/tablet để tạo/điều khiển vòng, pause/resume, ghi nhận talent winner và recovery.
- `/judge/:sessionCode` là tùy chọn, chưa thuộc MVP.

Ngôn ngữ mặc định là tiếng Việt. Copy sẽ được chuyển vào locale dictionary trước khi có ngôn ngữ thứ hai.

## Yêu cầu chức năng MVP

- Tạo phòng với mã 6 ký tự, chọn mode mặc định và số vòng.
- Tham gia bằng tên hiển thị; reconnect không tạo người chơi trùng.
- Thư viện meme curated, tìm/lọc nhanh và media tối ưu.
- Một người chỉ được gửi một meme mỗi vòng.
- `TALENT_MODE`: admin/talent chọn winner, không cần audience vote.
- `COMMUNITY_MODE`: submission ẩn danh; người đủ điều kiện vote đúng một lần và không vote chính mình.
- Server chốt deadline, đếm vote, xử lý hòa theo quy tắc trong `game-rules.md` và phát kết quả.
- Admin pause/resume, retry phase và phục hồi checkpoint có audit log.

## Phi chức năng

- Mục tiêu ban đầu: 50 người/phòng, tối thiểu 5 phòng đồng thời mà không cần dịch vụ trả phí.
- State mutation P95 dưới 500 ms trong khu vực có Cloudflare edge gần người dùng (mục tiêu, cần đo thực tế).
- Giao diện player dùng được từ 320 px; touch target tối thiểu 44 px.
- Keyboard, focus visible, semantic labels, contrast WCAG AA cho nội dung chính.
- Không mất winner/submission/vote đã xác nhận sau reconnect hoặc Worker restart.
- Không secret nào xuất hiện trong bundle frontend.

## Ngoài phạm vi MVP

Chat công khai, upload tự do từ người chơi, thanh toán, multi-region database chủ động, video transcoding và moderation tự động bằng dịch vụ trả phí.

## Phân kỳ

- Phase 01 — foundation: repo, contracts, UI shell, DO connection, schema, docs.
- Phase 02 — Liquid Glass design system: tokens, components, responsive role layouts, mock states và visual QA.
- Phase 03 — identity/session: admin auth, create/join/reconnect, lobby state.
- Phase 04 — round engine: phase machine, alarms, submit/reveal, recovery.
- Phase 05 — community voting và talent decision; scoring/results.
- Phase 06 — meme library/admin upload/R2 validation.
- Phase 07 — hardening, accessibility, observability, E2E, production deploy.
