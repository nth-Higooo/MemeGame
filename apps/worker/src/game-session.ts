import { clientMessageSchema, type PublicSessionState, type ServerMessage } from "@misthy/shared";
import type { Env } from "./env";

const textEncoder = new TextEncoder();

export class GameSession implements DurableObject {
  private readonly storage: DurableObjectStorage;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    this.storage = state.storage;
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json({ error: "upgrade_required" }, { status: 426 });
    }

    const url = new URL(request.url);
    const sessionCode = url.pathname.split("/").filter(Boolean).at(-1) ?? "UNKNOWN";
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server, ["audience"]);
    server.serializeAttachment({ sessionCode, connectedAt: Date.now() });

    const snapshot = await this.getOrCreateState(sessionCode);
    this.send(server, { type: "STATE_SYNC", state: this.withClock(snapshot) });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    const text = typeof rawMessage === "string" ? rawMessage : new TextDecoder().decode(rawMessage);
    if (textEncoder.encode(text).byteLength > 8_192) {
      this.send(socket, {
        type: "ERROR",
        code: "MESSAGE_TOO_LARGE",
        message: "Tin nhắn vượt quá giới hạn.",
      });
      socket.close(1009, "Message too large");
      return;
    }

    let candidate: unknown;
    try {
      candidate = JSON.parse(text);
    } catch {
      this.send(socket, { type: "ERROR", code: "INVALID_JSON", message: "Tin nhắn không hợp lệ." });
      return;
    }

    const parsed = clientMessageSchema.safeParse(candidate);
    if (!parsed.success) {
      this.send(socket, {
        type: "ERROR",
        code: "INVALID_MESSAGE",
        message: "Loại tin nhắn chưa được hỗ trợ.",
      });
      return;
    }

    if (parsed.data.type === "PING") {
      this.send(socket, { type: "PONG", sentAt: parsed.data.sentAt, serverTime: Date.now() });
      return;
    }

    const attachment = socket.deserializeAttachment() as { sessionCode?: string } | null;
    const snapshot = await this.getOrCreateState(attachment?.sessionCode ?? "UNKNOWN");
    this.send(socket, { type: "STATE_SYNC", state: this.withClock(snapshot) });
  }

  webSocketClose(socket: WebSocket, code: number, reason: string, wasClean: boolean): void {
    socket.close(code, reason || (wasClean ? "Closed" : "Disconnected"));
  }

  webSocketError(socket: WebSocket): void {
    socket.close(1011, "Realtime connection error");
  }

  private async getOrCreateState(sessionCode: string): Promise<PublicSessionState> {
    const existing = await this.storage.get<PublicSessionState>("publicState");
    if (existing) return existing;

    const initial: PublicSessionState = {
      version: 0,
      sessionCode,
      mode: "COMMUNITY_MODE",
      phase: "LOBBY",
      serverTime: Date.now(),
      phaseEndsAt: null,
      roundNumber: 0,
      prompt: null,
      players: [],
    };
    await this.storage.put("publicState", initial);
    return initial;
  }

  private withClock(state: PublicSessionState): PublicSessionState {
    return { ...state, serverTime: Date.now() };
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
  }
}
