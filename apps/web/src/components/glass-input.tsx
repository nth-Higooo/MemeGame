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
          "mb-2 block text-sm font-bold text-[var(--ink-body)]",
          visuallyHideLabel && "sr-only",
        )}
      >
        {label}
      </span>
      <span className="input-shell">
        {icon && <span className="text-[var(--periwinkle-700)]">{icon}</span>}
        <input
          id={inputId}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--ink-strong)] outline-none placeholder:text-[var(--ink-muted)]",
            className,
          )}
          {...props}
        />
      </span>
      {hint && <span className="mt-1.5 block pl-3 text-xs text-[var(--ink-muted)]">{hint}</span>}
    </label>
  );
}
