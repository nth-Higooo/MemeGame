import { CircleAlert, CloudOff, ImageOff, LoaderCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { GlassButton } from "./glass-button";
import { GlassCard } from "./glass-card";

export type FeedbackKind = "loading" | "empty" | "error" | "disconnected";

const feedback: Record<
  FeedbackKind,
  { icon: typeof LoaderCircle; title: string; description: string; tone: string }
> = {
  loading: {
    icon: LoaderCircle,
    title: "Đang chuẩn bị meme",
    description: "Chờ một nhịp nhé, kho meme sắp xuất hiện.",
    tone: "bg-violet-100 text-violet-700",
  },
  empty: {
    icon: ImageOff,
    title: "Chưa có meme phù hợp",
    description: "Thử một từ khóa khác hoặc xem toàn bộ thư viện.",
    tone: "bg-sky-100 text-sky-700",
  },
  error: {
    icon: CircleAlert,
    title: "Có gì đó chưa ổn",
    description: "Không tải được nội dung. Bạn có thể thử lại ngay.",
    tone: "bg-rose-100 text-rose-700",
  },
  disconnected: {
    icon: CloudOff,
    title: "Mất kết nối tạm thời",
    description: "Lựa chọn vẫn được giữ. Chúng mình đang nối lại phòng.",
    tone: "bg-amber-100 text-amber-800",
  },
};

export function FeedbackState({
  kind,
  compact = false,
  action,
  className,
}: {
  kind: FeedbackKind;
  compact?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  const item = feedback[kind];
  const Icon = item.icon;
  return (
    <GlassCard
      className={cn("flex flex-col items-center text-center", compact ? "p-5" : "p-8", className)}
      variant="solid"
    >
      <span className={cn("grid size-11 place-items-center rounded-2xl", item.tone)}>
        <Icon
          aria-hidden="true"
          className={kind === "loading" ? "motion-safe:animate-spin" : undefined}
          size={20}
        />
      </span>
      <strong className="mt-4 text-base font-black text-violet-950">{item.title}</strong>
      <p className="mt-1 max-w-xs text-sm leading-5 text-violet-950/56">{item.description}</p>
      {action ??
        ((kind === "error" || kind === "disconnected") && (
          <GlassButton className="mt-4" size="small" variant="soft">
            <RotateCcw aria-hidden="true" size={14} /> Thử lại
          </GlassButton>
        ))}
    </GlassCard>
  );
}
