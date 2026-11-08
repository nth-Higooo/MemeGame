import { Check, Heart, Play, Smile, Search, Crown, Flame, HandHeart, Ghost } from "lucide-react";
import { motion, useReducedMotion, type HTMLMotionProps, type MotionStyle } from "motion/react";
import type { MockMeme } from "../data/mock-data";
import { cn } from "../lib/utils";

type MemeCardProps = Omit<HTMLMotionProps<"button">, "children" | "style"> & {
  meme: MockMeme;
  selected?: boolean;
  compact?: boolean;
  anonymous?: boolean;
};

function MemeArtwork({ meme }: { meme: MockMeme }) {
  const icons = {
    innocent: Smile,
    detective: Search,
    spotlight: Crown,
    meltdown: Flame,
    apology: HandHeart,
    "side-eye": Ghost,
  };
  const Icon = icons[meme.art];
  return (
    <div className="meme-icon-placeholder" role="img" aria-label={meme.alt}>
      <Icon size={64} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}

export function MemeCard({
  meme,
  selected,
  compact,
  anonymous,
  className,
  ...props
}: MemeCardProps) {
  const reduceMotion = useReducedMotion();
  const style = {
    "--meme-a": meme.palette[0],
    "--meme-b": meme.palette[1],
    "--meme-c": meme.palette[2],
  } as MotionStyle;
  return (
    <motion.button
      type="button"
      aria-label={`${selected ? "Đã chọn" : "Chọn"} meme ${meme.title}`}
      aria-pressed={selected}
      className={cn(
        "meme-card group relative overflow-hidden border text-left outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]",
        selected ? "meme-card-selected" : "",
        compact && "is-compact",
        className,
      )}
      style={style}
      {...(!reduceMotion ? { whileTap: { scale: 0.985 } } : {})}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      {...props}
    >
      <span className="meme-media">
        <MemeArtwork meme={meme} />
        <span className="media-chip">
          <Play aria-hidden="true" fill="currentColor" size={9} /> GIF
        </span>
        {!anonymous && (
          <span className="reaction-chip">
            <Heart aria-hidden="true" size={10} /> {meme.reactions}
          </span>
        )}
      </span>
      <span className="meme-caption">
        <span>
          <strong>{anonymous ? "Ẩn danh" : meme.title}</strong>
          {!anonymous && <small>{meme.tag}</small>}
        </span>
        {selected && (
          <span className="selection-check">
            <Check aria-hidden="true" size={13} strokeWidth={3} />
          </span>
        )}
      </span>
    </motion.button>
  );
}
