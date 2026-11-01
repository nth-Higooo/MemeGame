# Cloudflare deployment

One Worker serves Hono `/api/*` and `/ws/*` routes plus the Vite bundle through Workers Static Assets. D1, R2, and the SQLite-backed `GameSession` Durable Object are configured in `apps/worker/wrangler.jsonc`.

## Resources

```bash
wrangler login
wrangler d1 create misthy-meme-party
wrangler r2 bucket create misthy-meme-library
```

Replace the placeholder D1 `database_id` in Wrangler config. Use separate preview and production resources.

Copy `.env.example` to `apps/worker/.dev.vars` locally. For production secrets:

```bash
cd apps/worker
wrangler secret put ADMIN_SESSION_SECRET
wrangler secret put ADMIN_BOOTSTRAP_PASSWORD
```

Never expose these values through `VITE_*`. Rotate or remove the bootstrap secret after the first owner exists.

`MAX_UPLOAD_BYTES` is non-secret and defaults to `10485760` (10 MiB). Keep it within current Workers request/memory limits. The API accepts GIF, WebP, PNG, and JPEG only and verifies the declared MIME type plus binary signature.

## Migrate and deploy

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @misthy/worker db:migrate:remote
pnpm deploy
```

Bootstrap the first owner at `/admin/<SESSION_CODE>/content`, or call `POST /api/admin/auth/bootstrap` with `X-Bootstrap-Secret`. Bootstrap returns `409` after an account exists.

R2 is private in Phase 03; authenticated admins stream previews through the Worker. Archiving is the normal removal path. Hard delete is restricted to unreferenced assets and removes D1 metadata and the R2 object. A failed D1 insert after upload triggers compensating R2 deletion.

Rollback application code using Cloudflare deployment versions. Fix D1 schema problems with a reviewed forward migration.
