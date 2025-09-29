// server/tele-assist-svc/app/routes/livekit-token.js
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = express.Router();

router.get('/token', async (req, res) => {
  try {
    // Use environment variables or fallback to development defaults
    const url = process.env.LIVEKIT_URL || 'ws://localhost:7880';
    const key = process.env.LIVEKIT_KEY || 'devkey';
    const secret = process.env.LIVEKIT_SECRET || 'devsecret';

    console.log('[LK] token request', { url, hasKey: !!key, hasSecret: !!secret });

    const { room = 'demo', identity = 'guest', role = 'participant' } = req.query;

    const at = new AccessToken(key, secret, {
      identity: String(identity).slice(0, 64),
    });
    at.addGrant({
      room: String(room),
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      // 如果你启了服务端录制等，这里可再加更多 grant
    });

    const token = await at.toJwt();
    return res.json({ url, token, role });
  } catch (e) {
    console.error('[LK] token error', e);
    return res.status(500).json({ error: 'token_failed' });
  }
});

export default router;
