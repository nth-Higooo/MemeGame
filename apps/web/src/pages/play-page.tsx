import { getMessages } from "../i18n";
import { playerContentSchema, playerRoomSchema } from "@misthy/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
  const placeholder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const nearViewport = entries.some((entry) => entry.isIntersecting);
        setVisible(nearViewport);
        if (!nearViewport) setUrl("");
      },
      { rootMargin: "200px" },
    );
    if (placeholder.current) observer.observe(placeholder.current);
    return () => observer.disconnect();
  }, []);
  const reduced = useReducedMotion();
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (!visible) return;
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
  }, [id, code, token, visible, retryImage]);
  return (
    <div ref={placeholder} className="aspect-video w-full">
      {failed ? (
        <div className="grid h-full place-items-center bg-white/50 p-3 text-xs">
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
      ) : !visible || !url ? (
        <div className="h-full bg-white/50" aria-label={playerText.dangTaiAnh} />
      ) : reduced && !animate ? (
        <GlassButton variant="soft" onClick={() => setAnimate(true)}>
          {playerText.phatAnhDong} {alt}
        </GlassButton>
      ) : (
        <img
          src={url}
          alt={alt}
          className="aspect-video w-full rounded-2xl bg-white/60 object-contain"
          loading="lazy"
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
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [selection, setSelection] = useState<{ round: number; id: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
  const visible = assets.filter(
    (asset) =>
      (!tag || asset.tags.includes(tag)) &&
      `${asset.title} ${asset.tags.join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  const tags = [...new Set(assets.flatMap((asset) => asset.tags))];
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
            className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm"
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
    <AppShell compactNav action={<GlassBadge tone="violet">{sessionCode}</GlassBadge>}>
      <div className="player-live mx-auto max-w-xl py-5 pb-12 [overflow-wrap:anywhere]">
        {!game.identity ? (
          <GlassCard className="p-6">
            <GlassBadge tone="violet">MisThy Meme Party</GlassBadge>
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
            <p className="mt-4 text-xs text-[var(--ink-muted)]">
              {playerText.banThamGiaAnDanhDanhTinhDuocLuu}
            </p>
          </GlassCard>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-2 text-xs font-bold">
              <span className="min-w-0 truncate">
                {own?.displayName ?? playerText.dangKhoiPhucDanhTinh}
              </span>
              <span role="status">
                {game.status === "connected"
                  ? playerText.daKetNoi
                  : game.status === "connecting"
                    ? playerText.dangKetNoi
                    : playerText.matKetNoiDangThuLai}
              </span>
            </div>
            {game.status !== "connected" && (
              <GlassButton variant="glass" size="small" onClick={game.reconnect}>
                {playerText.ketNoiLai}
              </GlassButton>
            )}
            {!snapshot && (
              <p className="mt-6" role="status">
                {playerText.dangDongBoPhong}
              </p>
            )}
            {snapshot && (
              <>
                <header className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <GlassBadge tone="violet">
                      {snapshot.phase === "LOBBY"
                        ? playerText.sanSangNhapTiec
                        : playerText.round(snapshot.roundNumber, snapshot.totalRounds)}
                    </GlassBadge>
                    <p className="mt-2 text-sm font-bold">
                      {snapshot.mode === "COMMUNITY_MODE"
                        ? playerText.congDongBinhChon
                        : playerText.talentChonWinner}{" "}
                      · {own?.score ?? 0} {playerText.diem}
                    </p>
                  </div>
                  {seconds !== null && (
                    <CountdownTimer
                      seconds={seconds}
                      total={Math.max(
                        1,
                        ((snapshot.phaseEndsAt ?? 0) - (snapshot.phaseStartedAt ?? 0)) / 1000,
                      )}
                    />
                  )}
                </header>
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
                    <p className="mt-4 text-sm leading-6">
                      {playerText.docTinhHuongChonMemeHopNhatVaGui}
                    </p>
                  </GlassCard>
                )}
                {!["LOBBY", "FINISHED", "LEADERBOARD"].includes(snapshot.phase) &&
                  snapshot.prompt && <QuestionCard>{snapshot.prompt}</QuestionCard>}
                {snapshot.questionImageAssetId &&
                  image(snapshot.questionImageAssetId, playerText.anhTinhHuong)}
                {snapshot.phase === "QUESTION" && (
                  <GlassCard className="mt-4 p-6">
                    <h1 className="text-xl font-black">{playerText.docTinhHuongNao}</h1>
                    <p className="mt-3">{playerText.thuVienMemeSeMoNgaySauPhanCau}</p>
                  </GlassCard>
                )}
                {snapshot.phase === "SUBMITTING" && (
                  <section className="mt-4">
                    <h1 className="text-2xl font-black">{playerText.chonCuChotCuaBan}</h1>
                    {snapshot.hasSubmitted && (
                      <p className="mt-2 font-bold text-emerald-700" role="status">
                        {playerText.daGuiMemeBanCoTheThayDoiTruoc}
                      </p>
                    )}
                    <GlassInput
                      className="mt-2"
                      label={playerText.timMeme}
                      placeholder={playerText.tenHoacTag}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    <div className="my-3 flex gap-2 overflow-x-auto">
                      <GlassButton
                        size="small"
                        variant={!tag ? "soft" : "ghost"}
                        onClick={() => setTag("")}
                      >
                        {playerText.tatCa}
                      </GlassButton>
                      {tags.map((value) => (
                        <GlassButton
                          size="small"
                          key={value}
                          aria-pressed={value === tag}
                          variant={value === tag ? "soft" : "ghost"}
                          onClick={() => setTag(value)}
                        >
                          {value}
                        </GlassButton>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {visible.map((asset) => (
                        <GlassCard
                          key={asset.id}
                          className={`overflow-hidden p-2 ${selected === asset.id ? "ring-2 ring-[var(--periwinkle-700)]" : ""}`}
                        >
                          {image(asset.id, asset.altText || asset.title)}
                          <strong className="my-2 block text-sm">{asset.title}</strong>
                          <div className="flex flex-wrap gap-1">
                            <GlassButton
                              variant="ghost"
                              size="small"
                              onClick={() => setPreview(asset.id)}
                            >
                              {playerText.xem}
                            </GlassButton>
                            <GlassButton
                              size="small"
                              variant={selected === asset.id ? "primary" : "glass"}
                              disabled={disabled}
                              aria-pressed={selected === asset.id}
                              aria-label={playerText.selectMeme(asset.title)}
                              onClick={() =>
                                setSelection({ round: snapshot.roundNumber, id: asset.id })
                              }
                            >
                              {playerText.chon}
                            </GlassButton>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                    {!visible.length && (
                      <p className="my-5">
                        {contentError || playerText.chuaCoMemePhuHopHayDoiTuKhoa}
                      </p>
                    )}
                    <div className="sticky bottom-3 mt-4 rounded-3xl border border-white bg-white/90 p-3 shadow-lg backdrop-blur-xl">
                      <GlassButton
                        className="w-full"
                        disabled={disabled || !selected || selected === snapshot.ownMemeAssetId}
                        onClick={() =>
                          selected &&
                          setConfirmation({
                            kind: "meme",
                            id: selected,
                            phaseStartedAt: snapshot.phaseStartedAt,
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
                  <GlassCard className="mt-4 p-6">
                    <h1 className="text-2xl font-black">{playerText.denGioTietLo}</h1>
                    <p className="mt-3">
                      {playerText.cungXemCacMemeTrenManHinhLon}{" "}
                      {snapshot.mode === "TALENT_MODE"
                        ? playerText.dangChoTalentChonWinner
                        : playerText.binhChonSeMoSauPhanTietLo}
                    </p>
                  </GlassCard>
                )}
                {snapshot.phase === "VOTING" && snapshot.mode === "COMMUNITY_MODE" && (
                  <section className="mt-4">
                    <h1 className="text-2xl font-black">{playerText.binhChonMemeYeuThich}</h1>
                    {snapshot.hasVoted ? (
                      <p role="status" className="my-3 font-bold text-emerald-700">
                        {playerText.daBinhChonLuaChonDaKhoa}
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
                  <GlassCard className="mt-4 p-6">
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
                  <GlassCard className="p-5">
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
          open={Boolean(preview)}
          title={playerText.xemTruocMeme}
          onClose={() => setPreview(null)}
        >
          {preview &&
            image(preview, content.assets.find((asset) => asset.id === preview)?.title ?? "Meme")}
        </GlassModal>
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
