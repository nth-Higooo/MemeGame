import { cn } from "../lib/utils";

export function ConnectionIndicator({
  connected = true,
  label,
  compact = false,
}: {
  connected?: boolean;
  label?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn("connection-indicator", !connected && "is-offline", compact && "is-compact")}
    >
      <span className="connection-dot" />
      {!compact && (label ?? (connected ? "Đã kết nối" : "Mất kết nối"))}
    </span>
  );
}
