import { Check, Heart, Play } from "lucide-react";
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
  const face = meme.art !== "apology";
  return (
    <svg aria-label={meme.alt} className="meme-illustration" role="img" viewBox="0 0 240 190">
      <path className="meme-sky" d="M0 0h240v190H0z" />
      <circle className="meme-moon" cx="188" cy="38" r="23" />
      <path
        className="meme-hill meme-hill-back"
        d="M0 136c35-32 70-31 103-4 32-42 82-40 137 4v54H0Z"
      />
      <path className="meme-hill" d="M0 158c42-25 87-24 128 3 40-31 78-27 112-4v33H0Z" />
      <path className="meme-star" d="m37 26 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
      <path className="meme-star tiny" d="m211 88 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
      {face && (
        <g className={cn("meme-character", `art-${meme.art}`)}>
          <path className="character-body" d="M79 165c3-42 19-63 47-63 29 0 44 22 46 63Z" />
          <circle className="character-head" cx="125" cy="88" r="42" />
          <path
            className="character-hair"
            d="M86 83c2-31 19-47 43-47 24 0 39 17 40 44-12-11-23-17-35-18-11 12-27 19-48 21Z"
          />
          <ellipse className="character-eye eye-left" cx="109" cy="88" rx="5" ry="7" />
          <ellipse className="character-eye eye-right" cx="143" cy="88" rx="5" ry="7" />
          <path className="character-mouth" d="M116 107c7 4 14 4 21 0" />
        </g>
      )}
      {meme.art === "detective" && (
        <g className="meme-prop">
          <circle cx="153" cy="91" r="23" />
          <path d="m168 108 21 24" />
        </g>
      )}
      {meme.art === "spotlight" && (
        <>
          <path className="spotlight" d="m104 0-40 164h125L151 0Z" />
          <path className="crown" d="m104 46 12 10 11-18 12 18 13-10-5 27h-39Z" />
        </>
      )}
      {meme.art === "meltdown" && (
        <path
          className="melt"
          d="M84 111c6 8 13 12 21 13l5 28 12-22 14 29 9-33c11-4 19-12 23-24-19 13-47 16-84 9Z"
        />
      )}
      {meme.art === "apology" && (
        <g className="hands">
          <path d="M77 151c11-48 25-76 40-85 9-5 15 1 12 11l-14 42 20-46c4-10 16-6 14 5l-10 67Z" />
          <path d="M163 151c-11-48-25-76-40-85-9-5-15 1-12 11l14 42-20-46c-4-10-16-6-14 5l10 67Z" />
          <path className="heart" d="M120 53c-11-13-29 4 0 24 29-20 11-37 0-24Z" />
        </g>
      )}
      {meme.art === "innocent" && (
        <path
          className="cloud-cover"
          d="M49 156c0-15 13-26 29-25 6-18 22-29 42-29 22 0 39 14 44 33 16-5 31 5 31 20 0 14-13 24-30 24H78c-17 0-29-8-29-23Z"
        />
      )}
    </svg>
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
