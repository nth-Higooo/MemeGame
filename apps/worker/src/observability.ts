type LogEntry = {
  event: "http_request" | "service_error" | "game_commit" | "game_error" | "state_recovered";
  requestId?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  sessionId?: string;
  version?: number;
  commandType?: string;
  code?: string;
  assetId?: string;
};

// Never accept raw errors, URLs, bodies, tokens, names, passwords or IP addresses here.
export function logEvent(entry: LogEntry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}
