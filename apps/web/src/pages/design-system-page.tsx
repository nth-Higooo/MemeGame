import { AlertTriangle, ArrowRight, Mail, Sparkles, Wifi } from "lucide-react";
import { useState } from "react";
import { AppShell } from "../components/app-shell";
import { FeedbackState } from "../components/feedback-state";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassCard } from "../components/glass-card";
import { GlassInput } from "../components/glass-input";
import { GlassModal } from "../components/glass-modal";
import { MemeCard } from "../components/meme-card";
import { mockMemes } from "../data/mock-data";

const colors = [
  ["Lavender", "#7650c4"],
  ["Petal", "#d95f9f"],
  ["Mint", "#b7ead5"],
  ["Peach", "#ffcfaa"],
  ["Cream", "#fffaf4"],
  ["Ink", "#28173a"],
];

export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(mockMemes[0]?.id);
  return (
    <AppShell
      action={
        <GlassBadge icon={<Sparkles aria-hidden="true" size={12} />} tone="violet">
          Dev showcase
        </GlassBadge>
      }
    >
      <div className="py-10 sm:py-14">
        <GlassBadge tone="violet">Liquid Celebration · v1</GlassBadge>
        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-.05em] text-violet-950 sm:text-6xl">
          Hệ thống giao diện mềm, rõ và có nhịp.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-violet-950/58">
          Trang nội bộ để kiểm tra token, component, trạng thái và interaction trước khi nối dữ liệu
          thật.
        </p>

        <ShowcaseSection
          title="Màu sắc"
          description="Pastel nền, màu đậm dành cho chữ và hành động."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {colors.map(([name, color]) => (
              <GlassCard key={name} className="p-3" variant="solid" radius="medium">
                <span
                  className="block aspect-square rounded-2xl shadow-inner"
                  style={{ background: color }}
                />
                <strong className="mt-3 block text-sm text-violet-950">{name}</strong>
                <code className="text-[.65rem] text-violet-950/45">{color}</code>
              </GlassCard>
            ))}
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          title="Glass surfaces"
          description="Clear cho control ngắn; solid cho nội dung cần đọc lâu."
        >
          <div className="grid gap-4 md:grid-cols-4">
            {(["regular", "subtle", "solid", "clear"] as const).map((variant) => (
              <GlassCard key={variant} className="min-h-36 p-5" variant={variant}>
                <span className="text-xs font-black uppercase tracking-[.12em] text-violet-700">
                  {variant}
                </span>
                <p className="mt-3 text-sm leading-6 text-violet-950/62">
                  Nội dung luôn giữ độ tương phản tốt trên ánh sáng nền.
                </p>
              </GlassCard>
            ))}
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          title="Buttons, badges & input"
          description="Touch target tối thiểu 44px và focus ring rõ ràng."
        >
          <GlassCard className="p-5 sm:p-6" variant="solid">
            <div className="flex flex-wrap gap-2.5">
              <GlassButton>
                Primary <ArrowRight aria-hidden="true" size={16} />
              </GlassButton>
              <GlassButton variant="glass">Glass</GlassButton>
              <GlassButton variant="soft">Soft</GlassButton>
              <GlassButton variant="ghost">Ghost</GlassButton>
              <GlassButton variant="danger">
                <AlertTriangle aria-hidden="true" size={15} /> Nguy hiểm
              </GlassButton>
              <GlassButton disabled>Disabled</GlassButton>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <GlassBadge tone="neutral">Trung tính</GlassBadge>
              <GlassBadge tone="violet">Vòng 1</GlassBadge>
              <GlassBadge icon={<Wifi aria-hidden="true" size={11} />} tone="success">
                Đã kết nối
              </GlassBadge>
              <GlassBadge tone="warning">Đang chờ</GlassBadge>
              <GlassBadge tone="danger">Có lỗi</GlassBadge>
            </div>
            <div className="mt-6 max-w-md">
              <GlassInput
                label="Email điều phối"
                icon={<Mail aria-hidden="true" size={17} />}
                placeholder="hello@example.com"
                hint="Ví dụ input có nhãn và trợ giúp."
              />
            </div>
            <GlassButton className="mt-5" variant="glass" onClick={() => setModalOpen(true)}>
              Mở GlassModal
            </GlassButton>
          </GlassCard>
        </ShowcaseSection>

        <ShowcaseSection
          title="Meme cards"
          description="Ảnh/GIF nằm ở content layer rõ nét; selection có viền, icon và aria state."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {mockMemes.map((meme) => (
              <MemeCard
                key={meme.id}
                meme={meme}
                selected={selected === meme.id}
                onClick={() => setSelected(meme.id)}
              />
            ))}
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          title="System states"
          description="Loading, empty, error và disconnected dùng chung một cấu trúc."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(["loading", "empty", "error", "disconnected"] as const).map((kind) => (
              <FeedbackState key={kind} compact kind={kind} />
            ))}
          </div>
        </ShowcaseSection>
      </div>

      <GlassModal
        open={modalOpen}
        title="Sẵn sàng bắt đầu?"
        description="Modal dùng bề mặt gần-opaque để nội dung không bị ánh sáng nền làm khó đọc."
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

function ShowcaseSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-black tracking-[-.035em] text-violet-950">{title}</h2>
      <p className="mt-1 text-sm text-violet-950/50">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
