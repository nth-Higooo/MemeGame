import { ArrowRight, Gamepad2, MonitorUp, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { GlassCard } from "../components/glass-card";
import { Button } from "../components/ui/button";
import { getMessages } from "../i18n";

const { roles: roleCopy } = getMessages();
const roles = [
  { icon: Gamepad2, ...roleCopy.player, href: "/play/MT2026" },
  { icon: MonitorUp, ...roleCopy.display, href: "/display/MT2026" },
  { icon: ShieldCheck, ...roleCopy.admin, href: "/admin/MT2026" },
];

export function HomePage() {
  const { common } = getMessages();
  return (
    <AppShell action={<span className="status-pill"><i /> {common.ready}</span>}>
      <section className="grid min-h-[calc(100dvh-6rem)] items-center gap-10 py-14 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
        <div>
          <span className="eyebrow">Birthday special · 2026</span>
          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-black leading-[.94] tracking-[-.06em] text-violet-950 sm:text-7xl lg:text-[5.6rem]">
            Meme đúng lúc,
            <span className="gradient-text block">vui đúng điệu.</span>
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-violet-950/66 sm:text-lg">
            Chọn chiếc GIF nói hộ lòng mình, tung cú chốt bất ngờ và cùng hội bạn tạo nên một sinh nhật khó quên.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="large"><a href="/play/MT2026">Vào phòng chơi <ArrowRight size={18} /></a></Button>
            <Button asChild size="large" variant="glass"><a href="#vai-tro">Khám phá giao diện</a></Button>
          </div>
        </div>

        <GlassCard className="p-4 sm:p-6">
          <div className="meme-preview aspect-[4/5] rounded-[1.55rem] p-6 sm:p-8">
            <span className="rounded-full bg-black/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">TÌNH HUỐNG #01</span>
            <div className="mt-auto">
              <p className="max-w-sm text-3xl font-black leading-tight tracking-[-.04em] text-white sm:text-4xl">Khi bạn nói “chơi ván cuối” lúc 2 giờ sáng…</p>
              <div className="mt-6 flex gap-2"><span className="reaction">😂 18</span><span className="reaction">🔥 12</span><span className="reaction">💜 9</span></div>
            </div>
          </div>
        </GlassCard>
      </section>

      <section id="vai-tro" className="grid gap-4 pb-16 md:grid-cols-3">
        {roles.map(({ icon: Icon, label, note, href }) => (
          <a key={label} href={href} className="group rounded-[1.75rem] border border-white/65 bg-white/40 p-5 transition hover:-translate-y-1 hover:bg-white/65">
            <Icon className="text-fuchsia-600" aria-hidden="true" />
            <strong className="mt-7 block text-xl text-violet-950">{label}</strong>
            <span className="mt-1 block text-sm text-violet-950/55">{note}</span>
          </a>
        ))}
      </section>
    </AppShell>
  );
}
