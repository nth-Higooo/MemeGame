import { describe, expect, it } from "vitest";
import { sessionCodeSchema } from "./contracts";
import { clientMessageSchema } from "./realtime";

describe("shared contracts", () => {
  it("normalizes a valid session code", () => {
    expect(sessionCodeSchema.parse(" mt2026 ")).toBe("MT2026");
  });

  it("rejects unknown websocket messages", () => {
    expect(clientMessageSchema.safeParse({ type: "CAST_VOTE" }).success).toBe(false);
  });
});
