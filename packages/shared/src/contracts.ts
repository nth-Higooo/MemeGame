import { z } from "zod";

export const sessionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "Mã phòng phải gồm 6 ký tự chữ hoặc số.");

export const gameModeSchema = z.enum(["TALENT_MODE", "COMMUNITY_MODE"]);
export type GameMode = z.infer<typeof gameModeSchema>;

export const gamePhaseSchema = z.enum([
  "LOBBY",
  "PROMPT",
  "SUBMITTING",
  "REVEAL",
  "VOTING",
  "RESULT",
  "PAUSED",
  "FINISHED",
]);
export type GamePhase = z.infer<typeof gamePhaseSchema>;

export const publicPlayerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1).max(32),
  connected: z.boolean(),
  score: z.number().int().nonnegative(),
});
export type PublicPlayer = z.infer<typeof publicPlayerSchema>;

export const publicSessionStateSchema = z.object({
  version: z.number().int().nonnegative(),
  sessionCode: sessionCodeSchema,
  mode: gameModeSchema,
  phase: gamePhaseSchema,
  serverTime: z.number().int().nonnegative(),
  phaseEndsAt: z.number().int().nonnegative().nullable(),
  roundNumber: z.number().int().nonnegative(),
  prompt: z.string().max(280).nullable(),
  players: z.array(publicPlayerSchema),
});
export type PublicSessionState = z.infer<typeof publicSessionStateSchema>;

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CLIENT_READY"), lastKnownVersion: z.number().int().nonnegative().optional() }),
  z.object({ type: z.literal("PING"), sentAt: z.number().int().nonnegative() }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("STATE_SYNC"), state: publicSessionStateSchema }),
  z.object({ type: z.literal("PONG"), sentAt: z.number(), serverTime: z.number() }),
  z.object({ type: z.literal("ERROR"), code: z.string(), message: z.string() }),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("misthy-meme-party-api"),
  timestamp: z.string().datetime(),
});
