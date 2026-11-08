import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  z,
  adminSessionsSchema,
  auditSchema,
  gamePresetSchema,
  questionSchema,
  memeAssetSchema,
  persistedGameStateSchema,
  displayConnectionSchema,
  type PublicSessionState,
  type GameCommand,
  type PersistedGameState,
  type GamePreset,
  type Question,
  type MemeAsset,
} from "@misthy/shared";
import { applyGameCommand, projectPublicState } from "@misthy/game-engine";
import { getMessages } from "../i18n";
import { adminRequest, useAdminSession } from "../lib/admin-session";
import { AdminLogin } from "./content-admin-page";
import { CelestialBackground } from "../components/celestial-background";
import { Brand } from "../components/brand";
import { GlassCard } from "../components/glass-card";
import { GlassButton } from "../components/glass-button";
import { GlassInput } from "../components/glass-input";
import { GlassBadge } from "../components/glass-badge";
import { GlassModal } from "../components/glass-modal";
import { CountdownTimer } from "../components/countdown-timer";
import { OperatorMedia } from "../components/operator-media";

const c = getMessages().admin;
type Confirmation = {
  kind: "publish" | "override" | "score" | "stop";
  id?: string;
  version: number;
};
function JudgeImage({ id, code, token }: { id: string; code: string; token: string }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    void adminRequest(`/api/judge/${code}/ticket`, {})
      .then((data) => {
        const connection = displayConnectionSchema.parse(data).connection;
        return fetch(`/api/sessions/${code}/display-media/${id}`, {
          headers: { Authorization: `Bearer ${connection.protocols[1]}` },
        });
      })
      .then(async (response) => {
        if (!response.ok) throw new Error("media unavailable");
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, code, token, retry]);
  if (failed)
    return (
      <div role="status" className="control-meme p-3 text-sm">
        {c.mediaFailure}
        <GlassButton
          onClick={() => {
            setFailed(false);
            setRetry((value) => value + 1);
          }}
        >
          {c.mediaRetry}
        </GlassButton>
      </div>
    );
  return url ? <OperatorMedia src={url} alt={c.anonymous} /> : <div className="control-meme" />;
}
export function AdminPage({ sessionCode }: { sessionCode: string }) {
  return <ControlPage sessionCode={sessionCode} />;
}
export function JudgePage({ sessionCode }: { sessionCode: string }) {
  return <ControlPage sessionCode={sessionCode} judge />;
}

function ControlPage({ sessionCode, judge = false }: { sessionCode: string; judge?: boolean }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [judgeAttempt, setJudgeAttempt] = useState(0);
  const [dry, setDry] = useState<PersistedGameState | null>(null);
  const game = useAdminSession(sessionCode, judge ? "JUDGE" : "ADMIN", authenticated && !dry);
  const [sessions, setSessions] = useState<ReturnType<typeof adminSessionsSchema.parse>["items"]>(
    [],
  );
  const [presets, setPresets] = useState<GamePreset[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assets, setAssets] = useState<MemeAsset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [category, setCategory] = useState("");
  const [qr, setQr] = useState("");
  const [judgeQr, setJudgeQr] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<ReturnType<typeof auditSchema.parse>["items"]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const state: PublicSessionState | null = dry
    ? projectPublicState(dry, "ADMIN", null, new Set(dry.players.map((p) => p.id)), clock)
    : game.snapshot;
  const load = async () => {
    try {
      const [s, p, q, a] = await Promise.all([
        adminRequest("/api/admin/sessions"),
        adminRequest("/api/admin/presets"),
        adminRequest("/api/admin/questions"),
        adminRequest("/api/admin/assets"),
      ]);
      setSessions(adminSessionsSchema.parse(s).items);
      const parsed = z
        .object({ items: z.array(gamePresetSchema) })
        .parse(p)
        .items.filter((item) => item.playMode === "INDIVIDUAL");
      setPresets(parsed);
      setPresetId((id) => id || parsed[0]?.id || "");
      setQuestions(z.object({ items: z.array(questionSchema) }).parse(q).items);
      setAssets(z.object({ items: z.array(memeAssetSchema) }).parse(a).items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.offline);
    }
  };
  useEffect(() => {
    if (judge) return;
    let active = true;
    void adminRequest("/api/admin/auth/me")
      .then(() => {
        if (active) {
          setAuthenticated(true);
          void load();
        }
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, [judge]);
  useEffect(() => {
    if (!judge) return;
    let active = true;
    void adminRequest(`/api/judge/${sessionCode}/login`, {})
      .then(() => {
        if (active) {
          setError("");
          setAuthenticated(true);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : c.offline);
      });
    return () => {
      active = false;
    };
  }, [judge, judgeAttempt, sessionCode]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([
      QRCode.toDataURL(new URL(`/play/${sessionCode}`, location.origin).href, {
        width: 240,
        margin: 4,
      }),
      QRCode.toDataURL(new URL(`/judge/${sessionCode}`, location.origin).href, {
        width: 240,
        margin: 4,
      }),
    ]).then(([player, talent]) => {
      if (active) {
        setQr(player);
        setJudgeQr(talent);
      }
    });
    return () => {
      active = false;
    };
  }, [sessionCode]);
  useEffect(() => {
    if (judge || !authenticated || !state || dry) return;
    let active = true;
    void adminRequest(`/api/admin/sessions/${sessionCode}/audit`)
      .then((data) => {
        if (active) setAudit(auditSchema.parse(data).items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [judge, authenticated, state?.version, sessionCode, Boolean(dry)]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (action: () => Promise<unknown>, success: string = c.saved) => {
    setError("");
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.offline);
    }
  };
  const send = (command: GameCommand) => {
    setError("");
    if (dry) {
      try {
        setDry(
          applyGameCommand(dry, command, { role: "ADMIN", subjectId: null }, Date.now()).state,
        );
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : c.offline);
      }
      return;
    }
    game.send(command);
  };
  const action = (value: Extract<GameCommand, { type: "ADMIN_ACTION" }>["action"]) => {
    if (state)
      send({
        type: "ADMIN_ACTION",
        commandId: crypto.randomUUID(),
        expectedVersion: state.version,
        action: value,
      });
  };
  const archiveCompletedSession = () => {
    if (!window.confirm(c.archiveSessionConfirm)) return;
    void run(
      () => adminRequest(`/api/admin/sessions/${sessionCode}`, undefined, "DELETE"),
      c.archivedSession,
    ).then(() => location.assign("/admin/MT2026"));
  };
  useEffect(() => {
    if (judge || dry || !state || state.paused || confirmation || game.pending) return;
    const advanceable = [
      "LOBBY",
      "QUESTION",
      "SUBMITTING",
      "VOTING",
      "RESULT",
      "LEADERBOARD",
    ].includes(state.phase);
    if (!advanceable) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key !== "Enter" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)))
      )
        return;
      event.preventDefault();
      action(state.phase === "LOBBY" ? "START" : "ADVANCE");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [judge, dry, state, confirmation, game.pending]); // action is recreated from the current authoritative state.
  const selectedPreset = presets.find((item) => item.id === presetId);
  const allowedAssets = assets
    .filter((asset) => asset.status !== "ARCHIVED" && (!category || asset.category === category))
    .map((asset) => asset.id);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const response = z.object({ session: z.object({ code: z.string() }) }).parse(
        await adminRequest("/api/admin/sessions", {
          name: data.get("name"),
          presetId,
          manualControl: true,
          assetIds: allowedAssets,
          settings: {
            mode: data.get("mode"),
            submissionDurationSeconds: Number(data.get("submissionDurationSeconds")),
            votingDurationSeconds: Number(data.get("votingDurationSeconds")),
            winnerPoints: Number(data.get("winnerPoints")),
            participationPoints: Number(data.get("participationPoints")),
            tieBreaker: data.get("tieBreaker"),
          },
        }),
      );
      location.assign(`/admin/${response.session.code}`);
    });
  };
  const startDry = () => {
    if (!selectedPreset) return;
    try {
      const dryQuestions = selectedPreset.questionIds
        .map((id) => questions.find((q) => q.id === id))
        .filter((q): q is Question => Boolean(q))
        .map((q) => ({
          ...q,
          memeAssetIds: q.memeAssetIds.filter((id) => allowedAssets.includes(id)),
        }));
      if (!dryQuestions.length || dryQuestions.some((q) => !q.memeAssetIds.length))
        throw new Error(c.rehearsalError);
      setDry(
        persistedGameStateSchema.parse({
          schemaVersion: 1,
          manualControl: true,
          sessionId: crypto.randomUUID(),
          sessionCode,
          name: c.dry,
          mode: selectedPreset.mode,
          version: 0,
          phase: "LOBBY",
          phaseStartedAt: Date.now(),
          phaseEndsAt: null,
          paused: null,
          questions: dryQuestions,
          players: [
            { id: crypto.randomUUID(), displayName: "Preview 1", score: 0, joinedAt: Date.now() },
            { id: crypto.randomUUID(), displayName: "Preview 2", score: 0, joinedAt: Date.now() },
          ],
          round: null,
          processedCommandIds: [],
          scoring: selectedPreset.scoring,
          tieBreaker: selectedPreset.tieBreaker,
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.rehearsalError);
    }
  };
  const simulate = (vote: boolean) => {
    if (!dry || !dry.round) return;
    try {
      let next = dry;
      for (const player of dry.players) {
        const target = vote ? dry.round.submissions.find((s) => s.playerId !== player.id) : null;
        const meme = dry.questions[dry.round.questionIndex]?.memeAssetIds[0];
        if (vote && !target) continue;
        if (!vote && !meme) continue;
        next = applyGameCommand(
          next,
          vote
            ? { type: "CAST_VOTE", commandId: crypto.randomUUID(), submissionId: target!.id }
            : { type: "SUBMIT_MEME", commandId: crypto.randomUUID(), memeAssetId: meme! },
          { role: "PLAYER", subjectId: player.id },
          Date.now(),
        ).state;
      }
      setDry(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.offline);
    }
  };
  const confirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmation || !state) return;
    const data = new FormData(event.currentTarget);
    const base = { commandId: crypto.randomUUID(), expectedVersion: confirmation.version };
    if (confirmation.kind === "publish") send({ ...base, type: "PUBLISH_RESULT", confirmed: true });
    if (confirmation.kind === "stop") send({ ...base, type: "ADMIN_ACTION", action: "STOP_ROUND" });
    if (confirmation.kind === "override")
      send({
        ...base,
        type: "OVERRIDE_WINNER",
        submissionId: String(data.get("submissionId")) || null,
        confirmed: true,
        reason: String(data.get("reason")),
      });
    if (confirmation.kind === "score")
      send({
        ...base,
        type: "ADJUST_SCORE",
        playerId: confirmation.id!,
        delta: Number(data.get("delta")),
        reason: String(data.get("reason")),
        confirmed: true,
      });
    setConfirmation(null);
  };
  if (!judge && (!authenticated || game.status === "unauthorized"))
    return (
      <AdminLogin
        title={c.title}
        onAuthenticated={() => {
          setAuthenticated(true);
          game.reconnect();
          void load();
        }}
      />
    );
  if (judge && (!authenticated || game.status === "unauthorized"))
    return (
      <main className="theme-dark grid min-h-screen place-items-center p-5">
        <CelestialBackground tone="stage" />
        <GlassCard className="relative w-full max-w-md p-6">
          <Brand />
          <h1 className="mt-5 text-2xl font-black">{c.judgeTitle}</h1>
          <p className="mt-4" role={error ? "alert" : "status"}>
            {error || c.judgeConnecting}
          </p>
          {error && (
            <GlassButton className="mt-5" onClick={() => setJudgeAttempt((value) => value + 1)}>
              {c.reconnect}
            </GlassButton>
          )}
        </GlassCard>
      </main>
    );
  const disabled = !dry && (game.status !== "connected" || game.pending);
  const seconds = state?.phaseEndsAt
    ? Math.max(0, Math.ceil((state.phaseEndsAt - clock - (dry ? 0 : game.offset)) / 1000))
    : null;
  const nextAction =
    state?.phase === "LOBBY"
      ? "START"
      : state?.phase === "QUESTION"
        ? "ADVANCE"
        : state?.phase === "SUBMITTING"
          ? "ADVANCE"
          : state?.phase === "REVEAL" &&
              state.mode === "COMMUNITY_MODE" &&
              !state.resultPending &&
              !state.awaitingTieBreak
            ? "ADVANCE"
            : state?.phase === "VOTING"
              ? "ADVANCE"
              : state?.phase === "RESULT" || state?.phase === "LEADERBOARD"
                ? "ADVANCE"
                : null;
  const nextLabel =
    state?.phase === "LOBBY"
      ? c.start
      : state?.phase === "QUESTION"
        ? c.submitting
        : state?.phase === "SUBMITTING"
          ? c.reveal
          : state?.phase === "REVEAL"
            ? c.openVoting
            : state?.phase === "VOTING"
              ? c.closeVoting
              : state?.phase === "RESULT"
                ? c.leaderboard
                : c.next;
  return (
    <main className="theme-dark control-live min-h-screen">
      <CelestialBackground tone="stage" />
      <div className="relative mx-auto max-w-[1600px] p-4 lg:p-7">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Brand />
            <div>
              <p className="text-xs font-bold tracking-widest">{c.studio}</p>
              <h1 className="text-2xl font-black">{judge ? c.judgeTitle : c.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GlassBadge tone={dry ? "violet" : game.status === "connected" ? "success" : "danger"}>
              {dry ? c.dryBanner : game.status === "connected" ? c.connected : c.offline}
            </GlassBadge>
            {!judge && (
              <GlassButton
                variant="ghost"
                size="small"
                onClick={() =>
                  void run(async () => {
                    await adminRequest("/api/admin/auth/logout", {});
                    setAuthenticated(false);
                  })
                }
              >
                {c.logout}
              </GlassButton>
            )}
          </div>
        </header>
        {(error || game.error) && (
          <p className="mb-4 rounded-2xl bg-red-50 p-3 text-red-800" role="alert">
            {error || game.error}
          </p>
        )}
        {notice && (
          <p className="notice-positive mb-4 rounded-2xl p-3" role="status">
            {notice}
          </p>
        )}
        {!judge && (
          <nav className="mb-5 flex flex-wrap gap-2">
            <select
              aria-label={c.sessions}
              className="cms-field max-w-xs"
              value={sessions.some((s) => s.code === sessionCode) ? sessionCode : ""}
              onChange={(event) => location.assign(`/admin/${event.target.value}`)}
            >
              <option value="">{c.sessions}</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.name} · {s.code} · {s.status}
                </option>
              ))}
            </select>
            <GlassButton asChild variant="glass">
              <a href={`/admin/${sessionCode}/content`}>{c.content}</a>
            </GlassButton>
            <GlassButton asChild variant="glass">
              <a target="_blank" rel="noreferrer" href={`/display/${sessionCode}`}>
                {c.display}
              </a>
            </GlassButton>
            <GlassButton variant="soft" onClick={() => (dry ? setDry(null) : startDry())}>
              {dry ? c.dryStop : c.dry}
            </GlassButton>
          </nav>
        )}
        <div
          className={judge ? "mx-auto max-w-5xl" : "grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"}
        >
          {!judge && (
            <aside className="space-y-4">
              <GlassCard className="p-4">
                <h2 className="mb-4 font-black">{c.create}</h2>
                <form className="space-y-3" onSubmit={create} key={presetId}>
                  <GlassInput
                    label={c.name}
                    name="name"
                    required
                    defaultValue={getMessages().brand.title}
                  />
                  <label className="block text-sm font-bold">
                    {c.pack}
                    <select
                      className="cms-field mt-1"
                      value={presetId}
                      aria-label={c.pack}
                      disabled={!presets.length}
                      onChange={(event) => setPresetId(event.target.value)}
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    {c.library}
                    <select
                      className="cms-field mt-1"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      <option value="">{c.all}</option>
                      {[...new Set(assets.map((a) => a.category))].map((cat) => (
                        <option key={cat}>{cat}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">
                    {c.mode}
                    <select
                      name="mode"
                      className="cms-field mt-1"
                      defaultValue={selectedPreset?.mode ?? "COMMUNITY_MODE"}
                    >
                      <option value="COMMUNITY_MODE">{c.community}</option>
                      <option value="TALENT_MODE">{c.talent}</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <GlassInput
                      label={c.duration}
                      name="submissionDurationSeconds"
                      type="number"
                      min={10}
                      max={300}
                      defaultValue={selectedPreset?.roundDurationSeconds ?? 45}
                    />
                    <GlassInput
                      label={c.voteDuration}
                      name="votingDurationSeconds"
                      type="number"
                      min={5}
                      max={180}
                      defaultValue={30}
                    />
                    <GlassInput
                      label={c.points}
                      name="winnerPoints"
                      type="number"
                      min={0}
                      max={10000}
                      defaultValue={selectedPreset?.scoring.winnerPoints ?? 100}
                    />
                    <GlassInput
                      label={c.participation}
                      name="participationPoints"
                      type="number"
                      min={0}
                      max={1000}
                      defaultValue={selectedPreset?.scoring.participationPoints ?? 0}
                    />
                  </div>
                  <label className="block text-sm font-bold">
                    {c.tie}
                    <select
                      name="tieBreaker"
                      className="cms-field mt-1"
                      defaultValue={selectedPreset?.tieBreaker ?? "EARLIEST_SUBMISSION"}
                    >
                      <option value="EARLIEST_SUBMISSION">{c.earliest}</option>
                      <option value="RANDOM">{c.random}</option>
                      <option value="TALENT_DECIDES">{c.talentTie}</option>
                    </select>
                  </label>
                  <GlassButton
                    type="submit"
                    disabled={!presetId || Boolean(dry)}
                    className="w-full"
                  >
                    {c.create}
                  </GlassButton>
                </form>
              </GlassCard>
              <GlassCard className="grid grid-cols-2 gap-3 p-4 text-center">
                <div>
                  {qr && <img src={qr} alt={c.qr} className="mx-auto w-28" />}
                  <strong className="mt-2 block text-sm">{c.qr}</strong>
                </div>
                <div>
                  {judgeQr && <img src={judgeQr} alt={c.talentQr} className="mx-auto w-28" />}
                  <strong className="mt-2 block text-sm">{c.talentQr}</strong>
                </div>
                <strong className="col-span-2 block text-2xl tracking-widest">{sessionCode}</strong>
              </GlassCard>
            </aside>
          )}
          <section className="space-y-4">
            {!state ? (
              <GlassCard className="p-6">
                <p>{c.noSession}</p>
                <GlassButton variant="glass" onClick={game.reconnect}>
                  {c.reconnect}
                </GlassButton>
              </GlassCard>
            ) : (
              <>
                <GlassCard className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <GlassBadge tone="violet">
                        {state.phase} · {c.round(state.roundNumber, state.totalRounds)}
                      </GlassBadge>
                      <h2 className="mt-3 text-2xl font-black">{state.prompt ?? state.name}</h2>
                      <p className="mt-2 text-sm">
                        {state.mode === "TALENT_MODE" ? c.talent : c.community} ·{" "}
                        {c.progress(state.submissionCount, state.players.length)}
                      </p>
                    </div>
                    {seconds !== null && <CountdownTimer seconds={seconds} />}
                  </div>
                  {!state.manualControl && (
                    <p className="mt-3 text-sm text-[var(--accent-jasmine)]">{c.manualLegacy}</p>
                  )}
                  {state.paused && <p className="mt-3 font-bold">{c.pause}</p>}
                  {seconds === 0 && <p>{c.expired}</p>}
                  {!judge && (
                    <div className="mt-5 space-y-3">
                      {nextAction && (
                        <GlassButton
                          className="w-full"
                          disabled={disabled || Boolean(state.paused)}
                          onClick={() => action(nextAction)}
                        >
                          {nextLabel} · Enter
                        </GlassButton>
                      )}
                      <details className="rounded-2xl bg-[var(--surface-soft)] p-3">
                        <summary className="cursor-pointer text-sm font-bold">
                          {c.exceptions}
                        </summary>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <GlassButton
                            variant="glass"
                            disabled={disabled}
                            onClick={() =>
                              send({
                                type: "SET_SCREEN",
                                commandId: crypto.randomUUID(),
                                expectedVersion: state.version,
                                screen:
                                  state.presentationMode === "INTERMISSION"
                                    ? "AUTO"
                                    : "INTERMISSION",
                              })
                            }
                          >
                            {state.presentationMode === "INTERMISSION"
                              ? c.showDisplay
                              : c.hideDisplay}
                          </GlassButton>
                          {!["LOBBY", "FINISHED"].includes(state.phase) && (
                            <GlassButton
                              disabled={disabled}
                              variant="glass"
                              onClick={() => action(state.paused ? "RESUME" : "PAUSE")}
                            >
                              {state.paused ? c.resume : c.pause}
                            </GlassButton>
                          )}
                          {["QUESTION", "SUBMITTING", "REVEAL", "VOTING"].includes(state.phase) && (
                            <GlassButton
                              disabled={disabled || Boolean(state.paused)}
                              variant="danger"
                              onClick={() =>
                                setConfirmation({ kind: "stop", version: state.version })
                              }
                            >
                              {c.stop}
                            </GlassButton>
                          )}
                          {["LOBBY", "QUESTION", "LEADERBOARD"].includes(state.phase) && (
                            <GlassButton
                              variant="glass"
                              disabled={disabled}
                              onClick={() =>
                                send({
                                  type: "SET_MODE",
                                  commandId: crypto.randomUUID(),
                                  expectedVersion: state.version,
                                  mode:
                                    state.mode === "TALENT_MODE" ? "COMMUNITY_MODE" : "TALENT_MODE",
                                })
                              }
                            >
                              {state.mode === "TALENT_MODE" ? c.community : c.talent}
                            </GlassButton>
                          )}
                          {state.phase === "QUESTION" && (
                            <GlassButton
                              variant="ghost"
                              disabled={disabled}
                              onClick={() => action("RESTART_ROUND")}
                            >
                              {c.restart}
                            </GlassButton>
                          )}
                          {dry && state.phase === "SUBMITTING" && (
                            <GlassButton onClick={() => simulate(false)}>
                              {c.simulateSubmit}
                            </GlassButton>
                          )}
                          {dry && state.phase === "VOTING" && (
                            <GlassButton onClick={() => simulate(true)}>
                              {c.simulateVote}
                            </GlassButton>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                  {state.resultPending && (
                    <div className="surface-soft mt-4 rounded-2xl p-4">
                      <strong>{judge ? c.judgeChosen : c.provisional}</strong>
                      <p className="mt-2 text-sm">
                        {state.provisionalWinnerId
                          ? `#${state.submissions.findIndex((s) => s.id === state.provisionalWinnerId) + 1}`
                          : c.none}
                      </p>
                      {!judge && (
                        <div className="mt-3 flex gap-2">
                          <GlassButton
                            disabled={disabled}
                            onClick={() =>
                              setConfirmation({ kind: "publish", version: state.version })
                            }
                          >
                            {c.publish}
                          </GlassButton>
                          <GlassButton
                            disabled={disabled}
                            variant="glass"
                            onClick={() =>
                              setConfirmation({ kind: "override", version: state.version })
                            }
                          >
                            {c.override}
                          </GlassButton>
                        </div>
                      )}
                    </div>
                  )}
                  {state.phase === "FINISHED" && <p className="mt-4 font-bold">{c.finish}</p>}
                  {state.phase === "FINISHED" && !judge && !dry && (
                    <GlassButton
                      className="mt-3"
                      variant="danger"
                      onClick={archiveCompletedSession}
                    >
                      {c.archiveSession}
                    </GlassButton>
                  )}
                  {!judge && (
                    <details className="mt-3 rounded-2xl bg-[var(--surface-soft)] p-3">
                      <summary className="cursor-pointer text-sm font-bold">{c.exceptions}</summary>
                      <GlassButton
                        className="mt-3"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => action("RECOVER_SESSION")}
                      >
                        {c.recover}
                      </GlassButton>
                    </details>
                  )}
                </GlassCard>
                <GlassCard className="p-5">
                  <h2 className="font-black">{c.submissions}</h2>
                  {judge && <p className="my-3 text-sm">{c.judgeWaiting}</p>}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {state.submissions.map((submission, index) => (
                      <article
                        className="surface-solid rounded-2xl border border-[var(--border-card)] p-3"
                        key={submission.id}
                      >
                        {judge ? (
                          <JudgeImage
                            id={submission.memeAssetId}
                            code={sessionCode}
                            token={game.token}
                          />
                        ) : (
                          <OperatorMedia
                            src={`/api/admin/assets/${submission.memeAssetId}/content`}
                            alt={`${c.submissions} ${index + 1}`}
                          />
                        )}
                        <p className="mt-2 text-sm font-bold">
                          #{index + 1} ·{" "}
                          {submission.authorPlayerId
                            ? state.players.find((p) => p.id === submission.authorPlayerId)
                                ?.displayName
                            : c.anonymous}
                        </p>
                        {!judge && (
                          <p className="text-sm">{c.voteCount(submission.voteCount ?? 0)}</p>
                        )}
                        {state.phase === "REVEAL" &&
                          !state.resultPending &&
                          (state.mode === "TALENT_MODE" ||
                            (state.awaitingTieBreak &&
                              state.tieCandidateIds.includes(submission.id))) && (
                            <GlassButton
                              className="mt-2 w-full"
                              size="small"
                              disabled={disabled || Boolean(state.paused)}
                              onClick={() =>
                                send({
                                  type: "SELECT_WINNER",
                                  commandId: crypto.randomUUID(),
                                  expectedVersion: state.version,
                                  submissionId: submission.id,
                                })
                              }
                            >
                              {c.choose}
                            </GlassButton>
                          )}
                      </article>
                    ))}
                  </div>
                  {!state.submissions.length && <p className="mt-4 text-sm">{c.noSubmissions}</p>}
                </GlassCard>
                {!judge && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <GlassCard className="p-5">
                      <h2 className="mb-3 font-black">{c.players}</h2>
                      {state.players.map((player) => (
                        <div
                          className="flex items-center justify-between gap-3 border-b border-white py-2 text-sm"
                          key={player.id}
                        >
                          <span className="min-w-0 truncate">
                            {player.connected ? "●" : "○"} {player.displayName}
                          </span>
                          <strong>{c.score(player.score)}</strong>
                          <GlassButton
                            size="small"
                            variant="ghost"
                            disabled={disabled}
                            onClick={() =>
                              setConfirmation({
                                kind: "score",
                                id: player.id,
                                version: state.version,
                              })
                            }
                          >
                            {c.adjust}
                          </GlassButton>
                        </div>
                      ))}
                    </GlassCard>
                    <GlassCard className="p-5">
                      <h2 className="mb-3 font-black">{c.scores}</h2>
                      <ol>
                        {[...state.players]
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 5)
                          .map((p, i) => (
                            <li key={p.id} className="flex justify-between py-2 text-sm">
                              <span>
                                {i + 1}. {p.displayName}
                              </span>
                              <strong>{c.score(p.score)}</strong>
                            </li>
                          ))}
                      </ol>
                      <p className="mt-3 text-xs font-bold text-[var(--ink-muted)]">{c.topFive}</p>
                    </GlassCard>
                  </div>
                )}
              </>
            )}
            {!judge && !dry && (
              <>
                <GlassCard className="p-5">
                  <h2 className="mb-4 font-black">{c.judgeSetup}</h2>
                  <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const data = new FormData(form);
                      void run(async () => {
                        await adminRequest(`/api/admin/sessions/${sessionCode}/judge`, {
                          displayName: data.get("displayName"),
                        });
                        form.reset();
                      }, c.judgeCreated);
                    }}
                  >
                    <GlassInput label={c.judgeName} name="displayName" required />
                    <GlassButton type="submit" disabled={!state}>
                      {c.configure}
                    </GlassButton>
                    <a
                      href={`/judge/${sessionCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline"
                    >
                      {c.judgeTitle}
                    </a>
                  </form>
                </GlassCard>
                <GlassCard className="p-5">
                  <h2 className="font-black">{c.audit}</h2>
                  <div className="mt-3 max-h-64 overflow-auto">
                    {audit.map((item) => (
                      <details key={item.id} className="border-b border-white py-2 text-xs">
                        <summary>
                          {item.created_at} · {item.actor_type} · {item.event_type}
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all">
                          {item.payload_json}
                        </pre>
                      </details>
                    ))}
                  </div>
                </GlassCard>
              </>
            )}
          </section>
        </div>
        <GlassModal
          open={Boolean(confirmation)}
          title={
            confirmation?.kind === "publish"
              ? c.publish
              : confirmation?.kind === "override"
                ? c.override
                : confirmation?.kind === "score"
                  ? c.adjust
                  : c.stop
          }
          description={
            confirmation?.kind === "publish"
              ? c.warningPublish
              : confirmation?.kind === "override"
                ? c.warningOverride
                : confirmation?.kind === "score"
                  ? c.warningScore
                  : c.warningStop
          }
          onClose={() => setConfirmation(null)}
        >
          <form className="space-y-4" onSubmit={confirm}>
            {confirmation && confirmation.version !== state?.version && (
              <p role="alert">{c.stale}</p>
            )}
            {confirmation?.kind === "override" && (
              <label className="block text-sm font-bold">
                {c.submissions}
                <select className="cms-field" name="submissionId">
                  <option value="">{c.none}</option>
                  {state?.submissions.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      #{i + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {confirmation?.kind === "score" && (
              <GlassInput
                label={c.delta}
                name="delta"
                type="number"
                min={-10000}
                max={10000}
                required
              />
            )}
            {["override", "score"].includes(confirmation?.kind ?? "") && (
              <GlassInput label={c.reason} name="reason" minLength={5} maxLength={300} required />
            )}
            <GlassButton
              type="submit"
              disabled={disabled || confirmation?.version !== state?.version}
            >
              {c.confirm}
            </GlassButton>
          </form>
        </GlassModal>
      </div>
    </main>
  );
}
