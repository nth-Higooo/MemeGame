import { ArrowRight, Gamepad2, MonitorUp, Palette, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { DecorativeCloud, DecorativeSparkle } from "../components/celestial-background";
import { ConnectionIndicator } from "../components/connection-indicator";
import { GlassButton } from "../components/glass-button";
import { MemeCard } from "../components/meme-card";
import { mockMemes } from "../data/mock-data";
import { getMessages } from "../i18n";

const { roles: roleCopy } = getMessages();
const roles = [
  { icon: Gamepad2, ...roleCopy.player, href: "/play/MT2026", tone: "#eee9fb" },
  { icon: MonitorUp, ...roleCopy.display, href: "/display/MT2026", tone: "#fde9f2" },
  { icon: ShieldCheck, ...roleCopy.admin, href: "/admin/MT2026", tone: "#e7f5f0" },
];

export function HomePage() {
  return (
    <AppShell action={<ConnectionIndicator label="Sẵn sàng quẩy" />}>
      <section className="grid min-h-[calc(100dvh-5rem)] items-center gap-10 py-12 lg:grid-cols-[1fr_.9fr] lg:py-16">
        <div className="relative">
          <span className="text-xs font-black uppercase tracking-[.16em] text-[#b75586]">
            Birthday special · 2026
          </span>
          <h1 className="mt-4 max-w-3xl text-balance text-5xl font-black leading-[.96] tracking-[-.055em] text-[var(--midnight)] sm:text-7xl lg:text-[5rem]">
            Meme đúng lúc,<span className="block text-[var(--periwinkle-700)]">vui đúng điệu.</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-[var(--ink-body)] sm:text-lg">
            Chọn chiếc GIF nói hộ lòng mình, tung cú chốt bất ngờ và cùng hội bạn tạo nên một sinh
            nhật khó quên.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <GlassButton asChild size="large">
              <a href="/play/MT2026">
                Vào phòng chơi <ArrowRight aria-hidden="true" size={18} />
              </a>
            </GlassButton>
            <GlassButton asChild size="large" variant="glass">
              <a href="#vai-tro">Khám phá giao diện</a>
            </GlassButton>
            {import.meta.env.DEV && (
              <GlassButton asChild size="large" variant="ghost">
                <a href="/dev/design-system">
                  <Palette aria-hidden="true" size={17} /> Design system
                </a>
              </GlassButton>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] pb-7 pt-3">
          <DecorativeSparkle className="!right-2 !top-0 !w-7 !fill-[#e07aa8]" />
          <DecorativeCloud className="!bottom-0 !left-[-3rem] !w-52 !opacity-80" />
          <div className="relative grid grid-cols-2 gap-3 rounded-[1.4rem] border border-white/70 bg-white/42 p-3 shadow-[var(--shadow-float)] backdrop-blur-sm">
            <MemeCard className="-rotate-2" meme={mockMemes[0]!} selected />
            <MemeCard className="translate-y-4 rotate-2" meme={mockMemes[2]!} />
            <div className="absolute inset-x-7 bottom-2 rounded-[1rem] border border-[#ede8f2] bg-[#fffdfb] p-3 shadow-lg">
              <span className="text-[.6rem] font-black uppercase tracking-[.13em] text-[#b75586]">
                Tình huống #01
              </span>
              <p className="mt-1 text-sm font-black leading-snug text-[var(--midnight)] sm:text-base">
                Khi bạn nói “chơi ván cuối” lúc 2 giờ sáng…
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="vai-tro" className="grid gap-3 pb-16 md:grid-cols-3">
        {roles.map(({ icon: Icon, label, note, href, tone }, index) => (
          <a
            key={label}
            href={href}
            className="group rounded-[var(--radius-lg)] border border-[#e9e5ed] bg-[#fffdfb] p-5 shadow-[0_10px_28px_rgba(52,55,94,.07)] outline-none transition hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]"
          >
            <span
              className="grid size-10 place-items-center rounded-xl text-[var(--periwinkle-700)]"
              style={{ background: tone }}
            >
              <Icon aria-hidden="true" size={19} />
            </span>
            <span className="mt-6 block text-[.65rem] font-black tracking-[.12em] text-[var(--ink-muted)]">
              0{index + 1}
            </span>
            <strong className="mt-1 block text-lg font-black text-[var(--midnight)]">
              {label}
            </strong>
            <span className="mt-1 block text-sm text-[var(--ink-muted)]">{note}</span>
            <ArrowRight
              aria-hidden="true"
              className="mt-4 text-[var(--periwinkle-700)] transition-transform group-hover:translate-x-1"
              size={17}
            />
          </a>
        ))}
      </section>
    </AppShell>
  );
}
