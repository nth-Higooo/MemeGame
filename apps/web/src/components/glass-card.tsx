import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

const cardVariants = cva("surface-card relative overflow-hidden", {
  variants: {
    variant: {
      regular: "surface-frosted",
      subtle: "surface-soft",
      solid: "surface-solid",
      clear: "surface-clear",
      pink: "surface-pink",
      peach: "surface-peach",
      dark: "theme-dark surface-dark",
    },
    radius: {
      medium: "rounded-[var(--radius-md)]",
      large: "rounded-[var(--radius-lg)]",
      xlarge: "rounded-[var(--radius-xl)]",
    },
  },
  defaultVariants: { variant: "regular", radius: "large" },
});

type GlassCardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

export function GlassCard({ className, variant, radius, ...props }: GlassCardProps) {
  return <div className={cn(cardVariants({ variant, radius }), className)} {...props} />;
}
