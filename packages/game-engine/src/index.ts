import type {
  GameCommand,
  GamePhase,
  PersistedGameState,
  PublicSessionState,
  SessionRole,
} from "@misthy/shared";

export type EngineActor = { role: SessionRole; subjectId: string | null };
export type EngineEffect =
  | { type: "ROUND_STARTED" }
  | { type: "SUBMISSION_ACCEPTED"; submissionId: string }
  | { type: "VOTE_ACCEPTED"; voteId: string }
  | { type: "ROUND_FINALIZED" }
  | { type: "ROUND_RESTARTED" }
  | { type: "SESSION_RESET" }
  | { type: "STATE_CHANGED" };
export type EngineResult = {
  state: PersistedGameState;
  effects: EngineEffect[];
  duplicate: boolean;
};

export class EngineError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const PHASE_DURATION_MS: Partial<Record<GamePhase, number>> = {
  QUESTION: 5_000,
  REVEAL: 5_000,
  RESULT: 8_000,
  LEADERBOARD: 8_000,
};

function requireRole(actor: EngineActor, roles: SessionRole[]) {
  if (!roles.includes(actor.role)) {
    throw new EngineError("UNAUTHORIZED_COMMAND", "Vai trò này không được phép thực hiện lệnh.");
  }
}

function setPhase(
  state: PersistedGameState,
  phase: GamePhase,
  now: number,
  durationMs: number | null,
): PersistedGameState {
  return {
    ...state,
    phase,
    phaseStartedAt: now,
    phaseEndsAt: durationMs === null ? null : now + durationMs,
    paused: null,
    version: state.version + 1,
  };
}

function startRound(state: PersistedGameState, now: number, idFactory: () => string) {
  const nextIndex = state.round ? state.round.questionIndex + 1 : 0;
  const question = state.questions[nextIndex];
  if (!question) return setPhase(state, "FINISHED", now, null);
  return setPhase(
    {
      ...state,
      round: {
        id: idFactory(),
        number: nextIndex + 1,
        questionIndex: nextIndex,
        questionId: question.id,
        submissions: [],
        votes: [],
        eligibleVoterIds: [],
        awaitingTieBreak: false,
        winnerSubmissionId: null,
        finalizedAt: null,
      },
    },
    "QUESTION",
    now,
    PHASE_DURATION_MS.QUESTION!,
  );
}

function deterministicRandomWinner(ids: string[], seed: string) {
  let hash = 2_166_136_261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  return [...ids].sort()[Math.abs(hash) % ids.length] ?? null;
}

function scoreFinalizedRound(state: PersistedGameState, winnerSubmissionId: string | null) {
  const round = state.round!;
  const winner = round.submissions.find((item) => item.id === winnerSubmissionId);
  const participantIds = new Set(round.submissions.map((item) => item.playerId));
  return state.players.map((player) => ({
    ...player,
    score:
      player.score +
      (participantIds.has(player.id) ? state.scoring.participationPoints : 0) +
      (winner?.playerId === player.id ? state.scoring.winnerPoints : 0),
  }));
}

function finalizeRound(state: PersistedGameState, now: number, selectedWinnerId?: string | null) {
  const round = state.round;
  if (!round) throw new EngineError("NO_ACTIVE_ROUND", "Không có vòng đang hoạt động.");
  if (round.finalizedAt !== null) return state;

  let winnerSubmissionId = selectedWinnerId ?? null;
  if (selectedWinnerId === undefined && round.submissions.length > 0) {
    const totals = new Map(round.submissions.map((item) => [item.id, 0]));
    for (const vote of round.votes) {
      totals.set(vote.submissionId, (totals.get(vote.submissionId) ?? 0) + 1);
    }
    const highest = Math.max(...totals.values());
    const candidates = round.submissions.filter((item) => totals.get(item.id) === highest);
    if (candidates.length > 1 && state.tieBreaker === "TALENT_DECIDES") {
      return setPhase(
        { ...state, round: { ...round, awaitingTieBreak: true } },
        "REVEAL",
        now,
        null,
      );
    }
    winnerSubmissionId =
      state.tieBreaker === "RANDOM"
        ? deterministicRandomWinner(
            candidates.map((item) => item.id),
            round.id,
          )
        : ([...candidates].sort(
            (left, right) =>
              left.submittedAt - right.submittedAt || left.id.localeCompare(right.id),
          )[0]?.id ?? null);
  }
  if (winnerSubmissionId && !round.submissions.some((item) => item.id === winnerSubmissionId)) {
    throw new EngineError("INVALID_WINNER", "Submission thắng không thuộc vòng hiện tại.");
  }
  const withWinner = {
    ...state,
    round: { ...round, awaitingTieBreak: false, winnerSubmissionId, finalizedAt: now },
  };
  return setPhase(
    { ...withWinner, players: scoreFinalizedRound(withWinner, winnerSubmissionId) },
    "RESULT",
    now,
    PHASE_DURATION_MS.RESULT!,
  );
}

function advance(state: PersistedGameState, now: number, idFactory: () => string) {
  if (state.paused) throw new EngineError("SESSION_PAUSED", "Phiên đang tạm dừng.");
  const question = state.round ? state.questions[state.round.questionIndex] : null;
  switch (state.phase) {
    case "LOBBY":
      return startRound(state, now, idFactory);
    case "QUESTION":
      return setPhase(state, "SUBMITTING", now, question!.submissionDurationSeconds * 1000);
    case "SUBMITTING":
      return setPhase(
        {
          ...state,
          round: {
            ...state.round!,
            eligibleVoterIds: state.players.map((player) => player.id),
            awaitingTieBreak: false,
          },
        },
        "REVEAL",
        now,
        state.mode === "COMMUNITY_MODE" ? PHASE_DURATION_MS.REVEAL! : null,
      );
    case "REVEAL":
      if (state.round?.awaitingTieBreak) return finalizeRound(state, now, null);
      return state.mode === "TALENT_MODE"
        ? finalizeRound(state, now, null)
        : setPhase(state, "VOTING", now, question!.votingDurationSeconds * 1000);
    case "VOTING":
      return finalizeRound(state, now);
    case "RESULT":
      return setPhase(state, "LEADERBOARD", now, PHASE_DURATION_MS.LEADERBOARD!);
    case "LEADERBOARD":
      return startRound(state, now, idFactory);
    case "FINISHED":
      throw new EngineError("SESSION_FINISHED", "Phiên chơi đã kết thúc.");
  }
}

function markProcessed(state: PersistedGameState, commandId: string) {
  return {
    ...state,
    processedCommandIds: [...state.processedCommandIds.slice(-999), commandId],
  };
}

export function applyGameCommand(
  state: PersistedGameState,
  command: GameCommand,
  actor: EngineActor,
  now: number,
  idFactory: () => string = () => crypto.randomUUID(),
): EngineResult {
  if (state.processedCommandIds.includes(command.commandId)) {
    return { state, effects: [], duplicate: true };
  }
  let next = state;
  const effects: EngineEffect[] = [];

  if (command.type === "SUBMIT_MEME" || command.type === "REPLACE_MEME") {
    requireRole(actor, ["PLAYER"]);
    if (!actor.subjectId) throw new EngineError("PLAYER_REQUIRED", "Thiếu danh tính người chơi.");
    if (state.phase !== "SUBMITTING" || state.paused) {
      throw new EngineError("SUBMISSION_CLOSED", "Đã hết thời gian gửi meme.");
    }
    if (state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
      throw new EngineError("SUBMISSION_LATE", "Submission đến sau hạn chót.");
    }
    const round = state.round!;
    const question = state.questions[round.questionIndex]!;
    if (!question.memeAssetIds.includes(command.memeAssetId)) {
      throw new EngineError("MEME_NOT_ALLOWED", "Meme không thuộc bộ sưu tập của câu hỏi.");
    }
    const existing = round.submissions.find((item) => item.playerId === actor.subjectId);
    if (existing && command.type === "SUBMIT_MEME") {
      throw new EngineError("DUPLICATE_SUBMISSION", "Bạn đã gửi meme cho vòng này.");
    }
    if (!existing && command.type === "REPLACE_MEME")
      throw new EngineError("SUBMISSION_NOT_FOUND", "Bạn chưa gửi meme.");
    next = {
      ...state,
      version: state.version + 1,
      round: {
        ...round,
        submissions: [
          ...round.submissions.filter((item) => item.playerId !== actor.subjectId),
          {
            id: existing?.id ?? command.commandId,
            playerId: actor.subjectId,
            memeAssetId: command.memeAssetId,
            submittedAt: now,
            commandId: command.commandId,
          },
        ],
      },
    };
    effects.push({ type: "SUBMISSION_ACCEPTED", submissionId: existing?.id ?? command.commandId });
  } else if (command.type === "CAST_VOTE") {
    requireRole(actor, ["PLAYER"]);
    if (!actor.subjectId) throw new EngineError("PLAYER_REQUIRED", "Thiếu danh tính người chơi.");
    if (state.phase !== "VOTING" || state.paused) {
      throw new EngineError("VOTING_CLOSED", "Bình chọn chưa mở hoặc đã kết thúc.");
    }
    if (state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
      throw new EngineError("VOTE_LATE", "Bình chọn đến sau hạn chót.");
    }
    const round = state.round!;
    if (!round.eligibleVoterIds.includes(actor.subjectId)) {
      throw new EngineError("VOTER_NOT_ELIGIBLE", "Bạn không thuộc danh sách được bình chọn.");
    }
    if (round.votes.some((item) => item.voterPlayerId === actor.subjectId)) {
      throw new EngineError("DUPLICATE_VOTE", "Bạn đã bình chọn trong vòng này.");
    }
    const submission = round.submissions.find((item) => item.id === command.submissionId);
    if (!submission) throw new EngineError("SUBMISSION_NOT_FOUND", "Submission không tồn tại.");
    if (submission.playerId === actor.subjectId) {
      throw new EngineError("SELF_VOTE", "Không thể bình chọn cho chính mình.");
    }
    next = {
      ...state,
      version: state.version + 1,
      round: {
        ...round,
        votes: [
          ...round.votes,
          {
            id: command.commandId,
            voterPlayerId: actor.subjectId,
            submissionId: command.submissionId,
            castAt: now,
            commandId: command.commandId,
          },
        ],
      },
    };
    effects.push({ type: "VOTE_ACCEPTED", voteId: command.commandId });
  } else if (command.type === "SELECT_WINNER") {
    requireRole(actor, ["ADMIN", "JUDGE"]);
    if (
      state.phase !== "REVEAL" ||
      state.paused ||
      (state.mode === "COMMUNITY_MODE" && !state.round?.awaitingTieBreak)
    ) {
      throw new EngineError("WINNER_SELECTION_CLOSED", "Không thể chọn winner ở phase hiện tại.");
    }
    next = finalizeRound(state, now, command.submissionId);
    effects.push({ type: "ROUND_FINALIZED" });
  } else {
    requireRole(actor, ["ADMIN"]);
    switch (command.action) {
      case "START":
        if (state.phase !== "LOBBY") {
          throw new EngineError("INVALID_TRANSITION", "Chỉ có thể bắt đầu từ lobby.");
        }
        next = advance(state, now, idFactory);
        effects.push({ type: "ROUND_STARTED" });
        break;
      case "ADVANCE":
      case "SKIP":
        next = advance(state, now, idFactory);
        effects.push(
          next.phase === "RESULT" ? { type: "ROUND_FINALIZED" } : { type: "STATE_CHANGED" },
        );
        break;
      case "PAUSE":
        if (state.paused || ["LOBBY", "FINISHED"].includes(state.phase)) {
          throw new EngineError("INVALID_TRANSITION", "Không thể tạm dừng ở phase hiện tại.");
        }
        next = {
          ...state,
          paused: {
            phase: state.phase,
            remainingMs: Math.max(0, (state.phaseEndsAt ?? now) - now),
          },
          phaseEndsAt: null,
          version: state.version + 1,
        };
        effects.push({ type: "STATE_CHANGED" });
        break;
      case "RESUME":
        if (!state.paused) {
          throw new EngineError("INVALID_TRANSITION", "Phiên chưa tạm dừng.");
        }
        next = {
          ...state,
          paused: null,
          phaseStartedAt: now,
          phaseEndsAt: state.paused.remainingMs > 0 ? now + state.paused.remainingMs : null,
          version: state.version + 1,
        };
        effects.push({ type: "STATE_CHANGED" });
        break;
      case "RESTART_ROUND": {
        if (!state.round) {
          throw new EngineError("NO_ACTIVE_ROUND", "Không có vòng để khởi động lại.");
        }
        const winner = state.round.submissions.find(
          (item) => item.id === state.round!.winnerSubmissionId,
        );
        const participants = new Set(state.round.submissions.map((item) => item.playerId));
        const players = state.players.map((player) => ({
          ...player,
          score: Math.max(
            0,
            player.score -
              (participants.has(player.id) && state.round!.finalizedAt
                ? state.scoring.participationPoints
                : 0) -
              (winner?.playerId === player.id ? state.scoring.winnerPoints : 0),
          ),
        }));
        next = setPhase(
          {
            ...state,
            players,
            round: {
              ...state.round,
              submissions: [],
              votes: [],
              eligibleVoterIds: [],
              awaitingTieBreak: false,
              winnerSubmissionId: null,
              finalizedAt: null,
            },
          },
          "QUESTION",
          now,
          PHASE_DURATION_MS.QUESTION!,
        );
        effects.push({ type: "ROUND_RESTARTED" });
        break;
      }
      case "RESET_SESSION":
        next = {
          ...state,
          version: state.version + 1,
          phase: "LOBBY",
          phaseStartedAt: now,
          phaseEndsAt: null,
          paused: null,
          round: null,
          players: state.players.map((player) => ({ ...player, score: 0 })),
          processedCommandIds: [],
        };
        effects.push({ type: "SESSION_RESET" });
        break;
    }
  }
  return { state: markProcessed(next, command.commandId), effects, duplicate: false };
}

export function applyDeadline(
  state: PersistedGameState,
  now: number,
  idFactory: () => string = () => crypto.randomUUID(),
): EngineResult {
  if (state.paused || state.phaseEndsAt === null || now < state.phaseEndsAt) {
    return { state, effects: [], duplicate: true };
  }
  const next = advance(state, now, idFactory);
  return {
    state: next,
    effects: [next.phase === "RESULT" ? { type: "ROUND_FINALIZED" } : { type: "STATE_CHANGED" }],
    duplicate: false,
  };
}

export function addPlayer(
  state: PersistedGameState,
  player: PersistedGameState["players"][number],
) {
  if (state.players.some((item) => item.id === player.id)) return state;
  if (state.phase !== "LOBBY") {
    throw new EngineError("SESSION_STARTED", "Không thể tham gia sau khi trò chơi bắt đầu.");
  }
  return { ...state, version: state.version + 1, players: [...state.players, player] };
}

export function projectPublicState(
  state: PersistedGameState,
  role: SessionRole,
  viewerId: string | null,
  connectedPlayerIds: ReadonlySet<string>,
  now: number,
): PublicSessionState {
  const round = state.round;
  const question = round ? state.questions[round.questionIndex]! : null;
  const showSubmissions = ["REVEAL", "VOTING", "RESULT", "LEADERBOARD", "FINISHED"].includes(
    state.phase,
  );
  const showAuthors =
    role === "ADMIN" ||
    role === "JUDGE" ||
    ["RESULT", "LEADERBOARD", "FINISHED"].includes(state.phase);
  const showVotes = role === "ADMIN" || ["RESULT", "LEADERBOARD", "FINISHED"].includes(state.phase);
  return {
    version: state.version,
    sessionCode: state.sessionCode,
    name: state.name,
    mode: state.mode,
    phase: state.phase,
    role,
    viewerId,
    serverTime: now,
    phaseStartedAt: state.phaseStartedAt,
    phaseEndsAt: state.phaseEndsAt,
    paused: state.paused !== null,
    roundNumber: round?.number ?? 0,
    totalRounds: state.questions.length,
    prompt: question?.text ?? null,
    questionImageAssetId: question?.imageAssetId ?? null,
    allowedMemeAssetIds:
      state.phase === "SUBMITTING" || role === "ADMIN" ? (question?.memeAssetIds ?? []) : [],
    players: state.players.map((player) => ({
      ...player,
      connected: connectedPlayerIds.has(player.id),
    })),
    submissions: showSubmissions
      ? (round?.submissions ?? []).map((submission) => ({
          id: submission.id,
          memeAssetId: submission.memeAssetId,
          authorPlayerId: showAuthors ? submission.playerId : null,
          voteCount: showVotes
            ? (round?.votes.filter((vote) => vote.submissionId === submission.id).length ?? 0)
            : null,
        }))
      : [],
    submissionCount: round?.submissions.length ?? 0,
    eligibleVoterCount: round?.eligibleVoterIds.length ?? 0,
    votesCast: ["VOTING", "RESULT", "LEADERBOARD", "FINISHED"].includes(state.phase)
      ? (round?.votes.length ?? 0)
      : 0,
    hasSubmitted: Boolean(
      viewerId && round?.submissions.some((item) => item.playerId === viewerId),
    ),
    hasVoted: Boolean(viewerId && round?.votes.some((item) => item.voterPlayerId === viewerId)),
    ownSubmissionId: round?.submissions.find((item) => item.playerId === viewerId)?.id ?? null,
    ownMemeAssetId:
      round?.submissions.find((item) => item.playerId === viewerId)?.memeAssetId ?? null,
    canVote: Boolean(
      viewerId &&
      round?.eligibleVoterIds.includes(viewerId) &&
      !round.votes.some((item) => item.voterPlayerId === viewerId),
    ),
    winnerSubmissionId: round?.winnerSubmissionId ?? null,
  };
}
