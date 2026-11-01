import { Check, Heart, Play } from "lucide-react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { MockMeme } from "../data/mock-data";
import { cn } from "../lib/utils";
import { GlassBadge } from "./glass-badge";

type MemeCardProps = Omit<HTMLMotionProps<"button">, "children"> & {
  meme: MockMeme;
  selected?: boolean;
  compact?: boolean;
};

export function MemeCard({ meme, selected, compact, className, ...props }: MemeCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={`${selected ? "Đã chọn" : "Chọn"} meme ${meme.title}`}
      aria-pressed={selected}
      className={cn(
        "meme-card group relative overflow-hidden rounded-[var(--radius-md)] border text-left outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]",
        selected ? "meme-card-selected border-violet-500" : "border-white/70",
        className,
      )}
      {...(!reduceMotion ? { whileTap: { scale: 0.98 } } : {})}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      {...props}
    >
      <span
        className={cn(
          "meme-art relative flex items-center justify-center bg-gradient-to-br",
          compact ? "aspect-[5/4]" : "aspect-square",
          meme.gradient,
        )}
      >
        <span aria-hidden="true" className="meme-emoji">
          {meme.emoji}
        </span>
        <GlassBadge className="absolute left-2.5 top-2.5" tone="neutral">
          <Play aria-hidden="true" fill="currentColor" size={9} /> GIF
        </GlassBadge>
        <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-violet-950/36 px-2 py-1 text-[.65rem] font-bold text-white backdrop-blur-md">
          <Heart aria-hidden="true" size={10} /> {12 + meme.title.length}
        </span>
      </span>
      <span className="flex min-h-12 items-center justify-between gap-2 bg-white/76 px-3 py-2.5">
        <span className="truncate text-xs font-extrabold text-violet-950 sm:text-sm">
          {meme.title}
        </span>
        {selected && (
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-700 text-white shadow-md">
            <Check aria-hidden="true" size={13} strokeWidth={3} />
          </span>
        )}
      </span>
    </motion.button>
  );
}
