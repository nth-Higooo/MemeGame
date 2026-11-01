import { sessionCodeSchema } from "@misthy/shared";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { Env } from "./env";
import { GameSession } from "./game-session";

const app = new Hono<{ Bindings: Env }>();

app.use("*", secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", "wss:"],
    imgSrc: ["'self'", "data:", "blob:"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
}));

app.get("/api/health", (c) => c.json({
  ok: true as const,
  service: "misthy-meme-party-api" as const,
  timestamp: new Date().toISOString(),
}));

app.get("/ws/:sessionCode", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("sessionCode"));
  if (!code.success) return c.json({ error: "invalid_session_code" }, 400);
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    return c.json({ error: "upgrade_required" }, 426);
  }

  const id = c.env.GAME_SESSIONS.idFromName(code.data);
  return c.env.GAME_SESSIONS.get(id).fetch(c.req.raw);
});

app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export { GameSession };
export default app;
