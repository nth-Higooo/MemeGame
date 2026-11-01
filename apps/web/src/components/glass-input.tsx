import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

type GlassInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  hint?: string;
  visuallyHideLabel?: boolean;
};

export function GlassInput({
  className,
  label,
  icon,
  hint,
  id,
  visuallyHideLabel,
  ...props
}: GlassInputProps) {
  const inputId = id ?? `glass-input-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <label className="block" htmlFor={inputId}>
      <span
        className={cn(
          "mb-2 block text-sm font-bold text-violet-950/74",
          visuallyHideLabel && "sr-only",
        )}
      >
        {label}
      </span>
      <span className="glass-control flex min-h-[var(--size-touch)] items-center gap-3 rounded-full border border-white/70 px-4 shadow-[var(--shadow-control)] transition focus-within:border-violet-300 focus-within:ring-3 focus-within:ring-[var(--focus-ring)]">
        {icon && <span className="text-violet-700/65">{icon}</span>}
        <input
          id={inputId}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm font-medium text-violet-950 outline-none placeholder:text-violet-950/38",
            className,
          )}
          {...props}
        />
      </span>
      {hint && <span className="mt-1.5 block pl-4 text-xs text-violet-950/52">{hint}</span>}
    </label>
  );
}
