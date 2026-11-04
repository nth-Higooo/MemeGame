import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, open, readFile, stat, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { z } from "zod";

const MAGIC = Buffer.from("MISTHY-BACKUP-1\n");
const headerLength = MAGIC.length + 32 + 12;
const key = (passphrase, salt) => {
  if (typeof passphrase !== "string" || passphrase.length < 20)
    throw new Error("Use a backup passphrase of at least 20 characters from your password manager");
  return scryptSync(passphrase, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
};
export const assetBackupSchema = z.object({
  id: z.uuid(),
  object_key: z.string().regex(/^memes\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.(gif|webp|png|jpg)$/i),
  byte_size: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
  content_type: z.enum(["image/gif", "image/webp", "image/png", "image/jpeg"]),
});
export const backupManifestSchema = z.object({
  schemaVersion: z.literal(1),
  createdAt: z.iso.datetime(),
  worker: z.string().min(1),
  databaseId: z.uuid(),
  databaseSha256: z.string().regex(/^[a-f0-9]{64}$/),
  resultsSha256: z.string().regex(/^[a-f0-9]{64}$/),
  assets: z
    .array(assetBackupSchema.extend({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }))
    .max(5000),
});
export function validateArchiveListing(listing) {
  const paths = listing
    .trim()
    .split(/\r?\n/)
    .map((name) => name.replace(/^\.\//, ""));
  if (
    !paths.includes("manifest.json") ||
    !paths.includes("database.sql") ||
    !paths.includes("results.json")
  )
    throw new Error("Missing backup files");
  const seen = new Set();
  for (const name of paths) {
    if (
      seen.has(name) ||
      !/^(manifest\.json|database\.sql|results\.json|media\/|media\/[a-f0-9-]{36}\.bin)$/.test(name)
    )
      throw new Error("Unexpected or unsafe archive path");
    seen.add(name);
  }
  return paths;
}
export async function encryptArchive(input, output, passphrase) {
  const salt = randomBytes(32),
    iv = randomBytes(12);
  const header = Buffer.concat([MAGIC, salt, iv]);
  const cipher = createCipheriv("aes-256-gcm", key(passphrase, salt), iv);
  cipher.setAAD(header);
  const file = await open(output, "wx", 0o600);
  await file.close();
  try {
    await appendFile(output, header);
    await pipeline(createReadStream(input), cipher, createWriteStream(output, { flags: "a" }));
    await appendFile(output, cipher.getAuthTag());
  } catch (error) {
    await unlink(output).catch(() => {});
    throw error;
  }
}
export async function decryptArchive(input, output, passphrase) {
  const size = (await stat(input)).size;
  if (size < headerLength + 16) throw new Error("Incomplete encrypted backup");
  const file = await open(input, "r");
  const header = Buffer.alloc(headerLength),
    tag = Buffer.alloc(16);
  try {
    await file.read(header, 0, headerLength, 0);
    await file.read(tag, 0, 16, size - 16);
  } finally {
    await file.close();
  }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Unsupported backup format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(passphrase, header.subarray(MAGIC.length, MAGIC.length + 32)),
    header.subarray(-12),
  );
  decipher.setAAD(header);
  decipher.setAuthTag(tag);
  const target = await open(output, "wx", 0o600);
  await target.close();
  try {
    await pipeline(
      createReadStream(input, { start: headerLength, end: size - 17 }),
      decipher,
      createWriteStream(output, { flags: "a" }),
    );
  } catch {
    await unlink(output).catch(() => {});
    throw new Error("Backup authentication failed: wrong passphrase, corruption or tampering");
  }
}
export async function readManifest(path) {
  return backupManifestSchema.parse(JSON.parse(await readFile(path, "utf8")));
}
