/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { GameSession } from "./game-session";
import { createSessionToken } from "./auth";
import {
  persistedGameStateSchema,
  serverMessageSchema,
  type ConnectionAttachment,
} from "@misthy/shared";
import type { Env } from "./env";
import app from "./index";

// Actual SQLite + real migrations/SQL/transactions; adapters inject service failures.
export class TestD1 {
  readonly sql = new DatabaseSync(":memory:");
  failReads = false;
  failBatch = false;
  failAssetInsert = false;
  largestBatch = 0;
  constructor() {
    const folder = new NodeURL("../migrations/", import.meta.url);
    for (const file of readdirSync(folder)
      .filter((name) => name.endsWith(".sql"))
      .sort())
      this.sql.exec(readFileSync(new NodeURL(file, folder), "utf8"));
  }
  prepare(query: string) {
    return new TestStatement(this, query);
  }
  async batch(statements: TestStatement[]) {
    if (this.failBatch) throw new Error("injected D1 outage: must not reach client/log");
    this.largestBatch = Math.max(this.largestBatch, statements.length);
    if (statements.length > 50) throw new Error("D1 free query budget exceeded");
    this.sql.exec("BEGIN");
    try {
      const results = statements.map((statement) => statement.runSync());
      this.sql.exec("COMMIT");
      return results;
    } catch (error) {
      this.sql.exec("ROLLBACK");
      throw error;
    }
  }
}
class TestStatement {
  private values: SQLInputValue[] = [];
  constructor(
    private db: TestD1,
    readonly query: string,
  ) {}
  bind(...values: SQLInputValue[]) {
    if (values.length > 100) throw new Error("D1 parameter budget exceeded");
    this.values = values;
    return this;
  }
  async first(column?: string) {
    if (this.db.failReads) throw new Error("injected D1 read secret");
    const row = this.db.sql.prepare(this.query).get(...this.values);
    return (column ? row?.[column] : row) ?? null;
  }
  async all() {
    if (this.db.failReads) throw new Error("injected D1 read secret");
    return { results: this.db.sql.prepare(this.query).all(...this.values), success: true };
  }
  runSync() {
    if (this.db.failAssetInsert && this.query.includes("INSERT INTO meme_assets"))
      throw new Error("injected insert failure");
    return {
      success: true,
      meta: this.db.sql.prepare(this.query).run(...this.values),
      results: [],
    };
  }
  async run() {
    return this.runSync();
  }
}
export class TestSocket {
  readyState = 1;
  closedWith: number | undefined;
  attachment: ConnectionAttachment;
  frames: ReturnType<typeof serverMessageSchema.parse>[] = [];
  constructor(attachment: ConnectionAttachment) {
    this.attachment = attachment;
  }
  serializeAttachment(value: ConnectionAttachment) {
    this.attachment = structuredClone(value);
  }
  deserializeAttachment() {
    return structuredClone(this.attachment);
  }
  send(value: string) {
    this.frames.push(serverMessageSchema.parse(JSON.parse(value)));
  }
  close(code: number) {
    this.readyState = 3;
    this.closedWith = code;
  }
  get snapshot() {
    return this.frames.filter((frame) => frame.type === "STATE_SYNC").at(-1)?.state;
  }
  get webSocket() {
    return this as unknown as WebSocket;
  }
}
export class TestRoomStorage {
  data = new Map<string, unknown>();
  alarm: number | null = null;
  failNextPut = false;
  sockets: TestSocket[] = [];
  get<T>(key: string) {
    return Promise.resolve(structuredClone(this.data.get(key)) as T);
  }
  async put(key: string | Record<string, unknown>, value?: unknown) {
    if (this.failNextPut) {
      this.failNextPut = false;
      throw new Error("injected checkpoint failure");
    }
    if (typeof key === "string") this.data.set(key, structuredClone(value));
    else for (const [id, item] of Object.entries(key)) this.data.set(id, structuredClone(item));
  }
  getAlarm() {
    return Promise.resolve(this.alarm);
  }
  async setAlarm(value: number) {
    this.alarm = value;
  }
  async deleteAlarm() {
    this.alarm = null;
  }
  get durableState() {
    return {
      storage: this,
      getWebSockets: () => this.sockets,
      setWebSocketAutoResponse: () => {},
    } as unknown as DurableObjectState;
  }
}
export async function harness() {
  const db = new TestD1();
  const adminId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO admin_users(id,email,display_name,password_hash,password_salt,password_iterations,role) VALUES(?,?,?,?,?,120000,'OWNER')",
  )
    .bind(adminId, "qa@example.test", "QA owner", "unused", "unused")
    .runSync();
  const objects = new Map<string, Uint8Array>();
  const storage = new TestRoomStorage();
  const failure = { r2Put: false, r2Get: false, r2Delete: false };
  let room: GameSession;
  const env = {
    ADMIN_SESSION_SECRET: "qa-only-session-secret-at-least-32-characters",
    ADMIN_BOOTSTRAP_PASSWORD: "qa-only-bootstrap",
    MAX_UPLOAD_BYTES: "2048",
    DB: db as unknown as D1Database,
    MEME_BUCKET: {
      async put(key: string, bytes: Uint8Array) {
        if (failure.r2Put) throw new Error("injected R2 put secret");
        objects.set(key, new Uint8Array(bytes));
      },
      async delete(key: string) {
        if (failure.r2Delete) throw new Error("injected delete");
        objects.delete(key);
      },
      async get(key: string) {
        if (failure.r2Get) throw new Error("injected R2 get secret");
        const bytes = objects.get(key);
        return bytes
          ? {
              body: bytes,
              writeHttpMetadata(headers: Headers) {
                headers.set("Content-Type", "image/gif");
              },
            }
          : null;
      },
    } as unknown as R2Bucket,
    GAME_SESSIONS: {
      idFromName: (code: string) => code,
      get: () => ({
        fetch: (input: string, init: RequestInit) => room.fetch(new Request(input, init)),
      }),
    } as unknown as DurableObjectNamespace,
    ASSETS: { fetch: () => new Response("asset") } as unknown as Fetcher,
  } satisfies Env;
  room = new GameSession(storage.durableState, env);
  const cookie = `misthy_admin=${await createSessionToken({ sub: adminId, email: "qa@example.test", role: "OWNER" }, env.ADMIN_SESSION_SECRET)}`;
  const testIp = crypto.randomUUID();
  const call = (path: string, data?: unknown, authorized = true) =>
    app.request(
      `http://localhost${path}`,
      {
        method: data === undefined ? "GET" : "POST",
        headers: {
          ...(authorized ? { Cookie: cookie } : {}),
          "CF-Connecting-IP": testIp,
          "X-Requested-With": "misthy-admin",
          "Content-Type": "application/json",
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      },
      env,
    );
  const assetId = crypto.randomUUID(),
    questionId = crypto.randomUUID(),
    presetId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO meme_assets(id,title,object_key,content_type,byte_size,width,height,status) VALUES(?,'Original QA','qa.gif','image/gif',42,1,1,'ACTIVE')",
  )
    .bind(assetId)
    .runSync();
  objects.set("qa.gif", new Uint8Array([71, 73, 70]));
  db.prepare("INSERT INTO questions(id,text,status) VALUES(?,'QA question','ACTIVE')")
    .bind(questionId)
    .runSync();
  db.prepare("INSERT INTO question_meme_assets(question_id,meme_asset_id,position) VALUES(?,?,0)")
    .bind(questionId, assetId)
    .runSync();
  db.prepare(
    "INSERT INTO game_presets(id,name,mode,voting_rules_json,scoring_json,status) VALUES(?,'QA pack','COMMUNITY_MODE',?,?,'ACTIVE')",
  )
    .bind(
      presetId,
      JSON.stringify({ allowSelfVote: false, votesPerPlayer: 1, audienceVoting: true }),
      JSON.stringify({ winnerPoints: 100, participationPoints: 2 }),
    )
    .runSync();
  db.prepare("INSERT INTO preset_questions(preset_id,question_id,position) VALUES(?,?,0)")
    .bind(presetId, questionId)
    .runSync();
  const response = await call("/api/admin/sessions", {
    code: "QA2026",
    name: "QA party",
    presetId,
  });
  if (response.status !== 201) throw new Error(await response.text());
  const socket = (role: ConnectionAttachment["role"], subjectId: string | null) => {
    const value = new TestSocket({
      role,
      subjectId,
      connectedAt: Date.now(),
      authExpiresAt: Date.now() + 3600000,
    });
    storage.sockets.push(value);
    return value;
  };
  const admin = socket("ADMIN", adminId);
  const command = async (peer: TestSocket, command: Record<string, unknown>) => {
    const value = { commandId: crypto.randomUUID(), ...command };
    await room.webSocketMessage(
      peer.webSocket,
      JSON.stringify({ type: "COMMAND", command: value }),
    );
    return value;
  };
  const snapshot = () =>
    persistedGameStateSchema.parse(
      JSON.parse(
        String(
          db.sql.prepare("SELECT state_json FROM sessions WHERE code='QA2026'").get()?.state_json,
        ),
      ),
    );
  const upload = (bytes: Uint8Array, mime = "image/gif", authorized = true) => {
    const form = new FormData();
    form.append("title", "QA upload");
    form.append("tags", "[]");
    form.append("status", "ACTIVE");
    form.append("file", new File([new Uint8Array(bytes)], "qa.gif", { type: mime }));
    return app.request(
      "http://localhost/api/admin/assets",
      {
        method: "POST",
        headers: { ...(authorized ? { Cookie: cookie } : {}), "X-Requested-With": "misthy-admin" },
        body: form,
      },
      env,
    );
  };
  return {
    db,
    env,
    storage,
    objects,
    failure,
    call,
    command,
    admin,
    socket,
    snapshot,
    upload,
    assetId,
    adminId,
    evict() {
      room = new GameSession(storage.durableState, env);
    },
    get room() {
      return room;
    },
  };
}
