import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { harness } from "./qa-harness.test-support";
import { WindowLimiter } from "./protection";
import { buildInitialState, issueRoleTicket } from "./session-service";
import app from "./index";

beforeEach(() => {
  vi.stubGlobal("WebSocketRequestResponsePair", class {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const gif = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) =>
  c.charCodeAt(0),
);
type Fixture = Awaited<ReturnType<typeof harness>>;
async function join(f: Fixture, name: string) {
  const response = await f.call("/api/sessions/QA2026/join", { displayName: name }, false);
  expect(response.status).toBe(201);
  return (await response.json()) as { player: { id: string }; reconnectToken: string };
}
async function action(f: Fixture, value: string) {
  return f.command(f.admin, { type: "ADMIN_ACTION", action: value });
}

describe("Phase 08 storage, security and recovery integration", () => {
  it("creates a room from the seeded preset with a meme collection on every question", async () => {
    const f = await harness();
    try {
      const assetIds = f.db.sql
        .prepare(
          "SELECT id FROM meme_assets WHERE source_type='PLACEHOLDER' AND status!='ARCHIVED'",
        )
        .all()
        .map((row) => String(row.id));
      const extraQuestionId = "6d22b7a8-e782-40cf-b1ee-7443f6ddb7e7";
      f.db.sql
        .prepare(
          "INSERT INTO questions(id,text,status) VALUES(?,'Production regression question','DRAFT')",
        )
        .run(extraQuestionId);
      f.db.sql
        .prepare("INSERT INTO preset_questions(preset_id,question_id,position) VALUES(?,?,2)")
        .run("00000000-0000-4000-8000-000000000301", extraQuestionId);
      f.db.sql.exec(
        readFileSync(
          new NodeURL(
            "../migrations/0007_repair_empty_preset_question_collections.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const questionCollections = f.db.sql
        .prepare(
          `SELECT q.id, COUNT(qma.meme_asset_id) AS asset_count
           FROM preset_questions pq
           JOIN questions q ON q.id=pq.question_id
           LEFT JOIN question_meme_assets qma ON qma.question_id=q.id
           WHERE pq.preset_id='00000000-0000-4000-8000-000000000301'
           GROUP BY q.id`,
        )
        .all();
      expect(questionCollections).toHaveLength(3);
      expect(questionCollections.every((row) => Number(row.asset_count) > 0)).toBe(true);

      const state = await buildInitialState(f.env.DB, {
        sessionId: crypto.randomUUID(),
        sessionCode: "SEED26",
        name: "Seeded birthday pack",
        presetId: "00000000-0000-4000-8000-000000000301",
      });
      expect(state).not.toBeNull();
      expect(state?.questions).toHaveLength(3);
      expect(
        state?.questions.every((question) =>
          question.memeAssetIds.some((assetId) => assetIds.includes(assetId)),
        ),
      ).toBe(true);
    } finally {
      f.db.sql.close();
    }
  });

  it("recovers a restored D1 snapshot in an empty namespace only with a valid signed session ticket", async () => {
    const f = await harness();
    try {
      const joined = await join(f, "Restored player");
      await action(f, "START");
      const expected = f.snapshot();
      f.storage.data.clear();
      f.storage.alarm = null;
      f.evict();
      const invalid = await f.room.fetch(
        new Request("http://localhost/ws/QA2026", {
          headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": "misthy-v1, invalid" },
        }),
      );
      expect(invalid.status).toBe(401);
      expect(f.storage.data.size).toBe(0);
      // Reach admission protection before Node's unavailable native WS upgrade.
      for (let i = 0; i < 3; i++) f.socket("PLAYER", joined.player.id);
      const ticket = await issueRoleTicket(
        f.env,
        { id: expected.sessionId, code: expected.sessionCode },
        "PLAYER",
        joined.player.id,
      );
      const restored = await f.room.fetch(
        new Request("http://localhost/ws/QA2026", {
          headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": `misthy-v1, ${ticket}` },
        }),
      );
      expect(restored.status).toBe(429);
      expect(f.storage.data.get("sessionId")).toBe(expected.sessionId);
      expect(f.storage.data.get("engineState")).toEqual(expected);
    } finally {
      f.db.sql.close();
    }
  });
  it("bounds HTTP bodies and join bursts before they can exhaust room resources", async () => {
    const f = await harness();
    try {
      const oversized = await app.request(
        "http://localhost/api/sessions/QA2026/join",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: "x".repeat(1024 * 1024) }),
        },
        f.env,
      );
      expect(oversized.status).toBe(413);
      for (let index = 0; index < 65; index++)
        await f.call("/api/sessions/QA2026/join", { displayName: "One identity" }, false);
      const limited = await f.call("/api/sessions/QA2026/join", { displayName: "Burst" }, false);
      expect(limited.status).toBe(429);
      expect(limited.headers.get("Retry-After")).toBe("60");
      expect(f.snapshot().players).toHaveLength(1);
    } finally {
      f.db.sql.close();
    }
  });
  it("refuses a fourth player tab and an eleventh display before accepting sockets", async () => {
    const f = await harness();
    try {
      const joined = await join(f, "Tabs");
      for (let index = 0; index < 3; index++) f.socket("PLAYER", joined.player.id);
      const room = { id: f.snapshot().sessionId, code: "QA2026" };
      for (const role of ["PLAYER", "DISPLAY"] as const) {
        if (role === "DISPLAY") for (let index = 0; index < 10; index++) f.socket("DISPLAY", null);
        const ticket = await issueRoleTicket(
          f.env,
          room,
          role,
          role === "PLAYER" ? joined.player.id : null,
        );
        const response = await f.room.fetch(
          new Request("http://localhost/ws/QA2026", {
            headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": `misthy-v1, ${ticket}` },
          }),
        );
        expect(response.status).toBe(429);
      }
      const invalid = await app.request(
        "http://localhost/ws/QA2026",
        { headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": "misthy-v1, invalid" } },
        f.env,
      );
      expect(invalid.status).toBe(401);
    } finally {
      f.db.sql.close();
    }
  });

  it("loads 200 allowed memes plus an attachment within D1 parameter limits", async () => {
    const f = await harness();
    try {
      const joined = await join(f, "Gallery");
      const state = f.snapshot();
      for (let index = 0; index < 200; index++) {
        const id = crypto.randomUUID();
        f.db
          .prepare(
            "INSERT INTO meme_assets(id,title,source_type,status) VALUES(?,'Original placeholder','PLACEHOLDER','ACTIVE')",
          )
          .bind(id)
          .runSync();
        if (index < 199) state.questions[0]!.memeAssetIds.push(id);
        else state.questions[0]!.imageAssetId = id;
      }
      state.version++;
      f.db
        .prepare("UPDATE sessions SET state_version=?,state_json=? WHERE id=?")
        .bind(state.version, JSON.stringify(state), state.sessionId)
        .runSync();
      f.evict();
      await action(f, "START");
      await action(f, "ADVANCE");
      const response = await app.request(
        "http://localhost/api/sessions/QA2026/content",
        { headers: { Authorization: `Bearer ${joined.reconnectToken}` } },
        f.env,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as { assets: unknown[] };
      expect(body.assets).toHaveLength(201);
    } finally {
      f.db.sql.close();
    }
  });
  it("serializes duplicate normalized names and never leaves an orphan player", async () => {
    const f = await harness();
    try {
      const responses = await Promise.all(
        ["  Linh  ", "LINH"].map((displayName) =>
          f.call("/api/sessions/QA2026/join", { displayName }, false),
        ),
      );
      expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(f.snapshot().players).toHaveLength(1);
      expect(f.db.sql.prepare("SELECT count(*) AS n FROM players").get()?.n).toBe(1);
      await action(f, "START");
      expect(
        (await f.call("/api/sessions/QA2026/join", { displayName: "Late" }, false)).status,
      ).toBe(409);
    } finally {
      f.db.sql.close();
    }
  });

  it("supports 50 durable players, bounds scoring batches, and refuses player 51", async () => {
    const f = await harness();
    try {
      const joined = [];
      for (let i = 0; i < 50; i++) joined.push(await join(f, `QA ${i}`));
      expect(
        (await f.call("/api/sessions/QA2026/join", { displayName: "Overflow" }, false)).status,
      ).toBe(409);
      await action(f, "START");
      await action(f, "ADVANCE");
      for (const player of joined) {
        const socket = f.socket("PLAYER", player.player.id);
        await f.command(socket, { type: "SUBMIT_MEME", memeAssetId: f.assetId });
        socket.close(1000);
      }
      await action(f, "ADVANCE");
      await action(f, "ADVANCE");
      await action(f, "ADVANCE");
      expect(f.snapshot().round?.resultPending).toBe(true);
      // Use a fresh authenticated connection: test setup deliberately exceeded a human operator's message rate.
      f.admin.attachment.rateCount = 0;
      await f.command(f.admin, {
        type: "PUBLISH_RESULT",
        confirmed: true,
        expectedVersion: f.snapshot().version,
      });
      expect(f.snapshot().phase).toBe("RESULT");
      expect(f.snapshot().players.reduce((sum, player) => sum + player.score, 0)).toBe(200);
      expect(f.db.largestBatch).toBeLessThan(20);
      expect(f.db.sql.prepare("SELECT count(*) AS n FROM score_events").get()?.n).toBe(51);
    } finally {
      f.db.sql.close();
    }
  });

  it("rejects an exact-deadline submission before the alarm starts reveal", async () => {
    const f = await harness();
    try {
      const p = await join(f, "Deadline");
      await action(f, "START");
      await action(f, "ADVANCE");
      const deadline = f.snapshot().phaseEndsAt!;
      vi.spyOn(Date, "now").mockReturnValue(deadline);
      const socket = f.socket("PLAYER", p.player.id);
      await f.command(socket, { type: "SUBMIT_MEME", memeAssetId: f.assetId });
      expect(socket.frames.at(-1)).toMatchObject({ type: "ERROR", code: "SUBMISSION_LATE" });
      f.db.failBatch = true;
      await expect(f.room.alarm()).rejects.toThrow("Game alarm persistence unavailable");
      expect(f.snapshot().phase).toBe("SUBMITTING");
      f.db.failBatch = false;
      await f.room.alarm();
      expect(f.snapshot().phase).toBe("REVEAL");
      expect(f.snapshot().round?.submissions).toHaveLength(0);
      const version = f.snapshot().version;
      await f.room.alarm();
      expect(f.snapshot().version).toBe(version);
    } finally {
      f.db.sql.close();
    }
  });

  it("recovers hibernated attachments, repairs a lost checkpoint/alarm, and deduplicates retries", async () => {
    const f = await harness();
    try {
      const p = await join(f, "Recovery");
      await action(f, "START");
      await action(f, "ADVANCE");
      const socket = f.socket("PLAYER", p.player.id);
      f.storage.failNextPut = true;
      const accepted = await f.command(socket, { type: "SUBMIT_MEME", memeAssetId: f.assetId });
      expect(socket.frames.at(-1)).toMatchObject({ type: "COMMAND_ACK", duplicate: false });
      f.storage.alarm = null;
      f.evict();
      await f.room.webSocketMessage(socket.webSocket, JSON.stringify({ type: "CLIENT_READY" }));
      expect(socket.snapshot?.hasSubmitted).toBe(true);
      expect(f.storage.alarm).toBe(f.snapshot().phaseEndsAt);
      await f.command(socket, accepted);
      expect(socket.frames.at(-1)).toMatchObject({ type: "COMMAND_ACK", duplicate: true });
      expect(f.db.sql.prepare("SELECT count(*) AS n FROM submissions").get()?.n).toBe(1);
      expect(f.storage.data.get("engineState")).toMatchObject({ version: f.snapshot().version });
      const version = f.snapshot().version;
      await action(f, "RECOVER_SESSION");
      expect(f.snapshot().version).toBe(version + 1);
      expect(f.snapshot().round?.submissions).toHaveLength(1);
    } finally {
      f.db.sql.close();
    }
  });

  it("fails closed on a D1 transaction outage and accepts the same command after recovery", async () => {
    const f = await harness();
    try {
      const p = await join(f, "Storage");
      await action(f, "START");
      await action(f, "ADVANCE");
      const socket = f.socket("PLAYER", p.player.id);
      const before = f.snapshot();
      f.db.failBatch = true;
      const command = await f.command(socket, { type: "SUBMIT_MEME", memeAssetId: f.assetId });
      expect(socket.closedWith).toBe(1011);
      expect(f.snapshot()).toEqual(before);
      f.db.failBatch = false;
      const reconnect = f.socket("PLAYER", p.player.id);
      await f.command(reconnect, command);
      expect(reconnect.frames.at(-1)).toMatchObject({ type: "COMMAND_ACK", duplicate: false });
      expect(f.snapshot().round?.submissions).toHaveLength(1);
    } finally {
      f.db.sql.close();
    }
  });

  it.each(["TALENT_MODE", "COMMUNITY_MODE"])(
    "publishes an empty %s round once without phantom points",
    async (mode) => {
      const f = await harness();
      try {
        await f.command(f.admin, { type: "SET_MODE", mode });
        await join(f, "Empty");
        await action(f, "START");
        await action(f, "ADVANCE");
        await action(f, "ADVANCE");
        if (mode === "TALENT_MODE")
          await f.command(f.admin, { type: "SELECT_WINNER", submissionId: null });
        else {
          await action(f, "ADVANCE");
          await action(f, "ADVANCE");
        }
        const publication = await f.command(f.admin, {
          type: "PUBLISH_RESULT",
          confirmed: true,
          expectedVersion: f.snapshot().version,
        });
        await f.command(f.admin, publication);
        expect(f.snapshot().phase).toBe("RESULT");
        expect(f.snapshot().round?.winnerSubmissionId).toBeNull();
        expect(f.db.sql.prepare("SELECT count(*) AS n FROM score_events").get()?.n).toBe(0);
      } finally {
        f.db.sql.close();
      }
    },
  );

  it("validates upload MIME, truncation, size, dimensions and unauthorized access", async () => {
    const f = await harness();
    try {
      expect((await f.upload(gif, "image/gif", false)).status).toBe(401);
      expect((await f.upload(gif, "image/png")).status).toBe(415);
      expect((await f.upload(gif.slice(0, 15))).status).toBe(415);
      expect((await f.upload(new Uint8Array(2049))).status).toBe(413);
      const huge = new Uint8Array(gif);
      huge[6] = 255;
      huge[7] = 255;
      expect((await f.upload(huge)).status).toBe(413);
      expect((await f.upload(gif)).status).toBe(201);
    } finally {
      f.db.sql.close();
    }
  });

  it("handles R2 and D1 upload failures without exposing internals or orphaning successful objects", async () => {
    const f = await harness();
    try {
      f.failure.r2Put = true;
      const unavailable = await f.upload(gif);
      expect(unavailable.status).toBe(503);
      expect(await unavailable.text()).not.toContain("injected");
      expect(f.objects.size).toBe(1);
      f.failure.r2Put = false;
      f.db.failAssetInsert = true;
      expect((await f.upload(gif)).status).toBe(503);
      expect(f.objects.size).toBe(1);
      f.failure.r2Delete = true;
      expect((await f.upload(gif)).status).toBe(503);
      expect(f.objects.size).toBe(2);
      expect(JSON.stringify(vi.mocked(console.log).mock.calls)).toContain("R2_CLEANUP_REQUIRED");
      f.failure.r2Delete = false;
      f.db.failAssetInsert = false;
      expect((await f.upload(gif)).status).toBe(201);
      f.failure.r2Get = true;
      expect((await f.call(`/api/admin/assets/${f.assetId}/content`)).status).toBe(503);
      f.failure.r2Get = false;
      f.objects.delete("qa.gif");
      expect((await f.call(`/api/admin/assets/${f.assetId}/content`)).status).toBe(404);
    } finally {
      f.db.sql.close();
    }
  });

  it("returns safe correlated errors, rejects expired identities and denies privileged player commands", async () => {
    const f = await harness();
    try {
      const p = await join(f, "Security");
      const player = f.socket("PLAYER", p.player.id);
      await f.command(player, { type: "ADMIN_ACTION", action: "START" });
      expect(player.frames.at(-1)).toMatchObject({ type: "ERROR", code: "UNAUTHORIZED_COMMAND" });
      f.admin.attachment.authExpiresAt = Date.now() - 1;
      await f.command(f.admin, { type: "ADMIN_ACTION", action: "START" });
      expect(f.admin.frames.at(-1)).toMatchObject({ type: "ERROR", code: "UNAUTHORIZED_COMMAND" });
      f.db.failReads = true;
      const response = await f.call("/api/admin/sessions");
      expect(response.status).toBe(503);
      const body = (await response.json()) as { requestId: string };
      expect(body.requestId).toBe(response.headers.get("X-Request-Id"));
      const logs = JSON.stringify(vi.mocked(console.log).mock.calls);
      expect(logs).not.toContain("injected");
      expect(logs).not.toContain(p.reconnectToken);
      f.db.failReads = false;
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 9 * 3600000);
      expect((await f.call("/api/admin/sessions")).status).toBe(401);
    } finally {
      f.db.sql.close();
    }
  });

  it("keeps rate budgets through eviction and bounds limiter memory", async () => {
    const f = await harness();
    try {
      const p = await join(f, "Abuse");
      const socket = f.socket("PLAYER", p.player.id);
      for (let i = 0; i < 30; i++) {
        if (i === 15) f.evict();
        await f.room.webSocketMessage(
          socket.webSocket,
          JSON.stringify({ type: "PING", sentAt: Date.now() }),
        );
      }
      await f.room.webSocketMessage(
        socket.webSocket,
        JSON.stringify({ type: "PING", sentAt: Date.now() }),
      );
      expect(socket.closedWith).toBe(1013);
      const limiter = new WindowLimiter(1);
      expect(limiter.allow("one", 2, 0)).toBe(true);
      expect(limiter.allow("one", 2, 1)).toBe(true);
      expect(limiter.allow("one", 2, 2)).toBe(false);
      expect(limiter.allow("two", 2, 3)).toBe(false);
      expect(limiter.allow("two", 2, 60001)).toBe(true);
    } finally {
      f.db.sql.close();
    }
  });

  it("uses reviewed indexes for personal history and login throttling", async () => {
    const f = await harness();
    try {
      for (const [sql, index] of [
        ["SELECT count(*) FROM submissions WHERE player_id='id'", "idx_submissions_player"],
        ["SELECT count(*) FROM votes WHERE voter_player_id='id'", "idx_votes_player"],
        [
          "SELECT count(*) FROM score_events WHERE player_id='id' AND reason='ROUND_WINNER'",
          "idx_score_player_reason",
        ],
        [
          "SELECT count(*) FROM admin_login_attempts WHERE email='x' AND ip_hash='y' AND julianday(created_at)>julianday('now','-15 minutes')",
          "idx_login_attempts_time",
        ],
      ])
        expect(JSON.stringify(f.db.sql.prepare(`EXPLAIN QUERY PLAN ${sql}`).all())).toContain(
          index,
        );
    } finally {
      f.db.sql.close();
    }
  });
});
