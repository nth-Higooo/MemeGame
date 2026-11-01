import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold outline-none transition focus-visible:ring-3 focus-visible:ring-violet-400/35 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-violet-700 text-white shadow-[0_10px_30px_rgba(109,67,180,.28)] hover:-translate-y-0.5 hover:bg-violet-800",
        glass:
          "border border-white/65 bg-white/55 text-violet-950 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_8px_30px_rgba(86,66,122,.1)] hover:bg-white/75",
        ghost: "text-violet-900 hover:bg-white/45",
      },
      size: {
        default: "min-h-11",
        large: "min-h-14 px-7 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ asChild, className, variant, size, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
