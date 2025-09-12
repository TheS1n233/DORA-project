# English comments only
from __future__ import annotations

import json
import os
import threading
import time
from typing import Optional, Dict

import paho.mqtt.client as mqtt
from redis import Redis

from .core.config import HSConfig
from .notify.telegram import notify
from .metrics import inc, mark

# Try to import unified event helpers; provide safe fallbacks if missing
try:
    from dora_common import make_event, to_stream_fields  # libs/dora-common
except Exception:  # pragma: no cover
    def make_event(kind: str, *, ts: Optional[int] = None, source: Optional[str] = None,
                   data: Optional[Dict] = None, severity: Optional[str] = None) -> Dict:
        if ts is None:
            ts = int(time.time())
        ev = {"ts": int(ts), "kind": str(kind), "source": source or "", "data": data or {}}
        if severity:
            ev["sev"] = severity
        return ev
    def to_stream_fields(ev: Dict) -> Dict[str, str]:
        ts = str(int(ev.get("ts", int(time.time()))))
        kind = str(ev.get("kind", ""))
        blob = json.dumps(ev, separators=(",", ":"))
        return {"ts": ts, "kind": kind, "json": blob}

# ---- internal runtime state ----
_running = False
_thread: Optional[threading.Thread] = None
_last_connect_rc: Optional[int] = None
_last_msg_ts: Optional[int] = None

# inactivity trackers
_LAST_ACTIVE: Dict[str, int] = {}
_LAST_ALERTED: Dict[str, int] = {}


def _now() -> int:
    return int(time.time())


def _xadd(stream: str, fields: dict) -> None:
    """Wrapper to allow monkeypatch in tests."""
    from .core.redis import get_redis
    r = get_redis()
    r.xadd(stream, fields)


def _cooldown_key(kind: str, source: Optional[str] = None) -> str:
    return f"hs:cd:{kind}:{source or 'n/a'}"


def _redis_set_cooldown(r: Redis, key: str, ttl_sec: int) -> bool:
    return r.set(name=key, value="1", ex=ttl_sec, nx=True) is True


def _connect_client() -> mqtt.Client:
    host = os.getenv("MQTT_HOST", "mosquitto")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = 30
    c = mqtt.Client(client_id=f"hs-sub-{_now()}")
    c.connect(host, port, keepalive=keepalive)
    return c


def _parse_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    s = str(v).strip().lower()
    return s in ("1", "true", "yes", "on", "y")


def _handle_motion(topic: str, payload: dict) -> None:
    parts = topic.split("/")
    if len(parts) >= 2:
        room = parts[1] or "unknown"
    else:
        room = "unknown"
    ts = int(payload.get("ts") or _now())
    _LAST_ACTIVE[room] = ts
    mark("last_motion_ts", ts)


def _write_unified_event(kind: str, ts: int, data: Dict, severity: str = "warn", source: str = "home-safety-svc") -> None:
    """Write to unified 'events' stream."""
    try:
        ev = make_event(kind, ts=ts, source=source, data=data, severity=severity)
        fields = to_stream_fields(ev)
        stream = os.getenv("EVENTS_STREAM", "events")
        _xadd(stream, fields)
    except Exception as e:
        print(f"[hs] xadd unified events failed: {e}")


def _handle_hazard(kind: str, payload: dict, r: Redis, cfg: HSConfig) -> None:
    """Process hazard events and notify with cooldown. Also write to safety_events."""
    ts = int(payload.get("ts") or _now())
    source = str(payload.get("source") or "")
    stream = os.getenv("SAFETY_STREAM", "safety_events")

    hazard = False
    cd_sec = 0
    fields = {
        "kind": kind,
        "ts": ts,
        "source": source or "mqtt",
    }

    if kind == "gas":
        try:
            level = float(payload.get("level", 0))
        except Exception:
            level = 0.0
        fields["level"] = level
        hazard = level >= float(os.getenv("GAS_WARN_LEVEL", "50"))
        cd_sec = int(os.getenv("COOLDOWN_GAS_MIN", "5")) * 60
        if hazard:
            ok_cd = _redis_set_cooldown(r, _cooldown_key(kind, source), cd_sec)
            if ok_cd:
                msg = f"Hazard GAS level={level:.0f} source={source or 'n/a'}"
                try:
                    notify(msg, priority="high")
                    inc("hazards_detected", 1)
                    inc("gas_detected", 1)
                    mark("last_hazard_ts", ts)
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
            # Unified events (only when hazard=true to reduce noise)
            _write_unified_event("hazard", ts, {"type": "gas", "level": level, "source": source or "mqtt"}, severity="warn")

    elif kind == "smoke":
        try:
            level = float(payload.get("level", 0))
        except Exception:
            level = 0.0
        fields["level"] = level
        hazard = level >= float(os.getenv("SMOKE_WARN_LEVEL", "50"))
        cd_sec = int(os.getenv("COOLDOWN_SMOKE_MIN", "5")) * 60
        if hazard:
            ok_cd = _redis_set_cooldown(r, _cooldown_key(kind, source), cd_sec)
            if ok_cd:
                msg = f"Hazard SMOKE level={level:.0f} source={source or 'n/a'}"
                try:
                    notify(msg, priority="high")
                    inc("hazards_detected", 1)
                    mark("last_hazard_ts", ts)
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
            _write_unified_event("hazard", ts, {"type": "smoke", "level": level, "source": source or "mqtt"}, severity="warn")

    elif kind == "water":
        state = payload.get("state")
        if isinstance(state, str):
            state_norm = state.strip().lower()
            is_leak = state_norm in ("leak", "on", "true", "wet")
        else:
            is_leak = bool(state)
        fields["state"] = "leak" if is_leak else "ok"
        hazard = is_leak
        cd_sec = int(os.getenv("COOLDOWN_WATER_MIN", "2")) * 60
        if hazard:
            ok_cd = _redis_set_cooldown(r, _cooldown_key(kind, source), cd_sec)
            if ok_cd:
                msg = f"Hazard WATER state=leak source={source or 'n/a'}"
                try:
                    notify(msg, priority="high")
                    inc("hazards_detected", 1)
                    inc("water_detected", 1)
                    mark("last_hazard_ts", ts)
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
            _write_unified_event("hazard", ts, {"type": "water", "state": "leak", "source": source or "mqtt"}, severity="warn")

    elif kind == "power":
        state = str(payload.get("state", "")).lower()
        outage = state in ("outage", "down", "off", "0", "false") or (payload.get("outage") is True)
        fields["state"] = "outage" if outage else (state or "ok")
        hazard = outage
        cd_sec = int(os.getenv("COOLDOWN_POWER_MIN", "2")) * 60
        if hazard:
            ok_cd = _redis_set_cooldown(r, _cooldown_key(kind, source), cd_sec)
            if ok_cd:
                msg = f"Hazard POWER outage source={source or 'n/a'}"
                try:
                    notify(msg, priority="high")
                    inc("hazards_detected", 1)
                    inc("power_detected", 1)
                    mark("last_hazard_ts", ts)
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
            _write_unified_event("hazard", ts, {"type": "power", "state": "outage", "source": source or "mqtt"}, severity="warn")

    # Always write one record for observability, even if under cooldown
    try:
        _xadd(stream, fields)
    except Exception as e:
        print(f"[hs] xadd hazard failed: {e}")


def _on_message(cfg: HSConfig, r: Redis, _client: mqtt.Client, msg: mqtt.MQTTMessage) -> None:
    global _last_msg_ts
    topic = msg.topic
    try:
        p = json.loads(msg.payload.decode("utf-8"))
    except Exception:
        p = {}

    _last_msg_ts = int(p.get("ts") or _now())

    if topic.startswith("motion/"):
        _handle_motion(topic, p)
        return

    if topic == "hazard/gas":
        _handle_hazard("gas", p, r, cfg); return
    if topic == "hazard/smoke":
        _handle_hazard("smoke", p, r, cfg); return
    if topic == "hazard/water":
        _handle_hazard("water", p, r, cfg); return
    if topic == "hazard/power":
        _handle_hazard("power", p, r, cfg); return


def _check_in_silent_window() -> bool:
    rng = os.getenv("INACTIVITY_SILENT_RANGE", "23:00-06:00").strip()
    if not rng or "-" not in rng:
        return False
    try:
        a, b = rng.split("-", 1)
        def _to_min(s: str) -> int:
            hh, mm = s.split(":")
            return int(hh) * 60 + int(mm)
        now = time.localtime()
        now_min = now.tm_hour * 60 + now.tm_min
        a_min, b_min = _to_min(a), _to_min(b)
        if a_min <= b_min:
            return a_min <= now_min <= b_min
        return now_min >= a_min or now_min <= b_min
    except Exception:
        return False


def _check_inactivity() -> None:
    if _check_in_silent_window():
        return
    minutes = float(os.getenv("INACTIVITY_MINUTES", "30"))
    cd_min = float(os.getenv("INACTIVITY_COOLDOWN_MIN", "60"))
    stream = os.getenv("SAFETY_STREAM", "safety_events")
    now = _now()
    threshold = now - int(minutes * 60)

    for room, last_ts in list(_LAST_ACTIVE.items()):
        if last_ts <= threshold:
            last_alert = _LAST_ALERTED.get(room, 0)
            if now - last_alert >= int(cd_min * 60):
                fields = {"kind": "inactivity", "room": room, "last_active_ts": last_ts, "ts": now}
                try:
                    _xadd(stream, fields)
                except Exception as e:
                    print(f"[hs] xadd inactivity failed: {e}")
                try:
                    notify(
                        f"Inactivity alert: room={room} last_active={time.strftime('%H:%M:%S', time.localtime(last_ts))}",
                        priority="normal",
                    )
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
                _LAST_ALERTED[room] = now
                inc("hazards_detected", 1)
                mark("last_hazard_ts", now)
                # Unified events
                _write_unified_event("inactivity", now, {"room": room, "last_active_ts": last_ts}, severity="warn")


def _worker(cfg: HSConfig, r: Redis) -> None:
    global _running, _last_connect_rc
    while _running:
        try:
            c = _connect_client()
            _last_connect_rc = 0
            c.subscribe("hazard/gas", qos=0)
            c.subscribe("hazard/water", qos=0)
            c.subscribe("hazard/power", qos=0)
            c.subscribe("hazard/smoke", qos=0)
            c.subscribe("motion/#", qos=0)
            c.on_message = lambda _c, _u, m: _on_message(cfg, r, _c, m)
            last_check = 0
            def _loop():
                nonlocal last_check
                while _running:
                    c.loop(timeout=0.5)
                    now = _now()
                    if now - last_check >= 30:
                        last_check = now
                        _check_inactivity()
            _loop()
        except Exception as e:
            _last_connect_rc = -1
            print(f"[hs] mqtt loop error: {e}")
            time.sleep(2.0)


def start(cfg: HSConfig, r: Redis) -> None:
    global _running, _thread
    if _running:
        return
    _running = True
    _thread = threading.Thread(target=_worker, args=(cfg, r), name="hs-subscriber", daemon=True)
    _thread.start()
    print("[hs/subscriber] started")


def stop() -> None:
    global _running
    _running = False


def status() -> dict:
    return {"running": _running, "last_connect_rc": _last_connect_rc, "last_msg_ts": _last_msg_ts}
