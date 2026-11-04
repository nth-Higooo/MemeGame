import { describe, expect, it } from "vitest";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  productionConfigSchema,
  formatProductionFailure,
  requireFreeTierAcknowledgement,
} from "../../scripts/production-lib.mjs";
import {
  decryptArchive,
  encryptArchive,
  validateArchiveListing,
} from "../../scripts/backup-lib.mjs";

async function removeTestDirectory(directory: string, prefix: string) {
  const absolute = resolve(directory);
  if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith(prefix))
    throw new Error("Unsafe test cleanup refused");
  await rm(absolute, { recursive: true, force: true });
}

describe("production safeguards", () => {
  it("unpacks a genuine authenticated tar backup locally and verifies all files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "misthy-restore-test-"));
    try {
      const sql = "-- original local fixture\n",
        results = '{"schemaVersion":1}';
      const sha = (value: string) => createHash("sha256").update(value).digest("hex");
      const manifest = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        worker: "misthy-meme-party-test",
        databaseId: "10000000-0000-4000-8000-000000000001",
        databaseSha256: sha(sql),
        resultsSha256: sha(results),
        assets: [],
      };
      const { mkdir } = await import("node:fs/promises");
      await mkdir(join(directory, "media"));
      await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest));
      await writeFile(join(directory, "database.sql"), sql);
      await writeFile(join(directory, "results.json"), results);
      expect(
        spawnSync("tar", [
          "-cf",
          join(directory, "archive.tar"),
          "-C",
          directory,
          "manifest.json",
          "database.sql",
          "results.json",
          "media",
        ]).status,
      ).toBe(0);
      const passphrase = "test-only-authenticated-restore-passphrase";
      await encryptArchive(
        join(directory, "archive.tar"),
        join(directory, "archive.enc"),
        passphrase,
      );
      const child = spawnSync(
        process.execPath,
        [
          "scripts/backup.mjs",
          "unpack",
          join(directory, "archive.enc"),
          join(directory, "restored"),
        ],
        { env: { ...process.env, BACKUP_PASSPHRASE: passphrase }, encoding: "utf8" },
      );
      expect(child.status, child.stderr).toBe(0);
      expect(await readFile(join(directory, "restored", "database.sql"), "utf8")).toBe(sql);
      expect(await readFile(join(directory, "restored", "results.json"), "utf8")).toBe(results);
    } finally {
      await removeTestDirectory(directory, "misthy-restore-test-");
    }
  });
  it("refuses unconfigured production IDs and unsafe routing/storage", async () => {
    const template = JSON.parse(await readFile("apps/worker/wrangler.production.json", "utf8"));
    const target = {
      ...template,
      account_id: "1".repeat(32),
      d1_databases: [
        { ...template.d1_databases[0], database_id: "10000000-0000-4000-8000-000000000001" },
      ],
    };
    expect(productionConfigSchema.safeParse(target).success).toBe(true);
    expect(
      productionConfigSchema.safeParse({ ...target, account_id: "0".repeat(32) }).success,
    ).toBe(false);
    expect(
      productionConfigSchema.safeParse({
        ...target,
        assets: { ...target.assets, run_worker_first: [] },
      }).success,
    ).toBe(false);
    expect(
      productionConfigSchema.safeParse({
        ...target,
        exports: { GameSession: { type: "durable-object", storage: "kv" } },
      }).success,
    ).toBe(false);
  });
  it("requires an explicit existing R2 and free-plan attestation", () => {
    expect(() => requireFreeTierAcknowledgement({})).toThrow(/Stop/);
    expect(() =>
      requireFreeTierAcknowledgement({ CLOUDFLARE_FREE_PLAN_CONFIRMED: "true" }),
    ).toThrow(/Stop/);
    expect(() =>
      requireFreeTierAcknowledgement({
        CLOUDFLARE_FREE_PLAN_CONFIRMED: "true",
        CLOUDFLARE_R2_ALREADY_ENABLED: "true",
      }),
    ).not.toThrow();
  });
  it("shows a safe actionable preflight reason without leaking raw diagnostics", () => {
    expect(formatProductionFailure(new Error("Wrangler r2 bucket failed (exit 1)"))).toMatch(
      /R2 preflight failed.*activated.*Dashboard/,
    );
    expect(formatProductionFailure(new Error("Stop: verify Workers Free"))).toContain(
      "verify Workers Free",
    );
    const invalidConfig = new Error('invalid account_id "sensitive diagnostic detail"');
    invalidConfig.name = "ZodError";
    expect(formatProductionFailure(invalidConfig)).not.toContain("sensitive diagnostic detail");
    expect(formatProductionFailure(invalidConfig)).toMatch(/production:check/);
  });
  it("rejects missing, duplicate and path-traversal archive entries", () => {
    const safe =
      "manifest.json\ndatabase.sql\nresults.json\nmedia/\nmedia/10000000-0000-4000-8000-000000000001.bin\n";
    expect(validateArchiveListing(safe)).toHaveLength(5);
    expect(() => validateArchiveListing(`${safe}../secret\n`)).toThrow();
    expect(() => validateArchiveListing(`${safe}database.sql\n`)).toThrow();
    expect(() => validateArchiveListing("database.sql\n")).toThrow();
  });
  it("authenticates encrypted backups and refuses tampering, wrong passwords and overwrite", async () => {
    const directory = await mkdtemp(join(tmpdir(), "misthy-crypto-test-"));
    try {
      const source = join(directory, "source"),
        encrypted = join(directory, "backup.enc"),
        restored = join(directory, "restored");
      const passphrase = "test-only-long-backup-passphrase";
      await writeFile(source, "private database and original media");
      await encryptArchive(source, encrypted, passphrase);
      expect((await readFile(encrypted)).includes(Buffer.from("private database"))).toBe(false);
      await expect(encryptArchive(source, encrypted, passphrase)).rejects.toThrow();
      await expect(
        decryptArchive(encrypted, restored, "different-long-test-passphrase"),
      ).rejects.toThrow(/authentication/);
      await decryptArchive(encrypted, restored, passphrase);
      expect(await readFile(restored, "utf8")).toBe("private database and original media");
      const tampered = await readFile(encrypted);
      tampered[tampered.length - 20] ^= 1;
      await writeFile(join(directory, "tampered.enc"), tampered);
      await expect(
        decryptArchive(join(directory, "tampered.enc"), join(directory, "failed"), passphrase),
      ).rejects.toThrow(/authentication/);
    } finally {
      await removeTestDirectory(directory, "misthy-crypto-test-");
    }
  });
});
