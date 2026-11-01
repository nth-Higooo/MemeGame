import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "./auth";

describe("admin authentication primitives", () => {
  it("hashes and verifies passwords with PBKDF2", async () => {
    const stored = await hashPassword("a-long-test-password", new Uint8Array(16).fill(7), 100_000);
    await expect(
      verifyPassword("a-long-test-password", stored.hash, stored.salt, stored.iterations),
    ).resolves.toBe(true);
    await expect(
      verifyPassword("wrong-password", stored.hash, stored.salt, stored.iterations),
    ).resolves.toBe(false);
  });

  it("signs sessions and rejects tampering", async () => {
    const secret = "test-secret-that-is-long-enough-for-hmac";
    const token = await createSessionToken(
      { sub: crypto.randomUUID(), email: "admin@example.com", role: "OWNER" },
      secret,
    );
    expect((await verifySessionToken(token, secret))?.email).toBe("admin@example.com");
    await expect(verifySessionToken(`${token}x`, secret)).resolves.toBeNull();
  });
});
