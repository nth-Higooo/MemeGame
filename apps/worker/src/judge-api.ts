import { sessionCodeSchema } from "@misthy/shared";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { digestText } from "./auth";
import type { Env } from "./env";
import { createReconnectToken, issueConnectionTicket } from "./realtime-auth";

const judgeApi = new Hono<{ Bindings: Env }>();
judgeApi.use("*", async (c, next) => {
  if (
    c.req.method !== "GET" &&
    (c.req.header("X-Requested-With") !== "misthy-admin" ||
      (c.req.header("Origin") && c.req.header("Origin") !== new URL(c.req.url).origin))
  )
    return c.json({ message: "Yêu cầu không hợp lệ." }, 403);
  await next();
});

judgeApi.post("/:code/login", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("code"));
  if (!code.success) return c.json({ message: "Mã phòng không hợp lệ." }, 400);

  const grant = await c.env.DB.prepare(
    "SELECT g.id FROM judge_grants g JOIN sessions s ON s.id=g.session_id WHERE s.code=? AND g.active=1",
  )
    .bind(code.data)
    .first<{ id: string }>();
  if (!grant) return c.json({ message: "Phòng chưa bật quyền Talent." }, 401);

  const token = createReconnectToken();
  await c.env.DB.prepare("INSERT INTO judge_sessions(token_hash,grant_id,expires_at) VALUES(?,?,?)")
    .bind(await digestText(token), grant.id, Date.now() + 8 * 3600000)
    .run();
  setCookie(c, "misthy_judge", token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Strict",
    path: "/api/judge",
    maxAge: 8 * 3600,
  });
  return c.json({ ok: true });
});

judgeApi.post("/:code/ticket", async (c) => {
  const cookie = getCookie(c, "misthy_judge");
  if (!cookie) return c.json({ message: "Mở lại trang Talent để kết nối." }, 401);
  const grant = await c.env.DB.prepare(
    "SELECT g.id,s.id AS session_id,s.code,j.expires_at FROM judge_sessions j JOIN judge_grants g ON g.id=j.grant_id JOIN sessions s ON s.id=g.session_id WHERE j.token_hash=? AND g.active=1 AND s.code=? AND j.expires_at>?",
  )
    .bind(await digestText(cookie), c.req.param("code"), Date.now())
    .first<{ id: string; session_id: string; code: string; expires_at: number }>();
  if (!grant) return c.json({ message: "Quyền Talent đã hết hiệu lực." }, 401);
  const token = await issueConnectionTicket(
    {
      sessionId: grant.session_id,
      sessionCode: grant.code,
      subjectId: grant.id,
      role: "JUDGE",
      authExpiresAt: grant.expires_at,
      authSessionId: await digestText(cookie),
    },
    c.env.ADMIN_SESSION_SECRET,
  );
  return c.json({ connection: { url: `/ws/${grant.code}`, protocols: ["misthy-v1", token] } });
});

judgeApi.post("/:code/logout", async (c) => {
  const cookie = getCookie(c, "misthy_judge");
  if (cookie)
    await c.env.DB.prepare("DELETE FROM judge_sessions WHERE token_hash=?")
      .bind(await digestText(cookie))
      .run();
  deleteCookie(c, "misthy_judge", { path: "/api/judge" });
  return c.json({ ok: true });
});

export { judgeApi };
