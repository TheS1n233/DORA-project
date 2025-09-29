// server/tele-assist-svc/app/index.js
// Node/Express entrypoint for Tele-assist service

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { AccessToken } from "livekit-server-sdk";
import livekitTokenRouter from "./routers/livekit-token.js"; // route for issuing LiveKit access tokens

const app = express();

// middlewares
app.use(cors()); // allow cross-origin for dev
app.use(express.json());
app.use(morgan("dev")); // request logger

// health check
app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

// LiveKit token route - implemented directly
app.get("/tele/livekit/token", async (req, res) => {
  try {
    // Use environment variables or fallback to development defaults
    const url = process.env.LIVEKIT_URL || 'wss://doratele-wmf8rq69.livekit.cloud';
    const key = process.env.LIVEKIT_KEY || 'devkey';
    const secret = process.env.LIVEKIT_SECRET || 'devsecret';

    console.log('[LK] token request', { url, hasKey: !!key, hasSecret: !!secret });

    const { room = 'demo', identity = 'guest', role = 'participant' } = req.query;

    // 使用LiveKit SDK生成真实的JWT token
    const token = new AccessToken(key, secret, {
      identity: identity,
      ttl: 3600, // 1 hour
    });

    // 添加房间权限
    token.addGrant({
      room: room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    
    console.log('[LK] Generated JWT token:', jwt.substring(0, 50) + '...');
    
    return res.json({ 
      url, 
      token: jwt, 
      role,
      room,
      identity 
    });
  } catch (e) {
    console.error('[LK] token error', e);
    return res.status(500).json({ error: 'token_failed' });
  }
});

// Test route to verify routing works
app.get("/test", (req, res) => {
  res.json({ message: "Routing works!", timestamp: Date.now() });
});

// === NEW: Admin call elder functionality ===
// In-memory stores (replace with Redis/DB in production)
const CALLS = {};
const LOGS = [];

// Admin call elder endpoint
app.post("/api/calls/admin/call-elder", (req, res) => {
  const { admin_id, elder_id, call_type = "regular", message } = req.body;
  
  if (!admin_id || !elder_id) {
    return res.status(400).json({ error: "admin_id and elder_id are required" });
  }
  
  const room_id = `admin-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  const call_data = {
    room_id,
    caller_id: admin_id,
    callee_id: elder_id,
    call_type,
    message,
    status: "ringing",
    created_at: now,
    answered_at: null,
    ended_at: null,
    is_admin_initiated: true,
  };
  
  CALLS[room_id] = call_data;
  LOGS.push({
    event: "admin_call_elder",
    room_id,
    ts: now,
    data: call_data
  });
  
  res.json({
    room_id,
    status: "ringing",
    call_type,
    message
  });
});

// Answer call endpoint
app.post("/api/calls/answer", (req, res) => {
  const { room_id, user_id, action } = req.body;
  
  if (!CALLS[room_id]) {
    return res.status(404).json({ error: "room not found" });
  }
  
  const call = CALLS[room_id];
  const now = Date.now();
  
  if (action === "accept") {
    call.status = "answered";
    call.answered_at = now;
    LOGS.push({
      event: "call_answered",
      room_id,
      user_id,
      ts: now
    });
  } else if (action === "decline") {
    call.status = "declined";
    call.ended_at = now;
    LOGS.push({
      event: "call_declined",
      room_id,
      user_id,
      ts: now
    });
  } else if (action === "timeout") {
    call.status = "timeout";
    call.ended_at = now;
    LOGS.push({
      event: "call_timeout",
      room_id,
      user_id,
      ts: now
    });
  }
  
  res.json({ status: call.status, room_id });
});

// Get admin calls
app.get("/api/calls/admin/calls", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const admin_calls = Object.values(CALLS)
    .filter(call => call.is_admin_initiated)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
  
  res.json(admin_calls);
});

// Get call status by room_id
app.get("/api/calls/status/:room_id", (req, res) => {
  const { room_id } = req.params;
  
  console.log(`[STATUS] 检查通话状态: ${room_id}`);
  console.log(`[STATUS] 当前通话记录:`, Object.keys(CALLS));
  
  if (!CALLS[room_id]) {
    console.log(`[STATUS] 通话记录不存在: ${room_id}`);
    return res.status(404).json({ error: "room not found" });
  }
  
  const call = CALLS[room_id];
  console.log(`[STATUS] 找到通话记录:`, call);
  
  // 如果通话已结束超过10分钟，清理记录
  const now = Date.now();
  if (call.ended_at && (now - call.ended_at) > 600000) { // 10分钟
    console.log(`[STATUS] 通话已结束超过10分钟，清理记录: ${room_id}`);
    delete CALLS[room_id];
    return res.status(404).json({ error: "room not found" });
  }
  
  console.log(`[STATUS] 返回通话状态:`, {
    room_id: call.room_id,
    status: call.status,
    caller_id: call.caller_id,
    callee_id: call.callee_id,
    created_at: call.created_at,
    answered_at: call.answered_at,
    ended_at: call.ended_at
  });
  
  res.json({
    room_id: call.room_id,
    status: call.status,
    caller_id: call.caller_id,
    callee_id: call.callee_id,
    created_at: call.created_at,
    answered_at: call.answered_at,
    ended_at: call.ended_at
  });
});

// Get elder pending calls
app.get("/api/calls/elder/pending-calls/:elder_id", (req, res) => {
  const { elder_id } = req.params;
  const pending_calls = Object.values(CALLS)
    .filter(call => 
      call.callee_id === elder_id && 
      call.status === "ringing" && 
      call.is_admin_initiated
    );
  
  // 清理过期的呼叫（超过5分钟未接听的）
  const now = Date.now();
  Object.keys(CALLS).forEach(roomId => {
    const call = CALLS[roomId];
    if (call.status === "ringing" && (now - call.created_at) > 300000) { // 5分钟
      call.status = "timeout";
      call.ended_at = now;
      LOGS.push({
        event: "call_timeout",
        room_id: roomId,
        ts: now
      });
    }
  });
  
  res.json(pending_calls);
});

// Get call logs
app.get("/api/calls/logs", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = LOGS
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit);
  
  res.json(logs);
});

// Cancel call endpoint (管理员取消呼叫)
app.post("/api/calls/cancel", (req, res) => {
  const { room_id, admin_id } = req.body;
  
  if (!CALLS[room_id]) {
    return res.status(404).json({ error: "room not found" });
  }
  
  CALLS[room_id].status = "cancelled";
  CALLS[room_id].ended_at = Date.now();
  LOGS.push({
    event: "call_cancelled",
    room_id,
    admin_id,
    ts: Date.now()
  });
  
  res.json({ status: "cancelled", room_id });
});

// End call endpoint (结束通话)
app.post("/api/calls/end", (req, res) => {
  const { room_id } = req.body;
  
  if (!CALLS[room_id]) {
    return res.status(404).json({ error: "room not found" });
  }
  
  CALLS[room_id].status = "ended";
  CALLS[room_id].ended_at = Date.now();
  LOGS.push({
    event: "call_ended",
    room_id,
    ts: Date.now()
  });
  
  res.json({ status: "ended", room_id });
});

// ---- NEW: events summary (24h) for TTS ----
// IMPORTANT: default to service name inside compose network, not 127.0.0.1
const HM_BASE = process.env.HM_BASE || "http://health-svc:8100";

app.get("/api/summary/events", async (_req, res) => {
  try {
    const url = `${HM_BASE}/events?kinds=emergency,hazard&since=24h&limit=200`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HM ${r.status}`);
    const body = await r.json();
    const items = body.entry || [];

    const emergencies = items.filter((e) => e.kind === "emergency");
    const hazards = items.filter((e) => e.kind === "hazard");

    const byType = {};
    for (const h of hazards) {
      const t = (h.data && h.data.type) || "hazard";
      byType[t] = (byType[t] || 0) + 1;
    }
    const hazardParts = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${n} ${t}`);

    let text = "In the last 24 hours, ";
    if (emergencies.length === 0 && hazards.length === 0) {
      text += "no emergencies and no environmental hazards were detected.";
    } else {
      text += `${emergencies.length} emergency ${emergencies.length === 1 ? "event" : "events"}`;
      if (hazards.length > 0) {
        text += `, and ${hazards.length} hazards`;
        if (hazardParts.length) text += ` (${hazardParts.join(", ")})`;
      }
      text += " were recorded.";
    }

    res.json({
      ok: true,
      window: "24h",
      total: items.length,
      emergencies: emergencies.length,
      hazards: hazards.length,
      text,
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
});

// default 404
app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

const PORT = process.env.PORT || 8300;
app.listen(PORT, () => {
  console.log(`[tele-assist-svc] listening on :${PORT}`);
  console.log(`[tele-assist-svc] HM_BASE=${HM_BASE}`);
  console.log(`[tele-assist-svc] LIVEKIT_URL=${process.env.LIVEKIT_URL ? "set" : "not set"}`);
});
