// Application caps for a small event; no paid rate-limiter binding is needed.
export const GAME_LIMITS = {
  players: 50,
  sockets: 170,
  socketsPerIdentity: 3,
  displaySockets: 10,
  messageBytes: 8192,
  messagesPerWindow: 30,
  messageWindowMs: 10000,
} as const;

export function nicknameKey(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("vi");
}
