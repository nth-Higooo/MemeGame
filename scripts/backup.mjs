import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, mkdtemp, readdir, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";
import { preflight, productionFile, wrangler } from "./production-lib.mjs";
import {
  assetBackupSchema,
  backupManifestSchema,
  decryptArchive,
  encryptArchive,
  readManifest,
  validateArchiveListing,
} from "./backup-lib.mjs";

function command(binary, args, capture = false) {
  return new Promise((done, reject) => {
    const child = spawn(binary, args, {
      shell: false,
      stdio: ["ignore", capture ? "pipe" : "ignore", "ignore"],
    });
    let text = "";
    if (capture)
      child.stdout.on("data", (chunk) => {
        text += chunk;
      });
    child.on("error", () => reject(new Error(`Required command unavailable: ${binary}`)));
    child.on("close", (code) =>
      code === 0 ? done(text) : reject(new Error(`${binary} failed; no cloud restore attempted`)),
    );
  });
}
async function hash(path) {
  const sha = createHash("sha256");
  for await (const chunk of createReadStream(path)) sha.update(chunk);
  return sha.digest("hex");
}
async function privateTemp() {
  const path = await mkdtemp(join(tmpdir(), "misthy-backup-"));
  if (process.platform === "win32")
    await command("icacls", [
      path,
      "/inheritance:r",
      "/grant:r",
      `${userInfo().username}:(OI)(CI)F`,
    ]);
  else await chmod(path, 0o700);
  return path;
}
async function cleanup(path) {
  // Validate the final absolute path before any recursive delete on Windows or Ubuntu.
  const target = resolve(path);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("misthy-backup-"))
    throw new Error("Unsafe temporary cleanup refused");
  await rm(target, { recursive: true, force: true });
}
const queryResponse = z
  .array(
    z.object({ success: z.literal(true), results: z.array(z.record(z.string(), z.unknown())) }),
  )
  .min(1);
async function query(sql) {
  const raw = await wrangler(
    ["d1", "execute", "DB", "--remote", "--config", productionFile, "--json", "--command", sql],
    { capture: true },
  );
  return queryResponse.parse(JSON.parse(raw)).flatMap((item) => item.results);
}
async function rows(table, columns) {
  const all = [];
  let last = "";
  do {
    const batch = await query(
      `SELECT ${columns} FROM ${table} ${last ? `WHERE id>'${last}'` : ""} ORDER BY id LIMIT 100`,
    );
    all.push(...batch);
    if (all.length > 5000)
      throw new Error("Backup row cap reached; plan a separate archival export");
    if (batch.length < 100) return all;
    last = z.uuid().parse(batch.at(-1).id);
  } while (last);
  return all;
}
async function create(output, passphrase) {
  if (process.env.BACKUP_EVENT_QUIESCENT !== "true")
    throw new Error(
      "Pause/finish sessions and freeze CMS writes; set BACKUP_EVENT_QUIESCENT=true only after doing so",
    );
  const config = await preflight();
  const scratch = await privateTemp();
  try {
    await mkdir(join(scratch, "media"));
    const assets = z
      .array(assetBackupSchema)
      .parse(
        (await rows("meme_assets", "id,object_key,content_type,byte_size")).filter(
          (asset) => asset.object_key !== null,
        ),
      );
    if (assets.length > 250 || assets.reduce((sum, asset) => sum + asset.byte_size, 0) > 1024 ** 3)
      throw new Error(
        "Backup safety cap: 250 assets / 1 GiB; split content with an operator-reviewed process",
      );
    await wrangler(
      [
        "d1",
        "export",
        "DB",
        "--remote",
        "--config",
        productionFile,
        "--output",
        join(scratch, "database.sql"),
      ],
      { capture: true },
    );
    const resultTables = {
      sessions: "id,code,name,status,default_mode,created_at,finished_at",
      rounds: "id,session_id,round_number,mode,prompt,winner_submission_id,completed_at",
      players: "id,session_id,display_name,score",
      submissions: "id,round_id,player_id,meme_asset_id,submitted_at",
      votes: "id,round_id,voter_player_id,submission_id,created_at",
      score_events: "id,session_id,round_id,player_id,points,reason,metadata_json",
    };
    const results = {};
    for (const [table, columns] of Object.entries(resultTables))
      results[table] = await rows(table, columns);
    await writeFile(
      join(scratch, "results.json"),
      JSON.stringify({ schemaVersion: 1, ...results }, null, 2),
      { mode: 0o600 },
    );
    const verifiedAssets = [];
    for (const asset of assets) {
      const file = join(scratch, "media", `${asset.id}.bin`);
      await wrangler(
        [
          "r2",
          "object",
          "get",
          `${config.r2_buckets[0].bucket_name}/${asset.object_key}`,
          "--remote",
          "--config",
          productionFile,
          "--file",
          file,
        ],
        { capture: true },
      );
      if ((await stat(file)).size !== asset.byte_size)
        throw new Error("Asset size mismatch; backup stopped");
      verifiedAssets.push({ ...asset, sha256: await hash(file) });
    }
    const manifest = backupManifestSchema.parse({
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      worker: config.name,
      databaseId: config.d1_databases[0].database_id,
      databaseSha256: await hash(join(scratch, "database.sql")),
      resultsSha256: await hash(join(scratch, "results.json")),
      assets: verifiedAssets,
    });
    await writeFile(join(scratch, "manifest.json"), JSON.stringify(manifest, null, 2), {
      mode: 0o600,
    });
    await command("tar", [
      "-cf",
      join(scratch, "archive.tar"),
      "-C",
      scratch,
      "manifest.json",
      "database.sql",
      "results.json",
      "media",
    ]);
    await encryptArchive(join(scratch, "archive.tar"), output, passphrase);
    console.log(
      "Encrypted backup created. Keep it and the passphrase separately; nothing was uploaded or restored.",
    );
  } finally {
    await cleanup(scratch);
  }
}
async function unpack(input, destination, passphrase) {
  const output = resolve(destination);
  // A fresh directory prevents overwriting developer files; authentication finishes before extraction.
  await mkdir(output, { mode: 0o700 });
  const scratch = await privateTemp();
  try {
    const archive = join(scratch, "archive.tar");
    await decryptArchive(input, archive, passphrase);
    const listing = await command("tar", ["-tf", archive], true);
    validateArchiveListing(listing);
    const details = await command("tar", ["-tvf", archive], true);
    if (
      details
        .split(/\r?\n/)
        .filter(Boolean)
        .some((line) => !["-", "d"].includes(line[0]))
    )
      throw new Error("Archive links or special files refused");
    await command("tar", ["-xf", archive, "-C", scratch]);
    const manifest = await readManifest(join(scratch, "manifest.json"));
    if (
      (await hash(join(scratch, "database.sql"))) !== manifest.databaseSha256 ||
      (await hash(join(scratch, "results.json"))) !== manifest.resultsSha256
    )
      throw new Error("Backup checksum mismatch");
    for (const asset of manifest.assets)
      if ((await hash(join(scratch, "media", `${asset.id}.bin`))) !== asset.sha256)
        throw new Error("Media checksum mismatch");
    const expectedMedia = new Set(manifest.assets.map((asset) => `${asset.id}.bin`));
    if ((await readdir(join(scratch, "media"))).some((name) => !expectedMedia.has(name)))
      throw new Error("Unexpected media file");
    if (process.platform === "win32")
      await command("icacls", [
        output,
        "/inheritance:r",
        "/grant:r",
        `${userInfo().username}:(OI)(CI)F`,
      ]);
    await command("tar", ["-xf", archive, "-C", output]);
    console.log(
      "Backup authenticated, checksummed and unpacked locally. Cloud data was not changed. Follow docs/backup-and-restore.md.",
    );
  } catch (error) {
    await rmdir(output).catch(() => {});
    throw error;
  } finally {
    await cleanup(scratch);
  }
}
async function main() {
  const [action, first, second] = process.argv.slice(2);
  const passphrase = process.env.BACKUP_PASSPHRASE;
  if (typeof passphrase !== "string" || passphrase.length < 20)
    throw new Error(
      "Set BACKUP_PASSPHRASE securely (20+ characters); never put it in command-line arguments",
    );
  if (action === "create" && first && !second) return create(resolve(first), passphrase);
  if (action === "unpack" && first && second)
    return unpack(resolve(first), resolve(second), passphrase);
  throw new Error(
    "Usage: backup.mjs create <new-file.enc> | unpack <file.enc> <new-private-directory>",
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backup operation failed");
  process.exitCode = 1;
});
