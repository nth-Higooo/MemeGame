import { z } from "zod";
import { gameModeSchema } from "./contracts";

export const entityIdSchema = z.uuid();
export const contentStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const memeContentTypeSchema = z.enum(["image/gif", "image/webp", "image/png", "image/jpeg"]);

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((tag) => tag.toLowerCase());

export const memeAssetInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  tags: z.array(tagSchema).max(20).default([]),
  category: z.string().trim().min(1).max(40).default("general"),
  status: contentStatusSchema.default("DRAFT"),
  altText: z.string().trim().max(240).default(""),
});

export const memeAssetUpdateSchema = memeAssetInputSchema.partial();

export const memeAssetSchema = memeAssetInputSchema.extend({
  id: entityIdSchema,
  objectKey: z.string().nullable(),
  contentType: memeContentTypeSchema.nullable(),
  byteSize: z.number().int().positive().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  sourceType: z.enum(["R2", "PLACEHOLDER"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MemeAsset = z.infer<typeof memeAssetSchema>;

export const questionInputSchema = z.object({
  text: z.string().trim().min(1).max(280),
  imageAssetId: entityIdSchema.nullable().default(null),
  memeAssetIds: z.array(entityIdSchema).max(200).default([]),
  position: z.number().int().min(0).default(0),
  submissionDurationSeconds: z.number().int().min(10).max(300).default(45),
  votingDurationSeconds: z.number().int().min(5).max(180).default(30),
  status: contentStatusSchema.default("DRAFT"),
});
export const questionUpdateSchema = questionInputSchema.partial();
export const questionSchema = questionInputSchema.extend({
  id: entityIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Question = z.infer<typeof questionSchema>;

export const votingRulesSchema = z.object({
  allowSelfVote: z.literal(false).default(false),
  votesPerPlayer: z.number().int().min(1).max(5).default(1),
  audienceVoting: z.boolean().default(true),
});

export const scoringRulesSchema = z.object({
  winnerPoints: z.number().int().min(0).max(10_000).default(100),
  participationPoints: z.number().int().min(0).max(1_000).default(0),
});

const gamePresetBaseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  mode: gameModeSchema,
  playMode: z.enum(["INDIVIDUAL", "TEAM"]).default("INDIVIDUAL"),
  roundDurationSeconds: z.number().int().min(10).max(300).default(45),
  votingRules: votingRulesSchema.default({
    allowSelfVote: false,
    votesPerPlayer: 1,
    audienceVoting: true,
  }),
  scoring: scoringRulesSchema.default({ winnerPoints: 100, participationPoints: 0 }),
  tieBreaker: z
    .enum(["EARLIEST_SUBMISSION", "RANDOM", "TALENT_DECIDES"])
    .default("EARLIEST_SUBMISSION"),
  questionIds: z.array(entityIdSchema).min(1).max(100),
  status: contentStatusSchema.default("DRAFT"),
});

export const gamePresetInputSchema = gamePresetBaseSchema.superRefine((value, context) => {
  if (value.playMode === "TEAM") {
    context.addIssue({
      code: "custom",
      path: ["playMode"],
      message: "Chế độ đội đã được dự trù nhưng chưa triển khai trong MVP.",
    });
  }
  if (value.mode === "TALENT_MODE" && value.votingRules.audienceVoting) {
    context.addIssue({
      code: "custom",
      path: ["votingRules", "audienceVoting"],
      message: "Talent Mode không sử dụng bình chọn khán giả.",
    });
  }
});

export const gamePresetUpdateSchema = gamePresetBaseSchema.partial();
export const gamePresetSchema = gamePresetBaseSchema.extend({
  id: entityIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GamePreset = z.infer<typeof gamePresetSchema>;

export const contentPackSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime().optional(),
  questions: z.array(questionSchema.omit({ createdAt: true, updatedAt: true })).max(500),
  presets: z.array(gamePresetSchema.omit({ createdAt: true, updatedAt: true })).max(100),
});
export type ContentPack = z.infer<typeof contentPackSchema>;

export const contentImportSchema = z.object({
  duplicateStrategy: z.enum(["REJECT", "SKIP", "REGENERATE"]).default("REJECT"),
  pack: contentPackSchema,
});

export const reorderSchema = z.object({ ids: z.array(entityIdSchema).min(1).max(500) });

export const adminBootstrapSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(128),
});

export const adminLoginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});
