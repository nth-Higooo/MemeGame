import { Users } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { GlassCard } from "../components/glass-card";

export function DisplayPage({ sessionCode }: { sessionCode: string }) {
  return (
    <AppShell
      action={
        <div className="flex items-center gap-3">
          <span className="status-pill">
            <Users size={14} /> 28 người chơi
          </span>
          <strong className="rounded-full bg-violet-800 px-4 py-2 text-sm text-white">
            {sessionCode}
          </strong>
        </div>
      }
    >
      <section className="flex min-h-[calc(100dvh-6rem)] flex-col items-center justify-center py-10 text-center">
        <span className="eyebrow">Vòng 1 · Đang gửi meme</span>
        <h1 className="mt-7 max-w-5xl text-balance text-5xl font-black leading-[1.02] tracking-[-.055em] text-violet-950 md:text-7xl xl:text-8xl">
          Khi admin bảo “chương trình hôm nay đơn giản lắm”...
        </h1>
        <div className="mt-12 grid w-full max-w-5xl items-center gap-6 md:grid-cols-[1fr_auto]">
          <GlassCard className="p-4 text-left">
            <div className="flex items-center gap-4 rounded-[1.4rem] bg-white/42 p-4">
              <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-300 to-violet-300 text-2xl">
                ✨
              </span>
              <div>
                <strong className="block text-lg text-violet-950">Đã nhận 21 / 28 meme</strong>
                <span className="text-sm text-violet-950/55">
                  Vẫn còn thời gian để tung cú chốt
                </span>
              </div>
            </div>
          </GlassCard>
          <div className="countdown countdown-large" aria-label="Còn 24 giây">
            24
          </div>
        </div>
      </section>
    </AppShell>
  );
}
