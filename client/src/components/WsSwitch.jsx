// /src/components/WsSwitch.jsx
// English comments only
import React, { useMemo } from "react";
import { useWs } from "./WsProvider.jsx";

function mapStatus(s) {
  if (s === "open") return "connected";
  if (s === "connecting") return "connecting";
  return "disconnected"; // 'closed' | 'idle' | unknown
}

export default function WsSwitch({ defaultRoom = "demo" }) {
  const api = useWs();
  const uiStatus = useMemo(() => mapStatus(api?.status), [api?.status]);
  const room = api?.room || defaultRoom;

  const doConnect = async () => {
    try {
      if (api?.setRoom && room !== (api?.room || defaultRoom)) {
        api.setRoom(room);
      }
      await api?.connect?.();
    } catch (e) {
      // no-op: status chip / overlay will reflect final state
      console.warn("[WS] connect failed:", e);
    }
  };

  const doDisconnect = async () => {
    try {
      await api?.disconnect?.();
    } catch (e) {
      console.warn("[WS] disconnect failed:", e);
    }
  };

  const doPing = () => {
    try {
      api?.send?.({ type: "ping", from: "WsSwitch", at: Date.now() });
    } catch (e) {
      console.warn("[WS] ping failed:", e);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button className="btn" onClick={uiStatus === "connected" ? doDisconnect : doConnect}>
        WS {uiStatus === "connected" ? "disconnect" : "connect"}
      </button>
      <button className="btn btn-secondary" onClick={doPing} disabled={uiStatus !== "connected"}>
        Ping
      </button>
      <small>state: {uiStatus} · room: {room}</small>
    </div>
  );
}
