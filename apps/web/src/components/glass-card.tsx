import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

const cardVariants = cva("glass-surface relative overflow-hidden", {
  variants: {
    variant: {
      regular: "glass-regular",
      subtle: "glass-subtle",
      solid: "glass-solid",
      clear: "glass-clear",
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
