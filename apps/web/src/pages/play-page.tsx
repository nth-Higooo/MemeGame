import { getMessages } from "../i18n";
import { playerContentSchema, playerRoomSchema } from "@misthy/shared";
import { Check } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { AppShell } from "../components/app-shell";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassCard } from "../components/glass-card";
import { GlassInput } from "../components/glass-input";
import { GlassModal } from "../components/glass-modal";
import { QuestionCard } from "../components/question-card";
import { CountdownTimer } from "../components/countdown-timer";
import { playerRequest, usePlayerSession } from "../lib/player-session";
import { revealPosition } from "../lib/reveal-position";

const playerText = getMessages().player;

type Content = ReturnType<typeof playerContentSchema.parse>;
const emptyContent: Content = { assets: [], participation: { submissions: 0, votes: 0, wins: 0 } };

function PlayerImage({
  id,
  code,
  token,
  alt,
}: {
  id: string;
  code: string;
  token: string;
  alt: string;
}) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [retryImage, setRetryImage] = useState(0);
  const reduced = useReducedMotion();
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let objectUrl = "";
    void fetch(`/api/sessions/${code}/content/${id}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("image");
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) {
          setFailed(false);
          setUrl(objectUrl);
        } else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, code, token, retryImage]);
  return (
    <div className="aspect-video w-full">
      {failed ? (
        <div className="grid h-full place-items-center bg-[var(--surface-soft)] p-3 text-xs">
          <span role="status">{playerText.anhChuaSanSang}</span>
          <GlassButton
            variant="ghost"
            onClick={() => {
              setFailed(false);
              setRetryImage((value) => value + 1);
            }}
          >
            {playerText.taiLaiAnh}
          </GlassButton>
        </div>
      ) : !url ? (
        <div className="h-full bg-[var(--surface-soft)]" aria-label={playerText.dangTaiAnh} />
      ) : reduced && !animate ? (
        <GlassButton variant="soft" onClick={() => setAnimate(true)}>
          {playerText.phatAnhDong} {alt}
        </GlassButton>
      ) : (
        <img
          src={url}
          alt={alt}
          className="aspect-video w-full rounded-2xl bg-[var(--surface-soft)] object-contain"
          loading="eager"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function PlayPage({ sessionCode }: { sessionCode: string }) {
  const game = usePlayerSession(sessionCode);
  const [room, setRoom] = useState<ReturnType<typeof playerRoomSchema.parse> | null>(null);
  const [roomError, setRoomError] = useState("");
  const [content, setContent] = useState<Content>(emptyContent);
  const [contentError, setContentError] = useState("");
  const [selection, setSelection] = useState<{ round: number; id: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    kind: "meme" | "vote";
    id: string;
    phaseStartedAt: number | null;
  } | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    let active = true;
    void playerRequest(`/api/sessions/${sessionCode}`)
      .then((data) => {
        if (active) setRoom(playerRoomSchema.parse(data));
      })
      .catch((error: unknown) => {
        if (active)
          setRoomError(error instanceof Error ? error.message : playerText.khongTimThayPhong);
      });
    return () => {
      active = false;
    };
  }, [sessionCode]);
  const snapshot = game.snapshot;
  const activeConfirmation =
    confirmation?.phaseStartedAt === snapshot?.phaseStartedAt ? confirmation : null;
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!game.identity || !snapshot || game.status !== "connected") return;
    let active = true;
    void playerRequest(`/api/sessions/${sessionCode}/content`, undefined, game.identity)
      .then((data) => {
        if (active) {
          setContent(playerContentSchema.parse(data));
          setContentError("");
        }
      })
      .catch((error: unknown) => {
        if (active)
          setContentError(error instanceof Error ? error.message : playerText.khongTheTaiThuVien);
      });
    return () => {
      active = false;
    };
    // Content and personal totals change at phase/round boundaries, not with every other player's action.
  }, [game.identity, snapshot?.roundNumber, snapshot?.phase, game.status, sessionCode]); // eslint-disable-line react-hooks/exhaustive-deps
  const seconds =
    snapshot?.phaseEndsAt === null || !snapshot
      ? null
      : Math.max(0, Math.ceil((snapshot.phaseEndsAt - clock - game.offset) / 1000));
  const expired = seconds === 0;
  const disabled = game.status !== "connected" || game.pending || snapshot?.paused || expired;
  const own = snapshot?.players.find((player) => player.id === snapshot.viewerId);
  const selected =
    selection?.round === snapshot?.roundNumber ? selection?.id : snapshot?.ownMemeAssetId;
  const assets = content.assets.filter((asset) => snapshot?.allowedMemeAssetIds.includes(asset.id));
  const image = (id: string, alt: string) =>
    game.identity ? (
      <PlayerImage key={id} id={id} code={sessionCode} token={game.identity} alt={alt} />
    ) : null;
  const leaderboard = () => (
    <ol className="mt-4 space-y-2" aria-label={playerText.bangXepHang}>
      {[...(snapshot?.players ?? [])]
        .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))
        .map((player, index) => (
          <li
            className="flex items-center justify-between rounded-2xl bg-[var(--surface-soft)] p-3 text-sm"
            key={player.id}
          >
            <span>
              {index + 1}. {player.displayName}
              {player.id === own?.id ? playerText.ban : ""}
            </span>
            <strong>
              {player.score} {playerText.diem}
            </strong>
          </li>
        ))}
    </ol>
  );
  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void game.join(String(data.get("nickname")));
  };
  const confirm = () => {
    if (!activeConfirmation || !confirmation || disabled || !snapshot) return;
    game.send(
      confirmation.kind === "vote"
        ? { type: "CAST_VOTE", commandId: crypto.randomUUID(), submissionId: confirmation.id }
        : {
            type: snapshot.hasSubmitted ? "REPLACE_MEME" : "SUBMIT_MEME",
            commandId: crypto.randomUUID(),
            memeAssetId: confirmation.id,
          },
    );
    setConfirmation(null);
  };

  return (
    <AppShell
      compactNav
      brandLinked={false}
      showNav={false}
      action={
        game.identity && snapshot ? (
          <strong className="max-w-[70vw] truncate text-right text-sm text-[var(--midnight)]">
            {own?.displayName ?? playerText.dangKhoiPhucDanhTinh} ·{" "}
            {playerText.round(Math.max(1, snapshot.roundNumber), snapshot.totalRounds)}
          </strong>
        ) : (
          <GlassBadge tone="violet">{sessionCode}</GlassBadge>
        )
      }
    >
      <div className="player-live mx-auto max-w-xl py-2 pb-12 [overflow-wrap:anywhere]">
        {!game.identity ? (
          <GlassCard className="p-6">
            <GlassBadge tone="violet">{getMessages().brand.title}</GlassBadge>
            <h1 className="mt-4 text-2xl font-black">{playerText.thamGiaPhong}</h1>
            <p className="mt-2 text-sm">{room?.name ?? playerText.dangKiemTraPhong}</p>
            {roomError && (
              <p role="alert" className="mt-3 text-red-700">
                {roomError}
              </p>
            )}
            {room && room.status !== "LOBBY" && (
              <p className="mt-3">{playerText.phongDaBatDauHayDungTrinhDuyetDa}</p>
            )}
            <form onSubmit={submitJoin} className="mt-5 space-y-4">
              <GlassInput
                name="nickname"
                label={playerText.bietDanh}
                required
                minLength={1}
                maxLength={32}
                autoComplete="nickname"
              />
              <GlassButton
                className="w-full"
                disabled={!room || room.status !== "LOBBY" || game.pending}
              >
                {game.pending ? playerText.dangThamGia : playerText.xacNhanThamGia}
              </GlassButton>
            </form>
          </GlassCard>
        ) : (
          <>
            {game.status !== "connected" && (
              <div className="mb-4 flex items-center justify-between gap-3" role="status">
                <span className="text-sm font-bold">{playerText.matKetNoiDangThuLai}</span>
                <GlassButton variant="glass" size="small" onClick={game.reconnect}>
                  {playerText.ketNoiLai}
                </GlassButton>
              </div>
            )}
            {!snapshot && (
              <p className="mt-6" role="status">
                {playerText.dangDongBoPhong}
              </p>
            )}
            {snapshot && (
              <>
                {snapshot.phase === "LOBBY" && (
                  <GlassCard className="p-6">
                    <h1 className="text-2xl font-black">{playerText.banDaVaoPhong}</h1>
                    <p className="mt-3">
                      {playerText.chao} {own?.displayName}
                      {playerText.dangChoQuanTroBatDau}
                    </p>
                    <p className="mt-3 font-bold">
                      {snapshot.players.filter((player) => player.connected).length}{" "}
                      {playerText.nguoiDangKetNoi}
                    </p>
                    <p className="mt-4 text-sm leading-6">{playerText.lobbyHint}</p>
                  </GlassCard>
                )}
                {!["LOBBY", "FINISHED", "LEADERBOARD"].includes(snapshot.phase) &&
                  snapshot.prompt && <QuestionCard>{snapshot.prompt}</QuestionCard>}
                {seconds !== null && (
                  <div className="my-3 flex justify-end">
                    <CountdownTimer
                      seconds={seconds}
                      total={Math.max(
                        1,
                        ((snapshot.phaseEndsAt ?? 0) - (snapshot.phaseStartedAt ?? 0)) / 1000,
                      )}
                    />
                  </div>
                )}
                {snapshot.paused && (
                  <p role="status" className="mb-3 rounded-2xl bg-amber-50 p-3 font-bold">
                    {playerText.troChoiDangTamDung}
                  </p>
                )}
                {expired && (
                  <p role="status" className="mb-3 rounded-2xl bg-amber-50 p-3 font-bold">
                    {playerText.daHetThoiGianDangChoMayChuChuyen}
                  </p>
                )}
                {!["LOBBY", "FINISHED", "LEADERBOARD"].includes(snapshot.phase) &&
                  snapshot.questionImageAssetId &&
                  image(snapshot.questionImageAssetId, playerText.anhTinhHuong)}
                {snapshot.phase === "SUBMITTING" && (
                  <section className="mt-4">
                    <h1 className="sr-only">{playerText.chonCuChotCuaBan}</h1>
                    {snapshot.hasSubmitted && (
                      <p className="mt-2 font-bold text-emerald-700" role="status">
                        {playerText.daGuiMemeBanCoTheThayDoiTruoc}
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                      {assets.map((asset) => (
                        <button
                          type="button"
                          key={asset.id}
                          className={`player-meme overflow-hidden p-2 text-left ${selected === asset.id ? "player-meme-selected" : ""}`}
                          disabled={disabled}
                          aria-pressed={selected === asset.id}
                          aria-label={playerText.selectMeme(asset.title)}
                          onClick={() =>
                            setSelection({ round: snapshot.roundNumber, id: asset.id })
                          }
                        >
                          {image(asset.id, asset.altText || asset.title)}
                          {selected === asset.id && (
                            <span className="player-meme-selection" aria-hidden="true">
                              <Check size={22} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    {!assets.length && (
                      <p className="my-5">
                        {contentError || playerText.chuaCoMemePhuHopHayDoiTuKhoa}
                      </p>
                    )}
                    <div className="player-submit-bar sticky mt-4 rounded-3xl p-3">
                      {selected && (
                        <p className="mb-2 text-sm font-bold" role="status">
                          {playerText.selectedMeme(
                            assets.find((asset) => asset.id === selected)?.title ?? "Meme",
                          )}
                        </p>
                      )}
                      <GlassButton
                        className="w-full"
                        disabled={disabled || !selected || selected === snapshot.ownMemeAssetId}
                        onClick={() =>
                          selected &&
                          game.send({
                            type: snapshot.hasSubmitted ? "REPLACE_MEME" : "SUBMIT_MEME",
                            commandId: crypto.randomUUID(),
                            memeAssetId: selected,
                          })
                        }
                      >
                        {game.pending
                          ? playerText.dangGui
                          : snapshot.hasSubmitted
                            ? playerText.thayMemeDaGui
                            : playerText.chotMemeNay}
                      </GlassButton>
                    </div>
                  </section>
                )}
                {snapshot.phase === "REVEAL" && (
                  <p className="mt-4 text-center font-bold" role="status">
                    <span className="sr-only">{playerText.denGioTietLo}. </span>
                    {snapshot.submissions.length
                      ? playerText.revealProgress(
                          revealPosition(snapshot, clock + game.offset) + 1,
                          snapshot.submissions.length,
                        )
                      : playerText.revealEmpty}
                  </p>
                )}
                {snapshot.phase === "VOTING" && snapshot.mode === "COMMUNITY_MODE" && (
                  <section className="mt-4">
                    <h1 className="text-2xl font-black">{playerText.binhChonMemeYeuThich}</h1>
                    {snapshot.hasVoted ? (
                      <p role="status" className="my-3 font-bold text-emerald-700">
                        {playerText.daBinhChonLuaChonDaKhoa} {playerText.voteWait}
                      </p>
                    ) : !snapshot.canVote ? (
                      <p className="my-3">{playerText.banKhongThuocDanhSachBinhChonVongNay}</p>
                    ) : (
                      <p className="my-3 text-sm">
                        {playerText.motLuotBinhChonKhongTheChonMemeCua}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {snapshot.submissions.map((submission, index) => (
                        <GlassCard key={submission.id} className="p-2">
                          {image(submission.memeAssetId, playerText.anonymousMeme(index + 1))}
                          <GlassButton
                            className="mt-2 w-full"
                            size="small"
                            disabled={
                              disabled ||
                              snapshot.hasVoted ||
                              !snapshot.canVote ||
                              submission.id === snapshot.ownSubmissionId
                            }
                            onClick={() =>
                              setConfirmation({
                                kind: "vote",
                                id: submission.id,
                                phaseStartedAt: snapshot.phaseStartedAt,
                              })
                            }
                          >
                            {submission.id === snapshot.ownSubmissionId
                              ? playerText.memeCuaBan
                              : playerText.voteFor(index + 1)}
                          </GlassButton>
                        </GlassCard>
                      ))}
                    </div>
                    {!snapshot.submissions.length && <p>{playerText.vongNayChuaCoSubmission}</p>}
                  </section>
                )}
                {snapshot.phase === "RESULT" && (
                  <GlassCard variant="peach" className="player-result mt-4 p-6">
                    <h1 className="text-2xl font-black">{playerText.ketQuaVongNay}</h1>
                    {(() => {
                      const winner = snapshot.submissions.find(
                        (item) => item.id === snapshot.winnerSubmissionId,
                      );
                      const player = snapshot.players.find(
                        (item) => item.id === winner?.authorPlayerId,
                      );
                      return winner ? (
                        <div className="mt-4">
                          {image(winner.memeAssetId, playerText.memeChienThang)}
                          <p className="mt-3 text-lg font-black">
                            {player?.displayName ?? playerText.nguoiChoi} {playerText.thangVongNay}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3">{playerText.vongNayKhongCoWinner}</p>
                      );
                    })()}
                    <p className="mt-4 font-bold">
                      {playerText.diemCuaBan} {own?.score ?? 0}
                    </p>
                  </GlassCard>
                )}
                {snapshot.phase === "LEADERBOARD" && (
                  <GlassCard className="p-5">
                    <h1 className="text-2xl font-black">{playerText.bangXepHang}</h1>
                    {leaderboard()}
                    <p className="mt-4 text-sm">{playerText.cungChuanBiChoVongTiepTheo}</p>
                  </GlassCard>
                )}
                {snapshot.phase === "FINISHED" && (
                  <GlassCard variant="pink" className="p-5">
                    <h1 className="text-2xl font-black">{playerText.buaTiecMemeDaKetThuc}</h1>
                    <p className="mt-3">
                      {playerText.camOn} {own?.displayName} {playerText.daChoiCungMoiNguoi}
                    </p>
                    {leaderboard()}
                    <h2 className="mt-6 font-black">{playerText.dauAnCuaBan}</h2>
                    <p className="mt-2 text-sm">
                      {content.participation.submissions} {playerText.memeDaGui}{" "}
                      {content.participation.votes} {playerText.luotBinhChon}{" "}
                      {content.participation.wins} {playerText.vongChienThang}
                    </p>
                  </GlassCard>
                )}
              </>
            )}
          </>
        )}
        {(game.error || contentError) && (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-800">
            {game.error || contentError}
          </p>
        )}
        <GlassModal
          open={Boolean(activeConfirmation)}
          title={confirmation?.kind === "vote" ? playerText.xacNhanBinhChon : playerText.guiMemeNay}
          description={
            confirmation?.kind === "vote"
              ? playerText.banChiCoMotLuotVaKhongTheThay
              : playerText.banCoTheThayMemeTruocKhiThoiGian
          }
          onClose={() => setConfirmation(null)}
        >
          <GlassButton className="w-full" disabled={disabled} onClick={confirm}>
            {playerText.xacNhan}
          </GlassButton>
        </GlassModal>
      </div>
    </AppShell>
  );
}
