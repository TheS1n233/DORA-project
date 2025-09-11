# libs/dora-common/events.py
# English comments only
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Any, Dict, Literal, Optional
import time
import uuid

EventKind = Literal["vital", "safety", "emergency", "intent", "system"]

@dataclass
class DoraEvent:
    kind: EventKind
    ts: int                      # unix seconds
    source: str                  # publisher id or service
    room: Optional[str] = None   # physical/virtual room
    severity: Optional[str] = None  # info/warn/crit
    payload: Optional[Dict[str, Any]] = None
    id: str = ""                 # event id

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if not d.get("id"):
            d["id"] = self.make_id()
        return d

    @staticmethod
    def make_id() -> str:
        return uuid.uuid4().hex

def make_event(
    kind: EventKind,
    source: str,
    *,
    room: Optional[str] = None,
    severity: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    ts: Optional[int] = None,
) -> Dict[str, Any]:
    """Factory for a normalized DORA event."""
    e = DoraEvent(
        kind=kind,
        ts=int(ts or time.time()),
        source=source,
        room=room,
        severity=severity,
        payload=payload or {},
    )
    return e.to_dict()
