import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

type BadgeTone = "neutral" | "violet" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "border-white/65 bg-white/55 text-violet-950/70",
  violet: "border-violet-200/70 bg-violet-100/65 text-violet-800",
  success: "border-emerald-200/70 bg-emerald-50/75 text-emerald-800",
  warning: "border-amber-200/75 bg-amber-50/80 text-amber-800",
  danger: "border-rose-200/75 bg-rose-50/80 text-rose-700",
};

export function GlassBadge({
  className,
  tone = "neutral",
  icon,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; icon?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[.7rem] font-extrabold tracking-[.02em] shadow-[inset_0_1px_0_rgba(255,255,255,.72)]",
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {props.children}
    </span>
  );
}
