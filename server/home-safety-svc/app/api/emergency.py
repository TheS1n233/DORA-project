# English comments only
from __future__ import annotations

import os
import time
from typing import Optional

from fastapi import APIRouter, Body
from ..core.redis import get_redis
from ..notify.telegram import notify

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.post("/trigger")
def trigger_emergency(message: Optional[str] = Body(default=None, embed=True)) -> dict:
    ts = int(time.time())
    stream = os.getenv("SAFETY_STREAM", "safety_events")
    try:
        get_redis().xadd(
            stream,
            {
                "ts": ts,
                "kind": "emergency",
                "action": "trigger",
                "source": "rest",
                "message": (message or "").strip(),
            },
        )
    except Exception as e:
        print(f"[emergency] redis xadd failed: {e}")
    text = (
        f"Emergency triggered: {message.strip()}" if message else "Emergency triggered"
    )
    notify(text, priority="high")
    return {"ok": True, "ts": ts}
