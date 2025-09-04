# English comments only
from __future__ import annotations

import time
from typing import Dict, Optional

_METRICS: Dict[str, int] = {
    "falls_detected": 0,
    "angles_detected": 0,
    "frame_detected": 0,
    "hazards_detected": 0,
    "gas_detected": 0,
    "water_detected": 0,
    "power_detected": 0,
}
_TIMES: Dict[str, Optional[int]] = {
    "last_fall_ts": None,
    "last_hazard_ts": None,
}


def inc(key: str, delta: int = 1) -> None:
    _METRICS[key] = _METRICS.get(key, 0) + delta


def mark(key: str, ts: Optional[int] = None) -> None:
    _TIMES[key] = int(ts or time.time())


def snapshot() -> dict:
    s = dict(_METRICS)
    s.update(_TIMES)
    return s
