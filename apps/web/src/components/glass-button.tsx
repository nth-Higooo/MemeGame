import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export const glassButtonVariants = cva(
  "group inline-flex min-h-[var(--size-touch)] select-none items-center justify-center gap-2 rounded-full px-5 text-sm font-bold outline-none transition-[transform,box-shadow,background-color,border-color] duration-200 ease-[var(--ease-spring)] focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-45 active:scale-[.98] motion-reduce:transform-none",
  {
    variants: {
      variant: {
        primary:
          "border border-violet-500/20 bg-[linear-gradient(135deg,var(--violet-600),var(--pink-500))] text-white shadow-[var(--shadow-action)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-action-hover)]",
        glass:
          "glass-control border border-white/65 text-[var(--ink-strong)] shadow-[var(--shadow-control)] hover:-translate-y-0.5 hover:bg-white/74",
        soft: "border border-violet-200/70 bg-violet-100/75 text-violet-900 hover:bg-violet-100",
        ghost: "text-violet-950 hover:bg-white/50",
        danger: "border border-rose-200/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100",
      },
      size: {
        small: "min-h-10 px-4 text-xs",
        default: "min-h-[var(--size-touch)]",
        large: "min-h-14 px-7 text-base",
        icon: "size-[var(--size-touch)] p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof glassButtonVariants> & { asChild?: boolean };

export function GlassButton({ asChild, className, variant, size, ...props }: GlassButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(glassButtonVariants({ variant, size }), className)} {...props} />;
}
