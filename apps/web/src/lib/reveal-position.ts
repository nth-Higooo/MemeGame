import type { PublicSessionState } from "@misthy/shared";

// Presentation only: both screens follow the same server phase origin.
export function revealPosition(snapshot: PublicSessionState, serverNow: number): number {
  const now = snapshot.paused ? snapshot.serverTime : serverNow;
  const elapsed = Math.max(0, now - (snapshot.phaseStartedAt ?? now));
  return Math.floor(elapsed / 5000) % Math.max(1, snapshot.submissions.length);
}
