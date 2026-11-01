import type { ReactNode } from "react";
export function FloatingActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="floating-action-wrap">
      <div className="floating-action-bar">{children}</div>
    </div>
  );
}
