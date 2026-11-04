import { getMessages } from "../i18n";
import {
  playerConnectionSchema,
  serverMessageSchema,
  type GameCommand,
  type PublicSessionState,
} from "@misthy/shared";
import { useEffect, useRef, useState } from "react";

const playerText = getMessages().player;

export class PlayerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function playerRequest(path: string, body?: unknown, token?: string) {
  const response = await fetch(path, {
    signal: AbortSignal.timeout(15000),
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || data === null)
    throw new PlayerApiError(
      typeof data === "object" && data && "message" in data
        ? String(data.message)
        : playerText.khongTheKetNoiPhong,
      response.status,
    );
  return data;
}

export function usePlayerSession(code: string) {
  const [identity, setIdentity] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`misthy-player:${code}`);
    } catch {
      return null;
    }
  });
  const [snapshot, setSnapshot] = useState<PublicSessionState | null>(null);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [offset, setOffset] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const inFlight = useRef<GameCommand | null>(null);
  const joining = useRef(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const restore = (event: StorageEvent) => {
      if (event.key === `misthy-player:${code}` && event.newValue) setIdentity(event.newValue);
    };
    window.addEventListener("storage", restore);
    return () => window.removeEventListener("storage", restore);
  }, [code]);

  useEffect(() => {
    if (!identity) return;
    let disposed = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval>;
    let handshake: ReturnType<typeof setTimeout>;
    const connect = async () => {
      setStatus("connecting");
      try {
        const response = playerConnectionSchema.parse(
          await playerRequest(`/api/sessions/${code}/reconnect`, { reconnectToken: identity }),
        );
        if (disposed) return;
        const url = new URL(response.connection.url, window.location.href);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(url, response.connection.protocols);
        let lastMessageAt = Date.now();
        handshake = setTimeout(() => ws.close(), 15000);
        socket.current = ws;
        ws.onopen = () => {
          clearTimeout(handshake);
          if (disposed) {
            ws.close();
            return;
          }
          attempts = 0;
          setStatus("connected");
          setError("");
          ws.send(JSON.stringify({ type: "CLIENT_READY" }));
          if (inFlight.current)
            ws.send(JSON.stringify({ type: "COMMAND", command: inFlight.current }));
          heartbeat = setInterval(() => {
            if (Date.now() - lastMessageAt > 60000) {
              ws.close();
              return;
            }
            if (ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ type: "PING", sentAt: Date.now() }));
          }, 25000);
        };
        ws.onmessage = (event) => {
          lastMessageAt = Date.now();
          if (disposed) return;
          try {
            const message = serverMessageSchema.parse(JSON.parse(String(event.data)));
            if (message.type === "STATE_SYNC") {
              setSnapshot((previous) =>
                !previous || message.state.version >= previous.version ? message.state : previous,
              );
              setOffset(message.state.serverTime - Date.now());
            } else if (message.type === "PONG")
              setOffset(message.serverTime - (message.sentAt + Date.now()) / 2);
            else if (
              message.type === "COMMAND_ACK" &&
              message.commandId === inFlight.current?.commandId
            ) {
              inFlight.current = null;
              setPending(false);
            } else if (message.type === "ERROR") {
              setError(message.message);
              if (message.commandId === inFlight.current?.commandId) {
                inFlight.current = null;
                setPending(false);
              }
            }
          } catch {
            setError(playerText.duLieuPhongKhongHopLeDangChoDong);
          }
        };
        ws.onerror = () => ws.close();
        ws.onclose = () => {
          clearTimeout(handshake);
          clearInterval(heartbeat);
          if (!disposed) {
            setStatus("disconnected");
            timer = setTimeout(() => void connect(), Math.min(15000, 500 * 2 ** attempts++));
          }
        };
      } catch (caught) {
        if (disposed) return;
        setError(caught instanceof Error ? caught.message : playerText.matKetNoi);
        if (caught instanceof PlayerApiError && caught.status === 401) {
          try {
            localStorage.removeItem(`misthy-player:${code}`);
          } catch {
            /* Storage may be unavailable. */
          }
          setIdentity(null);
          setSnapshot(null);
          setStatus("disconnected");
          return;
        }
        setStatus("disconnected");
        timer = setTimeout(() => void connect(), Math.min(15000, 500 * 2 ** attempts++));
      }
    };
    void connect();
    const online = () => {
      socket.current?.close();
    };
    window.addEventListener("online", online);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      clearTimeout(handshake);
      socket.current?.close();
      window.removeEventListener("online", online);
    };
  }, [code, identity, retry]);

  const join = async (nickname: string) => {
    if (joining.current || identity) return;
    joining.current = true;
    setPending(true);
    setError("");
    try {
      const result = playerConnectionSchema.parse(
        await playerRequest(`/api/sessions/${code}/join`, { displayName: nickname }),
      );
      if (!result.reconnectToken) throw new Error(playerText.thieuThongTinThamGia);
      try {
        localStorage.setItem(`misthy-player:${code}`, result.reconnectToken);
      } catch {
        /* Identity stays available for this tab. */
      }
      setIdentity(result.reconnectToken);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : playerText.khongTheThamGia);
    } finally {
      joining.current = false;
      setPending(false);
    }
  };
  const send = (command: GameCommand) => {
    if (inFlight.current || socket.current?.readyState !== WebSocket.OPEN) return;
    inFlight.current = command;
    setPending(true);
    setError("");
    socket.current.send(JSON.stringify({ type: "COMMAND", command }));
  };
  return {
    identity,
    snapshot,
    status,
    error,
    pending,
    offset,
    join,
    send,
    reconnect: () => setRetry((value) => value + 1),
  };
}
