import { ArrowRight, Gamepad2, MonitorUp, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassCard } from "../components/glass-card";
import { MemeCard } from "../components/meme-card";
import { mockMemes } from "../data/mock-data";
import { getMessages } from "../i18n";

const { roles: roleCopy } = getMessages();
const roles = [
  {
    icon: Gamepad2,
    ...roleCopy.player,
    href: "/play/MT2026",
    color: "from-violet-200 to-fuchsia-200",
  },
  {
    icon: MonitorUp,
    ...roleCopy.display,
    href: "/display/MT2026",
    color: "from-pink-200 to-orange-200",
  },
  {
    icon: ShieldCheck,
    ...roleCopy.admin,
    href: "/admin/MT2026",
    color: "from-emerald-200 to-cyan-200",
  },
];

export function HomePage() {
  const { common } = getMessages();
  return (
    <AppShell
      action={
        <GlassBadge icon={<span className="size-1.5 rounded-full bg-emerald-500" />} tone="success">
          {common.ready}
        </GlassBadge>
      }
    >
      <section className="grid min-h-[calc(100dvh-5rem)] items-center gap-10 py-12 lg:grid-cols-[1.04fr_.96fr] lg:py-16">
        <div>
          <GlassBadge icon={<Sparkles aria-hidden="true" size={12} />} tone="violet">
            Birthday special · 2026
          </GlassBadge>
          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-black leading-[.94] tracking-[-.06em] text-violet-950 sm:text-7xl lg:text-[5.4rem]">
            Meme đúng lúc,
            <span className="gradient-text block">vui đúng điệu.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-violet-950/62 sm:text-lg">
            Chọn chiếc GIF nói hộ lòng mình, tung cú chốt bất ngờ và cùng hội bạn tạo nên một sinh
            nhật khó quên.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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

        <GlassCard
          className="relative mx-auto w-full max-w-xl p-3 sm:p-4"
          variant="subtle"
          radius="xlarge"
        >
          <div className="grid grid-cols-2 gap-3">
            <MemeCard className="-rotate-2" meme={mockMemes[0]!} selected />
            <MemeCard className="translate-y-5 rotate-2" meme={mockMemes[2]!} />
          </div>
          <GlassCard
            className="absolute inset-x-8 bottom-6 z-10 p-4"
            variant="solid"
            radius="medium"
          >
            <span className="text-[.65rem] font-black uppercase tracking-[.14em] text-fuchsia-700">
              Tình huống #01
            </span>
            <p className="mt-1 text-base font-black leading-snug text-violet-950 sm:text-lg">
              Khi bạn nói “chơi ván cuối” lúc 2 giờ sáng…
            </p>
          </GlassCard>
        </GlassCard>
      </section>

      <section id="vai-tro" className="grid gap-4 pb-16 md:grid-cols-3">
        {roles.map(({ icon: Icon, label, note, href, color }) => (
          <a
            key={label}
            href={href}
            className="group outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-lg)]"
          >
            <GlassCard
              className="h-full p-5 transition duration-200 ease-[var(--ease-spring)] group-hover:-translate-y-1"
              variant="solid"
            >
              <span
                className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${color} text-violet-800`}
              >
                <Icon aria-hidden="true" size={20} />
              </span>
              <strong className="mt-7 block text-xl font-black text-violet-950">{label}</strong>
              <span className="mt-1 block text-sm text-violet-950/52">{note}</span>
              <ArrowRight
                aria-hidden="true"
                className="mt-5 text-violet-600 transition-transform group-hover:translate-x-1"
                size={17}
              />
            </GlassCard>
          </a>
        ))}
      </section>
    </AppShell>
  );
}
