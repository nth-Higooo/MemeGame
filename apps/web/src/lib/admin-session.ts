import {
  displayConnectionSchema,
  serverMessageSchema,
  type GameCommand,
  type PublicSessionState,
} from "@misthy/shared";
import { useEffect, useRef, useState } from "react";

export class AdminHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function adminRequest(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Requested-With": "misthy-admin" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new AdminHttpError(
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : "Yêu cầu không thành công.",
      response.status,
    );
  return data;
}

export function useAdminSession(code: string, role: "ADMIN" | "JUDGE", enabled: boolean) {
  const [snapshot, setSnapshot] = useState<PublicSessionState | null>(null);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [token, setToken] = useState("");
  const socket = useRef<WebSocket | null>(null);
  const command = useRef<GameCommand | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval>;
    let handshake: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const connect = async () => {
      try {
        const connection = displayConnectionSchema.parse(
          await adminRequest(
            role === "ADMIN" ? `/api/admin/sessions/${code}/ticket` : `/api/judge/${code}/ticket`,
            role === "ADMIN" ? { role } : {},
          ),
        ).connection;
        if (disposed) return;
        setToken(connection.protocols[1] ?? "");
        const url = new URL(connection.url, location.href);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(url, connection.protocols);
        socket.current = ws;
        let lastMessage = Date.now();
        handshake = setTimeout(() => ws.close(), 15000);
        ws.onopen = () => {
          clearTimeout(handshake);
          attempts = 0;
          ws.send(JSON.stringify({ type: "CLIENT_READY" }));
          if (command.current)
            ws.send(JSON.stringify({ type: "COMMAND", command: command.current }));
          heartbeat = setInterval(() => {
            if (Date.now() - lastMessage > 60000) {
              ws.close();
              return;
            }
            if (ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ type: "PING", sentAt: Date.now() }));
          }, 25000);
        };
        ws.onmessage = (event) => {
          if (disposed) return;
          lastMessage = Date.now();
          try {
            const message = serverMessageSchema.parse(JSON.parse(String(event.data)));
            if (
              message.type === "STATE_SYNC" &&
              message.state.role === role &&
              message.state.sessionCode === code
            ) {
              setSnapshot((old) =>
                !old || message.state.version >= old.version ? message.state : old,
              );
              setStatus("connected");
              setOffset(message.state.serverTime - Date.now());
            } else if (
              message.type === "COMMAND_ACK" &&
              message.commandId === command.current?.commandId
            ) {
              command.current = null;
              setPending(false);
              setError("");
            } else if (message.type === "ERROR") {
              command.current = null;
              setPending(false);
              setError(message.message);
            }
          } catch {
            setError("Không thể đồng bộ dữ liệu phòng.");
          }
        };
        ws.onerror = () => ws.close();
        ws.onclose = (event) => {
          clearTimeout(handshake);
          clearInterval(heartbeat);
          if (disposed) return;
          setStatus(event.code === 1008 ? "unauthorized" : "disconnected");
          if (event.code !== 1008)
            timer = setTimeout(() => void connect(), Math.min(15000, 500 * 2 ** attempts++));
        };
      } catch (caught) {
        if (disposed) return;
        setError(caught instanceof Error ? caught.message : "Mất kết nối.");
        if (caught instanceof AdminHttpError && [401, 403].includes(caught.status)) {
          setStatus("unauthorized");
          return;
        }
        setStatus("disconnected");
        timer = setTimeout(() => void connect(), Math.min(15000, 500 * 2 ** attempts++));
      }
    };
    void connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(handshake);
      clearInterval(heartbeat);
      socket.current?.close();
    };
  }, [code, role, enabled, retry]);
  const send = (value: GameCommand) => {
    if (command.current || socket.current?.readyState !== WebSocket.OPEN) return;
    command.current = value;
    setPending(true);
    socket.current.send(JSON.stringify({ type: "COMMAND", command: value }));
  };
  return {
    snapshot,
    status,
    error,
    pending,
    offset,
    token,
    send,
    reconnect: () => setRetry((value) => value + 1),
  };
}
