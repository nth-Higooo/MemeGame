# Celestial Pastel Glass Design System

## Art direction

Phase 02 dùng ngôn ngữ **Celestial Pastel × Dreamy Glass × Playful Illustration**: nền trời pastel ấm cho Player/Admin, sân khấu indigo cho Display, cloud/sparkle vector có cùng silhouette và line treatment. Mục tiêu là giao diện indie party game được art-direct, không phải landing page AI hoặc dashboard SaaS.

Glass là lớp chức năng nổi dành cho navigation, action bar, modal và toolbar. Câu hỏi, meme, danh sách và control panel dùng bề mặt solid/soft để giữ khả năng đọc.

## Audit UI trước redesign

- Background dùng ba gradient orb lớn nên thiếu hình ảnh nhận diện và dễ giống template AI.
- Glass treatment lặp ở navigation, content card, dashboard panel và action; phân cấp surface yếu.
- Primary action dùng gradient tím–hồng; nhiều card dùng gradient khác nhau nên màu thiếu điểm neo.
- Radius 22–36 px và spacing lớn xuất hiện gần như mọi nơi, khiến mobile có cảm giác phóng to.
- Meme mock dùng emoji làm hình chính, không tạo được illustration system riêng.
- Display là layout web hai cột phóng lớn thay vì stage composition.
- Admin dùng ba statistic card và card grid lặp lại, giống dashboard doanh nghiệp.
- Typography rất đậm ở nhiều cấp; hierarchy dựa quá nhiều vào kích thước/weight.

## Semantic tokens

Token nguồn nằm tại `apps/web/src/styles.css`.

| Token           | Giá trị   | Vai trò                               |
| --------------- | --------- | ------------------------------------- |
| Candy Pink      | `#F9C6DE` | accent cảm xúc, stage progress        |
| Soft Lilac      | `#C7B5F5` | selection/supporting surface          |
| Cloud Blue      | `#A9DDF7` | atmosphere và illustration            |
| Peach           | `#FFC4A7` | warm illustration accent              |
| Periwinkle      | `#8F9BEF` | focus, progress, active state         |
| Mint            | `#B9E9DA` | success và illustration               |
| Warm White      | `#FFF8F7` | Player/Admin canvas                   |
| Midnight Indigo | `#242B4D` | primary action, heading, stage anchor |

Semantic ink: `--ink-strong`, `--ink-body`, `--ink-muted`. Surface: `--surface-solid`, `--surface-soft`, `--surface-frosted`, `--surface-clear`. Gradient chỉ còn ở background atmosphere hoặc illustration; control và card chủ yếu dùng màu solid.

## Typography

Stack ưu tiên Nunito, sau đó Segoe UI Variable/Segoe UI/system UI. Các font này hỗ trợ đầy đủ dấu tiếng Việt; không tải font ngoài để tránh dependency và flash font. Display heading dùng weight 900 có chọn lọc; body 600–700 và line-height thoáng. Player heading không vượt khoảng 28 px ở mobile.

## Spacing, radius và sizing

- Nhịp spacing: 4/8/12/16/20/24/32 px.
- Compact control: 12–14 px radius.
- Content card: 16–20 px radius.
- Floating feature surface: tối đa khoảng 26 px.
- Touch target: tối thiểu 44×44 px.
- Player gutter: 12 px ở 320 px, tương đương khoảng 16 px cho content bên trong.
- Safe-area được áp dụng cho top navigation và bottom action bar.

## Surface variants

1. **Solid Surface** — `#FFFDFB`, dùng cho câu hỏi, meme caption, list và control panel.
2. **Soft Surface** — pastel tint nhẹ, dùng cho grouping phụ.
3. **Frosted Glass** — blur 15 px tiết chế, dùng cho floating navigation/action.
4. **Elevated Glass** — shadow mạnh hơn cho modal và bottom action bar.
5. **Stage Surface** — indigo gần-opaque, border lilac thấp, dành cho projector.

`prefers-reduced-transparency` chuyển lớp frosted thành solid và bỏ backdrop filter. Không xếp glass trong glass ở content area.

## Component inventory

| Component                                                              | Vai trò                                     |
| ---------------------------------------------------------------------- | ------------------------------------------- |
| `CelestialBackground`                                                  | Light/stage scene, cloud, star, grain       |
| `DecorativeCloud`, `DecorativeSparkle`                                 | SVG illustration primitives                 |
| `GlassCard`                                                            | Semantic solid/soft/frosted/clear surface   |
| `GlassButton`, `GlassBadge`, `GlassInput`, `GlassModal`, `GlassNavbar` | Shared controls và floating layers          |
| `QuestionCard`                                                         | Focal prompt không dùng glass               |
| `CountdownTimer`                                                       | Compact/stage circular game timer           |
| `ConnectionIndicator`                                                  | Connected/offline semantic status           |
| `FloatingActionBar`                                                    | Mobile safe-area submit action              |
| `MemeCard`, `MemeGrid`                                                 | Vector mock media, caption, selection state |
| `FeedbackState`                                                        | Loading/empty/error/disconnected            |

Meme mock được vẽ bằng SVG nội bộ với sáu art variants. Đây là fallback đại diện cho visual QA, chưa phải thư viện GIF thật của Phase 06.

## Illustration guidelines

- Cloud dùng silhouette phồng, highlight mềm và shadow periwinkle thống nhất.
- Sparkle dùng hình bốn cánh; tiny star dùng dot có halo rất nhẹ.
- Mỗi scene chỉ có vài cluster ở mép composition; không đặt sau câu hỏi/control quan trọng.
- Meme illustration dùng palette theo token, shape đơn giản và đường viền indigo thấp.
- Lucide chỉ dùng cho utility/action; brand và personality đến từ SVG riêng.

## Motion

- Cloud drift 18 giây, biên độ nhỏ, là ambient loop duy nhất.
- Hover/selection 160–180 ms, dịch chuyển tối đa 2 px.
- Press feedback scale 0.985.
- `prefers-reduced-motion` tắt animation/transition thực tế.

## Responsive layouts

### Player

Mobile-first tại 320/375/390 px: floating compact header, prompt solid, timer cạnh heading, search + horizontal filter, meme grid hai cột và bottom action bar. Media giữ ưu tiên thị giác; selected state dùng border + check icon, không phủ tint.

### Display

Stage 16:9 dùng twilight scene, question lớn bên trái, submission count/timer/progress cùng một cụm và bốn meme ẩn danh bên phải. Không có admin/mobile navigation, không scrollbar ở 1280×720 và 1920×1080.

### Admin

Creative control studio với sidebar 216 px, summary strip thay statistic-card grid, main round control, player list và display preview. Decoration giảm cường độ so với Player/Display; quick action nằm ở heading.

## Showcase và visual QA

`/dev/design-system` chỉ resolve khi `import.meta.env.DEV`. Showcase gồm light/dark environment, palette, typography, surface, control states, input, modal, question, timer, meme selection và feedback states.

`pnpm visual:check` kiểm tra:

- Player: 320×568, 375×812, 390×844.
- Display: 1280×720, 1920×1080.
- Admin: 1440×900.
- Showcase: 1440×1000 full page.

Script fail khi HTTP khác 200, có console error hoặc horizontal overflow. Screenshot local nằm trong `artifacts/phase02` và không commit.

## Known limitations

- Bốn ảnh reference nêu trong brief không có trong attachment nhận được; implementation bám mô tả art direction thay vì đối chiếu pixel/reference trực tiếp.
- Meme/GIF hiện là SVG mock, chưa phải media thật.
- Các state join/waiting/voting/result được đại diện qua component/showcase; chưa có backend/state machine để điều hướng tới từng state.
- Không thêm font, media hoặc dependency ngoài.
