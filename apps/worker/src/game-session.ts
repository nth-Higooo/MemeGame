import {
  clientMessageSchema,
  connectionAttachmentSchema,
  enginePlayerSchema,
  persistedGameStateSchema,
  type GameCommand,
  type ConnectionAttachment,
  type PersistedGameState,
  type ServerMessage,
} from "@misthy/shared";
import {
  addPlayer,
  applyDeadline,
  applyGameCommand,
  EngineError,
  projectPublicState,
  type EngineActor,
  type EngineEffect,
} from "@misthy/game-engine";
import type { Env } from "./env";
import { verifyConnectionTicket } from "./realtime-auth";

const textEncoder = new TextEncoder();
const STATE_KEY = "engineState";
const SESSION_ID_KEY = "sessionId";

export class GameSession implements DurableObject {
  // D1 awaits permit event interleaving; queue complete mutations per room.
  private mutationQueue: Promise<void> = Promise.resolve();

  private exclusive<T>(action: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(action);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    return this.exclusive(() => this.handleFetch(request));
  }

  private async handleFetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/internal/initialize" && request.method === "POST") {
      return this.initialize(request);
    }
    if (url.pathname === "/internal/player" && request.method === "POST") {
      return this.joinPlayer(request);
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "upgrade_required" }, { status: 426 });
    }
    return this.acceptConnection(request);
  }

  async alarm(): Promise<void> {
    return this.exclusive(() => this.handleAlarm());
  }

  private async handleAlarm(): Promise<void> {
    const current = await this.loadState();
    const result = applyDeadline(current, Date.now());
    if (result.duplicate) {
      await this.scheduleAlarm(current);
      return;
    }
    await this.commit(current, result.state, result.effects, null, {
      role: "ADMIN",
      subjectId: null,
    });
    await this.broadcast(result.state);
  }

  async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    return this.exclusive(() => this.handleMessage(socket, rawMessage));
  }

  private async handleMessage(socket: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    const text = typeof rawMessage === "string" ? rawMessage : new TextDecoder().decode(rawMessage);
    if (textEncoder.encode(text).byteLength > 8_192) {
      this.send(socket, {
        type: "ERROR",
        code: "MESSAGE_TOO_LARGE",
        message: "Tin nhắn vượt quá giới hạn.",
      });
      socket.close(1009, "Message too large");
      return;
    }
    let candidate: unknown;
    try {
      candidate = JSON.parse(text);
    } catch {
      this.send(socket, { type: "ERROR", code: "INVALID_JSON", message: "Tin nhắn không hợp lệ." });
      return;
    }
    const parsed = clientMessageSchema.safeParse(candidate);
    if (!parsed.success) {
      this.send(socket, {
        type: "ERROR",
        code: "INVALID_MESSAGE",
        message: "Loại tin nhắn chưa được hỗ trợ.",
      });
      return;
    }
    if (parsed.data.type === "PING") {
      this.send(socket, { type: "PONG", sentAt: parsed.data.sentAt, serverTime: Date.now() });
      return;
    }
    const attachment = this.readAttachment(socket);
    if (!attachment) {
      socket.close(1008, "Missing connection identity");
      return;
    }
    const current = await this.loadState();
    if (parsed.data.type === "CLIENT_READY") {
      if (!(await this.privilegeAllowed(attachment, current.sessionId))) {
        socket.close(1008, "Authorization expired");
        return;
      }
      this.sendSnapshot(socket, current, attachment);
      return;
    }
    try {
      if (!(await this.privilegeAllowed(attachment, current.sessionId)))
        throw new EngineError("UNAUTHORIZED_COMMAND", "Quyền điều khiển đã hết hiệu lực.");
      const result = applyGameCommand(
        current,
        parsed.data.command,
        { role: attachment.role, subjectId: attachment.subjectId },
        Date.now(),
      );
      if (!result.duplicate) {
        await this.commit(current, result.state, result.effects, parsed.data.command, attachment);
        await this.broadcast(result.state);
      }
      this.send(socket, {
        type: "COMMAND_ACK",
        commandId: parsed.data.command.commandId,
        version: result.state.version,
        duplicate: result.duplicate,
      });
    } catch (error) {
      const engineError =
        error instanceof EngineError
          ? error
          : new EngineError("COMMAND_FAILED", "Không thể xử lý lệnh trò chơi.");
      this.send(socket, {
        type: "ERROR",
        code: engineError.code,
        message: engineError.message,
        commandId: parsed.data.command.commandId,
      });
    }
  }

  async webSocketClose(
    _socket: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const current = await this.loadState().catch(() => null);
    if (current) await this.broadcast(current);
  }

  webSocketError(socket: WebSocket): void {
    if (socket.readyState === WebSocket.OPEN) socket.close(1011, "Realtime connection error");
  }

  private async initialize(request: Request) {
    const parsed = persistedGameStateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "invalid_state" }, { status: 400 });
    const existing = await this.state.storage.get(STATE_KEY);
    if (existing) return Response.json({ error: "already_initialized" }, { status: 409 });
    await this.state.storage.put({
      [STATE_KEY]: parsed.data,
      [SESSION_ID_KEY]: parsed.data.sessionId,
    });
    return Response.json({ ok: true }, { status: 201 });
  }

  private async joinPlayer(request: Request) {
    const parsed = enginePlayerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "invalid_player" }, { status: 400 });
    try {
      const current = await this.loadState();
      const next = addPlayer(current, parsed.data);
      if (next !== current) {
        await this.commit(current, next, [{ type: "STATE_CHANGED" }], null, {
          role: "PLAYER",
          subjectId: parsed.data.id,
        });
        await this.broadcast(next);
      }
      return Response.json({ ok: true }, { status: 201 });
    } catch (error) {
      if (error instanceof EngineError) {
        return Response.json({ error: error.code, message: error.message }, { status: 409 });
      }
      throw error;
    }
  }

  private async acceptConnection(request: Request) {
    const protocols = (request.headers.get("Sec-WebSocket-Protocol") ?? "")
      .split(",")
      .map((value) => value.trim());
    const token = protocols.find((value) => value !== "misthy-v1");
    const ticket = token
      ? await verifyConnectionTicket(token, this.env.ADMIN_SESSION_SECRET)
      : null;
    const current = await this.loadState();
    if (
      !ticket ||
      ticket.sessionId !== current.sessionId ||
      ticket.sessionCode !== current.sessionCode
    ) {
      return Response.json({ error: "invalid_connection_ticket" }, { status: 401 });
    }
    if (ticket.role === "PLAYER" && !current.players.some((item) => item.id === ticket.subjectId)) {
      return Response.json({ error: "player_not_found" }, { status: 401 });
    }
    if (!(await this.privilegeAllowed(ticket, current.sessionId)))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const tags = [`role:${ticket.role}`];
    if (ticket.subjectId) tags.push(`subject:${ticket.subjectId}`);
    this.state.acceptWebSocket(server, tags);
    const attachment: ConnectionAttachment = {
      role: ticket.role,
      subjectId: ticket.subjectId,
      connectedAt: Date.now(),
      ...(ticket.authExpiresAt ? { authExpiresAt: ticket.authExpiresAt } : {}),
      ...(ticket.authSessionId ? { authSessionId: ticket.authSessionId } : {}),
    };
    server.serializeAttachment(attachment);
    this.sendSnapshot(server, current, attachment);
    await this.broadcast(current);
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { "Sec-WebSocket-Protocol": "misthy-v1" },
    });
  }

  private async loadState(): Promise<PersistedGameState> {
    const stored = persistedGameStateSchema.safeParse(await this.state.storage.get(STATE_KEY));
    const storedSessionId = await this.state.storage.get<string>(SESSION_ID_KEY);
    const sessionId = stored.success ? stored.data.sessionId : storedSessionId;
    const durable = stored.success ? stored.data : null;
    const d1 = sessionId
      ? await this.env.DB.prepare("SELECT state_json FROM sessions WHERE id=?")
          .bind(sessionId)
          .first<{ state_json: string | null }>()
      : null;
    let database: ReturnType<typeof persistedGameStateSchema.safeParse> | null = null;
    if (d1?.state_json) {
      try {
        database = persistedGameStateSchema.safeParse(JSON.parse(d1.state_json));
      } catch {
        database = null;
      }
    }
    if (database?.success && (!durable || database.data.version > durable.version)) {
      await this.state.storage.put(STATE_KEY, database.data);
      return database.data;
    }
    if (durable) return durable;
    throw new Error("Game session is not initialized");
  }

  private async privilegeAllowed(
    identity: {
      role: string;
      subjectId: string | null;
      authExpiresAt?: number | undefined;
      authSessionId?: string | undefined;
    },
    sessionId: string,
  ) {
    if (!["ADMIN", "JUDGE"].includes(identity.role)) return true;
    if (identity.authExpiresAt !== undefined && identity.authExpiresAt < Date.now()) return false;
    if (!identity.subjectId) return false;
    if (identity.role === "ADMIN")
      return Boolean(
        await this.env.DB.prepare("SELECT id FROM admin_users WHERE id=? AND status='ACTIVE'")
          .bind(identity.subjectId)
          .first(),
      );
    return Boolean(
      await this.env.DB.prepare(
        "SELECT g.id FROM judge_grants g JOIN judge_sessions j ON j.grant_id=g.id WHERE g.id=? AND g.session_id=? AND g.active=1 AND j.token_hash=? AND j.expires_at>?",
      )
        .bind(identity.subjectId, sessionId, identity.authSessionId ?? "", Date.now())
        .first(),
    );
  }

  private async commit(
    previous: PersistedGameState,
    next: PersistedGameState,
    effects: EngineEffect[],
    command: GameCommand | null,
    actor: EngineActor,
  ) {
    const statements = this.persistenceStatements(previous, next, effects, command, actor);
    await this.env.DB.batch(statements);
    await this.state.storage.put(STATE_KEY, next);
    await this.scheduleAlarm(next);
  }

  private persistenceStatements(
    previous: PersistedGameState,
    next: PersistedGameState,
    effects: EngineEffect[],
    command: GameCommand | null,
    actor: EngineActor,
  ) {
    const status =
      next.phase === "LOBBY"
        ? "LOBBY"
        : next.phase === "FINISHED"
          ? "FINISHED"
          : next.paused
            ? "PAUSED"
            : "ACTIVE";
    const statements: D1PreparedStatement[] = [
      this.env.DB.prepare(
        `UPDATE sessions SET status=?,active_round_id=?,state_version=?,state_json=?,
         finished_at=CASE WHEN ?='FINISHED' THEN ? ELSE NULL END,
         updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
      ).bind(
        status,
        next.round?.id ?? null,
        next.version,
        JSON.stringify(next),
        status,
        status === "FINISHED" ? new Date().toISOString() : null,
        next.sessionId,
      ),
    ];

    if (next.round && previous.round?.id !== next.round.id) {
      const question = next.questions[next.round.questionIndex]!;
      statements.push(
        this.env.DB.prepare(
          `INSERT INTO rounds (id,session_id,round_number,mode,prompt,phase,phase_ends_at,question_id,
           submission_duration_seconds,voting_duration_seconds,phase_started_at,eligible_voter_ids_json)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(
          next.round.id,
          next.sessionId,
          next.round.number,
          next.mode,
          question.text,
          next.phase,
          next.phaseEndsAt ? new Date(next.phaseEndsAt).toISOString() : null,
          question.id,
          question.submissionDurationSeconds,
          question.votingDurationSeconds,
          next.phaseStartedAt ? new Date(next.phaseStartedAt).toISOString() : null,
          JSON.stringify(next.round.eligibleVoterIds),
        ),
      );
    } else if (next.round) {
      statements.push(
        this.env.DB.prepare(
          `UPDATE rounds SET phase=?,phase_ends_at=?,phase_started_at=?,eligible_voter_ids_json=?,
           winner_submission_id=?,finalized_at=?,completed_at=?,revision=revision+1 WHERE id=?`,
        ).bind(
          next.phase,
          next.phaseEndsAt ? new Date(next.phaseEndsAt).toISOString() : null,
          next.phaseStartedAt ? new Date(next.phaseStartedAt).toISOString() : null,
          JSON.stringify(next.round.eligibleVoterIds),
          next.round.winnerSubmissionId,
          next.round.finalizedAt ? new Date(next.round.finalizedAt).toISOString() : null,
          next.round.finalizedAt ? new Date(next.round.finalizedAt).toISOString() : null,
          next.round.id,
        ),
      );
    }

    for (const effect of effects) {
      if (effect.type === "SUBMISSION_ACCEPTED") {
        const submission = next.round!.submissions.find((item) => item.id === effect.submissionId)!;
        statements.push(
          this.env.DB.prepare(
            "INSERT INTO submissions (id,round_id,player_id,meme_asset_id,command_id,submitted_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET meme_asset_id=excluded.meme_asset_id,command_id=excluded.command_id,submitted_at=excluded.submitted_at",
          ).bind(
            submission.id,
            next.round!.id,
            submission.playerId,
            submission.memeAssetId,
            submission.commandId,
            new Date(submission.submittedAt).toISOString(),
          ),
        );
      }
      if (effect.type === "VOTE_ACCEPTED") {
        const vote = next.round!.votes.find((item) => item.id === effect.voteId)!;
        statements.push(
          this.env.DB.prepare(
            "INSERT INTO votes (id,round_id,voter_player_id,submission_id,command_id,created_at) VALUES (?,?,?,?,?,?)",
          ).bind(
            vote.id,
            next.round!.id,
            vote.voterPlayerId,
            vote.submissionId,
            vote.commandId,
            new Date(vote.castAt).toISOString(),
          ),
        );
      }
      if (effect.type === "ROUND_FINALIZED") {
        this.appendScoreStatements(statements, next);
      }
      if (effect.type === "SCORE_CORRECTED") {
        statements.push(
          this.env.DB.prepare("UPDATE players SET score=? WHERE id=?").bind(
            next.players.find((player) => player.id === effect.playerId)!.score,
            effect.playerId,
          ),
        );
        statements.push(
          this.env.DB.prepare(
            "INSERT INTO score_events (id,session_id,round_id,player_id,points,reason,metadata_json) VALUES (?,?,?,?,?,'ADMIN_CORRECTION',?)",
          ).bind(
            crypto.randomUUID(),
            next.sessionId,
            next.round?.id ?? null,
            effect.playerId,
            effect.delta,
            JSON.stringify({
              reason: effect.reason,
              actorId: actor.subjectId,
              commandId: command?.commandId,
            }),
          ),
        );
      }
      if (effect.type === "ROUND_RESTARTED" && next.round) {
        statements.push(
          this.env.DB.prepare(
            "DELETE FROM score_events WHERE round_id=? AND reason IN ('ROUND_WINNER','PARTICIPATION')",
          ).bind(next.round.id),
          this.env.DB.prepare("DELETE FROM votes WHERE round_id=?").bind(next.round.id),
          this.env.DB.prepare("DELETE FROM submissions WHERE round_id=?").bind(next.round.id),
        );
        for (const player of next.players) {
          statements.push(
            this.env.DB.prepare("UPDATE players SET score=? WHERE id=?").bind(
              player.score,
              player.id,
            ),
          );
        }
      }
      if (effect.type === "SESSION_RESET") {
        statements.push(
          this.env.DB.prepare("DELETE FROM score_events WHERE session_id=?").bind(next.sessionId),
          this.env.DB.prepare(
            "DELETE FROM votes WHERE round_id IN (SELECT id FROM rounds WHERE session_id=?)",
          ).bind(next.sessionId),
          this.env.DB.prepare(
            "DELETE FROM submissions WHERE round_id IN (SELECT id FROM rounds WHERE session_id=?)",
          ).bind(next.sessionId),
          this.env.DB.prepare("DELETE FROM rounds WHERE session_id=?").bind(next.sessionId),
          this.env.DB.prepare("UPDATE players SET score=0 WHERE session_id=?").bind(next.sessionId),
        );
      }
    }

    statements.push(
      this.env.DB.prepare(
        "INSERT INTO audit_events (id,session_id,actor_type,actor_id,event_type,payload_json,command_id) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        next.sessionId,
        command ? (actor.role === "PLAYER" ? "PLAYER" : "ADMIN") : "SYSTEM",
        actor.subjectId,
        command?.type ?? "DEADLINE_TRANSITION",
        JSON.stringify({
          actorRole: actor.role,
          from: previous.phase,
          to: next.phase,
          version: next.version,
          command,
          previousScores: previous.players.map(({ id, score }) => ({ id, score })),
          scores: next.players.map(({ id, score }) => ({ id, score })),
        }),
        command?.commandId ?? null,
      ),
    );
    return statements;
  }

  private appendScoreStatements(statements: D1PreparedStatement[], state: PersistedGameState) {
    const round = state.round!;
    const participantIds = new Set(round.submissions.map((item) => item.playerId));
    const winner = round.submissions.find((item) => item.id === round.winnerSubmissionId);
    for (const player of state.players) {
      statements.push(
        this.env.DB.prepare("UPDATE players SET score=? WHERE id=?").bind(player.score, player.id),
      );
      if (participantIds.has(player.id) && state.scoring.participationPoints > 0) {
        statements.push(
          this.env.DB.prepare(
            "INSERT INTO score_events (id,session_id,round_id,player_id,points,reason,metadata_json) VALUES (?,?,?,?,?,'PARTICIPATION','{}')",
          ).bind(
            crypto.randomUUID(),
            state.sessionId,
            round.id,
            player.id,
            state.scoring.participationPoints,
          ),
        );
      }
    }
    if (winner) {
      statements.push(
        this.env.DB.prepare(
          "INSERT INTO score_events (id,session_id,round_id,player_id,points,reason,metadata_json) VALUES (?,?,?,?,?,'ROUND_WINNER',?)",
        ).bind(
          crypto.randomUUID(),
          state.sessionId,
          round.id,
          winner.playerId,
          state.scoring.winnerPoints,
          JSON.stringify({ submissionId: winner.id }),
        ),
      );
    }
  }

  private async scheduleAlarm(state: PersistedGameState) {
    if (state.phaseEndsAt !== null && !state.paused && !state.deadlineExpired) {
      await this.state.storage.setAlarm(state.phaseEndsAt);
    } else {
      await this.state.storage.deleteAlarm();
    }
  }

  private connectedPlayerIds() {
    const ids = new Set<string>();
    for (const socket of this.state.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const attachment = this.readAttachment(socket);
      if (attachment?.role === "PLAYER" && attachment.subjectId) ids.add(attachment.subjectId);
    }
    return ids;
  }

  private async broadcast(state: PersistedGameState) {
    for (const socket of this.state.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const attachment = this.readAttachment(socket);
      if (attachment) {
        if (!(await this.privilegeAllowed(attachment, state.sessionId))) {
          socket.close(1008, "Authorization expired");
          continue;
        }
        this.sendSnapshot(socket, state, attachment);
      }
    }
  }

  private sendSnapshot(
    socket: WebSocket,
    state: PersistedGameState,
    attachment: ConnectionAttachment,
  ) {
    this.send(socket, {
      type: "STATE_SYNC",
      state: projectPublicState(
        state,
        attachment.role,
        attachment.subjectId,
        this.connectedPlayerIds(),
        Date.now(),
      ),
    });
  }

  private readAttachment(socket: WebSocket) {
    const parsed = connectionAttachmentSchema.safeParse(socket.deserializeAttachment());
    return parsed.success ? parsed.data : null;
  }

  private send(socket: WebSocket, message: ServerMessage) {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      if (socket.readyState === WebSocket.OPEN) socket.close(1011, "Send failed");
    }
  }
}
