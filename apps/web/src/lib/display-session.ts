import {
  displayConnectionSchema,
  serverMessageSchema,
  type PublicSessionState,
} from "@misthy/shared";
import { useEffect, useRef, useState } from "react";
import { getMessages } from "../i18n";
import { reconnectDelay } from "./reconnect-delay";
const copy = getMessages().display;

async function ticket(code: string, signal?: AbortSignal) {
  const response = await fetch(`/api/sessions/${code}/display-ticket`, {
    method: "POST",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(response.status === 404 ? "missing" : "network");
  return displayConnectionSchema.parse(await response.json()).connection;
}

// This client deliberately exposes no command-sending API.
export function useDisplaySession(code: string) {
  const [snapshot, setSnapshot] = useState<PublicSessionState | null>(null);
  const [status, setStatus] = useState("connecting");
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    let ws: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval>;
    let handshake: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const controller = new AbortController();
    const connect = async () => {
      try {
        const connection = await ticket(
          code,
          AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        );
        if (disposed) return;
        const url = new URL(connection.url, location.href);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(url, connection.protocols);
        const socket = ws;
        let lastReceived = Date.now();
        handshake = setTimeout(() => socket.close(), 15000);
        socket.onopen = () => {
          clearTimeout(handshake);
          attempt = 0;
          socket.send(JSON.stringify({ type: "CLIENT_READY" }));
          heartbeat = setInterval(() => {
            if (Date.now() - lastReceived > 60000) {
              socket.close();
              return;
            }
            if (socket.readyState === WebSocket.OPEN)
              socket.send(JSON.stringify({ type: "PING", sentAt: Date.now() }));
          }, 25000);
        };
        socket.onmessage = (event) => {
          if (disposed) return;
          lastReceived = Date.now();
          try {
            const message = serverMessageSchema.parse(JSON.parse(String(event.data)));
            if (
              message.type === "STATE_SYNC" &&
              message.state.role === "DISPLAY" &&
              message.state.sessionCode === code
            ) {
              setSnapshot((previous) =>
                !previous || message.state.version >= previous.version ? message.state : previous,
              );
              setOffset(message.state.serverTime - Date.now());
              setStatus("connected");
            } else if (message.type === "PONG")
              setOffset(message.serverTime - (message.sentAt + Date.now()) / 2);
          } catch {
            setStatus("disconnected");
            socket.close();
          }
        };
        socket.onerror = () => socket.close();
        socket.onclose = () => {
          clearInterval(heartbeat);
          clearTimeout(handshake);
          if (!disposed) {
            setStatus("disconnected");
            timer = setTimeout(() => void connect(), reconnectDelay(attempt++));
          }
        };
      } catch (error) {
        if (disposed) return;
        if (error instanceof Error && error.message === "missing") {
          setStatus("missing");
          return;
        }
        setStatus("disconnected");
        timer = setTimeout(() => void connect(), reconnectDelay(attempt++));
      }
    };
    void connect();
    const online = () => {
      if (ws?.readyState === WebSocket.OPEN) ws.close();
      else {
        clearTimeout(timer);
        void connect();
      }
    };
    window.addEventListener("online", online);
    const offline = () => setStatus("disconnected");
    window.addEventListener("offline", offline);
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
      clearTimeout(handshake);
      clearInterval(heartbeat);
      ws?.close();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [code, retry]);
  return { snapshot, status, offset, reconnect: () => setRetry((value) => value + 1) };
}

export function useDisplayMedia(code: string, ids: string[], available = true) {
  const key = [...new Set(ids)].sort().join(",");
  const cache = useRef(new Map<string, string>());
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    const wanted = key ? key.split(",") : [];
    for (const [id, url] of cache.current)
      if (!wanted.includes(id)) {
        URL.revokeObjectURL(url);
        cache.current.delete(id);
      }
    const load = async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setUrls(Object.fromEntries(cache.current));
      const connection = await ticket(code, controller.signal);
      let token = connection.protocols[1];
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(4, wanted.length) }, async () => {
          while (cursor < wanted.length) {
            const id = wanted[cursor++]!;
            if (cache.current.has(id)) continue;
            try {
              const request = () =>
                fetch(`/api/sessions/${code}/display-media/${id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                  signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
                });
              let response = await request();
              if (response.status === 401) {
                token = (await ticket(code, controller.signal)).protocols[1];
                response = await request();
              }
              if (!response.ok) throw new Error("media");
              const blob = await response.blob();
              if (controller.signal.aborted) return;
              const url = URL.createObjectURL(blob);
              cache.current.set(id, url);
              setUrls(Object.fromEntries(cache.current));
              setErrors((old) => ({ ...old, [id]: "" }));
            } catch {
              if (!controller.signal.aborted)
                setErrors((old) => ({ ...old, [id]: copy.unavailable }));
            }
          }
        }),
      );
    };
    if (wanted.length)
      void load().catch(() => {
        if (!controller.signal.aborted)
          setErrors(Object.fromEntries(wanted.map((id) => [id, copy.unavailable])));
      });
    return () => controller.abort();
  }, [code, key, retry, available]);
  useEffect(() => {
    const stored = cache.current;
    return () => {
      for (const url of stored.values()) URL.revokeObjectURL(url);
      stored.clear();
    };
  }, []);
  return { urls, errors, retry: () => setRetry((value) => value + 1) };
}
