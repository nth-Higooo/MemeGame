import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

type BadgeTone = "neutral" | "violet" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "badge-neutral",
  violet: "badge-violet",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
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
        "status-badge inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[.7rem] font-extrabold tracking-[.02em]",
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
