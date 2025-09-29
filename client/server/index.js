// Minimal token service for local debugging (CommonJS)
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { AccessToken } = require("livekit-server-sdk");

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8787;
const LIVEKIT_URL = process.env.LIVEKIT_URL || "https://your-livekit.example.com";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "devsecret";

// GET /api/livekit/token?room=dora-demo&identity=tv-333&name=TV%20Device
app.get("/api/livekit/token", async (req, res) => {
  try {
    const room = (req.query.room || "dora-demo").toString();
    const identity = (req.query.identity || "tv-333").toString();
    const name = (req.query.name || identity).toString();

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name
    });

    // grant join/publish/subscribe for the specific room
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true
    });

    const token = await at.toJwt();
    res.json({ url: LIVEKIT_URL, token, room, identity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "token error" });
  }
});

app.listen(PORT, () => {
  console.log(`[dora-livekit-server] listening on http://localhost:${PORT}`);
});
