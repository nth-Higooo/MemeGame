import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export const glassButtonVariants = cva(
  "celestial-button group inline-flex min-h-[var(--size-touch)] select-none items-center justify-center gap-2 px-5 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-45 active:scale-[.98] motion-reduce:transform-none",
  {
    variants: {
      variant: {
        primary: "button-primary",
        glass: "button-glass",
        soft: "button-soft",
        ghost: "button-ghost",
        danger: "button-danger",
      },
      size: {
        small: "min-h-[var(--size-touch)] px-4 text-xs",
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
