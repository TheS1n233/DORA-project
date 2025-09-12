# English comments only
from __future__ import annotations

import json
import os
import time
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Query

from ..core.redis import get_redis

router = APIRouter()


def _parse_duration_to_seconds(since: Optional[str]) -> int:
    if not since:
        return 24 * 3600
    s = since.strip().lower()
    if s.endswith("h"):
        return int(float(s[:-1]) * 3600)
    if s.endswith("m"):
        return int(float(s[:-1]) * 60)
    if s.endswith("s"):
        return int(float(s[:-1]))
    try:
        return int(float(s))
    except Exception:
        return 24 * 3600


def _entry_ts(entry_id: str) -> Optional[int]:
    try:
        ms = int(str(entry_id).split("-")[0])
        return int(ms // 1000)
    except Exception:
        return None


def _coerce_int(v, default: Optional[int] = None) -> Optional[int]:
    try:
        return int(v)
    except Exception:
        return default


def _decode_vitals_item(fields: Dict[str, str]) -> Optional[Dict]:
    blob_raw = fields.get("blob") or ""
    if not blob_raw:
        return None
    try:
        env = json.loads(blob_raw)
    except Exception:
        return None
    if env.get("enc") == "none":
        try:
            return json.loads(env.get("json", "{}"))
        except Exception:
            return None
    return None


def _decode_safety_item(fields: Dict[str, str]) -> Optional[Dict]:
    j = fields.get("json") or ""
    if not j:
        return None
    try:
        return json.loads(j)
    except Exception:
        return None


@router.get("/events")
def list_events(
    kinds: Optional[str] = Query(
        default=None,
        description="Comma separated kinds to include (e.g. 'vitals,hazard,emergency').",
    ),
    since: Optional[str] = Query(
        default="24h",
        description="Time window. Accepts '24h','1h','15m','30s' or integer seconds.",
    ),
    limit: int = Query(
        default=200,
        ge=1,
        le=2000,
        description="Max number of recent entries per stream to scan.",
    ),
):
    """
    Aggregate events from multiple Redis Streams into a normalized list.
    Sources:
      - vitals         -> kind 'vitals' (health module), envelope in 'blob'
      - safety_events  -> legacy HS, plain fields with 'json' optional
      - events         -> unified stream, fields {ts,kind,json}
    """
    vitals_stream = os.getenv("VITALS_STREAM", "vitals")
    safety_stream = os.getenv("SAFETY_STREAM", "safety_events")
    unified_stream = os.getenv("EVENTS_STREAM", "events")

    window = _parse_duration_to_seconds(since)
    now = int(time.time())
    since_ts = now - window

    include: Optional[set] = None
    if kinds:
        include = {k.strip().lower() for k in kinds.split(",") if k.strip()}

    r = get_redis()
    out: List[Dict] = []

    # ---- vitals ----
    try:
        vitals_items: List[Tuple[str, Dict[str, str]]] = r.xrevrange(vitals_stream, "+", "-", count=limit) or []
        vitals_items.reverse()
        for entry_id, fields in vitals_items:
            ts = _coerce_int(fields.get("ts")) or _entry_ts(entry_id) or now
            if ts < since_ts:
                continue
            payload = _decode_vitals_item(fields)
            if not payload:
                continue
            ev = {"id": entry_id, "ts": ts, "kind": "vitals", "data": payload, "source": "health-svc"}
            if (include is None) or ("vitals" in include):
                out.append(ev)
    except Exception:
        pass

    # ---- safety_events (legacy) ----
    try:
        safety_items: List[Tuple[str, Dict[str, str]]] = r.xrevrange(safety_stream, "+", "-", count=limit) or []
        safety_items.reverse()
        for entry_id, fields in safety_items:
            ts = _coerce_int(fields.get("ts")) or _entry_ts(entry_id) or now
            if ts < since_ts:
                continue
            payload = _decode_safety_item(fields)
            # If no json field, create minimal payload from fields (optional)
            if not payload:
                payload = {k: fields.get(k) for k in ("kind", "action", "message", "state", "level", "room") if fields.get(k) is not None}
            k = str(fields.get("kind") or (payload.get("kind") if isinstance(payload, dict) else "") or "safety").lower()
            ev = {"id": entry_id, "ts": ts, "kind": k, "data": payload or {}, "source": "home-safety-svc"}
            if (include is None) or (k in include):
                out.append(ev)
    except Exception:
        pass

    # ---- unified events ----
    try:
        unified_items: List[Tuple[str, Dict[str, str]]] = r.xrevrange(unified_stream, "+", "-", count=limit) or []
        unified_items.reverse()
        for entry_id, fields in unified_items:
            ts = _coerce_int(fields.get("ts")) or _entry_ts(entry_id) or now
            if ts < since_ts:
                continue
            j = fields.get("json") or ""
            try:
                payload = json.loads(j) if j else {}
            except Exception:
                payload = {}
            k = str(fields.get("kind") or payload.get("kind") or "event").lower()
            ev = {"id": entry_id, "ts": ts, "kind": k, "data": payload.get("data", payload), "source": payload.get("source", "event")}
            if (include is None) or (k in include):
                out.append(ev)
    except Exception:
        pass

    out.sort(key=lambda e: (e.get("ts") or 0, str(e.get("id") or "")))

    return {
        "total": len(out),
        "since": since if since is not None else "24h",
        "streams": {"vitals": vitals_stream, "safety": safety_stream, "events": unified_stream},
        "entry": out,
    }
