# Backup and restore

The backup command makes an **encrypted, local archive** of a quiescent event: D1 SQL, a separate JSON export of game results, and the R2 media referenced by D1. It verifies media byte counts and SHA-256 hashes, then encrypts the tar archive with AES-256-GCM. The encryption key is derived from a passphrase with scrypt. The passphrase is not stored in the archive.

The archive contains private data, including account/player names, session history, and password/session hashes from the SQL export. Treat it as sensitive. Store it outside the repository, restrict access, and store the passphrase separately in a password manager. The `.gitignore` excludes common backup files, but that does not replace access controls.

## Create an encrypted backup

Prerequisites: Wrangler authenticated to the production account; production config IDs populated; Cloudflare Free plan and R2 activation already authorized; D1 and R2 accessible; `tar` available. Freeze CMS writes and finish or pause all live rounds first. The script refuses to proceed unless `BACKUP_EVENT_QUIESCENT=true` is set.

PowerShell:

```powershell
$env:CLOUDFLARE_FREE_PLAN_CONFIRMED = "true"
$env:CLOUDFLARE_R2_ALREADY_ENABLED = "true"
$env:BACKUP_EVENT_QUIESCENT = "true"
$secure = Read-Host "Backup passphrase (20+ characters; use a password manager)" -AsSecureString
$env:BACKUP_PASSPHRASE = [System.Net.NetworkCredential]::new("", $secure).Password
pnpm backup create D:\secure-backups\misthy-event-2026-11-05.misthy.enc
Remove-Item Env:\BACKUP_PASSPHRASE
Remove-Item Env:\BACKUP_EVENT_QUIESCENT
```

Ubuntu:

```bash
export CLOUDFLARE_FREE_PLAN_CONFIRMED=true
export CLOUDFLARE_R2_ALREADY_ENABLED=true
export BACKUP_EVENT_QUIESCENT=true
read -rsp 'Backup passphrase (20+ characters): ' BACKUP_PASSPHRASE; echo
export BACKUP_PASSPHRASE
pnpm backup create /secure/backups/misthy-event-2026-11-05.misthy.enc
unset BACKUP_PASSPHRASE BACKUP_EVENT_QUIESCENT
```

Keep the passphrase out of command arguments, terminal recordings, CI logs, and chat. The passphrase is briefly present in the current process environment; prefer an isolated, trusted operator machine. The current implementation caps backup collection at 250 media objects/1 GiB and 5,000 records per paged result table. Larger events need a separately reviewed export procedure. Backups are not automatically uploaded anywhere.

## Authenticate and inspect locally

Restore/unpack never writes to Cloudflare. Choose a new empty output directory and provide the same passphrase.

PowerShell:

```powershell
$secure = Read-Host "Backup passphrase" -AsSecureString
$env:BACKUP_PASSPHRASE = [System.Net.NetworkCredential]::new("", $secure).Password
pnpm backup unpack D:\secure-backups\misthy-event-2026-11-05.misthy.enc D:\secure-recovery\misthy-event-2026-11-05
Remove-Item Env:\BACKUP_PASSPHRASE
```

Ubuntu:

```bash
read -rsp 'Backup passphrase: ' BACKUP_PASSPHRASE; echo
export BACKUP_PASSPHRASE
pnpm backup unpack /secure/backups/misthy-event-2026-11-05.misthy.enc /secure/recovery/misthy-event-2026-11-05
unset BACKUP_PASSPHRASE
```

The command authenticates the encrypted bytes before extraction, rejects unsafe archive entries/special files, checks the manifest and file hashes, and refuses to overwrite an existing output directory. Confirm `manifest.json`, `database.sql`, `results.json`, and `media/` exist. Keep this recovered copy private.

## Restore procedure (operator-reviewed, not automated)

There is deliberately no command that pushes this archive into a live D1/R2. A restore can discard newer gameplay records, break object references, or conflict with active Durable Object checkpoints. Never import the SQL into a live database as a quick fix.

For an actual disaster recovery:

1. Stop event writes and preserve a copy of the affected database/bucket before changing anything. Record the incident and current Worker deployment.
2. Unpack and verify the archive locally. Confirm its manifest worker/database IDs, creation time, asset list, hashes, and result counts with a second operator.
3. Create an isolated recovery D1 database and R2 bucket only after the account owner approves any resource/billing effects. Use an isolated Worker configuration, not the production bindings.
4. Inspect the archived `database.sql` and `results.json`; check Wrangler's current D1 import/export behavior and run the import into the empty recovery database. Reapply neither an old migration nor the full SQL over a non-empty database. Confirm migration table state and all foreign-key references.
5. Upload each file from `media/<asset-id>.bin` to its exact `object_key` from `manifest.json`, preserving the MIME type. For example, use `wrangler r2 object put <recovery-bucket>/<object_key> --file <path> --content-type <type> --remote`. Verify object count and downloaded byte hashes. Keep the bucket private.
6. Deploy a recovery Worker against only the isolated recovery resources. Verify Admin login, media preview, session/round/submission/vote/score counts, and reconnect behavior. Durable Object SQLite state is reconstructed from the D1 checkpoint/recovery logic; this archive does **not** export a separate DO storage image. Test room recovery before returning traffic.
7. Have the event owner explicitly choose whether to promote recovery resources or continue with a new clean event. Update bindings/secrets through the reviewed deployment process; preserve the original account data until recovery is accepted.

If a D1 restore or Cloudflare import is required during a live event, stop and involve an experienced Cloudflare operator. This project's scripts authenticate and unpack only; they do not claim an end-to-end cloud restore has been tested.
