// server/tele-assist-svc/app/routes/livekit-token.js
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = express.Router();

router.get('/token', async (req, res) => {
  try {
    const url = process.env.LIVEKIT_URL;
    const key = process.env.LIVEKIT_KEY;
    const secret = process.env.LIVEKIT_SECRET;

    if (!url || !key || !secret) {
      console.error('[LK] missing env', { hasUrl: !!url, hasKey: !!key, hasSecret: !!secret });
      return res.status(500).json({ error: 'LIVEKIT env missing' });
    }

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
