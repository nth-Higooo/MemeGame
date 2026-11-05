import { AlertTriangle, ArrowRight, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppShell } from "../components/app-shell";
import {
  CelestialBackground,
  DecorativeCloud,
  DecorativeSparkle,
} from "../components/celestial-background";
import { ConnectionIndicator } from "../components/connection-indicator";
import { CountdownTimer } from "../components/countdown-timer";
import { FeedbackState } from "../components/feedback-state";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassCard } from "../components/glass-card";
import { GlassInput } from "../components/glass-input";
import { GlassModal } from "../components/glass-modal";
import { MemeCard } from "../components/meme-card";
import { QuestionCard } from "../components/question-card";
import { mockMemes, mockRound } from "../data/mock-data";
import { getMessages } from "../i18n";

const copy = getMessages().theme;

const colors = [
  ["Berry Lipstick", "--accent-berry"],
  ["Pink Mist", "--accent-pink"],
  ["Soft Blush", "--bg-warm-glow"],
  ["Light Caramel", "--accent-peach"],
  ["Jasmine", "--accent-jasmine"],
  ["Protocol Noir", "--bg-deep"],
  ["Bright Lavender", "--accent-lavender"],
  ["Flucberry", "--accent-flucberry"],
  ["Blossom", "--accent-blossom"],
  ["Light Peach", "--accent-light-peach"],
  ["Honeydew", "--accent-honeydew"],
];

export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(mockMemes[0]?.id);
  return (
    <AppShell action={<GlassBadge tone="violet">Celestial system · Dev</GlassBadge>}>
      <div className="py-9 sm:py-12">
        <span className="text-xs font-black uppercase tracking-[.16em] text-[var(--accent-ink)]">
          Phase 02 · Visual language
        </span>
        <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.045em] text-[var(--midnight)] sm:text-6xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--ink-body)]">{copy.description}</p>

        <Showcase title="Môi trường" description={copy.environments}>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="relative h-52 overflow-hidden rounded-[1.25rem] border border-[#e7e2eb]">
              <CelestialBackground contained />
              <div className="relative z-10 p-5">
                <strong className="text-[var(--midnight)]">{copy.player}</strong>
                <DecorativeSparkle className="!bottom-8 !right-8 !left-auto !top-auto !w-6" />
                <DecorativeCloud className="!top-20 !left-4 !w-44" />
              </div>
            </div>
            <div className="relative h-52 overflow-hidden rounded-[1.25rem] border border-[#41496f]">
              <CelestialBackground contained tone="stage" />
              <div className="relative z-10 p-5 text-white">
                <strong>{copy.display}</strong>
                <p className="mt-2 max-w-xs text-sm text-[#c9cde5]">
                  Tương phản mạnh để đọc rõ từ xa.
                </p>
              </div>
            </div>
            <GlassCard variant="dark" className="p-5">
              <strong>{copy.admin}</strong>
              <p className="mt-2 text-sm text-[var(--ink-body)]">{copy.adminNote}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <GlassBadge tone="success">{getMessages().common.connected}</GlassBadge>
                <GlassButton size="small">{getMessages().admin.start}</GlassButton>
              </div>
            </GlassCard>
          </div>
        </Showcase>

        <Showcase
          title="Màu & typography"
          description="Pastel tạo không khí; Midnight giữ độ tương phản và neo thị giác."
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {colors.map(([name, color]) => (
              <div
                key={name}
                className="rounded-[.9rem] border border-[var(--border-card)] bg-[var(--surface-solid)] p-2"
              >
                <span
                  className="block aspect-square rounded-[.65rem]"
                  style={{ background: `var(${color})` }}
                />
                <strong className="mt-2 block text-xs text-[var(--midnight)]">{name}</strong>
                <code className="text-[.58rem] text-[var(--ink-muted)]">{color}</code>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 rounded-[1rem] border border-[var(--border-card)] bg-[var(--surface-solid)] p-5 md:grid-cols-[1fr_1fr]">
            <div>
              <span className="text-xs font-black uppercase tracking-[.16em] text-[var(--accent-ink)]">
                Display / 900
              </span>
              <p className="mt-2 text-4xl font-black tracking-[-.045em] text-[var(--midnight)]">
                Chọn cú chốt
              </p>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[.16em] text-[var(--ink-muted)]">
                Body / 600
              </span>
              <p className="mt-2 leading-7">
                Nội dung tiếng Việt giữ dấu rõ, nhịp đọc thoải mái và không lạm dụng chữ đậm.
              </p>
            </div>
          </div>
        </Showcase>

        <Showcase title="Surface hierarchy" description={copy.surfaceDescription}>
          <div className="grid gap-3 md:grid-cols-4">
            {(["solid", "subtle", "regular", "clear", "pink", "peach", "dark"] as const).map(
              (variant) => (
                <GlassCard key={variant} className="min-h-32 p-4" variant={variant}>
                  <span className="text-xs font-black uppercase tracking-[.12em] text-[var(--periwinkle-700)]">
                    {variant}
                  </span>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-body)]">
                    Bề mặt có mục đích và không xếp glass lồng nhau.
                  </p>
                </GlassCard>
              ),
            )}
          </div>
        </Showcase>

        <Showcase
          title="Controls"
          description="Touch target 44px, focus rõ và trạng thái semantic nhất quán."
        >
          <div className="rounded-[1rem] border border-[var(--border-card)] bg-[var(--surface-solid)] p-5">
            <div className="flex flex-wrap gap-2">
              <GlassButton>
                Primary <ArrowRight size={15} />
              </GlassButton>
              <GlassButton variant="glass">Glass</GlassButton>
              <GlassButton variant="soft">Soft</GlassButton>
              <GlassButton variant="ghost">Ghost</GlassButton>
              <GlassButton variant="danger">
                <AlertTriangle size={15} /> Nguy hiểm
              </GlassButton>
              <GlassButton disabled>Disabled</GlassButton>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <GlassBadge>Trung tính</GlassBadge>
              <GlassBadge tone="violet">Vòng 1</GlassBadge>
              <GlassBadge tone="success">Đã gửi</GlassBadge>
              <GlassBadge tone="warning">Đang chờ</GlassBadge>
              <GlassBadge tone="danger">Có lỗi</GlassBadge>
              <ConnectionIndicator />
            </div>
            <div className="mt-5 max-w-md">
              <GlassInput
                label="Email điều phối"
                icon={<Mail size={16} />}
                placeholder="hello@example.com"
                hint="Nhãn, hint và focus state rõ ràng."
              />
            </div>
            <GlassButton className="mt-4" variant="glass" onClick={() => setModalOpen(true)}>
              Mở modal
            </GlassButton>
          </div>
        </Showcase>

        <Showcase
          title="Game components"
          description="Question rõ nét, timer như game element và meme luôn là nội dung chính."
        >
          <div className="grid gap-3 lg:grid-cols-[.7fr_1.3fr]">
            <div className="space-y-3">
              <QuestionCard>{mockRound.prompt}</QuestionCard>
              <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--border-card)] bg-[var(--surface-solid)] p-4">
                <CountdownTimer seconds={24} />
                <CountdownTimer seconds={9} />
                <span className="text-sm text-[var(--ink-muted)]">Compact countdown</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mockMemes.slice(0, 3).map((meme) => (
                <MemeCard
                  key={meme.id}
                  meme={meme}
                  selected={selected === meme.id}
                  onClick={() => setSelected(meme.id)}
                />
              ))}
            </div>
          </div>
        </Showcase>

        <Showcase
          title="System states"
          description="Loading, empty, error và disconnected có copy hành động cụ thể."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(["loading", "empty", "error", "disconnected"] as const).map((kind) => (
              <FeedbackState key={kind} compact kind={kind} />
            ))}
          </div>
        </Showcase>
      </div>

      <GlassModal
        open={modalOpen}
        title="Sẵn sàng bắt đầu?"
        description="Elevated glass dành cho dialog, với content surface gần-opaque."
        onClose={() => setModalOpen(false)}
      >
        <div className="flex justify-end gap-2">
          <GlassButton variant="ghost" onClick={() => setModalOpen(false)}>
            Để sau
          </GlassButton>
          <GlassButton onClick={() => setModalOpen(false)}>Bắt đầu</GlassButton>
        </div>
      </GlassModal>
    </AppShell>
  );
}

function Showcase({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-11">
      <h2 className="text-xl font-black tracking-[-.025em] text-[var(--midnight)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
