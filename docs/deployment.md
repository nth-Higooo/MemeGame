# Production deployment (Windows and Ubuntu)

This guide describes the supported single-Worker deployment. The Worker serves the Vite build through Workers Static Assets and routes `/api` and `/ws` through Hono. Production uses a SQLite-backed Durable Object per game session, D1 for durable records and private R2 for images. Wrangler configuration is in `apps/worker/wrangler.production.json`.

## Release status and Cloudflare Free plan

The operator has activated R2, confirmed the existing D1 database and bucket are accessible, and deployed the Worker to a `workers.dev` hostname. Admin bootstrap/login required a PBKDF2 limit fix and the `ADMIN_SESSION_SECRET`; current production acceptance is still pending. This is not a production-readiness claim.

For the current Cloudflare limits, check the account dashboard before each event because limits and plan terms can change. At the time this guide was reviewed, the published Free allowances include:

- Workers: 100,000 requests/day, with a 10 ms CPU limit per request; Static Assets requests are free and unlimited.
- Durable Objects: 100,000 requests/day and 13,000 GB-seconds/day; SQLite reads/writes use the published D1 row allowances, with a 5 GB Free storage allowance. Check current limits, since storage accounting and caps can change.
- D1: 5 million rows read/day, 100,000 rows written/day, and 5 GB total database storage.
- R2 Standard: 10 GB-month storage, 1 million Class A operations/month, 10 million Class B operations/month, and no egress charge within the published free tier.

See Cloudflare's live [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), and [R2 pricing](https://developers.cloudflare.com/r2/pricing/). Exceeding an included allowance can require a paid plan or incur charges under the account's current terms. This project does not enable an upgrade or billing subscription.

**R2 gate:** R2 has a free allowance, but enabling it on an account may require subscription activation/checkout. If Cloudflare shows the R2 activation page, the account owner must review and explicitly complete its Dashboard checkout. This has not been authorized or performed here. Do not attempt to deploy until the owner has done so and confirmed the account's billing terms. No secret, token, or account ID belongs in chat or source control.

## Prerequisites

- Node.js 22.13+, pnpm 10.20.0, and this repository's frozen lockfile.
- A Cloudflare account on the intended account, with Workers Free and R2 activation explicitly authorized.
- A scoped Cloudflare API token usable for Workers, D1, and R2 operations; keep it in the local shell or GitHub Actions secret store only.
- A GitHub repository with `main` protected by pull requests and required CI checks. The production environment is used by both automatic and manual deployment workflows.

Install from a fresh checkout.

PowerShell:

```powershell
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install --frozen-lockfile
pnpm check
pnpm audit --prod --audit-level moderate
```

Ubuntu:

```bash
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install --frozen-lockfile
pnpm check
pnpm audit --prod --audit-level moderate
```

## First-time resource setup

First review Cloudflare's R2 activation terms in the Dashboard. If the account owner declines, stop; this application's current media storage requires R2. This account already has a D1 database named `misthy-meme-db`; do not create a duplicate. The local production binding must point to that database. After R2 activation, use read-only inventory commands first and create only the missing bucket. Resource creation is intentionally a manual action, not part of the scripts/workflow.

PowerShell:

```powershell
pnpm exec wrangler d1 info DB --config apps/worker/wrangler.production.json
pnpm exec wrangler r2 bucket list
```

Ubuntu:

```bash
pnpm exec wrangler d1 info DB --config apps/worker/wrangler.production.json
pnpm exec wrangler r2 bucket list
```

If the R2 list does not contain `misthy-meme-assets`, create it after activation:

```powershell
pnpm exec wrangler r2 bucket create misthy-meme-assets
```

Only for a different/new Cloudflare account with no D1, create a database and use its returned name and UUID. In this account, use the existing `misthy-meme-db` and UUID shown by `wrangler d1 info`. In the same local shell, set the account, database and acknowledgement values; these are not application secrets, but do not commit the generated config:

PowerShell:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = "<account-id>"
$env:CLOUDFLARE_D1_DATABASE_NAME = "misthy-meme-db"
$env:CLOUDFLARE_D1_DATABASE_ID = "<database-uuid>"
$env:CLOUDFLARE_R2_BUCKET = "misthy-meme-assets"
$env:CLOUDFLARE_FREE_PLAN_CONFIRMED = "true"
$env:CLOUDFLARE_R2_ALREADY_ENABLED = "true"
pnpm production:configure
pnpm production:check
```

Ubuntu:

```bash
export CLOUDFLARE_ACCOUNT_ID='<account-id>'
export CLOUDFLARE_D1_DATABASE_NAME='misthy-meme-db'
export CLOUDFLARE_D1_DATABASE_ID='<database-uuid>'
export CLOUDFLARE_R2_BUCKET='misthy-meme-assets'
export CLOUDFLARE_FREE_PLAN_CONFIRMED=true
export CLOUDFLARE_R2_ALREADY_ENABLED=true
pnpm production:configure
pnpm production:check
```

`production:configure` only changes the local production binding file. Review it and keep it out of commits if it contains account-specific IDs. `production:check` validates only that local file; its success does not mean Cloudflare resources exist. `production:preflight` uses read-only Cloudflare commands to confirm existing resources and stops on missing R2/D1 access; it never creates or activates resources. Setting `CLOUDFLARE_R2_ALREADY_ENABLED=true` only acknowledges that the owner already enabled R2; it does not activate R2 or billing.

## Secrets, migrations, and deploy

Then run sequentially from the repository root, after the R2 gate is complete:

```bash
pnpm production:preflight
pnpm exec wrangler d1 migrations list DB --remote --config apps/worker/wrangler.production.json
pnpm production:build
pnpm production:migrate
pnpm production:deploy
```

The migration-list command is read-only. Review it against the database's current schema before continuing: this account's D1 is existing and contains data. If migrations appear unapplied despite the existing tables, stop and inspect migration history; do not apply them blindly. Create and verify an encrypted backup using [backup and restore](backup-and-restore.md) before any migration. Deployment scripts require explicit free-plan and already-enabled-R2 acknowledgements and check existing bindings before applying migrations or publishing. The Worker config declares SQLite Durable Object storage and `/api`, `/api/*`, `/ws`, `/ws/*` worker-first routing. SPA navigation falls back to `index.html`; API and WebSocket paths are not served as HTML.

### Set Admin secrets on the first deployment

For a new Worker, deploy the code first. Then immediately run the following commands and enter each value at Wrangler's hidden prompt. Cloudflare documents that `secret put` creates and deploys a new Worker version, so the Worker must exist first. Until both secrets are set, the site may load but Admin bootstrap/login is unavailable; do not open the room to players.

```powershell
pnpm exec wrangler secret put ADMIN_SESSION_SECRET --config apps/worker/wrangler.production.json
pnpm exec wrangler secret put ADMIN_BOOTSTRAP_PASSWORD --config apps/worker/wrangler.production.json
```

Use strong, unique values stored in a password manager. Never put them in command arguments, `.env`, Wrangler `vars`, `VITE_*`, logs, or source control. Create the first Admin owner with the one-time bootstrap password, then rotate/remove that bootstrap secret. Talent access is provisioned separately in the Admin UI without a password. On later releases, `wrangler secret put` remains available to rotate a secret and creates a Worker version immediately.

After deployment, obtain the generated `workers.dev` URL from the Wrangler output or Dashboard, then run:

```bash
PRODUCTION_BASE_URL='https://<verified-worker>.workers.dev' pnpm production:verify
PRODUCTION_BASE_URL='https://<verified-worker>.workers.dev' pnpm production:acceptance
```

PowerShell equivalent:

```powershell
$env:PRODUCTION_BASE_URL = "https://<verified-worker>.workers.dev"
pnpm production:verify
pnpm production:acceptance
```

The full acceptance suite creates disposable production test records and a test image. Run it only on the intended release Worker after confirming it is safe to create test data; remove the test content afterward. It does not run the 30/50-player load suite against Cloudflare.

## GitHub Actions deployment

`.github/workflows/deploy.yml` deploys automatically on every push to `main` (normally the merge commit) and also supports a guarded manual run. It installs the frozen dependencies, runs `pnpm check` and the dependency audit, configures the local production bindings from GitHub Environment variables, checks remote D1/R2 access, builds the production Worker and deploys it. Automatic deployments **do not apply D1 migrations**. They run a read-only migration check and stop if any migration is pending or Wrangler cannot confirm the database is current. This protects the existing, data-bearing D1 database; use the manual `workflow_dispatch` inputs only after reviewing and backing up before a migration.

In GitHub, open **Settings → Environments → production**. Add these Environment variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_DATABASE_NAME` = `misthy-meme-db`
- `CLOUDFLARE_R2_BUCKET` = `misthy-meme-assets`
- `CLOUDFLARE_FREE_PLAN_CONFIRMED` = `true`
- `CLOUDFLARE_R2_ALREADY_ENABLED` = `true`
- `PRODUCTION_AUTO_DEPLOY_ENABLED` = `true` (arm automatic production deployment after reviewing this workflow)
- `PRODUCTION_APP_SECRETS_READY` = `true` only after `wrangler secret list` confirms `ADMIN_SESSION_SECRET` is present in the Worker. Keep `ADMIN_BOOTSTRAP_PASSWORD` only until first Admin setup, then rotate or remove it as documented above.
- Optional: `PRODUCTION_ORIGIN` = the verified `https://...workers.dev` origin, to run read-only deployment verification after each deploy

Add `CLOUDFLARE_API_TOKEN` as an **Environment secret**, not a variable. Scope it to the Cloudflare account and the minimum Workers deployment, D1 read/info/migration-list, and R2 bucket-info permissions Wrangler requires. Never add `ADMIN_SESSION_SECRET` or `ADMIN_BOOTSTRAP_PASSWORD` to GitHub; those stay as Cloudflare Worker secrets and survive ordinary code deployments.

To have merges deploy without a human approval pause, do not add required reviewers to the `production` environment. Keep `main` protected with pull requests and required checks from `.github/workflows/ci.yml`. The production job is serialized and uses read-only resource checks before publishing. A pending migration stops automatic deployment with an instruction to use the manual workflow after a current encrypted backup and review. The manual workflow still requires all three confirmations, applies migrations, then deploys. Neither path creates resources, activates R2, changes billing, or sets application secrets.

The first automatic run should be a reviewed deployment after the Environment variables and secret are in place. Confirm the Actions run succeeds, then set `PRODUCTION_ORIGIN` and rerun if it was not yet configured. If deployment is not ready, leave `PRODUCTION_AUTO_DEPLOY_ENABLED` unset or false; the workflow will fail before any Cloudflare write.

## Verification and HTTPS

Verify HTTPS and `/api/health`; verify `/play/<code>`, `/display/<code>`, `/admin/<code>` SPA fallback; sign in as Admin; upload and preview an original GIF; create a session; join from a phone; observe display updates and complete each mode. Confirm refresh/reconnect restoration and persisted scores. `production:verify` checks HTTPS, health response shape, SPA routes, API behavior and that protected endpoints reject unauthenticated requests. `production:acceptance` exercises both modes, media and refresh behavior.

Production deployment verification and full event acceptance remain pending. A local Wrangler rehearsal is not evidence of an edge deployment.

## Rollback

Before release, record the deployed Worker version/deployment ID, migration status, and encrypted backup path. To roll back code using the Wrangler deployment history, inspect the deployment list, then roll back the reviewed version:

```bash
pnpm exec wrangler deployments list --name misthy-meme-party-production
pnpm exec wrangler rollback <deployment-id> --name misthy-meme-party-production --config apps/worker/wrangler.production.json --yes
```

Use the same `--config` arguments in PowerShell. Confirm the exact syntax shown by `pnpm exec wrangler rollback --help` for the pinned Wrangler version before operating. A code rollback does not reverse D1 migrations. Prefer a forward fix; restoring D1 is a separate incident procedure documented in [backup and restore](backup-and-restore.md) and must not overwrite a live database without a reviewed recovery plan.

## Quota and cost watch

Before the event, inspect usage/billing in the Cloudflare Dashboard for Workers, Durable Objects, D1, and R2. Recheck after rehearsal and after the event. The 20–50 participant target and local concurrency measurements do not guarantee the production workload stays within free allocations; GIF sizes, repeated media loads, reconnect churn, storage growth, other account workloads, and published plan changes affect usage. Avoid production load tests. Do not enable a paid upgrade without account-owner approval.
