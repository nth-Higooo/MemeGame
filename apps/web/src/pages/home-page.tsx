import {
  ArrowRight,
  Gamepad2,
  MonitorUp,
  Palette,
  ShieldCheck,
  Images,
  Vote,
  Trophy,
} from "lucide-react";
import { AppShell } from "../components/app-shell";
import { DecorativeCloud, DecorativeSparkle } from "../components/celestial-background";
import { ConnectionIndicator } from "../components/connection-indicator";
import { GlassButton } from "../components/glass-button";
import { getMessages } from "../i18n";

const { roles: roleCopy, home: copy } = getMessages();
const roles = [
  { icon: Gamepad2, ...roleCopy.player, href: "/play/MT2026", tone: "var(--bg-warm-glow)" },
  {
    icon: MonitorUp,
    ...roleCopy.display,
    href: "/display/MT2026",
    tone: "var(--accent-light-peach)",
  },
  {
    icon: ShieldCheck,
    ...roleCopy.admin,
    href: "/admin/MT2026",
    tone: "var(--status-positive-bg)",
  },
];

export function HomePage() {
  return (
    <AppShell action={<ConnectionIndicator label={copy.ready} />}>
      <section className="grid min-h-[calc(100dvh-5rem)] items-center gap-10 py-12 lg:grid-cols-[1fr_.9fr] lg:py-16">
        <div className="relative">
          <h1 className="mt-4 max-w-3xl text-balance text-5xl font-extrabold leading-[1.15] tracking-[-.035em] text-[var(--midnight)] sm:text-7xl lg:text-[5rem]">
            {copy.title}
            <span className="block text-[var(--periwinkle-700)]">{copy.subtitle}</span>
          </h1>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <GlassButton asChild size="large">
              <a href="/play/MT2026">
                {copy.join} <ArrowRight aria-hidden="true" size={18} />
              </a>
            </GlassButton>
            <GlassButton asChild size="large" variant="glass">
              <a href="#vai-tro">{copy.roles}</a>
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
          <DecorativeSparkle className="!right-2 !top-0 !w-7 !fill-[var(--accent-berry)]" />
          <DecorativeCloud className="!bottom-0 !left-[-3rem] !w-52 !opacity-80" />
          <div className="home-play-icons" aria-hidden="true">
            {[
              { icon: Images, label: copy.pick },
              { icon: Vote, label: copy.vote },
              { icon: Trophy, label: copy.result },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="home-play-tile">
                <Icon size={64} strokeWidth={1.5} />
                <strong>{label}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="vai-tro" className="grid gap-3 pb-16 md:grid-cols-3">
        {roles.map(({ icon: Icon, label, note, href, tone }, index) => (
          <a
            key={label}
            href={href}
            className="group rounded-[var(--radius-lg)] border border-[var(--border-card)] bg-[var(--surface-solid)] p-5 shadow-[0_10px_28px_rgba(52,55,94,.07)] outline-none transition hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]"
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
