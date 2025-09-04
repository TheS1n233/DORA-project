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

// default 404
app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

const PORT = process.env.PORT || 8300;
app.listen(PORT, () => {
  console.log(`[tele-assist-svc] listening on :${PORT}`);
  console.log(`[tele-assist-svc] LIVEKIT_URL=${process.env.LIVEKIT_URL ? "set" : "not set"}`);
});
