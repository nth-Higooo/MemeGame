import type { CSSProperties } from "react";
import { cn } from "../lib/utils";

export function CountdownTimer({
  seconds,
  total = 60,
  size = "compact",
  dark = false,
}: {
  seconds: number;
  total?: number;
  size?: "compact" | "stage";
  dark?: boolean;
}) {
  const progress = Math.max(0, Math.min(1, seconds / total));
  return (
    <div
      aria-label={`Còn ${seconds} giây`}
      className={cn(
        "timer-dial",
        size === "stage" && "timer-dial-stage",
        dark && "timer-dial-dark",
      )}
      role="timer"
      style={{ "--timer-progress": `${progress * 360}deg` } as CSSProperties}
    >
      <div className="timer-dial-inner">
        <strong>{seconds}</strong>
        {size === "stage" && <span>giây</span>}
      </div>
    </div>
  );
}
