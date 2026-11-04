# MisThy Meme Party

MisThy Meme Party is a Vietnamese-first, real-time party game. Players submit curated memes for a prompt; a talent or the community picks the winner. The repository contains the React application, Cloudflare Worker/API, Durable Object game engine, D1 migrations, and R2 media integration.

## Requirements

- Node.js 22.13 or newer
- pnpm 10.20.0
- Cloudflare account only for authenticated resource setup/deployment
- Git and (for full E2E) Playwright browsers

## Install and run locally

PowerShell (Windows):

```powershell
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install --frozen-lockfile
Copy-Item .env.example apps/worker/.dev.vars
pnpm db:migrate:local
pnpm dev
```

Ubuntu:

```bash
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install --frozen-lockfile
cp .env.example apps/worker/.dev.vars
pnpm db:migrate:local
pnpm dev
```

Set strong local-only values for `ADMIN_SESSION_SECRET` and `ADMIN_BOOTSTRAP_PASSWORD` in `apps/worker/.dev.vars` before signing in. Do not commit that file. The development server runs Vite at `http://localhost:5173` and Wrangler at `http://localhost:8787`; Vite proxies API and WebSocket requests to Wrangler. Use `pnpm dev:single-origin` to rehearse the bundled single-origin setup at port 8787.

Routes: `/play/ROOMCODE`, `/display/ROOMCODE`, `/admin/ROOMCODE`, and `/judge/ROOMCODE`. The CMS is available from the Admin interface. `/api/health` checks the Worker. Local R2 is simulated by Wrangler.

## Checks and browser tests

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install
pnpm test:e2e
```

Specific real-backend browser journeys: `pnpm test:player`, `pnpm test:display`, `pnpm test:admin`, and `pnpm test:qa`. The bounded QA suite creates 30/50 local browser players; do not point it at a production URL. `pnpm production:rehearse` runs the production Worker profile locally with disposable data. See [testing](docs/testing.md) and [Phase 08 evidence](docs/phase08-qa.md).

## Production deployment

The production config deploys one Worker for static assets and Hono APIs, with one SQLite Durable Object namespace, D1, and private R2. Read [deployment](docs/deployment.md) before using a Cloudflare account. Production configuration and commands do not create or activate billable services automatically. R2 activation currently requires a Cloudflare Dashboard subscription checkout; stop there unless the account owner explicitly completes that step.

The current Phase 09 handover has **not deployed a production Worker**, and there is no verified production URL. Free-tier limits, deployment gates, backup steps, and rollback are in [deployment](docs/deployment.md). Operational guides: [Admin](docs/admin-guide.md), [Player](docs/player-guide.md), [Event Day checklist](docs/event-day-checklist.md), [Troubleshooting](docs/troubleshooting.md), and [Backup and restore](docs/backup-and-restore.md).

## Project documentation

Start with [architecture](docs/architecture.md), [requirements](docs/requirements.md), [game rules](docs/game-rules.md), [database](docs/database.md), [design system](docs/design-system.md), and [progress](docs/progress.md).
