# MisThy Meme Party contributor guide

## Read first

Before changing code, read `docs/progress.md`, the relevant requirement/design document, and the closest package README or configuration. Work on one documented phase at a time and preserve unrelated work.

## Repository map

- `apps/web`: React/Vite browser application.
- `apps/worker`: Hono API, Durable Object real-time authority, D1 migrations, and Cloudflare deployment config.
- `packages/shared`: runtime-validated contracts shared by browser and Worker.
- `docs`: product and engineering decisions.
- `tests/e2e`: cross-interface Playwright journeys.

## Engineering rules

- Keep TypeScript strict and avoid `any`.
- Parse every network or persistence boundary with a shared Zod schema.
- The server owns timers, phase transitions, submissions, vote eligibility, and scoring.
- Never expose secrets in `VITE_*`, source files, logs, WebSocket payloads, or client storage.
- D1 stores durable records; Durable Objects serialize live session mutations; R2 stores validated media.
- UI copy is Vietnamese by default. Add copy through the future locale dictionary rather than scattering new strings.
- Respect reduced motion, keyboard navigation, safe-area insets, and minimum 44 px touch targets.
- Add a migration instead of editing an already-deployed migration.

## Quality gate

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant Playwright tests. If a tool is unavailable, record the limitation in `docs/progress.md`; never claim the check passed.
