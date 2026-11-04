import { z } from "zod";
import { entityIdSchema } from "./content";
import { gameModeSchema, sessionCodeSchema } from "./contracts";

export const gamePhaseSchema = z.enum([
  "LOBBY",
  "QUESTION",
  "SUBMITTING",
  "REVEAL",
  "VOTING",
  "RESULT",
  "LEADERBOARD",
  "FINISHED",
]);
export type GamePhase = z.infer<typeof gamePhaseSchema>;

export const sessionRoleSchema = z.enum(["PLAYER", "DISPLAY", "ADMIN", "JUDGE"]);
export type SessionRole = z.infer<typeof sessionRoleSchema>;

export const adminActionSchema = z.enum([
  "START",
  "ADVANCE",
  "PAUSE",
  "RESUME",
  "SKIP",
  "RESTART_ROUND",
  "RESET_SESSION",
]);

const commandBase = { commandId: z.uuid() };
export const gameCommandSchema = z.discriminatedUnion("type", [
  z.object({ ...commandBase, type: z.literal("SUBMIT_MEME"), memeAssetId: entityIdSchema }),
  z.object({ ...commandBase, type: z.literal("REPLACE_MEME"), memeAssetId: entityIdSchema }),
  z.object({ ...commandBase, type: z.literal("CAST_VOTE"), submissionId: entityIdSchema }),
  z.object({ ...commandBase, type: z.literal("ADMIN_ACTION"), action: adminActionSchema }),
  z.object({
    ...commandBase,
    type: z.literal("SELECT_WINNER"),
    submissionId: entityIdSchema.nullable(),
  }),
]);
export type GameCommand = z.infer<typeof gameCommandSchema>;

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("CLIENT_READY"),
    lastKnownVersion: z.number().int().nonnegative().optional(),
  }),
  z.object({ type: z.literal("PING"), sentAt: z.number().int().nonnegative() }),
  z.object({ type: z.literal("COMMAND"), command: gameCommandSchema }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const publicPlayerSchema = z.object({
  id: entityIdSchema,
  displayName: z.string().trim().min(1).max(32),
  connected: z.boolean(),
  score: z.number().int().nonnegative(),
});
export type PublicPlayer = z.infer<typeof publicPlayerSchema>;

export const publicSubmissionSchema = z.object({
  id: entityIdSchema,
  memeAssetId: entityIdSchema,
  authorPlayerId: entityIdSchema.nullable(),
  voteCount: z.number().int().nonnegative().nullable(),
});

export const publicSessionStateSchema = z.object({
  version: z.number().int().nonnegative(),
  sessionCode: sessionCodeSchema,
  name: z.string().min(1).max(100),
  mode: gameModeSchema,
  phase: gamePhaseSchema,
  role: sessionRoleSchema,
  viewerId: entityIdSchema.nullable(),
  serverTime: z.number().int().nonnegative(),
  phaseStartedAt: z.number().int().nonnegative().nullable(),
  phaseEndsAt: z.number().int().nonnegative().nullable(),
  paused: z.boolean(),
  roundNumber: z.number().int().nonnegative(),
  totalRounds: z.number().int().nonnegative(),
  prompt: z.string().max(280).nullable(),
  questionImageAssetId: entityIdSchema.nullable(),
  allowedMemeAssetIds: z.array(entityIdSchema),
  players: z.array(publicPlayerSchema),
  submissions: z.array(publicSubmissionSchema),
  submissionCount: z.number().int().nonnegative(),
  eligibleVoterCount: z.number().int().nonnegative(),
  votesCast: z.number().int().nonnegative().default(0),
  hasSubmitted: z.boolean(),
  hasVoted: z.boolean(),
  ownSubmissionId: entityIdSchema.nullable(),
  ownMemeAssetId: entityIdSchema.nullable(),
  canVote: z.boolean(),
  winnerSubmissionId: entityIdSchema.nullable(),
});
export type PublicSessionState = z.infer<typeof publicSessionStateSchema>;

export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("STATE_SYNC"), state: publicSessionStateSchema }),
  z.object({
    type: z.literal("COMMAND_ACK"),
    commandId: z.uuid(),
    version: z.number().int().nonnegative(),
    duplicate: z.boolean(),
  }),
  z.object({ type: z.literal("PONG"), sentAt: z.number(), serverTime: z.number() }),
  z.object({
    type: z.literal("ERROR"),
    code: z.string(),
    message: z.string(),
    commandId: z.uuid().optional(),
  }),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export const connectionTicketSchema = z.object({
  sessionId: entityIdSchema,
  sessionCode: sessionCodeSchema,
  role: sessionRoleSchema,
  subjectId: entityIdSchema.nullable(),
  expiresAt: z.number().int().positive(),
  nonce: z.uuid(),
});
export type ConnectionTicket = z.infer<typeof connectionTicketSchema>;

export const connectionAttachmentSchema = z.object({
  role: sessionRoleSchema,
  subjectId: entityIdSchema.nullable(),
  connectedAt: z.number().int().nonnegative(),
});
export type ConnectionAttachment = z.infer<typeof connectionAttachmentSchema>;

export const createSessionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  presetId: entityIdSchema,
  code: sessionCodeSchema.optional(),
});

export const joinSessionSchema = z.object({
  displayName: z.string().trim().min(1).max(32),
});

export const reconnectSessionSchema = z.object({ reconnectToken: z.string().min(32).max(256) });

export const ticketRequestSchema = z.object({
  role: z.enum(["ADMIN", "JUDGE", "DISPLAY"]),
});

export const engineQuestionSchema = z.object({
  id: entityIdSchema,
  text: z.string().min(1).max(280),
  imageAssetId: entityIdSchema.nullable(),
  memeAssetIds: z.array(entityIdSchema),
  submissionDurationSeconds: z.number().int().min(10).max(300),
  votingDurationSeconds: z.number().int().min(5).max(180),
});

export const enginePlayerSchema = z.object({
  id: entityIdSchema,
  displayName: z.string().min(1).max(32),
  score: z.number().int().nonnegative(),
  joinedAt: z.number().int().nonnegative(),
});

export const engineSubmissionSchema = z.object({
  id: entityIdSchema,
  playerId: entityIdSchema,
  memeAssetId: entityIdSchema,
  submittedAt: z.number().int().nonnegative(),
  commandId: z.uuid(),
});

export const engineVoteSchema = z.object({
  id: entityIdSchema,
  voterPlayerId: entityIdSchema,
  submissionId: entityIdSchema,
  castAt: z.number().int().nonnegative(),
  commandId: z.uuid(),
});

export const engineRoundSchema = z.object({
  id: entityIdSchema,
  number: z.number().int().positive(),
  questionIndex: z.number().int().nonnegative(),
  questionId: entityIdSchema,
  submissions: z.array(engineSubmissionSchema),
  votes: z.array(engineVoteSchema),
  eligibleVoterIds: z.array(entityIdSchema),
  awaitingTieBreak: z.boolean(),
  winnerSubmissionId: entityIdSchema.nullable(),
  finalizedAt: z.number().int().nonnegative().nullable(),
});

export const persistedGameStateSchema = z.object({
  schemaVersion: z.literal(1),
  sessionId: entityIdSchema,
  sessionCode: sessionCodeSchema,
  name: z.string().min(1).max(100),
  mode: gameModeSchema,
  version: z.number().int().nonnegative(),
  phase: gamePhaseSchema,
  phaseStartedAt: z.number().int().nonnegative().nullable(),
  phaseEndsAt: z.number().int().nonnegative().nullable(),
  paused: z
    .object({ phase: gamePhaseSchema, remainingMs: z.number().int().nonnegative() })
    .nullable(),
  questions: z.array(engineQuestionSchema).min(1),
  players: z.array(enginePlayerSchema),
  round: engineRoundSchema.nullable(),
  processedCommandIds: z.array(z.uuid()).max(1000),
  scoring: z.object({
    winnerPoints: z.number().int().nonnegative(),
    participationPoints: z.number().int().nonnegative(),
  }),
  tieBreaker: z.enum(["EARLIEST_SUBMISSION", "RANDOM", "TALENT_DECIDES"]),
});
export type PersistedGameState = z.infer<typeof persistedGameStateSchema>;

export const playerConnectionSchema = z.object({
  player: z.object({ id: entityIdSchema, displayName: z.string() }),
  reconnectToken: z.string().optional(),
  connection: z.object({ url: z.string(), protocols: z.array(z.string()) }),
});
export const playerRoomSchema = z.object({ name: z.string(), status: z.string() });
export const displayConnectionSchema = z.object({
  connection: z.object({ url: z.string(), protocols: z.array(z.string()) }),
});
export const playerAssetSchema = z.object({
  id: entityIdSchema,
  title: z.string(),
  tags: z.array(z.string()),
  altText: z.string(),
  contentType: z.string().nullable(),
});
export const playerContentSchema = z.object({
  assets: z.array(playerAssetSchema),
  participation: z.object({ submissions: z.number(), votes: z.number(), wins: z.number() }),
});
