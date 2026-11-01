# Chiến lược kiểm thử

## Tầng kiểm thử

- Unit (Vitest): Zod contract, phase transition, eligibility, scoring, tie-break, timer math.
- Worker integration (`@cloudflare/vitest-pool-workers`): Hono route, D1 constraint, Durable Object command/idempotency, WebSocket reconnect.
- Component: tương tác form, focus, reduced motion và trạng thái lỗi.
- E2E (Playwright): player mobile Chrome/Safari emulation, admin desktop, projector display.

## Quality gate

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Không dùng snapshot khổng lồ cho game state. Test theo behavior và invariant. Timer test dùng fake clock ở unit/integration; chỉ vài E2E kiểm tra đồng hồ thật.

## Journey bắt buộc trước production

1. Admin login/tạo phòng; 2 player join và reconnect không nhân bản.
2. Talent round: submit → reveal → talent winner → result.
3. Community round: submit → anonymous reveal → self-vote bị chặn → duplicate vote bị chặn → deterministic winner.
4. Client refresh ở từng phase nhận đúng snapshot/version.
5. Admin pause/resume/retry sau lỗi persistence mô phỏng.
6. Keyboard-only admin, screen-reader labels cơ bản và reduced-motion.
7. 50 WebSocket connection có heartbeat/reconnect hợp lý và không broadcast secret/private state.

## Phase 01

Có unit test mẫu cho shared contract. Môi trường tạo code hiện tại không có Node/pnpm nên chưa cài dependency hoặc chạy test/build; đây là giới hạn đã ghi trong `progress.md`.
