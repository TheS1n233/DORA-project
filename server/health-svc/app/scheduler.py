import json
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

from .core.redis import get_redis
from .core.crypto import decrypt_json
from .notify.telegram import notify

_thread: Optional[threading.Thread] = None
_stop = threading.Event()


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default


def _env_str(name: str, default: str) -> str:
    return os.getenv(name, default)


def _parse_time_hhmm(s: str) -> Tuple[int, int]:
    try:
        h, m = s.strip().split(":")
        return int(h), int(m)
    except Exception:
        return 21, 0  # fallback 21:00


def _next_summary_ts(now: float) -> float:
    """Compute next daily summary timestamp using HM_DAILY_SUMMARY_AT or override HM_DAILY_SUMMARY_EVERY_MIN."""
    every_min = _env_float("HM_DAILY_SUMMARY_EVERY_MIN", 0.0)
    if every_min > 0:
        return now + every_min * 60.0
    hhmm = _env_str("HM_DAILY_SUMMARY_AT", "21:00")
    h, m = _parse_time_hhmm(hhmm)
    today = datetime.fromtimestamp(now).replace(
        hour=h, minute=m, second=0, microsecond=0
    )
    if today.timestamp() > now:
        return today.timestamp()
    return (today + timedelta(days=1)).timestamp()


def _max_age_for(metric: str) -> int:
    """Max allowed age (seconds) since last measurement for a metric."""
    dflt = int(_env_float("HM_MAX_AGE_DEFAULT_MIN", 180) * 60)
    key = f"HM_MAX_AGE_{metric.upper()}_MIN"
    if key in os.environ:
        return int(_env_float(key, 180) * 60)
    return dflt


def _list_metrics() -> List[str]:
    raw = _env_str("HM_REMINDER_METRICS", "hr,spo2,glucose")
    return [m.strip().lower() for m in raw.split(",") if m.strip()]


def _iter_vitals_recent(count: int = 2000) -> List[Dict[str, Any]]:
    """Return recent vitals records from Redis (decrypted when possible)."""
    r = get_redis()
    items = (
        r.xrevrange(os.getenv("VITALS_STREAM", "vitals"), "+", "-", count=count) or []
    )
    out: List[Dict[str, Any]] = []
    for _, fields in items:
        try:
            ts = int(fields.get("ts", "0"))
            blob = json.loads(fields.get("blob", "{}"))
            data = decrypt_json(blob) or {}
            metric = (data.get("metric") or fields.get("metric") or "").lower()
            value = float(data.get("value")) if "value" in data else None
            unit = data.get("unit") or ""
            out.append({"ts": ts, "metric": metric, "value": value, "unit": unit})
        except Exception:
            continue
    return out


def _build_daily_summary(now: int) -> Optional[str]:
    since = now - 24 * 3600
    vitals = [v for v in _iter_vitals_recent(3000) if v.get("ts", 0) >= since]
    if not vitals:
        return None

    by_metric: Dict[str, List[Dict[str, Any]]] = {}
    for v in vitals:
        m = v.get("metric") or ""
        by_metric.setdefault(m, []).append(v)

    lines = [f"Daily summary ({datetime.fromtimestamp(now).strftime('%Y-%m-%d')}):"]
    for m, arr in sorted(by_metric.items()):
        vals = [x["value"] for x in arr if x.get("value") is not None]
        if not vals:
            lines.append(f"- {m}: {len(arr)} records (no values)")
            continue
        mn = min(vals)
        mx = max(vals)
        avg = sum(vals) / max(1, len(vals))
        lines.append(f"- {m}: count={len(arr)} min={mn:.1f} max={mx:.1f} avg={avg:.1f}")
    return "\n".join(lines)


def _run_reminder(now: int) -> None:
    metrics = _list_metrics()
    vitals = _iter_vitals_recent(2000)
    latest: Dict[str, int] = {}
    for v in vitals:
        m = v.get("metric")
        if not m:
            continue
        t = int(v.get("ts", 0))
        if t > latest.get(m, 0):
            latest[m] = t

    for m in metrics:
        max_age = _max_age_for(m)
        last = latest.get(m, 0)
        if now - last >= max_age:
            mins = int(max_age // 60)
            notify(
                f"Reminder: no {m} measurement in last {mins} minutes",
                priority="normal",
            )


def _loop() -> None:
    reminder_iv = max(10.0, _env_float("HM_REMINDER_INTERVAL_MIN", 10.0) * 60.0)
    nxt_rem = time.time() + 2.0
    nxt_sum = _next_summary_ts(time.time())
    while not _stop.is_set():
        now = time.time()
        if now >= nxt_rem:
            try:
                _run_reminder(int(now))
            except Exception as e:
                print(f"[hm-scheduler] reminder error: {e}")
            nxt_rem = now + reminder_iv

        if now >= nxt_sum:
            try:
                msg = _build_daily_summary(int(now))
                if msg:
                    notify(msg, priority="normal")
            except Exception as e:
                print(f"[hm-scheduler] summary error: {e}")
            nxt_sum = _next_summary_ts(now)

        time.sleep(0.5)


def start_scheduler() -> None:
    global _thread
    if _thread and _thread.is_alive():
        return
    _stop.clear()
    _thread = threading.Thread(target=_loop, name="hm-scheduler", daemon=True)
    _thread.start()
    print("[hm-scheduler] started")


def stop_scheduler() -> None:
    _stop.set()
    if _thread:
        _thread.join(timeout=5.0)
    print("[hm-scheduler] stopped")
