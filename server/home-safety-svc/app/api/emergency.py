# English comments only
from __future__ import annotations

import time
from typing import Optional

from fastapi import APIRouter, Body
from ..core.redis import get_redis
from ..notify.telegram import notify

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.post("/trigger")
def trigger_emergency(message: Optional[str] = Body(default=None, embed=True)) -> dict:
    """
    Trigger an emergency event:
    - XADD into SAFETY_STREAM (default 'safety_events')
    - Notify via Telegram (best-effort)
    - Return {"ok": true, "ts": <unix>}
    """
    import os, json
    ts = int(time.time())
    stream = os.getenv("SAFETY_STREAM", "safety_events")
    fields = {
        "ts": ts,
        "kind": "emergency",
        "action": "trigger",
        "source": "api",
        "message": (message or "").strip(),
    }
    try:
        r = get_redis()
        r.xadd(stream, fields)
    except Exception as e:
        print(f"[emergency] redis xadd failed: {e}")
    try:
        text = f"Emergency triggered: {(message or '').strip()}" if message else "Emergency triggered"
        notify(text, priority="high")
    except Exception as e:
        print(f"[emergency] notify failed: {e}")
    return {"ok": True, "ts": ts}
