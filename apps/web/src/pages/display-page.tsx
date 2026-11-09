import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Expand, Minimize, Trophy } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CelestialBackground } from "../components/celestial-background";
import { CountdownTimer } from "../components/countdown-timer";
import { getMessages } from "../i18n";
import { useDisplayMedia, useDisplaySession } from "../lib/display-session";
import { RoundFlow } from "../components/round-flow";
import { revealPosition } from "../lib/reveal-position";

const copy = getMessages().display;

function StarConfetti() {
  return (
    <div className="presentation-confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => {
        const angle = (index / 28) * Math.PI * 2;
        const distance = 28 + (index % 5) * 7;
        return (
          <i
            key={index}
            style={
              {
                "--star-x": `${Math.cos(angle) * distance}vw`,
                "--star-y": `${Math.sin(angle) * distance}vh`,
                "--star-delay": `${(index % 7) * 0.035}s`,
                "--star-rotate": `${180 + (index % 4) * 90}deg`,
              } as CSSProperties
            }
          >
            ★
          </i>
        );
      })}
    </div>
  );
}

function StageImage({
  url,
  label,
  error,
  reduced,
}: {
  url: string | undefined;
  label: string;
  error?: string | undefined;
  reduced: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!url || !reduced) return;
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (disposed || !canvas.current) return;
      const scale = Math.min(1, 1280 / image.naturalWidth);
      canvas.current.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.current.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.current
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.current.width, canvas.current.height);
      image.onload = null;
      image.onerror = null;
      image.src = "";
    };
    image.onerror = () => {
      if (!disposed) setFailed(url);
    };
    image.src = url;
    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      image.src = "";
    };
  }, [url, reduced]);
  return (
    <div className="presentation-image" data-testid="stage-media">
      {error || (url && failed === url) ? (
        <span role="status">{copy.unavailable}</span>
      ) : !url ? (
        <span role="status">{copy.loading}</span>
      ) : reduced ? (
        <canvas ref={canvas} role="img" aria-label={label} />
      ) : (
        <img src={url} alt={label} onError={() => setFailed(url)} />
      )}
    </div>
  );
}

export function DisplayPage({ sessionCode }: { sessionCode: string }) {
  const { snapshot, status, offset, reconnect } = useDisplaySession(sessionCode);
  const reduced = Boolean(useReducedMotion());
  const [clock, setClock] = useState(() => Date.now());
  const [qr, setQr] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const root = useRef<HTMLElement>(null);
  const joinUrl = new URL(`/play/${sessionCode}`, location.origin).href;
  const intermission = snapshot?.presentationMode === "INTERMISSION";
  const phase = intermission ? "LOBBY" : snapshot?.phase;
  const publicMedia = Boolean(
    phase && ["REVEAL", "VOTING", "RESULT", "LEADERBOARD", "FINISHED"].includes(phase),
  );
  const submissions = publicMedia ? (snapshot?.submissions ?? []) : [];
  const ids = [
    ...submissions.map((item) => item.memeAssetId),
    ...(snapshot?.questionImageAssetId && phase !== "LOBBY" ? [snapshot.questionImageAssetId] : []),
  ];
  const media = useDisplayMedia(sessionCode, ids, status === "connected");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(joinUrl, {
      width: 384,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#242b4d", light: "#ffffff" },
    })
      .then((value) => {
        if (active) setQr(value);
      })
      .catch(() => {
        if (active) setQr("");
      });
    return () => {
      active = false;
    };
  }, [joinUrl]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setNotice(copy.fullscreenFailed);
    } catch {
      setNotice(copy.fullscreenFailed);
    }
  };
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    const key = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => setNotice(copy.fullscreenFailed));
        else if (root.current?.requestFullscreen)
          void root.current.requestFullscreen().catch(() => setNotice(copy.fullscreenFailed));
        else setNotice(copy.fullscreenFailed);
      }
    };
    document.addEventListener("fullscreenchange", change);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const seconds =
    snapshot?.phaseEndsAt !== null && snapshot && !intermission
      ? Math.max(0, Math.ceil((snapshot.phaseEndsAt - clock - offset) / 1000))
      : null;
  const ownRound = snapshot?.roundNumber ?? 0;
  const elapsed = Math.max(
    0,
    (snapshot?.paused ? snapshot.serverTime : clock + offset) - (snapshot?.phaseStartedAt ?? clock),
  );
  const index = snapshot ? revealPosition(snapshot, clock + offset) : 0;
  const active = submissions[index];
  const winner = submissions.find((item) => item.id === snapshot?.winnerSubmissionId);
  const winnerName = snapshot?.players.find(
    (item) => item.id === winner?.authorPlayerId,
  )?.displayName;
  const ranked = [...(snapshot?.players ?? [])].sort(
    (a, b) => b.score - a.score || a.id.localeCompare(b.id),
  );
  const rankPage =
    Math.floor(elapsed / 10000) % Math.max(1, Math.ceil(Math.max(0, ranked.length - 3) / 8));
  const progress = snapshot?.players.length
    ? Math.min(100, (100 * snapshot.submissionCount) / snapshot.players.length)
    : 0;
  const leaderboard = (
    <ol className="presentation-ranking" aria-label={copy.leaderboard}>
      {ranked.slice(3 + rankPage * 8, 3 + rankPage * 8 + 8).map((player, position) => (
        <motion.li
          layout={!reduced}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          key={player.id}
        >
          <span className="presentation-rank">{rankPage * 8 + position + 4}</span>
          <strong>{player.displayName}</strong>
          <span>
            {player.score} <small>{copy.points}</small>
          </span>
        </motion.li>
      ))}
    </ol>
  );
  const podium = ranked.slice(0, 3);
  const image = (id: string, label: string) => (
    <StageImage
      key={`${id}:${reduced}`}
      url={media.urls[id]}
      label={label}
      error={media.errors[id]}
      reduced={reduced}
    />
  );
  return (
    <main
      ref={root}
      className="presentation-shell"
      data-testid="presentation"
      data-phase={phase ?? "CONNECTING"}
    >
      <CelestialBackground tone="stage" />
      <div className="presentation-controls">
        <button
          aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen}
          title={`${copy.fullscreen} (F)`}
          onClick={() => void toggleFullscreen()}
        >
          {fullscreen ? <Minimize size={20} /> : <Expand size={20} />}
        </button>
      </div>
      {status !== "connected" && (
        <div className="presentation-network" role="status">
          {status === "missing" ? copy.missing : snapshot ? copy.reconnecting : copy.connecting}
          {status !== "connecting" && <button onClick={reconnect}>{copy.retry}</button>}
        </div>
      )}
      {notice && (
        <p className="presentation-network" role="alert">
          {notice}
        </p>
      )}
      {snapshot?.paused && (
        <div className="presentation-pause" role="status">
          {copy.paused}
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={`${ownRound}:${phase}`}
          className="presentation-body"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.3 }}
        >
          {!snapshot ? (
            <div className="presentation-center">
              <span className="presentation-eyebrow">{getMessages().brand.title}</span>
              <h1>{status === "missing" ? copy.missing : copy.connecting}</h1>
              <p>{status === "missing" ? copy.qrError : copy.networkNote}</p>
              <strong className="presentation-big-code">{sessionCode}</strong>
            </div>
          ) : (
            <>
              {phase === "LOBBY" && (
                <div className="presentation-lobby">
                  <div>
                    <span className="presentation-eyebrow">{snapshot.name}</span>
                    <h1>{intermission ? copy.paused : copy.waiting}</h1>
                    {intermission && <p>{copy.footer}</p>}
                    <strong className="presentation-big-code">{sessionCode}</strong>
                    <p>{copy.players(snapshot.players.filter((item) => item.connected).length)}</p>
                    <div className="presentation-guests">
                      {snapshot.players.slice(-10).map((player) => (
                        <span key={player.id}>{player.displayName}</span>
                      ))}
                    </div>
                    <RoundFlow phase="LOBBY" talent={snapshot.mode === "TALENT_MODE"} />
                  </div>
                  <div className="presentation-join">
                    <h2>{copy.join}</h2>
                    <div className="presentation-qr">
                      {qr ? (
                        <img src={qr} alt={copy.qr} width={384} height={384} />
                      ) : (
                        <p>{copy.qrError}</p>
                      )}
                    </div>
                    <p>{copy.joinHint}</p>
                    <a href={joinUrl} data-testid="join-link">
                      {joinUrl}
                    </a>
                  </div>
                </div>
              )}
              {(phase === "QUESTION" || phase === "SUBMITTING") && (
                <div
                  className={`presentation-question ${snapshot.questionImageAssetId ? "has-image" : ""}`}
                >
                  <div>
                    <span className="presentation-eyebrow">
                      {phase === "QUESTION" ? copy.question : copy.choose}
                    </span>
                    {ownRound === 1 && phase === "QUESTION" && (
                      <motion.p
                        className="presentation-intro"
                        initial={reduced ? false : { opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {copy.intro} <span>{copy.introHint}</span>
                      </motion.p>
                    )}
                    <h1 data-long={(snapshot.prompt?.length ?? 0) > 140}>{snapshot.prompt}</h1>
                    {phase === "SUBMITTING" && (
                      <div className="presentation-progress">
                        <div>
                          <h2>{copy.submitting}</h2>
                          <strong>
                            {copy.received(snapshot.submissionCount, snapshot.players.length)}
                          </strong>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={copy.progress}
                          aria-valuemin={0}
                          aria-valuemax={snapshot.players.length || 1}
                          aria-valuenow={snapshot.submissionCount}
                          className="presentation-progress-track"
                        >
                          <span style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {snapshot.questionImageAssetId &&
                    image(snapshot.questionImageAssetId, copy.question)}
                </div>
              )}
              {(phase === "REVEAL" || phase === "VOTING") && (
                <div className="presentation-reveal">
                  <div className="presentation-reveal-heading">
                    {phase === "REVEAL" ? (
                      <h1 className="presentation-prompt">“{snapshot.prompt}”</h1>
                    ) : (
                      <>
                        <span className="presentation-eyebrow">{copy.votingHint}</span>
                        <h1>{copy.voting}</h1>
                        <blockquote className="presentation-prompt">{snapshot.prompt}</blockquote>
                        <p>{copy.voted(snapshot.votesCast, snapshot.eligibleVoterCount)}</p>
                      </>
                    )}
                  </div>
                  {active ? (
                    <div className="presentation-carousel">
                      <div className="presentation-hero">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.figure
                            key={active.id}
                            initial={reduced ? false : { opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: reduced ? 0 : 0.4 }}
                          >
                            {image(active.memeAssetId, copy.entry(index + 1, submissions.length))}
                          </motion.figure>
                        </AnimatePresence>
                      </div>
                      {phase === "VOTING" && (
                        <div className="presentation-thumbnails" aria-hidden="true">
                          {submissions
                            .slice(Math.floor(index / 4) * 4, Math.floor(index / 4) * 4 + 4)
                            .map((item) => (
                              <div
                                key={item.id}
                                className={item.id === active.id ? "is-active" : ""}
                              >
                                {image(item.memeAssetId, copy.anonymous)}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="presentation-empty">{copy.empty}</div>
                  )}
                </div>
              )}
              {phase === "RESULT" && (
                <div className="presentation-result">
                  <div>
                    <span className="presentation-eyebrow">{copy.result}</span>
                    <h1>{winner ? copy.winner(winnerName ?? copy.anonymous) : copy.emptyResult}</h1>
                    <blockquote className="presentation-prompt">{snapshot.prompt}</blockquote>
                    <p>
                      {winner
                        ? `${ranked.find((player) => player.id === winner.authorPlayerId)?.score ?? 0} ${copy.points}`
                        : copy.noWinner}
                    </p>
                  </div>
                  {winner && image(winner.memeAssetId, copy.result)}
                  {winner && <StarConfetti />}
                </div>
              )}
              {(phase === "LEADERBOARD" || phase === "FINISHED") && (
                <div className="presentation-scores">
                  <span className="presentation-eyebrow">
                    {phase === "FINISHED"
                      ? snapshot.name
                      : copy.round(ownRound, snapshot.totalRounds)}
                  </span>
                  <h1>{phase === "FINISHED" ? copy.finished : copy.leaderboard}</h1>
                  {phase === "FINISHED" && ranked[0] && (
                    <p className="presentation-champion">
                      ✦ {copy.champion}: <strong>{ranked[0].displayName}</strong> ✦
                    </p>
                  )}
                  {ranked.length ? (
                    <>
                      <ol className="presentation-podium" aria-label={copy.leaderboard}>
                        {[podium[1], podium[0], podium[2]].map((player, index) => {
                          if (!player) return null;
                          const place = [2, 1, 3][index]!;
                          return (
                            <li className={`podium-place podium-${place}`} key={player.id}>
                              <strong>{player.displayName}</strong>
                              <Trophy aria-hidden="true" />
                              <span>Top {place}</span>
                              <small>
                                {player.score} {copy.points}
                              </small>
                            </li>
                          );
                        })}
                      </ol>
                      {ranked.length > 3 && leaderboard}
                    </>
                  ) : (
                    <p>{copy.noPlayers}</p>
                  )}
                  <p>{phase === "FINISHED" ? copy.footer : copy.next}</p>
                  {phase === "FINISHED" && <StarConfetti />}
                </div>
              )}
            </>
          )}
        </motion.section>
      </AnimatePresence>
      {seconds !== null && !snapshot?.paused && (
        <aside className="presentation-timer">
          <CountdownTimer
            seconds={seconds}
            total={Math.max(
              1,
              ((snapshot?.phaseEndsAt ?? 0) - (snapshot?.phaseStartedAt ?? 0)) / 1000,
            )}
            size="stage"
          />
          {seconds === 0 && <span>{copy.expired}</span>}
        </aside>
      )}
      {Object.values(media.errors).some(Boolean) && (
        <button className="presentation-media-retry" onClick={media.retry}>
          {copy.mediaRetry}
        </button>
      )}
    </main>
  );
}
