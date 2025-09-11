// server/tele-assist-svc/app/index.js
// English comments only

import express from "express";
import cors from "cors";
import morgan from "morgan";
import livekitTokenRouter from "./routes/livekit-token.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Basic health endpoints
app.get("/ping", (_req, res) => {
  res.json({ msg: "pong" });
});
app.get("/healthz", (_req, res) => {
  res.json({ status: "live" });
});
app.get("/whoami", (_req, res) => {
  res.json({ service: "tele-assist-svc", pid: process.pid });
});

// LiveKit token route: GET /tele/livekit/token?room=demo&identity=care-1&role=caregiver
app.use("/tele", livekitTokenRouter);

// Default 404 in JSON
app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

const PORT = process.env.PORT || 8300;
app.listen(PORT, () => {
  console.log(`[tele-assist-svc] listening on :${PORT}`);
  console.log(`[tele-assist-svc] LIVEKIT_URL=${process.env.LIVEKIT_URL ? "set" : "not set"}`);
});
