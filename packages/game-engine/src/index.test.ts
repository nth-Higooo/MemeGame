import type { GameCommand, PersistedGameState } from "@misthy/shared";
import { describe, expect, it } from "vitest";
import {
  addPlayer,
  applyDeadline,
  applyGameCommand,
  EngineError,
  projectPublicState,
} from "./index";

const ids = {
  session: "10000000-0000-4000-8000-000000000001",
  question: "10000000-0000-4000-8000-000000000002",
  memeA: "10000000-0000-4000-8000-000000000003",
  memeB: "10000000-0000-4000-8000-000000000004",
  playerA: "10000000-0000-4000-8000-000000000005",
  playerB: "10000000-0000-4000-8000-000000000006",
  round: "10000000-0000-4000-8000-000000000007",
};

let commandCounter = 100;
function commandId() {
  commandCounter += 1;
  return `20000000-0000-4000-8000-${String(commandCounter).padStart(12, "0")}`;
}

function state(mode: PersistedGameState["mode"] = "COMMUNITY_MODE"): PersistedGameState {
  return {
    schemaVersion: 1,
    sessionId: ids.session,
    sessionCode: "MT2026",
    name: "Test party",
    mode,
    version: 0,
    phase: "LOBBY",
    phaseStartedAt: 0,
    phaseEndsAt: null,
    paused: null,
    questions: [
      {
        id: ids.question,
        text: "Một tình huống vui",
        imageAssetId: null,
        memeAssetIds: [ids.memeA, ids.memeB],
        submissionDurationSeconds: 30,
        votingDurationSeconds: 20,
      },
    ],
    players: [
      { id: ids.playerA, displayName: "An", score: 0, joinedAt: 1 },
      { id: ids.playerB, displayName: "Bình", score: 0, joinedAt: 2 },
    ],
    round: null,
    processedCommandIds: [],
    scoring: { winnerPoints: 100, participationPoints: 0 },
    tieBreaker: "EARLIEST_SUBMISSION",
  };
}

const admin = { role: "ADMIN" as const, subjectId: null };
const playerA = { role: "PLAYER" as const, subjectId: ids.playerA };
const playerB = { role: "PLAYER" as const, subjectId: ids.playerB };

function adminCommand(
  current: PersistedGameState,
  action: Extract<GameCommand, { type: "ADMIN_ACTION" }>["action"],
  now: number,
) {
  return applyGameCommand(
    current,
    { type: "ADMIN_ACTION", commandId: commandId(), action },
    admin,
    now,
    () => ids.round,
  ).state;
}

function submittingState() {
  const question = adminCommand(state(), "START", 1_000);
  return applyDeadline(question, question.phaseEndsAt!).state;
}

describe("realtime game engine", () => {
  it("limits manual Community tie nominations to tied leaders before a reasoned override", () => {
    const base = submittingState();
    const thirdPlayerId = commandId();
    const submissions = [ids.memeA, ids.memeB, ids.question].map((id, index) => ({
      id,
      playerId: [ids.playerA, ids.playerB, thirdPlayerId][index]!,
      memeAssetId: ids.memeA,
      commandId: commandId(),
      submittedAt: index + 1,
    }));
    const current: PersistedGameState = {
      ...base,
      players: [...base.players, { id: thirdPlayerId, displayName: "Chi", score: 0, joinedAt: 3 }],
      manualControl: true,
      tieBreaker: "TALENT_DECIDES",
      phase: "REVEAL",
      phaseEndsAt: null,
      round: {
        ...base.round!,
        submissions,
        awaitingTieBreak: true,
        votes: submissions.slice(0, 2).map((submission, index) => ({
          id: commandId(),
          commandId: commandId(),
          voterPlayerId: index === 0 ? ids.playerB : ids.playerA,
          submissionId: submission.id,
          castAt: 4000,
        })),
      },
    };
    const judge = { role: "JUDGE" as const, subjectId: null };
    expect(projectPublicState(current, "JUDGE", null, new Set(), 5000).tieCandidateIds).toEqual([
      ids.memeA,
      ids.memeB,
    ]);
    expect(projectPublicState(current, "DISPLAY", null, new Set(), 5000).tieCandidateIds).toEqual(
      [],
    );
    expect(() =>
      applyGameCommand(
        current,
        { type: "SELECT_WINNER", commandId: commandId(), submissionId: ids.question },
        judge,
        5000,
      ),
    ).toThrow(/đang hòa/);
    const nominated = applyGameCommand(
      current,
      { type: "SELECT_WINNER", commandId: commandId(), submissionId: ids.memeB },
      judge,
      5000,
    ).state;
    expect(nominated.round?.awaitingTieBreak).toBe(false);
    expect(nominated.round?.provisionalWinnerId).toBe(ids.memeB);
    expect(nominated.round?.finalizedAt).toBeNull();
    expect(nominated.players.every((player) => player.score === 0)).toBe(true);
  });
  it("automatically begins the timed Community reveal when the submission deadline expires", () => {
    let current = adminCommand({ ...state(), manualControl: true }, "START", 1000);
    current = adminCommand(current, "ADVANCE", 2000);
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("REVEAL");
    expect(current.phaseEndsAt).toBe(37_000);
    expect(() =>
      applyGameCommand(
        current,
        { type: "SUBMIT_MEME", commandId: commandId(), memeAssetId: ids.memeA },
        playerA,
        3001,
      ),
    ).toThrow();
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("VOTING");
  });
  it("runs manual Talent nomination, confirmed publication, and audited correction", () => {
    let current = adminCommand({ ...state("TALENT_MODE"), manualControl: true }, "START", 1000);
    expect(current.phaseEndsAt).toBeNull();
    current = adminCommand(current, "ADVANCE", 2000);
    const submissionId = commandId();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: submissionId, memeAssetId: ids.memeA },
      playerA,
      3000,
    ).state;
    expect(() =>
      applyGameCommand(
        current,
        { type: "SET_MODE", commandId: commandId(), mode: "COMMUNITY_MODE" },
        admin,
        3100,
      ),
    ).toThrow(/trước khi nhận/);
    current = adminCommand(current, "ADVANCE", 4000);
    current = applyGameCommand(
      current,
      { type: "SELECT_WINNER", commandId: commandId(), submissionId },
      { role: "JUDGE", subjectId: null },
      5000,
    ).state;
    expect(current.round?.resultPending).toBe(true);
    expect(current.players[0]?.score).toBe(0);
    const hidden = projectPublicState(current, "DISPLAY", null, new Set(), 5100);
    expect(hidden.provisionalWinnerId).toBeNull();
    expect(hidden.winnerSubmissionId).toBeNull();
    const publish = {
      type: "PUBLISH_RESULT",
      confirmed: true,
      commandId: commandId(),
      expectedVersion: current.version,
    } as const;
    expect(() =>
      applyGameCommand(current, publish, { role: "JUDGE", subjectId: null }, 5200),
    ).toThrow(/Vai trò/);
    current = applyGameCommand(current, publish, admin, 5300).state;
    expect(current.phase).toBe("RESULT");
    expect(current.phaseEndsAt).toBe(35_300);
    expect(current.players[0]?.score).toBe(100);
    expect(applyGameCommand(current, publish, admin, 5400).duplicate).toBe(true);
    expect(() => adminCommand(current, "RESTART_ROUND", 5500)).toThrow(/đã công bố/);
    const correction = applyGameCommand(
      current,
      {
        type: "ADJUST_SCORE",
        commandId: commandId(),
        expectedVersion: current.version,
        confirmed: true,
        playerId: ids.playerA,
        delta: -10,
        reason: "Sửa điểm theo luật",
      },
      admin,
      5600,
    );
    expect(correction.state.players[0]?.score).toBe(90);
    expect(correction.effects).toContainEqual({
      type: "SCORE_CORRECTED",
      playerId: ids.playerA,
      delta: -10,
      reason: "Sửa điểm theo luật",
    });
    current = applyDeadline(correction.state, correction.state.phaseEndsAt!).state;
    expect(current.phase).toBe("LEADERBOARD");
    current = adminCommand(current, "ADVANCE", 36_000);
    expect(current.phase).toBe("FINISHED");
  });
  it("holds Community results and accepts only confirmed, current-version overrides", () => {
    let current = adminCommand({ ...state(), manualControl: true }, "START", 1000);
    current = adminCommand(current, "ADVANCE", 2000);
    const first = commandId(),
      second = commandId();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: first, memeAssetId: ids.memeA },
      playerA,
      3000,
    ).state;
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: second, memeAssetId: ids.memeB },
      playerB,
      3100,
    ).state;
    expect(current.phaseEndsAt).toBe(13_100);
    current = adminCommand(current, "ADVANCE", 5000);
    expect(current.phase).toBe("VOTING");
    current = applyGameCommand(
      current,
      { type: "CAST_VOTE", commandId: commandId(), submissionId: second },
      playerA,
      5100,
    ).state;
    current = applyGameCommand(
      current,
      { type: "CAST_VOTE", commandId: commandId(), submissionId: first },
      playerB,
      5200,
    ).state;
    current = adminCommand(current, "ADVANCE", 6000);
    expect(current.phase).toBe("REVEAL");
    expect(current.round?.provisionalWinnerId).toBe(first);
    expect(current.players.every((p) => p.score === 0)).toBe(true);
    expect(() =>
      applyGameCommand(
        current,
        {
          type: "PUBLISH_RESULT",
          commandId: commandId(),
          confirmed: true,
          expectedVersion: current.version - 1,
        },
        admin,
        6100,
      ),
    ).toThrow(/đã thay đổi/);
    current = applyGameCommand(
      current,
      {
        type: "OVERRIDE_WINNER",
        commandId: commandId(),
        expectedVersion: current.version,
        submissionId: second,
        confirmed: true,
        reason: "Talent quyết định hòa",
      },
      admin,
      6200,
    ).state;
    current = applyGameCommand(
      current,
      {
        type: "PUBLISH_RESULT",
        commandId: commandId(),
        expectedVersion: current.version,
        confirmed: true,
      },
      admin,
      6300,
    ).state;
    expect(current.round?.winnerSubmissionId).toBe(second);
    expect(current.players[1]?.score).toBe(100);
    expect(() =>
      applyGameCommand(
        current,
        {
          type: "PUBLISH_RESULT",
          commandId: commandId(),
          expectedVersion: current.version,
          confirmed: true,
        },
        admin,
        6400,
      ),
    ).toThrow(/Chưa có kết quả/);
  });
  it("replaces an existing meme before the deadline with stable identity and idempotency", () => {
    const initial = submittingState();
    const first = applyGameCommand(
      initial,
      { type: "SUBMIT_MEME", commandId: commandId(), memeAssetId: ids.memeA },
      playerA,
      7000,
    ).state;
    const replacement = {
      type: "REPLACE_MEME",
      commandId: commandId(),
      memeAssetId: ids.memeB,
    } as const;
    const result = applyGameCommand(first, replacement, playerA, 8000);
    expect(result.state.round?.submissions).toHaveLength(1);
    expect(result.state.round?.submissions[0]?.id).toBe(first.round?.submissions[0]?.id);
    expect(result.state.round?.submissions[0]?.memeAssetId).toBe(ids.memeB);
    expect(applyGameCommand(result.state, replacement, playerA, 8001).duplicate).toBe(true);
    expect(() =>
      applyGameCommand(
        first,
        { ...replacement, commandId: commandId() },
        playerA,
        first.phaseEndsAt!,
      ),
    ).toThrow(/sau hạn chót/);
    const view = projectPublicState(result.state, "PLAYER", ids.playerA, new Set(), 8000);
    expect(view.ownSubmissionId).toBe(first.round?.submissions[0]?.id);
    expect(view.submissions).toEqual([]);
  });
  it("follows the authoritative phase graph and finishes after the last leaderboard", () => {
    let current = adminCommand(state(), "START", 1_000);
    expect(current.phase).toBe("QUESTION");
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("SUBMITTING");
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("REVEAL");
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("VOTING");
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("RESULT");
    expect(current.round?.winnerSubmissionId).toBeNull();
    expect(current.phaseEndsAt! - current.phaseStartedAt!).toBe(30_000);
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("LEADERBOARD");
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("FINISHED");
  });

  it("makes submission commands idempotent and rejects duplicates and late arrivals", () => {
    const current = submittingState();
    const command = {
      type: "SUBMIT_MEME",
      commandId: commandId(),
      memeAssetId: ids.memeA,
    } as const;
    const accepted = applyGameCommand(current, command, playerA, 7_000);
    expect(accepted.state.round?.submissions).toHaveLength(1);
    expect(applyGameCommand(accepted.state, command, playerA, 7_001).duplicate).toBe(true);
    expect(() =>
      applyGameCommand(accepted.state, { ...command, commandId: commandId() }, playerA, 7_002),
    ).toThrowError(new EngineError("DUPLICATE_SUBMISSION", "Bạn đã gửi meme cho vòng này."));
    expect(() =>
      applyGameCommand(
        current,
        { ...command, commandId: commandId() },
        playerA,
        current.phaseEndsAt!,
      ),
    ).toThrowError(new EngineError("SUBMISSION_LATE", "Submission đến sau hạn chót."));
  });

  it("rejects self votes, makes votes idempotent, and resolves a zero-vote tie by earliest submit", () => {
    let current = submittingState();
    const firstId = commandId();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: firstId, memeAssetId: ids.memeA },
      playerA,
      7_000,
    ).state;
    const secondId = commandId();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: secondId, memeAssetId: ids.memeB },
      playerB,
      8_000,
    ).state;
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("VOTING");
    expect(() =>
      applyGameCommand(
        current,
        { type: "CAST_VOTE", commandId: commandId(), submissionId: firstId },
        playerA,
        current.phaseStartedAt! + 1,
      ),
    ).toThrowError(new EngineError("SELF_VOTE", "Không thể bình chọn cho chính mình."));
    const vote = { type: "CAST_VOTE", commandId: commandId(), submissionId: firstId } as const;
    const voted = applyGameCommand(current, vote, playerB, current.phaseStartedAt! + 2);
    expect(
      applyGameCommand(voted.state, vote, playerB, current.phaseStartedAt! + 3).duplicate,
    ).toBe(true);

    const zeroVoteResult = applyDeadline(current, current.phaseEndsAt!).state;
    expect(zeroVoteResult.round?.winnerSubmissionId).toBe(firstId);
  });

  it("allows only admin or judge to finalize Talent Mode and ignores repeated finalization", () => {
    let current = adminCommand(state("TALENT_MODE"), "START", 1_000);
    current = applyDeadline(current, current.phaseEndsAt!).state;
    const submissionId = commandId();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: submissionId, memeAssetId: ids.memeA },
      playerA,
      7_000,
    ).state;
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("REVEAL");
    const decision = {
      type: "SELECT_WINNER",
      commandId: commandId(),
      submissionId,
    } as const;
    expect(() => applyGameCommand(current, decision, playerA, 40_000)).toThrowError(
      new EngineError("UNAUTHORIZED_COMMAND", "Vai trò này không được phép thực hiện lệnh."),
    );
    const finalized = applyGameCommand(
      current,
      decision,
      { role: "JUDGE", subjectId: null },
      40_000,
    );
    expect(finalized.state.phase).toBe("RESULT");
    expect(finalized.state.players.find((player) => player.id === ids.playerA)?.score).toBe(100);
    expect(applyGameCommand(finalized.state, decision, admin, 40_001).duplicate).toBe(true);
  });

  it("waits for a judge only when a Community tie uses TALENT_DECIDES", () => {
    let current: PersistedGameState = {
      ...submittingState(),
      tieBreaker: "TALENT_DECIDES",
    };
    const firstId = commandId();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: firstId, memeAssetId: ids.memeA },
      playerA,
      7_000,
    ).state;
    const secondId = commandId();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: secondId, memeAssetId: ids.memeB },
      playerB,
      8_000,
    ).state;
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(() =>
      applyGameCommand(
        current,
        { type: "SELECT_WINNER", commandId: commandId(), submissionId: firstId },
        { role: "JUDGE", subjectId: null },
        current.phaseStartedAt! + 1,
      ),
    ).toThrowError(
      new EngineError("WINNER_SELECTION_CLOSED", "Không thể chọn winner ở phase hiện tại."),
    );
    current = applyDeadline(current, current.phaseEndsAt!).state;
    current = applyDeadline(current, current.phaseEndsAt!).state;
    expect(current.phase).toBe("REVEAL");
    expect(current.round?.awaitingTieBreak).toBe(true);
    const result = applyGameCommand(
      current,
      { type: "SELECT_WINNER", commandId: commandId(), submissionId: secondId },
      { role: "JUDGE", subjectId: null },
      60_000,
    ).state;
    expect(result.phase).toBe("RESULT");
    expect(result.round?.winnerSubmissionId).toBe(secondId);
  });

  it("pauses deadlines, resumes remaining time, restarts safely, and resets the session", () => {
    let current = submittingState();
    const beforePause = current.phaseEndsAt!;
    current = adminCommand(current, "PAUSE", 10_000);
    expect(current.paused?.remainingMs).toBe(beforePause - 10_000);
    expect(current.phaseEndsAt).toBeNull();
    expect(applyDeadline(current, 999_999).duplicate).toBe(true);
    current = adminCommand(current, "RESUME", 20_000);
    expect(current.phaseEndsAt).toBe(20_000 + beforePause - 10_000);
    current = adminCommand(current, "RESTART_ROUND", 21_000);
    expect(current.phase).toBe("QUESTION");
    expect(current.round?.submissions).toHaveLength(0);
    current = adminCommand(current, "RESET_SESSION", 22_000);
    expect(current.phase).toBe("LOBBY");
    expect(current.round).toBeNull();
  });

  it("keeps reconnecting players stable and rejects late joins", () => {
    const initial = state();
    expect(addPlayer(initial, initial.players[0]!)).toBe(initial);
    const started = adminCommand(initial, "START", 1_000);
    expect(() =>
      addPlayer(started, {
        id: "10000000-0000-4000-8000-000000000099",
        displayName: "Late",
        score: 0,
        joinedAt: 2_000,
      }),
    ).toThrowError(
      new EngineError("SESSION_STARTED", "Không thể tham gia sau khi trò chơi bắt đầu."),
    );
  });

  it("projects anonymous reveals and derives presence from active identities", () => {
    let current = submittingState();
    current = applyGameCommand(
      current,
      { type: "SUBMIT_MEME", commandId: commandId(), memeAssetId: ids.memeA },
      playerA,
      7_000,
    ).state;
    current = applyDeadline(current, current.phaseEndsAt!).state;
    const connected = new Set([ids.playerA]);
    const display = projectPublicState(current, "DISPLAY", null, connected, 40_000);
    const adminView = projectPublicState(current, "ADMIN", null, connected, 40_000);
    expect(display.submissions[0]?.authorPlayerId).toBeNull();
    expect(display.submissions[0]?.voteCount).toBeNull();
    expect(display.ownSubmissionId).toBeNull();
    expect(adminView.submissions[0]?.authorPlayerId).toBe(ids.playerA);
    expect(display.players.find((player) => player.id === ids.playerA)?.connected).toBe(true);
    expect(display.players.find((player) => player.id === ids.playerB)?.connected).toBe(false);
  });
});
