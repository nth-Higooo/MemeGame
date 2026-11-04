import { describe, expect, it } from "vitest";
import { issueConnectionTicket, verifyConnectionTicket } from "./realtime-auth";

describe("realtime connection tickets", () => {
  const secret = "a-test-only-secret-with-enough-entropy";
  const ticket = {
    sessionId: "30000000-0000-4000-8000-000000000001",
    sessionCode: "MT2026",
    role: "PLAYER" as const,
    subjectId: "30000000-0000-4000-8000-000000000002",
  };

  it("round-trips a signed short-lived identity", async () => {
    const token = await issueConnectionTicket(ticket, secret);
    await expect(verifyConnectionTicket(token, secret)).resolves.toMatchObject(ticket);
  });

  it("rejects tampered tickets", async () => {
    const token = await issueConnectionTicket(ticket, secret);
    await expect(verifyConnectionTicket(`${token}x`, secret)).resolves.toBeNull();
  });
});
