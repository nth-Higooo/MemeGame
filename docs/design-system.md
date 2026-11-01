# Design system

## Tinh thần

“Liquid celebration”: sáng, mềm và có chiều sâu như vật liệu kính, nhưng cấu trúc rõ ràng cho một game show. Bề mặt kính chỉ dùng cho navigation, panel và control nổi; nền, chữ và hierarchy không phụ thuộc blur.

## Token hình ảnh

- Lavender: màu thương hiệu và primary action.
- Soft pink/fuchsia: năng lượng, accent và trạng thái nổi bật.
- Mint: connected/success.
- Peach/cream: ánh sáng nền và cảm giác sinh nhật.
- Ink violet: nội dung chính, thay vì đen tuyệt đối.

Glass surface gồm ba lớp: nền trắng bán trong, viền highlight trắng và shadow tím xám mềm. Góc chính 24–32 px; pill dùng full radius. Không xếp quá hai lớp glass để tránh nhiễu thị giác.

## Typography và spacing

Font stack hiện tại ưu tiên Avenir Next/Segoe UI Variable/system để không tải font ngoài. Heading dùng trọng lượng 800–900 và tracking âm; body line-height tối thiểu 1.5. Spacing theo nhịp 4 px, vùng nội dung dùng khoảng thở 24–80 px tùy viewport.

## Motion

Motion dùng spring cho page entrance, lựa chọn meme và reveal. Chuyển động phải truyền đạt thay đổi state, không chạy vô hạn để trang trí. `prefers-reduced-motion` tắt gần như toàn bộ animation/transition; thông tin không được chỉ thể hiện bằng chuyển động.

## Theo interface

- Player: một cột, CTA trong tầm ngón cái, safe-area, card meme hai cột, không hover-dependent.
- Display: chữ lớn, vùng an toàn projector, ít control, nhìn rõ từ xa và ưu tiên 16:9.
- Admin: dashboard density vừa phải, trạng thái/primary action luôn rõ, dùng tốt ở tablet landscape.

## Accessibility

Touch target ≥44 px, focus ring rõ, icon trang trí có `aria-hidden`, status có text, không dùng màu làm tín hiệu duy nhất. GIF cần alt/label và tùy chọn giảm animation ở phase media. Contrast phải kiểm tra bằng automated + manual test trước production.

Component nền tảng theo cách tổ chức shadcn/ui: source nằm trong repo, biến thể qua CVA, composition qua Radix Slot. Phase 01 có `Button`; các phase sau bổ sung Dialog, Input, Toast, Tabs và AlertDialog khi thực sự cần.

Locale catalog có type nằm trong `apps/web/src/i18n`. `vi` là locale mặc định; thêm ngôn ngữ mới bằng catalog cùng shape rồi đưa vào `supportedLocales`. Phase sau tiếp tục chuyển copy chi tiết ra khỏi component trước khi công bố locale thứ hai.
