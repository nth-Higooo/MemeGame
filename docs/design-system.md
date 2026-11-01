# Liquid Celebration Design System

## Tinh thần

“Liquid Celebration” kết hợp hierarchy của Apple Liquid Glass với năng lượng pastel của một buổi party. Glass là lớp chức năng nổi dành cho navigation, control và modal; câu hỏi, bảng dữ liệu và GIF thuộc content layer rõ nét. Không xếp quá hai lớp glass và không dùng blur để che nội dung khó đọc.

Các nguyên tắc:

- Premium nhưng thân thiện: ánh sáng mềm, ít màu bão hòa cùng lúc, chữ tím đậm thay cho đen tuyệt đối.
- Control nổi, content rõ: navbar/button có glass; meme art và prompt dùng bề mặt solid hoặc gần-opaque.
- Shape đồng tâm: card 22–36 px, control pill, khoảng cách trong card theo cùng độ cong.
- Motion có mục đích: entrance, press và selection ngắn; không có animation trang trí gây mất tập trung.
- Accessibility là fallback thật: reduced motion, reduced transparency, increased contrast, focus ring và tín hiệu selection không chỉ dựa vào màu.

## Design tokens

Token nguồn nằm ở `apps/web/src/styles.css`.

### Màu

| Token                     | Giá trị        | Vai trò                        |
| ------------------------- | -------------- | ------------------------------ |
| `--ink-strong`            | `#28173a`      | Heading và nội dung quan trọng |
| `--ink-body`              | `#4f3d61`      | Body text                      |
| `--violet-600`            | `#7650c4`      | Primary brand/action           |
| `--pink-500`              | `#d95f9f`      | Celebration accent             |
| Lavender 50–600           | Tailwind theme | Surface, selection và focus    |
| Petal, mint, peach, cream | Tailwind theme | Status và ambient background   |

Surface semantic gồm `--surface-regular`, `--surface-subtle`, `--surface-solid`, `--surface-clear`. `solid` dành cho nội dung cần đọc lâu; `clear` chỉ dùng cho control ngắn trên nền đủ ổn định.

### Typography

Font stack ưu tiên Avenir Next, SF Pro Display, Segoe UI Variable và system UI; không tải font ngoài. Heading dùng weight 800–900, tracking âm nhẹ. Body tối thiểu 14 px trên player, line-height 1.5. Display dùng `clamp()` để giữ tỷ lệ từ laptop đến projector.

### Spacing, radius và touch

- Nhịp spacing cơ sở: 4 px; khoảng cách component thường 8/12/16/24/32 px.
- `--radius-sm`: 16 px; `--radius-md`: 22 px; `--radius-lg`: 28 px; `--radius-xl`: 36 px.
- `--size-touch`: 44 px, dùng cho mọi control tương tác chính.
- Player giữ chiều rộng tối thiểu 320 px và dùng safe-area cho top/bottom controls.

### Shadow và glass

- `--shadow-control`: elevation thấp cho input/button.
- `--shadow-nav`: elevation vừa cho navigation và bottom action bar.
- `--shadow-card`: card content.
- `--shadow-action` / `--shadow-action-hover`: CTA nổi bật.

Glass surface gồm màu nền bán trong, border highlight, luminosity gradient và blur+saturation có kiểm soát. `prefers-reduced-transparency` đổi các surface thành opaque và bỏ backdrop blur.

### Motion

`--ease-spring` mô phỏng spring có damping, dùng cho press/hover/selection. Ambient drift chạy chậm và bị vô hiệu hóa bởi `prefers-reduced-motion`. Interaction thông thường 180–240 ms; không dùng loop ngoài ambient background.

## Component inventory

| Component           | File                                | Dùng cho                                        |
| ------------------- | ----------------------------------- | ----------------------------------------------- |
| `GlassCard`         | `components/glass-card.tsx`         | Regular/subtle/solid/clear content surface      |
| `GlassButton`       | `components/glass-button.tsx`       | Primary, glass, soft, ghost, danger actions     |
| `GlassModal`        | `components/glass-modal.tsx`        | Native dialog với backdrop và accessible labels |
| `GlassNavbar`       | `components/glass-navbar.tsx`       | Floating navigation layer                       |
| `GlassInput`        | `components/glass-input.tsx`        | Labeled input, icon và hint                     |
| `GlassBadge`        | `components/glass-badge.tsx`        | Status có text và semantic tone                 |
| `MemeCard`          | `components/meme-card.tsx`          | GIF thumbnail, metadata và selection state      |
| `FeedbackState`     | `components/feedback-state.tsx`     | Loading, empty, error, disconnected             |
| `AmbientBackground` | `components/ambient-background.tsx` | Pastel light field dùng chung                   |

Component cơ sở theo cách tổ chức shadcn/ui: source nằm trong repo, variants dùng CVA, composition dùng Radix Slot. `components/ui/button.tsx` re-export `GlassButton` để giữ compatibility với shadcn CLI.

## Layout theo interface

- Player: một cột tối đa 576 px, meme grid hai cột, filter cuộn ngang, action bar cố định ngoài animated content tree và có safe-area padding. Đã kiểm tra ở viewport 320×700.
- Display: canvas fullscreen, grid 1.12/0.88 ở widescreen, type bằng `clamp`, footer tối giản. Đã kiểm tra 1600×900.
- Admin: sidebar 248 px từ desktop; tablet/mobile ẩn sidebar và giữ floating header. Dashboard dùng density vừa phải, không phóng đại statistic card.

## Showcase và visual QA

Trong Vite development, mở `/dev/design-system`. Route này bị loại khỏi routing production bằng `import.meta.env.DEV`.

Chạy visual QA bằng Chrome/Chromium đã cài hoặc Playwright browser:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome pnpm visual:check
```

Ảnh kiểm tra được ghi vào `artifacts/phase02` và không commit. Script kiểm tra HTTP status, console errors và horizontal overflow cho player, display, admin và showcase.

## Localization

Locale catalog có type nằm trong `apps/web/src/i18n`; `vi` là mặc định. Mock content của Phase 02 được tách tại `src/data/mock-data.ts`. Trước khi công bố locale thứ hai, chuyển toàn bộ copy chi tiết còn lại vào catalog cùng shape và thêm locale vào `supportedLocales`.
