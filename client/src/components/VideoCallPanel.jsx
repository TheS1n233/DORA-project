// client/src/components/VideoCallPanel.jsx
// Minimal WebRTC + WebSocket signaling panel for admin client
import React, { useEffect, useRef, useState } from "react";

const SIGNALING_WS = "ws://localhost:8086/ws"; // changed to 8086
const API_BASE = "http://localhost:8086";      // changed to 8086
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export default function VideoCallPanel() {
  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState("admin-01"); // admin identity
  const [calleeId, setCalleeId] = useState("tv-001");
  const [status, setStatus] = useState("idle");

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    return () => {
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = async () => {
    const resp = await fetch(`${API_BASE}/api/calls/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caller_id: userId, callee_id: calleeId, emergency: false }),
    });
    const data = await resp.json();
    if (data.room_id) {
      setRoomId(data.room_id);
      alert(`Room created: ${data.room_id}`);
    } else {
      alert("Failed to create room");
    }
  };

  const attachLocal = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));
  };

  const createPC = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "candidate", candidate: ev.candidate }));
      }
    };
    pc.onconnectionstatechange = () => setStatus(`pc:${pc.connectionState}`);
    pcRef.current = pc;
  };

  const connectWS = () =>
    new Promise((resolve, reject) => {
      if (!roomId || !userId) {
        reject(new Error("roomId/userId required"));
        return;
      }
      const url = `${SIGNALING_WS}?room_id=${encodeURIComponent(roomId)}&user_id=${encodeURIComponent(
        userId
      )}&role=admin`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);
      ws.onclose = () => setStatus("ws:closed");

      ws.onmessage = async (evt) => {
        const msg = JSON.parse(evt.data);
        const pc = pcRef.current;
        if (!pc) return;

        if (msg.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "answer", sdp: answer }));
        } else if (msg.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } else if (msg.type === "candidate") {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (e) {
            console.error("addIceCandidate error", e);
          }
        } else if (msg.type === "peer-left") {
          endCall();
        }
      };
    });

  const startCall = async () => {
    try {
      if (!roomId) {
        alert("Room ID required. Click 'Create Room' or input one.");
        return;
      }
      createPC();
      await attachLocal();
      await connectWS();

      const pc = pcRef.current;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsRef.current.send(JSON.stringify({ type: "offer", sdp: offer }));
      setStatus("calling");
    } catch (e) {
      console.error(e);
      alert("Failed to start call");
    }
  };

  const endCall = () => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "bye" }));
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;

    try {
      pcRef.current?.getSenders()?.forEach((s) => s.track && s.track.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    try {
      localStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    localStreamRef.current = null;

    setStatus("idle");
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Admin Video Call</h3>
      <div style={{ marginBottom: 8 }}>
        <label>User ID:&nbsp;</label>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="admin-01" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Callee ID:&nbsp;</label>
        <input value={calleeId} onChange={(e) => setCalleeId(e.target.value)} placeholder="tv-001" />
        <button onClick={createRoom} style={{ marginLeft: 8 }}>Create Room</button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Room ID:&nbsp;</label>
        <input style={{ width: 360 }} value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="room-xxxx" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={startCall}>Start / Join</button>
        <button onClick={endCall} style={{ marginLeft: 8 }}>End</button>
        <span style={{ marginLeft: 12 }}>Status: {status}</span>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div>
          <div>Local</div>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 240, background: "#000" }} />
        </div>
        <div>
          <div>Remote</div>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 480, background: "#000" }} />
        </div>
      </div>
    </div>
  );
}
