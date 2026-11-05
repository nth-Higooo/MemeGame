# Dreamy Peachy Cosmic × Pink Glass UI

## Art direction

The 2026-11-05 visual follow-up rebalances the Phase 02 celestial identity toward
**Dreamy Peachy Cosmic × Pink Glass UI**. Berry, pink, blush, caramel and jasmine
lead; Protocol Noir anchors the Display/Admin and lavender supports reflections.
The supplied references inform pink glass, four-point stars and holographic ovals.
The scoped plan and implementation phases are in [peachy-theme.md](peachy-theme.md).

Glass stays restrained on navigation, action bars, dialogs and panels. Prompts and
media use readable, near-opaque surfaces. Player/Home have a blush canvas; Display,
Admin, Judge, CMS and authentication use midnight with warm reflected light.

## Historical Phase 02 audit

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

| Token                  | Value     | Role                                         |
| ---------------------- | --------- | -------------------------------------------- |
| `--bg-deep`            | `#171836` | Protocol Noir, stage/Admin depth             |
| `--bg-cosmic-plum`     | `#352039` | Warm shadow and cosmic base                  |
| `--bg-warm-glow`       | `#FBE0E0` | Soft Blush, Player atmosphere                |
| `--accent-berry`       | `#D5306D` | Berry Lipstick, primary actions/selection    |
| `--accent-pink`        | `#FF92C1` | Pink Mist, light bloom/dark-surface emphasis |
| `--accent-peach`       | `#EEB17D` | Light Caramel, reflection/winner glow        |
| `--accent-jasmine`     | `#EFD47A` | Jasmine, stars and highlighted status        |
| `--accent-lavender`    | `#A775C9` | Bright Lavender, secondary reflection        |
| `--accent-flucberry`   | `#BB53CF` | Supporting violet swatch                     |
| `--accent-blossom`     | `#F9A1F8` | Supporting illustration pink                 |
| `--accent-light-peach` | `#FEDBAD` | Light Peach, holographic border              |
| `--accent-honeydew`    | `#EAF7EC` | Supporting mint illustration                 |

Semantic ink: `--ink-strong`, `--ink-body`, `--ink-muted`, `--accent-ink`.
Berry text uses a darker `#A32353` on light surfaces. White-label primary actions
use `#BA235B → #D5306D`, darkening on hover; pink/peach remain highlights, not
low-contrast button labels. Keyboard focus has an opaque outline plus a soft halo.

Glass: `--glass-light` (`rgba(251,224,224,.55)`), `--glass-pink`, `--glass-peach`,
`--glass-dark`. Borders/glows: `--border-soft`, `--border-control`, `--border-card`,
`--glow-pink`, `--glow-peach`, `--glow-gold`. `--holographic` combines pink, peach
and lavender. Existing named tokens remain aliases so older consumers inherit
the palette without changes to component APIs. `.theme-dark` and
`.presentation-shell` scope readable light ink and opaque dark content surfaces.

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

1. **Solid** — warm cream `#FFF5EF`; dark roles use `#2D2032`.
2. **Soft** — blush grouping; dark roles use warm plum `#3D2A3B`.
3. **Frosted/clear** — blush glass for floating controls; dark glass for operators.
4. **Pink/peach** — warm reflections over a readable solid base for highlights/results.
5. **Dark** — reusable `GlassCard variant="dark"` scopes light ink and dark surfaces.

`prefers-reduced-transparency` and `prefers-contrast: more` use opaque reading
surfaces, remove backdrop blur and hide haze/orbits/grain. Dialogs inherit their
role's tokens. QR codes keep their white backing and media receives no color tint.

## Component inventory

Phase 08 adds `OperatorMedia({ src, alt })` for fixed-size Admin/Judge image slots, decode failure/retry and explicit GIF playback under reduced motion. Player media keeps a stable aspect ratio, retries fetch/decode failures and releases blob URLs outside the near-viewport window. These states reuse the same 44 px controls and Vietnamese locale catalog; no new color or motion token is required. Browser checks cover keyboard join, reduced-motion opt-in, 320 px overflow and offscreen reload; a full screen-reader/contrast audit remains on the Event Day checklist.

| Component                                                              | Vai trò                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `CelestialBackground`                                                  | Existing cosmic background: light/stage, warm haze, stars, ovals, grain |
| `DecorativeCloud`, `DecorativeSparkle`                                 | SVG illustration primitives                                             |
| `GlassCard`                                                            | Semantic solid/soft/frosted/clear surface                               |
| `GlassButton`, `GlassBadge`, `GlassInput`, `GlassModal`, `GlassNavbar` | Shared controls và floating layers                                      |
| `QuestionCard`                                                         | Focal prompt không dùng glass                                           |
| `CountdownTimer`                                                       | Compact/stage circular game timer                                       |
| `ConnectionIndicator`                                                  | Connected/offline semantic status                                       |
| `FloatingActionBar`                                                    | Mobile safe-area submit action                                          |
| `MemeCard`, `MemeGrid`                                                 | Vector mock media, caption, selection state                             |
| `FeedbackState`                                                        | Loading/empty/error/disconnected                                        |

Home/showcase illustrations are six internal SVG variants using palette tokens.
Live pages retain the existing R2 media lifecycle; no media transformations,
external image dependencies or network behavior are introduced by this theme.

## Illustration guidelines

- Clouds retain the established silhouette with blush highlights and pink shadows.
- Four-point sparkles use jasmine/blush; tiny gold stars have a restrained halo.
- Static holographic ovals echo the reference. Large pink/peach light fields and
  a small jasmine reflection keep the night scene layered rather than flat orange.
- Mỗi scene chỉ có vài cluster ở mép composition; không đặt sau câu hỏi/control quan trọng.
- Meme illustration dùng palette theo token, shape đơn giản và đường viền indigo thấp.
- Lucide chỉ dùng cho utility/action; brand và personality đến từ SVG riêng.

## Motion

- Cloud drift 18 giây, biên độ nhỏ, là ambient loop duy nhất.
- Hover/selection 160–180 ms, dịch chuyển tối đa 2 px.
- Press feedback scale 0.98.
- `prefers-reduced-motion` removes decorative drift, hover/press movement and
  transitions; winner particles are hidden and media keeps its existing opt-in playback.

## Responsive layouts

### Player

Mobile-first at 320/375/390 px: blush navigation, cream prompt, berry timer/actions,
two-column media grid, holographic selected border and peach/pink result cards.
The sticky submit bar respects safe-area bottom insets. Shared small buttons are
at least 44 px tall; selection never covers the image.

### Display

The live 16:9 stage uses a deep cosmic base, warm blooms, pink room codes,
near-opaque dark progress/media panels, peach/lavender progress accents and
holographic winner/ranking outlines. Existing lobby, reveal carousel, voting,
result, leaderboard, fullscreen and fallback layouts are preserved.

### Admin

The live control workspace, Judge, Content Studio and login use dark glass,
blush text, pink reflections, outlined fields and warm status badges. Existing
forms, controls, audit, Dry Run and confirmation behavior remain intact. No
backend, API/WebSocket, engine or database change is part of the color update.

## Showcase và visual QA

`/dev/design-system` is development-only. It includes Player/Display/Admin
environments, all eleven reference swatches from CSS tokens, seven surface
variants, controls, focus, input, dialog, timer, selection and feedback states.
New theme copy lives in `i18n/theme-vi.ts`.

`pnpm visual:check` kiểm tra:

- Player: 320×568, 375×812, 390×844.
- Display: 1280×720, 1920×1080.
- Admin: 1440×900.
- Showcase: 1440×1000 full page.

Script fail khi HTTP khác 200, có console error hoặc horizontal overflow. Screenshot local nằm trong `artifacts/phase02` và không commit.

Live visual verification uses the existing Player/Display/Admin journeys against
local Wrangler, with screenshots in `artifacts/phase05`, `phase06`, `phase07`.
Supplemental theme screenshots and browser inspection are in ignored
`artifacts/peachy-theme`. See `progress.md` for exact results and limitations.

## Known limitations

- Physical mobile devices/projectors and venue lighting remain unverified.
- Original tiny GIF fixtures establish layout/behavior, not production-media quality.
- No external fonts, generated bitmap assets or dependencies were added.
- Historical mock-only layout selectors remain in the stylesheet; live role pages
  and the development showcase are the current styling reference.
