import { sessionCodeSchema } from "@misthy/shared";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { Env } from "./env";
import { adminApi } from "./admin-api";
import { GameSession } from "./game-session";
import { verifyConnectionTicket } from "./realtime-auth";
import { sessionApi } from "./session-api";
import { judgeApi } from "./judge-api";
import { protection } from "./protection";
import { logEvent } from "./observability";

const app = new Hono<{ Bindings: Env }>();
app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.header("X-Request-Id", requestId);
  const started = Date.now();
  await next();
  if (c.req.path.startsWith("/api/") || c.req.path.startsWith("/ws/"))
    logEvent({
      event: "http_request",
      requestId,
      route: c.req.routePath,
      status: c.res.status,
      durationMs: Date.now() - started,
    });
});
app.onError((_error, c) => {
  const requestId = c.res.headers.get("X-Request-Id") ?? crypto.randomUUID();
  logEvent({ event: "service_error", requestId, code: "STORAGE_OR_RUNTIME_FAILURE" });
  c.header("Retry-After", "5");
  return c.json(
    {
      error: "service_unavailable",
      message: "Dịch vụ tạm gián đoạn. Thử lại sau vài giây; dữ liệu đã xác nhận được giữ lại.",
      requestId,
    },
    503,
  );
});
app.use("/api/*", protection);
app.use("/ws/*", protection);

const securityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", "wss:"],
    imgSrc: ["'self'", "data:", "blob:"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
});

app.use("*", async (c, next) => {
  if (c.req.header("Upgrade")?.toLowerCase() === "websocket") return next();
  return securityHeaders(c, next);
});

app.get("/api/health", (c) =>
  c.json({
    ok: true as const,
    service: "misthy-meme-party-api" as const,
    timestamp: new Date().toISOString(),
  }),
);

app.route("/api/admin", adminApi);
app.route("/api/judge", judgeApi);
app.route("/api/sessions", sessionApi);

app.get("/ws/:sessionCode", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("sessionCode"));
  if (!code.success) return c.json({ error: "invalid_session_code" }, 400);
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    return c.json({ error: "upgrade_required" }, 426);
  }
  const protocols = (c.req.header("Sec-WebSocket-Protocol") ?? "")
    .split(",")
    .map((value) => value.trim());
  const ticketToken = protocols.find((value) => value !== "misthy-v1");
  const ticket = ticketToken
    ? await verifyConnectionTicket(ticketToken, c.env.ADMIN_SESSION_SECRET)
    : null;
  if (!protocols.includes("misthy-v1") || !ticket || ticket.sessionCode !== code.data) {
    return c.json({ error: "invalid_connection_ticket" }, 401);
  }

  const id = c.env.GAME_SESSIONS.idFromName(code.data);
  return c.env.GAME_SESSIONS.get(id).fetch(c.req.raw);
});

app.all("/api", (c) => c.json({ error: "not_found" }, 404));
app.all("/ws", (c) => c.json({ error: "not_found" }, 404));
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));
app.all("/ws/*", (c) => c.json({ error: "not_found" }, 404));
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export { GameSession };
export default app;
