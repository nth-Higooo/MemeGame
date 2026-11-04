// Jitter avoids a room of phones reconnecting on exactly the same millisecond.
export function reconnectDelay(attempt: number) {
  return Math.round(Math.min(15000, 500 * 2 ** Math.min(attempt, 5)) * (0.8 + Math.random() * 0.4));
}
