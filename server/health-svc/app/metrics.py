# English comments only
from __future__ import annotations

import time
from typing import Dict, Optional

_METRICS: Dict[str, int] = {
    "alerts_sent": 0,
    "emergencies_sent": 0,
    # per-vital counters
    "spo2_events": 0,
    "temp_events": 0,
}
_TIMES: Dict[str, Optional[int]] = {
    "last_alert_ts": None,
    "last_emergency_ts": None,
}


def inc(key: str, delta: int = 1) -> None:
    _METRICS[key] = _METRICS.get(key, 0) + delta


def mark(key: str, ts: Optional[int] = None) -> None:
    _TIMES[key] = int(ts or time.time())


def snapshot() -> dict:
    s = dict(_METRICS)
    s.update(_TIMES)
    return s
