import {
  joinSessionSchema,
  reconnectSessionSchema,
  sessionCodeSchema,
  persistedGameStateSchema,
  playerContentSchema,
} from "@misthy/shared";
import { Hono } from "hono";
import { digestText } from "./auth";
import type { Env } from "./env";
import { createReconnectToken } from "./realtime-auth";
import { issueRoleTicket, notifyPlayerJoined } from "./session-service";
import { verifyConnectionTicket } from "./realtime-auth";

const sessionApi = new Hono<{ Bindings: Env }>();

// A display ticket grants only currently public media, never the meme library.
sessionApi.get("/:sessionCode/display-media/:assetId", async (c) => {
  const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
  const ticket = token ? await verifyConnectionTicket(token, c.env.ADMIN_SESSION_SECRET) : null;
  if (
    !ticket ||
    !["DISPLAY", "JUDGE"].includes(ticket.role) ||
    ticket.sessionCode !== c.req.param("sessionCode")
  )
    return c.json({ message: "Kết nối màn hình đã hết hạn." }, 401);
  if (
    ticket.role === "JUDGE" &&
    !(await c.env.DB.prepare(
      "SELECT g.id FROM judge_grants g JOIN judge_sessions j ON j.grant_id=g.id WHERE g.id=? AND g.session_id=? AND g.active=1 AND j.token_hash=? AND j.expires_at>?",
    )
      .bind(ticket.subjectId, ticket.sessionId, ticket.authSessionId ?? "", Date.now())
      .first())
  )
    return c.json({ message: "Quyền Talent đã hết hạn." }, 401);
  const session = await c.env.DB.prepare(
    "SELECT state_json FROM sessions WHERE id=? AND status!='ARCHIVED'",
  )
    .bind(ticket.sessionId)
    .first<{ state_json: string }>();
  if (!session) return c.json({ message: "Không tìm thấy phòng." }, 404);
  const state = persistedGameStateSchema.parse(JSON.parse(session.state_json));
  const question = state.round ? state.questions[state.round.questionIndex] : null;
  const id = c.req.param("assetId");
  const revealed = ["REVEAL", "VOTING", "RESULT", "LEADERBOARD", "FINISHED"].includes(state.phase);
  const allowed =
    (state.phase !== "LOBBY" && question?.imageAssetId === id) ||
    (revealed && state.round?.submissions.some((item) => item.memeAssetId === id));
  if (!allowed) return c.json({ message: "Ảnh chưa được công bố." }, 403);
  const asset = await c.env.DB.prepare("SELECT object_key FROM meme_assets WHERE id=?")
    .bind(id)
    .first<{ object_key: string | null }>();
  const object = asset?.object_key ? await c.env.MEME_BUCKET.get(asset.object_key) : null;
  if (!object) return c.json({ message: "Ảnh chưa sẵn sàng." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});

sessionApi.get("/:sessionCode", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("sessionCode"));
  if (!code.success) return c.json({ message: "Mã phòng không hợp lệ." }, 400);
  const room = await c.env.DB.prepare(
    "SELECT name,status FROM sessions WHERE code=? AND status!='ARCHIVED'",
  )
    .bind(code.data)
    .first();
  return room ? c.json(room) : c.json({ message: "Không tìm thấy phòng." }, 404);
});

// Player media is scoped to the current public state, never the entire CMS.
sessionApi.get("/:sessionCode/content/:assetId?", async (c) => {
  const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
  if (!token) return c.json({ message: "Vui lòng tham gia phòng." }, 401);
  const identity = await c.env.DB.prepare(
    `SELECT p.id,s.id AS session_id,s.state_json FROM players p JOIN sessions s ON s.id=p.session_id WHERE s.code=? AND p.reconnect_token_hash=?`,
  )
    .bind(c.req.param("sessionCode"), await digestText(token))
    .first<{ id: string; session_id: string; state_json: string }>();
  if (!identity) return c.json({ message: "Danh tính đã hết hiệu lực." }, 401);
  const state = persistedGameStateSchema.parse(JSON.parse(identity.state_json));
  const question = state.round ? state.questions[state.round.questionIndex] : null;
  const ids = new Set<string>();
  if (question?.imageAssetId) ids.add(question.imageAssetId);
  if (state.phase === "SUBMITTING") question?.memeAssetIds.forEach((id) => ids.add(id));
  if (["REVEAL", "VOTING", "RESULT", "LEADERBOARD", "FINISHED"].includes(state.phase))
    state.round?.submissions.forEach((item) => ids.add(item.memeAssetId));
  const assetId = c.req.param("assetId");
  if (assetId) {
    if (!ids.has(assetId)) return c.json({ message: "Ảnh chưa được công bố." }, 403);
    const asset = await c.env.DB.prepare("SELECT object_key FROM meme_assets WHERE id=?")
      .bind(assetId)
      .first<{ object_key: string | null }>();
    const object = asset?.object_key ? await c.env.MEME_BUCKET.get(asset.object_key) : null;
    if (!object) return c.json({ message: "Ảnh chưa được tải lên." }, 404);
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, no-store");
    return new Response(object.body, { headers });
  }
  const assets = ids.size
    ? (
        await c.env.DB.prepare(
          `SELECT id,title,tags_json,alt_text,content_type FROM meme_assets WHERE id IN (${[...ids].map(() => "?").join(",")})`,
        )
          .bind(...ids)
          .all<{
            id: string;
            title: string;
            tags_json: string;
            alt_text: string;
            content_type: string | null;
          }>()
      ).results
    : [];
  const totals = await c.env.DB.prepare(
    `SELECT (SELECT count(*) FROM submissions WHERE player_id=?) AS submissions,(SELECT count(*) FROM votes WHERE voter_player_id=?) AS votes,(SELECT count(*) FROM score_events WHERE player_id=? AND reason='ROUND_WINNER') AS wins`,
  )
    .bind(identity.id, identity.id, identity.id)
    .first();
  return c.json(
    playerContentSchema.parse({
      assets: assets.map((item) => ({
        id: item.id,
        title: item.title,
        tags: JSON.parse(item.tags_json),
        altText: item.alt_text,
        contentType: item.content_type,
      })),
      participation: totals,
    }),
  );
});

async function parseBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

sessionApi.post("/:sessionCode/join", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("sessionCode"));
  const input = joinSessionSchema.safeParse(await parseBody(c.req.raw));
  if (!code.success || !input.success) {
    return c.json({ error: "validation_failed", message: "Tên hoặc mã phòng không hợp lệ." }, 400);
  }
  const session = await c.env.DB.prepare(
    "SELECT id,code,status FROM sessions WHERE code=? AND status='LOBBY'",
  )
    .bind(code.data)
    .first<{ id: string; code: string; status: string }>();
  if (!session) {
    return c.json(
      { error: "session_unavailable", message: "Phòng không tồn tại hoặc đã bắt đầu." },
      409,
    );
  }
  const playerId = crypto.randomUUID();
  const reconnectToken = createReconnectToken();
  const reconnectHash = await digestText(reconnectToken);
  const joinedAt = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO players (id,session_id,reconnect_token_hash,display_name,joined_at,last_seen_at) VALUES (?,?,?,?,?,?)",
  )
    .bind(
      playerId,
      session.id,
      reconnectHash,
      input.data.displayName,
      new Date(joinedAt).toISOString(),
      new Date(joinedAt).toISOString(),
    )
    .run();
  const response = await notifyPlayerJoined(c.env, session.code, {
    id: playerId,
    displayName: input.data.displayName,
    score: 0,
    joinedAt,
  });
  if (!response.ok) {
    await c.env.DB.prepare("DELETE FROM players WHERE id=?").bind(playerId).run();
    const body: { message?: string } = await response
      .json<{ message?: string }>()
      .catch(() => ({}));
    return c.json(
      { error: "join_rejected", message: body.message ?? "Không thể tham gia phòng." },
      409,
    );
  }
  const ticket = await issueRoleTicket(c.env, session, "PLAYER", playerId);
  return c.json(
    {
      player: { id: playerId, displayName: input.data.displayName },
      reconnectToken,
      connection: { url: `/ws/${session.code}`, protocols: ["misthy-v1", ticket] },
    },
    201,
  );
});

sessionApi.post("/:sessionCode/reconnect", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("sessionCode"));
  const input = reconnectSessionSchema.safeParse(await parseBody(c.req.raw));
  if (!code.success || !input.success) {
    return c.json(
      { error: "validation_failed", message: "Thông tin reconnect không hợp lệ." },
      400,
    );
  }
  const tokenHash = await digestText(input.data.reconnectToken);
  const player = await c.env.DB.prepare(
    `SELECT p.id,p.display_name,s.id AS session_id,s.code
     FROM players p JOIN sessions s ON s.id=p.session_id
     WHERE s.code=? AND p.reconnect_token_hash=?`,
  )
    .bind(code.data, tokenHash)
    .first<{ id: string; display_name: string; session_id: string; code: string }>();
  if (!player)
    return c.json({ error: "unauthorized", message: "Token reconnect không hợp lệ." }, 401);
  await c.env.DB.prepare(
    "UPDATE players SET last_seen_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
  )
    .bind(player.id)
    .run();
  const ticket = await issueRoleTicket(
    c.env,
    { id: player.session_id, code: player.code },
    "PLAYER",
    player.id,
  );
  return c.json({
    player: { id: player.id, displayName: player.display_name },
    connection: { url: `/ws/${player.code}`, protocols: ["misthy-v1", ticket] },
  });
});

sessionApi.post("/:sessionCode/display-ticket", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("sessionCode"));
  if (!code.success) return c.json({ error: "invalid_session_code" }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id,code FROM sessions WHERE code=? AND status!='ARCHIVED'",
  )
    .bind(code.data)
    .first<{ id: string; code: string }>();
  if (!session) return c.json({ error: "not_found", message: "Không tìm thấy phòng." }, 404);
  const ticket = await issueRoleTicket(c.env, session, "DISPLAY", null);
  return c.json({ connection: { url: `/ws/${session.code}`, protocols: ["misthy-v1", ticket] } });
});

export { sessionApi };
