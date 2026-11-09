import {
  adminBootstrapSchema,
  adminLoginSchema,
  contentImportSchema,
  createSessionSchema,
  deleteSessionSchema,
  judgeCredentialSchema,
  persistedGameStateSchema,
  gamePresetInputSchema,
  gamePresetUpdateSchema,
  memeAssetInputSchema,
  memeAssetUpdateSchema,
  questionInputSchema,
  questionUpdateSchema,
  reorderSchema,
  sessionCodeSchema,
  sessionReviewSchema,
  ticketRequestSchema,
  type ZodType,
} from "@misthy/shared";
import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "./env";
import {
  clearAdminCookie,
  createSessionToken,
  digestText,
  hashPassword,
  requireAdmin,
  safeSecretEqual,
  setAdminCookie,
  verifyPassword,
  type AdminSession,
} from "./auth";
import { ALLOWED_IMAGE_TYPES, inspectImageSignature, uploadLimit } from "./media";
import { createGameSession, issueRoleTicket } from "./session-service";
import { logEvent } from "./observability";
import { createReconnectToken } from "./realtime-auth";

type Variables = { admin: AdminSession };
const adminApi = new Hono<{ Bindings: Env; Variables: Variables }>();

function validationError(issues: unknown) {
  return { error: "validation_failed", message: "Dữ liệu không hợp lệ.", issues };
}

async function readJson<T>(c: Context, schema: ZodType<T>) {
  try {
    return schema.safeParse(await c.req.json());
  } catch {
    return { success: false as const, error: { issues: [{ message: "JSON không hợp lệ." }] } };
  }
}

function assetRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    objectKey: row.object_key,
    contentType: row.content_type,
    byteSize: row.byte_size,
    width: row.width,
    height: row.height,
    tags: JSON.parse(String(row.tags_json ?? "[]")),
    category: row.category,
    status: row.status,
    sourceType: row.source_type,
    altText: row.alt_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contentUrl: row.object_key ? `/api/admin/assets/${row.id}/content` : null,
  };
}

async function loadQuestions(db: D1Database, id?: string) {
  const query = id
    ? db.prepare("SELECT * FROM questions WHERE id = ?").bind(id)
    : db.prepare("SELECT * FROM questions ORDER BY position, created_at");
  const rows = (await query.all<Record<string, unknown>>()).results;
  const links = (
    await db
      .prepare("SELECT question_id, meme_asset_id FROM question_meme_assets ORDER BY position")
      .all<Record<string, string>>()
  ).results;
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    imageAssetId: row.image_asset_id,
    memeAssetIds: links
      .filter((link) => link.question_id === row.id)
      .map((link) => link.meme_asset_id),
    position: row.position,
    submissionDurationSeconds: row.submission_duration_seconds,
    votingDurationSeconds: row.voting_duration_seconds,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function loadPresets(db: D1Database, id?: string) {
  const query = id
    ? db.prepare("SELECT * FROM game_presets WHERE id = ?").bind(id)
    : db.prepare("SELECT * FROM game_presets ORDER BY updated_at DESC");
  const rows = (await query.all<Record<string, unknown>>()).results;
  const links = (
    await db
      .prepare("SELECT preset_id, question_id FROM preset_questions ORDER BY position")
      .all<Record<string, string>>()
  ).results;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    mode: row.mode,
    playMode: row.play_mode,
    roundDurationSeconds: row.round_duration_seconds,
    votingRules: JSON.parse(String(row.voting_rules_json)),
    scoring: JSON.parse(String(row.scoring_json)),
    tieBreaker: row.tie_breaker,
    questionIds: links.filter((link) => link.preset_id === row.id).map((link) => link.question_id),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

adminApi.post("/auth/bootstrap", async (c) => {
  const supplied = c.req.header("X-Bootstrap-Secret") ?? "";
  if (
    !c.env.ADMIN_BOOTSTRAP_PASSWORD ||
    !safeSecretEqual(supplied, c.env.ADMIN_BOOTSTRAP_PASSWORD)
  ) {
    return c.json({ error: "forbidden", message: "Mã khởi tạo không hợp lệ." }, 403);
  }
  logEvent({ event: "admin_bootstrap_stage", stage: "read_admin_count" });
  const count = await c.env.DB.prepare("SELECT count(*) AS count FROM admin_users").first<{
    count: number;
  }>();
  if ((count?.count ?? 0) > 0)
    return c.json({ error: "already_initialized", message: "Quản trị đã được khởi tạo." }, 409);
  logEvent({ event: "admin_bootstrap_stage", stage: "validate_input" });
  const parsed = await readJson(c, adminBootstrapSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const id = crypto.randomUUID();
  logEvent({ event: "admin_bootstrap_stage", stage: "hash_password" });
  const password = await hashPassword(parsed.data.password);
  logEvent({ event: "admin_bootstrap_stage", stage: "insert_admin" });
  await c.env.DB.prepare(
    "INSERT INTO admin_users (id,email,display_name,password_hash,password_salt,password_iterations,role) VALUES (?,?,?,?,?,?, 'OWNER')",
  )
    .bind(
      id,
      parsed.data.email,
      parsed.data.displayName,
      password.hash,
      password.salt,
      password.iterations,
    )
    .run();
  return c.json({ ok: true, id }, 201);
});

adminApi.post("/auth/login", async (c) => {
  const parsed = await readJson(c, adminLoginSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const ipHash = await digestText(c.req.header("CF-Connecting-IP") ?? "local");
  const recent = await c.env.DB.prepare(
    "SELECT count(*) AS count FROM admin_login_attempts WHERE email=? AND ip_hash=? AND succeeded=0 AND julianday(created_at)>julianday('now','-15 minutes')",
  )
    .bind(parsed.data.email, ipHash)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= 5)
    return c.json(
      { error: "rate_limited", message: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau." },
      429,
    );
  const user = await c.env.DB.prepare("SELECT * FROM admin_users WHERE email=? AND status='ACTIVE'")
    .bind(parsed.data.email)
    .first<Record<string, unknown>>();
  const valid =
    user &&
    (await verifyPassword(
      parsed.data.password,
      String(user.password_hash),
      String(user.password_salt),
      Number(user.password_iterations),
    ));
  await c.env.DB.prepare(
    "INSERT INTO admin_login_attempts (id,email,ip_hash,succeeded) VALUES (?,?,?,?)",
  )
    .bind(crypto.randomUUID(), parsed.data.email, ipHash, valid ? 1 : 0)
    .run();
  if (!valid || !user)
    return c.json(
      { error: "invalid_credentials", message: "Email hoặc mật khẩu không đúng." },
      401,
    );
  await c.env.DB.prepare(
    "UPDATE admin_users SET last_login_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
  )
    .bind(user.id)
    .run();
  const session = {
    sub: String(user.id),
    email: String(user.email),
    role: user.role as "OWNER" | "EDITOR",
  };
  setAdminCookie(c, await createSessionToken(session, c.env.ADMIN_SESSION_SECRET));
  return c.json({
    user: {
      id: session.sub,
      email: session.email,
      displayName: user.display_name,
      role: session.role,
    },
  });
});

adminApi.use("/*", requireAdmin);
adminApi.get("/auth/me", (c) => c.json({ user: c.get("admin") }));
adminApi.post("/auth/logout", (c) => {
  clearAdminCookie(c);
  return c.json({ ok: true });
});

adminApi.get("/assets", async (c) => {
  const search = (c.req.query("search") ?? "").trim();
  const status = c.req.query("status") ?? "";
  const category = c.req.query("category") ?? "";
  const result = await c.env.DB.prepare(
    `SELECT * FROM meme_assets WHERE (?='' OR title LIKE '%'||?||'%' OR tags_json LIKE '%'||?||'%') AND (?='' OR status=?) AND (?='' OR category=?) ORDER BY updated_at DESC LIMIT 250`,
  )
    .bind(search, search, search, status, status, category, category)
    .all<Record<string, unknown>>();
  return c.json({ items: result.results.map(assetRow) });
});

adminApi.post("/assets", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return c.json({ error: "file_required", message: "Vui lòng chọn tệp ảnh." }, 400);
  const limit = uploadLimit(c.env.MAX_UPLOAD_BYTES);
  if (file.size <= 0 || file.size > limit)
    return c.json(
      {
        error: "file_too_large",
        message: `Tệp phải nhỏ hơn ${Math.round(limit / 1024 / 1024)} MB.`,
      },
      413,
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectImageSignature(bytes);
  if (
    !inspected ||
    !ALLOWED_IMAGE_TYPES.some((type) => type === file.type) ||
    inspected.contentType !== file.type
  ) {
    return c.json(
      { error: "invalid_file", message: "Định dạng hoặc chữ ký tệp không hợp lệ." },
      415,
    );
  }
  if (
    (inspected.width !== null && (inspected.width < 1 || inspected.width > 4096)) ||
    (inspected.height !== null && (inspected.height < 1 || inspected.height > 4096)) ||
    (inspected.width !== null &&
      inspected.height !== null &&
      inspected.width * inspected.height > 16000000)
  )
    return c.json(
      { error: "image_dimensions", message: "Ảnh tối đa 4096 px mỗi chiều và 16 megapixel." },
      413,
    );
  if (
    inspected.contentType === "image/gif" &&
    (bytes.length < 14 || bytes[bytes.length - 1] !== 0x3b)
  )
    return c.json({ error: "invalid_file", message: "Tệp GIF chưa hoàn chỉnh." }, 415);
  let tags: unknown;
  try {
    tags = JSON.parse(String(form.get("tags") ?? "[]"));
  } catch {
    tags = String(form.get("tags") ?? "")
      .split(",")
      .filter(Boolean);
  }
  const parsed = memeAssetInputSchema.safeParse({
    title: form.get("title"),
    tags,
    category: form.get("category") || undefined,
    status: form.get("status") || undefined,
    altText: form.get("altText") || undefined,
  });
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const id = crypto.randomUUID();
  const date = new Date();
  const objectKey = `memes/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${id}.${inspected.extension}`;
  await c.env.MEME_BUCKET.put(objectKey, bytes, {
    httpMetadata: { contentType: inspected.contentType, cacheControl: "private, max-age=3600" },
    customMetadata: { assetId: id, uploadedBy: c.get("admin").sub },
  });
  try {
    await c.env.DB.prepare(
      `INSERT INTO meme_assets (id,title,object_key,content_type,byte_size,width,height,tags_json,category,status,source_type,alt_text,created_by) VALUES (?,?,?,?,?,?,?,?,?,?, 'R2',?,?)`,
    )
      .bind(
        id,
        parsed.data.title,
        objectKey,
        inspected.contentType,
        file.size,
        inspected.width,
        inspected.height,
        JSON.stringify(parsed.data.tags),
        parsed.data.category,
        parsed.data.status,
        parsed.data.altText,
        c.get("admin").sub,
      )
      .run();
  } catch (error) {
    try {
      await c.env.MEME_BUCKET.delete(objectKey);
    } catch {
      logEvent({ event: "service_error", code: "R2_CLEANUP_REQUIRED", assetId: id });
    }
    throw error;
  }
  const row = await c.env.DB.prepare("SELECT * FROM meme_assets WHERE id=?")
    .bind(id)
    .first<Record<string, unknown>>();
  return c.json({ item: assetRow(row!) }, 201);
});

adminApi.get("/assets/:id/content", async (c) => {
  const asset = await c.env.DB.prepare("SELECT object_key FROM meme_assets WHERE id=?")
    .bind(c.req.param("id"))
    .first<{ object_key: string | null }>();
  if (!asset?.object_key)
    return c.json({ error: "not_found", message: "Không tìm thấy nội dung ảnh." }, 404);
  const object = await c.env.MEME_BUCKET.get(asset.object_key);
  if (!object)
    return c.json({ error: "storage_not_found", message: "Tệp không còn trong kho lưu trữ." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
});

adminApi.patch("/assets/:id", async (c) => {
  const parsed = await readJson(c, memeAssetUpdateSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const current = await c.env.DB.prepare("SELECT * FROM meme_assets WHERE id=?")
    .bind(c.req.param("id"))
    .first<Record<string, unknown>>();
  if (!current) return c.json({ error: "not_found", message: "Không tìm thấy meme." }, 404);
  const next = memeAssetInputSchema.parse({
    title: current.title,
    tags: JSON.parse(String(current.tags_json)),
    category: current.category,
    status: current.status,
    altText: current.alt_text,
    ...parsed.data,
  });
  await c.env.DB.prepare(
    "UPDATE meme_assets SET title=?,tags_json=?,category=?,status=?,alt_text=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),archived_at=CASE WHEN ?='ARCHIVED' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END WHERE id=?",
  )
    .bind(
      next.title,
      JSON.stringify(next.tags),
      next.category,
      next.status,
      next.altText,
      next.status,
      c.req.param("id"),
    )
    .run();
  return c.json({
    item: assetRow(
      (await c.env.DB.prepare("SELECT * FROM meme_assets WHERE id=?")
        .bind(c.req.param("id"))
        .first<Record<string, unknown>>())!,
    ),
  });
});

adminApi.delete("/assets/:id", async (c) => {
  const id = c.req.param("id");
  const asset = await c.env.DB.prepare("SELECT object_key FROM meme_assets WHERE id=?")
    .bind(id)
    .first<{ object_key: string | null }>();
  if (!asset) return c.json({ error: "not_found" }, 404);
  if (c.req.query("mode") !== "delete") {
    await c.env.DB.prepare(
      "UPDATE meme_assets SET status='ARCHIVED',archived_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
    )
      .bind(id)
      .run();
    return c.json({ ok: true, archived: true });
  }
  const used = await c.env.DB.prepare(
    "SELECT (SELECT count(*) FROM question_meme_assets WHERE meme_asset_id=?) + (SELECT count(*) FROM questions WHERE image_asset_id=?) AS count",
  )
    .bind(id, id)
    .first<{ count: number }>();
  if ((used?.count ?? 0) > 0)
    return c.json(
      {
        error: "asset_in_use",
        message: "Meme đang được câu hỏi sử dụng; hãy lưu trữ thay vì xóa.",
      },
      409,
    );
  await c.env.DB.prepare("DELETE FROM meme_assets WHERE id=?").bind(id).run();
  if (asset.object_key) await c.env.MEME_BUCKET.delete(asset.object_key);
  return c.json({ ok: true, deleted: true });
});

adminApi.get("/questions", async (c) => c.json({ items: await loadQuestions(c.env.DB) }));
adminApi.get("/questions/:id/preview", async (c) => {
  const [item] = await loadQuestions(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not_found", message: "Không tìm thấy câu hỏi." }, 404);
  return c.json({ item });
});

async function replaceQuestionAssets(db: D1Database, questionId: string, assetIds: string[]) {
  const statements = [
    db.prepare("DELETE FROM question_meme_assets WHERE question_id=?").bind(questionId),
  ];
  assetIds.forEach((assetId, position) =>
    statements.push(
      db
        .prepare(
          "INSERT INTO question_meme_assets (question_id,meme_asset_id,position) VALUES (?,?,?)",
        )
        .bind(questionId, assetId, position),
    ),
  );
  await db.batch(statements);
}

adminApi.post("/questions", async (c) => {
  const parsed = await readJson(c, questionInputSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const id = crypto.randomUUID();
  const value = parsed.data;
  await c.env.DB.prepare(
    "INSERT INTO questions (id,text,image_asset_id,position,submission_duration_seconds,voting_duration_seconds,status,created_by) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      value.text,
      value.imageAssetId,
      value.position,
      value.submissionDurationSeconds,
      value.votingDurationSeconds,
      value.status,
      c.get("admin").sub,
    )
    .run();
  try {
    await replaceQuestionAssets(c.env.DB, id, value.memeAssetIds);
  } catch (error) {
    await c.env.DB.prepare("DELETE FROM questions WHERE id=?").bind(id).run();
    throw error;
  }
  return c.json({ item: (await loadQuestions(c.env.DB, id))[0] }, 201);
});

adminApi.patch("/questions/:id", async (c) => {
  const parsed = await readJson(c, questionUpdateSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const [current] = await loadQuestions(c.env.DB, c.req.param("id"));
  if (!current) return c.json({ error: "not_found" }, 404);
  const value = questionInputSchema.parse({ ...current, ...parsed.data });
  await c.env.DB.prepare(
    "UPDATE questions SET text=?,image_asset_id=?,position=?,submission_duration_seconds=?,voting_duration_seconds=?,status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
  )
    .bind(
      value.text,
      value.imageAssetId,
      value.position,
      value.submissionDurationSeconds,
      value.votingDurationSeconds,
      value.status,
      c.req.param("id"),
    )
    .run();
  await replaceQuestionAssets(c.env.DB, c.req.param("id"), value.memeAssetIds);
  return c.json({ item: (await loadQuestions(c.env.DB, c.req.param("id")))[0] });
});

adminApi.delete("/questions/:id", async (c) => {
  const used = await c.env.DB.prepare(
    "SELECT count(*) AS count FROM preset_questions WHERE question_id=?",
  )
    .bind(c.req.param("id"))
    .first<{ count: number }>();
  if ((used?.count ?? 0) > 0)
    return c.json({ error: "question_in_use", message: "Câu hỏi đang nằm trong preset." }, 409);
  const result = await c.env.DB.prepare("DELETE FROM questions WHERE id=?")
    .bind(c.req.param("id"))
    .run();
  return c.json({ ok: true, deleted: result.meta.changes > 0 });
});

adminApi.post("/questions/reorder", async (c) => {
  const parsed = await readJson(c, reorderSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  await c.env.DB.batch(
    parsed.data.ids.map((id: string, position: number) =>
      c.env.DB.prepare("UPDATE questions SET position=? WHERE id=?").bind(position, id),
    ),
  );
  return c.json({ items: await loadQuestions(c.env.DB) });
});

adminApi.get("/presets", async (c) => c.json({ items: await loadPresets(c.env.DB) }));
adminApi.get("/presets/:id/preview", async (c) => {
  const [item] = await loadPresets(c.env.DB, c.req.param("id"));
  if (!item) return c.json({ error: "not_found" }, 404);
  return c.json({
    item,
    questions: (await loadQuestions(c.env.DB)).filter((question) =>
      (item.questionIds as string[]).includes(String(question.id)),
    ),
  });
});

async function replacePresetQuestions(db: D1Database, presetId: string, questionIds: string[]) {
  const statements = [db.prepare("DELETE FROM preset_questions WHERE preset_id=?").bind(presetId)];
  questionIds.forEach((questionId, position) =>
    statements.push(
      db
        .prepare("INSERT INTO preset_questions (preset_id,question_id,position) VALUES (?,?,?)")
        .bind(presetId, questionId, position),
    ),
  );
  await db.batch(statements);
}

adminApi.post("/presets", async (c) => {
  const parsed = await readJson(c, gamePresetInputSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const id = crypto.randomUUID();
  const value = parsed.data;
  await c.env.DB.prepare(
    "INSERT INTO game_presets (id,name,description,mode,play_mode,round_duration_seconds,voting_rules_json,scoring_json,tie_breaker,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      value.name,
      value.description,
      value.mode,
      value.playMode,
      value.roundDurationSeconds,
      JSON.stringify(value.votingRules),
      JSON.stringify(value.scoring),
      value.tieBreaker,
      value.status,
      c.get("admin").sub,
    )
    .run();
  try {
    await replacePresetQuestions(c.env.DB, id, value.questionIds);
  } catch (error) {
    await c.env.DB.prepare("DELETE FROM game_presets WHERE id=?").bind(id).run();
    throw error;
  }
  return c.json({ item: (await loadPresets(c.env.DB, id))[0] }, 201);
});

adminApi.patch("/presets/:id", async (c) => {
  const patch = await readJson(c, gamePresetUpdateSchema);
  if (!patch.success) return c.json(validationError(patch.error.issues), 400);
  const [current] = await loadPresets(c.env.DB, c.req.param("id"));
  if (!current) return c.json({ error: "not_found" }, 404);
  const parsed = gamePresetInputSchema.safeParse({ ...current, ...patch.data });
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const value = parsed.data;
  await c.env.DB.prepare(
    "UPDATE game_presets SET name=?,description=?,mode=?,play_mode=?,round_duration_seconds=?,voting_rules_json=?,scoring_json=?,tie_breaker=?,status=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
  )
    .bind(
      value.name,
      value.description,
      value.mode,
      value.playMode,
      value.roundDurationSeconds,
      JSON.stringify(value.votingRules),
      JSON.stringify(value.scoring),
      value.tieBreaker,
      value.status,
      c.req.param("id"),
    )
    .run();
  await replacePresetQuestions(c.env.DB, c.req.param("id"), value.questionIds);
  return c.json({ item: (await loadPresets(c.env.DB, c.req.param("id")))[0] });
});

adminApi.delete("/presets/:id", async (c) => {
  const used = await c.env.DB.prepare("SELECT count(*) AS count FROM sessions WHERE preset_id=?")
    .bind(c.req.param("id"))
    .first<{ count: number }>();
  if ((used?.count ?? 0) > 0)
    return c.json({ error: "preset_in_use", message: "Preset đã được gắn với phiên chơi." }, 409);
  const result = await c.env.DB.prepare("DELETE FROM game_presets WHERE id=?")
    .bind(c.req.param("id"))
    .run();
  return c.json({ ok: true, deleted: result.meta.changes > 0 });
});

adminApi.post("/presets/:id/reorder", async (c) => {
  const parsed = await readJson(c, reorderSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  await replacePresetQuestions(c.env.DB, c.req.param("id"), parsed.data.ids);
  return c.json({ item: (await loadPresets(c.env.DB, c.req.param("id")))[0] });
});

adminApi.get("/content/export", async (c) =>
  c.json({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    questions: (await loadQuestions(c.env.DB)).map(
      ({ createdAt: _created, updatedAt: _updated, ...question }) => question,
    ),
    presets: (await loadPresets(c.env.DB)).map(
      ({ createdAt: _created, updatedAt: _updated, ...preset }) => preset,
    ),
  }),
);

adminApi.post("/content/import", async (c) => {
  const parsed = await readJson(c, contentImportSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const existingQuestions = new Set((await loadQuestions(c.env.DB)).map((item) => String(item.id)));
  const existingPresets = new Set((await loadPresets(c.env.DB)).map((item) => String(item.id)));
  const duplicateIds = [
    ...parsed.data.pack.questions
      .filter((item) => existingQuestions.has(item.id))
      .map((item) => item.id),
    ...parsed.data.pack.presets
      .filter((item) => existingPresets.has(item.id))
      .map((item) => item.id),
  ];
  if (duplicateIds.length && parsed.data.duplicateStrategy === "REJECT")
    return c.json(
      { error: "duplicate_ids", message: "Gói nội dung có ID đã tồn tại.", duplicateIds },
      409,
    );
  const idMap: Record<string, string> = {};
  const mapId = (id: string, exists: boolean) => {
    if (!exists || parsed.data.duplicateStrategy !== "REGENERATE") return id;
    return (idMap[id] ??= crypto.randomUUID());
  };
  const questions = parsed.data.pack.questions
    .filter((item) => parsed.data.duplicateStrategy !== "SKIP" || !existingQuestions.has(item.id))
    .map((item) => ({ ...item, id: mapId(item.id, existingQuestions.has(item.id)) }));
  const presets = parsed.data.pack.presets
    .filter((item) => parsed.data.duplicateStrategy !== "SKIP" || !existingPresets.has(item.id))
    .map((item) => ({
      ...item,
      id: mapId(item.id, existingPresets.has(item.id)),
      questionIds: item.questionIds.map((id) => idMap[id] ?? id),
    }));
  const availableQuestions = new Set([...existingQuestions, ...questions.map((item) => item.id)]);
  const missingQuestions = [
    ...new Set(
      presets.flatMap((item) => item.questionIds).filter((id) => !availableQuestions.has(id)),
    ),
  ];
  if (missingQuestions.length)
    return c.json(
      {
        error: "missing_question_ids",
        message: "Preset tham chiếu câu hỏi không tồn tại.",
        missingQuestionIds: missingQuestions,
      },
      400,
    );
  const availableAssets = new Set(
    (await c.env.DB.prepare("SELECT id FROM meme_assets").all<{ id: string }>()).results.map(
      (row) => row.id,
    ),
  );
  const missingAssets = [
    ...new Set(
      questions
        .flatMap((item) => [item.imageAssetId, ...item.memeAssetIds])
        .filter((id): id is string => Boolean(id) && !availableAssets.has(id!)),
    ),
  ];
  if (missingAssets.length)
    return c.json(
      {
        error: "missing_asset_ids",
        message: "Gói tham chiếu meme không tồn tại; hãy tải asset trước.",
        missingAssetIds: missingAssets,
      },
      400,
    );

  const statements: D1PreparedStatement[] = [];
  for (const item of questions) {
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO questions (id,text,image_asset_id,position,submission_duration_seconds,voting_duration_seconds,status,created_by) VALUES (?,?,?,?,?,?,?,?)",
      ).bind(
        item.id,
        item.text,
        item.imageAssetId,
        item.position,
        item.submissionDurationSeconds,
        item.votingDurationSeconds,
        item.status,
        c.get("admin").sub,
      ),
    );
    item.memeAssetIds.forEach((assetId, position) =>
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO question_meme_assets (question_id,meme_asset_id,position) VALUES (?,?,?)",
        ).bind(item.id, assetId, position),
      ),
    );
  }
  for (const item of presets) {
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO game_presets (id,name,description,mode,play_mode,round_duration_seconds,voting_rules_json,scoring_json,tie_breaker,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        item.id,
        item.name,
        item.description,
        item.mode,
        item.playMode,
        item.roundDurationSeconds,
        JSON.stringify(item.votingRules),
        JSON.stringify(item.scoring),
        item.tieBreaker,
        item.status,
        c.get("admin").sub,
      ),
    );
    item.questionIds.forEach((questionId, position) =>
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO preset_questions (preset_id,question_id,position) VALUES (?,?,?)",
        ).bind(item.id, questionId, position),
      ),
    );
  }
  if (statements.length) await c.env.DB.batch(statements);
  return c.json(
    {
      ok: true,
      imported: { questions: questions.length, presets: presets.length },
      skipped: duplicateIds.length - Object.keys(idMap).length,
      idMap,
    },
    201,
  );
});

adminApi.post("/sessions", async (c) => {
  const parsed = await readJson(c, createSessionSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const input = parsed.data;
  try {
    const created = await createGameSession(c.env, input, c.get("admin").sub);
    if (!created) {
      return c.json(
        { error: "invalid_preset", message: "Preset không tồn tại hoặc không có câu hỏi." },
        400,
      );
    }
    const ticket = await issueRoleTicket(
      c.env,
      { id: created.sessionId, code: created.sessionCode },
      "ADMIN",
      c.get("admin").sub,
      c.get("admin").exp,
    );
    return c.json(
      {
        session: {
          id: created.sessionId,
          code: created.sessionCode,
          name: created.state.name,
          mode: created.state.mode,
        },
        connection: {
          url: `/ws/${created.sessionCode}`,
          protocols: ["misthy-v1", ticket],
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return c.json({ error: "code_in_use", message: "Mã phòng đã được sử dụng." }, 409);
    }
    throw error;
  }
});

adminApi.get("/sessions", async (c) =>
  c.json({
    items: (
      await c.env.DB.prepare(
        "SELECT id,code,name,status FROM sessions WHERE status!='ARCHIVED' ORDER BY created_at DESC LIMIT 100",
      ).all()
    ).results,
  }),
);
adminApi.delete("/sessions/:sessionCode", async (c) => {
  const parsed = await readJson(c, deleteSessionSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const session = await c.env.DB.prepare(
    "SELECT id FROM sessions WHERE code=? AND status!='ARCHIVED'",
  )
    .bind(c.req.param("sessionCode"))
    .first<{ id: string }>();
  if (!session) return c.json({ error: "not_found", message: "Không tìm thấy phiên." }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE sessions SET status='ARCHIVED' WHERE id=?").bind(session.id),
    c.env.DB.prepare(
      "INSERT INTO audit_events(id,session_id,actor_type,actor_id,event_type,payload_json) VALUES(?,?,'ADMIN',?,'SESSION_ARCHIVED','{}')",
    ).bind(crypto.randomUUID(), session.id, c.get("admin").sub),
  ]);
  return c.json({ ok: true, archived: true });
});
adminApi.get("/sessions/:sessionCode/review", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT s.id AS submission_id,r.round_number,r.prompt,s.meme_asset_id,p.display_name,s.submitted_at,
      count(v.id) AS vote_count
     FROM sessions ss JOIN rounds r ON r.session_id=ss.id
     JOIN submissions s ON s.round_id=r.id JOIN players p ON p.id=s.player_id
     LEFT JOIN votes v ON v.submission_id=s.id
     WHERE ss.code=? AND ss.status!='ARCHIVED'
     GROUP BY s.id,r.round_number,r.prompt,s.meme_asset_id,p.display_name,s.submitted_at
     ORDER BY r.round_number,s.submitted_at`,
  )
    .bind(c.req.param("sessionCode"))
    .all<{
      submission_id: string;
      round_number: number;
      prompt: string;
      meme_asset_id: string;
      display_name: string;
      submitted_at: string;
      vote_count: number;
    }>();
  return c.json(
    sessionReviewSchema.parse({
      items: rows.results.map((row) => ({
        submissionId: row.submission_id,
        roundNumber: row.round_number,
        prompt: row.prompt,
        memeAssetId: row.meme_asset_id,
        playerName: row.display_name,
        submittedAt: row.submitted_at,
        voteCount: row.vote_count,
      })),
    }),
  );
});
adminApi.get("/sessions/:sessionCode/audit", async (c) =>
  c.json({
    items: (
      await c.env.DB.prepare(
        "SELECT a.id,a.actor_type,a.actor_id,a.event_type,a.payload_json,a.created_at FROM audit_events a JOIN sessions s ON s.id=a.session_id WHERE s.code=? ORDER BY a.created_at DESC LIMIT 100",
      )
        .bind(c.req.param("sessionCode"))
        .all()
    ).results,
  }),
);
adminApi.post("/sessions/:sessionCode/judge", async (c) => {
  const parsed = await readJson(c, judgeCredentialSchema);
  if (!parsed.success) return c.json(validationError(parsed.error.issues), 400);
  const session = await c.env.DB.prepare("SELECT id,state_json FROM sessions WHERE code=?")
    .bind(c.req.param("sessionCode"))
    .first<{ id: string; state_json: string }>();
  if (!session) return c.json({ message: "Không tìm thấy phòng." }, 404);
  if (!persistedGameStateSchema.parse(JSON.parse(session.state_json)).manualControl)
    return c.json({ message: "Tạo phiên thủ công để cấp quyền Talent." }, 400);
  const id = crypto.randomUUID();
  // Keep legacy non-null password columns populated without exposing a Talent password.
  const password = await hashPassword(createReconnectToken());
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM judge_grants WHERE session_id=?").bind(session.id),
    c.env.DB.prepare(
      "INSERT INTO judge_grants(id,session_id,display_name,password_hash,password_salt,password_iterations) VALUES(?,?,?,?,?,?)",
    ).bind(
      id,
      session.id,
      parsed.data.displayName,
      password.hash,
      password.salt,
      password.iterations,
    ),
    c.env.DB.prepare(
      "INSERT INTO audit_events(id,session_id,actor_type,actor_id,event_type,payload_json) VALUES(?,?,'ADMIN',?,'JUDGE_CREDENTIAL_ROTATED','{}')",
    ).bind(crypto.randomUUID(), session.id, c.get("admin").sub),
  ]);
  return c.json({ url: `/judge/${c.req.param("sessionCode")}` }, 201);
});

adminApi.post("/sessions/:sessionCode/ticket", async (c) => {
  const code = sessionCodeSchema.safeParse(c.req.param("sessionCode"));
  const parsed = await readJson(c, ticketRequestSchema);
  if (!code.success || !parsed.success) {
    return c.json(
      { error: "validation_failed", message: "Vai trò hoặc mã phòng không hợp lệ." },
      400,
    );
  }
  if (parsed.data.role === "JUDGE")
    return c.json({ message: "Talent cần đăng nhập bằng quyền riêng." }, 403);
  const session = await c.env.DB.prepare(
    "SELECT id,code FROM sessions WHERE code=? AND status!='ARCHIVED'",
  )
    .bind(code.data)
    .first<{ id: string; code: string }>();
  if (!session) return c.json({ error: "not_found", message: "Không tìm thấy phòng." }, 404);
  const ticket = await issueRoleTicket(
    c.env,
    session,
    parsed.data.role,
    parsed.data.role === "DISPLAY" ? null : c.get("admin").sub,
    c.get("admin").exp,
  );
  return c.json({ connection: { url: `/ws/${session.code}`, protocols: ["misthy-v1", ticket] } });
});

export { adminApi };
