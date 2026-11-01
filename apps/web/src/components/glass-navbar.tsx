import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Brand } from "./brand";

export function GlassNavbar({
  action,
  compact = false,
  className,
}: {
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "floating-nav sticky top-[max(.75rem,env(safe-area-inset-top))] z-40 mx-auto flex w-full max-w-7xl items-center justify-between px-3 py-2.5",
        className,
      )}
    >
      <Brand compact={compact} />
      {action}
    </nav>
  );
}
