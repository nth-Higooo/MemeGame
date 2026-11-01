import { describe, expect, it } from "vitest";
import { contentImportSchema, gamePresetInputSchema, questionInputSchema } from "./content";

describe("content management contracts", () => {
  it("normalizes question defaults", () => {
    const question = questionInputSchema.parse({ text: "  Một câu hỏi vui?  " });
    expect(question.text).toBe("Một câu hỏi vui?");
    expect(question.submissionDurationSeconds).toBe(45);
    expect(question.votingDurationSeconds).toBe(30);
  });

  it("rejects team mode until it is implemented", () => {
    const result = gamePresetInputSchema.safeParse({
      name: "Team preset",
      mode: "COMMUNITY_MODE",
      playMode: "TEAM",
      questionIds: [crypto.randomUUID()],
    });
    expect(result.success).toBe(false);
  });

  it("reports invalid imported content", () => {
    const result = contentImportSchema.safeParse({
      duplicateStrategy: "REJECT",
      pack: { schemaVersion: 1, questions: [{ id: "not-an-id" }], presets: [] },
    });
    expect(result.success).toBe(false);
  });
});
