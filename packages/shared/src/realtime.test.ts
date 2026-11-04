import { describe, expect, it } from "vitest";
import { clientMessageSchema, gamePhaseSchema, persistedGameStateSchema } from "./realtime";

describe("realtime contracts", () => {
  it("exposes the complete Phase 04 state set", () => {
    expect(gamePhaseSchema.options).toEqual([
      "LOBBY",
      "QUESTION",
      "SUBMITTING",
      "REVEAL",
      "VOTING",
      "RESULT",
      "LEADERBOARD",
      "FINISHED",
    ]);
  });

  it("rejects unstructured commands", () => {
    expect(clientMessageSchema.safeParse({ type: "SUBMIT_MEME", memeAssetId: "x" }).success).toBe(
      false,
    );
  });

  it("rejects persisted snapshots with an unknown schema version", () => {
    expect(persistedGameStateSchema.safeParse({ schemaVersion: 2 }).success).toBe(false);
  });
});
