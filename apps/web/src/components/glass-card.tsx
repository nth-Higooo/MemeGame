import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-white/65 bg-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_20px_65px_rgba(75,55,110,.13)] backdrop-blur-2xl",
        "after:pointer-events-none after:absolute after:inset-x-10 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
