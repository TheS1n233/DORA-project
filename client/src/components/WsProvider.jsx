// client/src/components/WsProvider.jsx
// English comments only

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const Ctx = createContext(null);

export function WsProvider({ base = "/ws", defaultRoom = "demo", children }) {
  const wsRef = useRef(null);
  const manualCloseRef = useRef(false);
  const reconnectTimerRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | connecting | open | closed
  const [room, setRoom] = useState(defaultRoom);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectTick, setConnectTick] = useState(0); // bump to force reconnect

  useEffect(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    manualCloseRef.current = false;
    if (!room) return;

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const basePath = base.startsWith("/") ? base : `/${base}`;
    const url = `${proto}://${location.host}${basePath}?room=${encodeURIComponent(room)}`;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
      try { ws.send(JSON.stringify({ type: "hello", room })); } catch {}
    };
    ws.onmessage = (evt) => {
      try { setLastMessage(JSON.parse(evt.data)); }
      catch { setLastMessage({ type: "text", data: evt.data }); }
    };
    ws.onerror = () => { setStatus("closed"); };
    ws.onclose = () => {
      setStatus("closed");
      wsRef.current = null;
      if (!manualCloseRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => setConnectTick(t => t + 1), 2000);
      }
    };

    return () => {
      clearTimeout(reconnectTimerRef.current);
      try { ws.close(); } catch {}
    };
  }, [room, base, connectTick]);

  const send = (payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  };

  const disconnect = () => {
    manualCloseRef.current = true;
    try { wsRef.current?.close(); } catch {}
    setStatus("idle");
  };

  const connect = () => {
    manualCloseRef.current = false;
    setConnectTick(t => t + 1);
  };

  const value = useMemo(() => ({
    status, room, lastMessage,
    setRoom, send, disconnect, connect
  }), [status, room, lastMessage]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWs must be used within WsProvider");
  return ctx;
}
