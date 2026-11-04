import {
  persistedGameStateSchema,
  type CreateSessionInput,
  type PersistedGameState,
  type SessionRole,
} from "@misthy/shared";
import type { Env } from "./env";
import { issueConnectionTicket } from "./realtime-auth";

type PresetRow = {
  id: string;
  mode: "TALENT_MODE" | "COMMUNITY_MODE";
  scoring_json: string;
  tie_breaker: "EARLIEST_SUBMISSION" | "RANDOM" | "TALENT_DECIDES";
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function uniqueSessionCode(db: D1Database) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let code = "";
    const random = crypto.getRandomValues(new Uint8Array(6));
    for (const value of random) code += CODE_ALPHABET[value % CODE_ALPHABET.length];
    const existing = await db.prepare("SELECT 1 FROM sessions WHERE code=?").bind(code).first();
    if (!existing) return code;
  }
  throw new Error("Could not allocate a unique session code");
}

export async function buildInitialState(
  db: D1Database,
  input: { sessionId: string; sessionCode: string; name: string; presetId: string },
) {
  const preset = await db
    .prepare(
      "SELECT id,mode,scoring_json,tie_breaker FROM game_presets WHERE id=? AND status!='ARCHIVED'",
    )
    .bind(input.presetId)
    .first<PresetRow>();
  if (!preset) return null;
  const questions = (
    await db
      .prepare(
        `SELECT q.id,q.text,q.image_asset_id,q.submission_duration_seconds,q.voting_duration_seconds
         FROM preset_questions pq JOIN questions q ON q.id=pq.question_id
         WHERE pq.preset_id=? AND q.status!='ARCHIVED' ORDER BY pq.position`,
      )
      .bind(input.presetId)
      .all<Record<string, unknown>>()
  ).results;
  if (questions.length === 0) return null;
  const assetLinks = (
    await db
      .prepare(
        `SELECT qma.question_id,qma.meme_asset_id FROM question_meme_assets qma
         JOIN meme_assets ma ON ma.id=qma.meme_asset_id
         WHERE qma.question_id IN (SELECT question_id FROM preset_questions WHERE preset_id=?)
           AND ma.status!='ARCHIVED' ORDER BY qma.position`,
      )
      .bind(input.presetId)
      .all<{ question_id: string; meme_asset_id: string }>()
  ).results;
  const scoring = JSON.parse(preset.scoring_json) as unknown;
  return persistedGameStateSchema.parse({
    schemaVersion: 1,
    sessionId: input.sessionId,
    sessionCode: input.sessionCode,
    name: input.name,
    mode: preset.mode,
    version: 0,
    phase: "LOBBY",
    phaseStartedAt: Date.now(),
    phaseEndsAt: null,
    paused: null,
    questions: questions.map((question) => ({
      id: question.id,
      text: question.text,
      imageAssetId: question.image_asset_id,
      memeAssetIds: assetLinks
        .filter((link) => link.question_id === question.id)
        .map((link) => link.meme_asset_id),
      submissionDurationSeconds: question.submission_duration_seconds,
      votingDurationSeconds: question.voting_duration_seconds,
    })),
    players: [],
    round: null,
    processedCommandIds: [],
    scoring,
    tieBreaker: preset.tie_breaker,
  });
}

export async function createGameSession(env: Env, input: CreateSessionInput, adminId: string) {
  const sessionId = crypto.randomUUID();
  const sessionCode = input.code ?? (await uniqueSessionCode(env.DB));
  const state = await buildInitialState(env.DB, {
    sessionId,
    sessionCode,
    name: input.name,
    presetId: input.presetId,
  });
  if (!state) return null;
  state.manualControl = input.manualControl;
  if (input.assetIds) {
    for (const question of state.questions)
      question.memeAssetIds = question.memeAssetIds.filter((id) => input.assetIds!.includes(id));
    if (state.questions.some((question) => question.memeAssetIds.length === 0)) return null;
  }
  if (input.settings) {
    state.mode = input.settings.mode;
    state.scoring = {
      winnerPoints: input.settings.winnerPoints,
      participationPoints: input.settings.participationPoints,
    };
    state.tieBreaker = input.settings.tieBreaker;
    for (const question of state.questions) {
      question.submissionDurationSeconds = input.settings.submissionDurationSeconds;
      question.votingDurationSeconds = input.settings.votingDurationSeconds;
    }
  }
  await env.DB.prepare(
    `INSERT INTO sessions (id,code,name,default_mode,status,preset_id,created_by,state_version,state_json)
     VALUES (?,?,?,?, 'LOBBY',?,?,?,?)`,
  )
    .bind(
      sessionId,
      sessionCode,
      input.name,
      state.mode,
      input.presetId,
      adminId,
      state.version,
      JSON.stringify(state),
    )
    .run();
  const stub = env.GAME_SESSIONS.get(env.GAME_SESSIONS.idFromName(sessionCode));
  const response = await stub.fetch("https://game.internal/internal/initialize", {
    method: "POST",
    body: JSON.stringify(state),
  });
  if (!response.ok) {
    await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(sessionId).run();
    throw new Error("Durable Object initialization failed");
  }
  return { sessionId, sessionCode, state };
}

export async function issueRoleTicket(
  env: Env,
  session: { id: string; code: string },
  role: SessionRole,
  subjectId: string | null,
  authExpiresAt = Date.now() + 8 * 3600000,
) {
  return issueConnectionTicket(
    { sessionId: session.id, sessionCode: session.code, role, subjectId, authExpiresAt },
    env.ADMIN_SESSION_SECRET,
  );
}

export async function notifyPlayerJoined(
  env: Env,
  sessionCode: string,
  player: PersistedGameState["players"][number],
) {
  const stub = env.GAME_SESSIONS.get(env.GAME_SESSIONS.idFromName(sessionCode));
  return stub.fetch("https://game.internal/internal/player", {
    method: "POST",
    body: JSON.stringify(player),
  });
}
