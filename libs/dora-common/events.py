# libs/dora-common/events.py
# English comments only
from __future__ import annotations

import json
import time
from typing import Any, Dict, Optional


def make_event(
    kind: str,
    *,
    ts: Optional[int] = None,
    source: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
    severity: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a normalized event shape for cross-module usage.

    Shape:
    {
      "ts":  int (unix seconds),
      "kind": str,              # e.g. "vitals", "hazard", "emergency", ...
      "source": str,            # optional publisher or service
      "sev": str,               # optional severity: info|warn|crit
      "data": { ... }           # arbitrary payload
    }
    """
    if ts is None:
        ts = int(time.time())
    ev: Dict[str, Any] = {"ts": int(ts), "kind": str(kind), "source": source or "", "data": data or {}}
    if severity:
        ev["sev"] = severity
    return ev


def to_stream_fields(ev: Dict[str, Any]) -> Dict[str, str]:
    """
    Serialize event to Redis Stream fields. Keep it simple & plaintext JSON.
    Fields:
      ts   -> str(int)
      kind -> str
      json -> compact JSON string of the whole event dict
    """
    ts = str(int(ev.get("ts", int(time.time()))))
    kind = str(ev.get("kind", ""))
    blob = json.dumps(ev, separators=(",", ":"))
    return {"ts": ts, "kind": kind, "json": blob}
