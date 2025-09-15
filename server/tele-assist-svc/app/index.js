// server/tele-assist-svc/app/index.js
// Node/Express entrypoint for Tele-assist service

import express from "express";
import cors from "cors";
import morgan from "morgan";
import livekitTokenRouter from "./routes/livekit-token.js"; // route for issuing LiveKit access tokens

const app = express();

// middlewares
app.use(cors()); // allow cross-origin for dev
app.use(express.json());
app.use(morgan("dev")); // request logger

// health check
app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

// LiveKit token route
// GET /tele/livekit/token?room=demo&identity=care-1&role=caregiver
app.use("/tele", livekitTokenRouter);

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
