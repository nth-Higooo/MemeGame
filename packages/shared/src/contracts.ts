import { z } from "zod";

export const sessionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "Mã phòng phải gồm 6 ký tự chữ hoặc số.");

export const gameModeSchema = z.enum(["TALENT_MODE", "COMMUNITY_MODE"]);
export type GameMode = z.infer<typeof gameModeSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("misthy-meme-party-api"),
  timestamp: z.string().datetime(),
});
