import { CheckCircle2, Users } from "lucide-react";
import { AmbientBackground } from "../components/ambient-background";
import { Brand } from "../components/brand";
import { GlassBadge } from "../components/glass-badge";
import { GlassCard } from "../components/glass-card";
import { MemeCard } from "../components/meme-card";
import { mockMemes, mockRound } from "../data/mock-data";

export function DisplayPage({ sessionCode }: { sessionCode: string }) {
  const progress = Math.round((mockRound.submitted / mockRound.players) * 100);
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden px-[clamp(1.25rem,4vw,4rem)] py-[clamp(1rem,3vw,2.5rem)]">
      <AmbientBackground />
      <header className="relative z-20 flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-2.5">
          <GlassBadge
            className="hidden min-h-9 px-3 text-xs sm:inline-flex"
            icon={<Users aria-hidden="true" size={14} />}
            tone="success"
          >
            {mockRound.players} người chơi
          </GlassBadge>
          <span className="rounded-full bg-violet-800 px-4 py-2 text-sm font-black tracking-[.08em] text-white shadow-lg shadow-violet-500/20">
            {sessionCode}
          </span>
        </div>
      </header>

      <section className="relative z-10 grid min-h-0 flex-1 items-center gap-[clamp(2rem,5vw,5rem)] py-[clamp(2rem,5vh,4rem)] xl:grid-cols-[1.12fr_.88fr]">
        <div>
          <GlassBadge tone="violet">Vòng {mockRound.number} · Đang gửi meme</GlassBadge>
          <h1 className="mt-6 max-w-5xl text-balance text-[clamp(2.7rem,5.7vw,6rem)] font-black leading-[.98] tracking-[-.055em] text-violet-950">
            {mockRound.prompt}
          </h1>
          <div className="mt-[clamp(2rem,5vh,4rem)] max-w-3xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-violet-950/50">Đã nhận</span>
                <p className="mt-1 text-3xl font-black tracking-[-.04em] text-violet-950">
                  {mockRound.submitted}{" "}
                  <span className="text-lg text-violet-950/42">/ {mockRound.players} meme</span>
                </p>
              </div>
              <div
                className="countdown countdown-large"
                aria-label={`Còn ${mockRound.secondsLeft} giây`}
              >
                {mockRound.secondsLeft}
              </div>
            </div>
            <div className="mt-5 h-3.5 overflow-hidden rounded-full border border-white/70 bg-white/58 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-400 shadow-[0_0_18px_rgba(205,85,164,.3)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-violet-950/55">
              <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={16} /> Mỗi lựa
              chọn đã gửi đều được giữ an toàn
            </p>
          </div>
        </div>

        <GlassCard
          className="mx-auto w-full max-w-[40rem] p-4 sm:p-5"
          variant="subtle"
          radius="xlarge"
        >
          <div className="grid grid-cols-2 gap-3">
            {mockMemes.slice(0, 4).map((meme, index) => (
              <MemeCard
                key={meme.id}
                aria-label={`Meme ẩn danh số ${index + 1}`}
                className="pointer-events-none"
                compact
                meme={{ ...meme, title: `Meme #${index + 1}` }}
              />
            ))}
          </div>
        </GlassCard>
      </section>

      <footer className="relative z-10 flex items-center justify-between text-xs font-semibold text-violet-950/42">
        <span>MisThy Meme Party</span>
        <span>Quét mã phòng · Chọn meme · Quẩy hết mình</span>
      </footer>
    </main>
  );
}
