# English comments only
from __future__ import annotations

import os
import time
from typing import Optional

from fastapi import APIRouter, Body
from ..core.redis import get_redis
from ..notify.telegram import notify

# Try to import the unified event helpers; provide safe fallbacks if missing
try:
    from dora_common import make_event, to_stream_fields  # installed package name (libs/dora-common)
except Exception:  # pragma: no cover
    # Fallback implementations to avoid import errors in dev/testing
    def make_event(kind: str, *, ts: Optional[int] = None, source: Optional[str] = None,
                   data: Optional[dict] = None, severity: Optional[str] = None) -> dict:
        if ts is None:
            ts = int(time.time())
        ev = {"ts": int(ts), "kind": str(kind), "source": source or "", "data": data or {}}
        if severity:
            ev["sev"] = severity
        return ev

    def to_stream_fields(ev: dict) -> dict:
        import json as _json
        ts = str(int(ev.get("ts", int(time.time()))))
        kind = str(ev.get("kind", ""))
        blob = _json.dumps(ev, separators=(",", ":"))
        return {"ts": ts, "kind": kind, "json": blob}

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.post("/trigger")
def trigger_emergency(message: Optional[str] = Body(default=None, embed=True)) -> dict:
    """
    Trigger an emergency event.
    - Keep legacy write to 'safety_events' (backward compatible)
    - Also write a normalized record to 'events' stream for unified timeline
    """
    r = get_redis()
    ts = int(time.time())

    # 1) Legacy safety_events stream (unchanged)
    try:
        stream_legacy = os.getenv("SAFETY_STREAM", "safety_events")
        r.xadd(
            stream_legacy,
            {
                "ts": ts,
                "kind": "emergency",
                "action": "trigger",
                "source": "rest",
                "message": (message or "").strip(),
            },
        )
    except Exception as e:
        print(f"[emergency] redis xadd to safety_events failed: {e}")

    # 2) Unified events stream (new)
    try:
        ev = make_event(
            "emergency",
            ts=ts,
            source="home-safety-svc",
            data={
                "action": "trigger",
                "message": (message or "").strip(),
            },
            severity="crit",
        )
        fields = to_stream_fields(ev)
        stream_unified = os.getenv("EVENTS_STREAM", "events")
        r.xadd(stream_unified, fields)
    except Exception as e:
        print(f"[emergency] redis xadd to events failed: {e}")

    # Notify (best-effort)
    text = f"Emergency triggered: {message.strip()}" if message else "Emergency triggered"
    try:
        notify(text, priority="high")
    except Exception as e:
        print(f"[emergency] notify failed: {e}")

    return {"ok": True, "ts": ts}
