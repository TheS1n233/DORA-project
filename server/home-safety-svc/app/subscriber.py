# English comments only
from __future__ import annotations

import json
import os
import threading
import time
from typing import Optional

import paho.mqtt.client as mqtt
from redis import Redis

from .core.config import HSConfig
from .notify.telegram import notify
from .metrics import inc, mark

_running = False
_thread: Optional[threading.Thread] = None
_last_connect_rc: Optional[int] = None
_last_msg_ts: Optional[int] = None
_cfg: Optional[HSConfig] = None
_rds: Optional[Redis] = None


def _redis_set_cooldown(r: Redis, key: str, ttl_sec: int) -> bool:
    # English comments only
    return r.set(name=key, value="1", ex=ttl_sec, nx=True) is True


def _cooldown_key(kind: str, source: str) -> str:
    # English comments only
    s = source or "default"
    return f"hs:cd:{kind}:{s}"


def _connect_client() -> mqtt.Client:
    # English comments only
    host = os.getenv("MQTT_HOST", "mosquitto")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = 30
    c = mqtt.Client(client_id=f"hs-sub-{int(time.time())}")
    c.connect(host, port, keepalive=keepalive)
    return c


def _handle_hazard(topic: str, payload: dict) -> None:
    # English comments only
    global _cfg, _rds, _last_msg_ts
    if _cfg is None or _rds is None:
        return
    parts = topic.split("/")
    if len(parts) < 2:
        return
    kind = parts[1]  # hazard/<kind>
    ts = int(payload.get("ts", int(time.time())))
    _last_msg_ts = ts
    source = str(payload.get("source", ""))

    # Decide hazard and cooldown per kind
    hazard = False
    cd_sec = 0
    if kind == "gas":
        try:
            level = float(payload.get("level", 0))
        except Exception:
            level = 0.0
        hazard = level >= float(_cfg.GAS_WARN_LEVEL)
        cd_sec = _cfg.COOLDOWN_GAS_MIN * 60
        if hazard:
            ok = _redis_set_cooldown(_rds, _cooldown_key(kind, source), cd_sec)
            if ok:
                msg = f"Hazard GAS level={level:.0f} source={source or 'n/a'}"
                sent = False
                try:
                    sent = notify(msg, priority="high")
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
                if sent:
                    inc("hazards_detected", 1)
                    inc("gas_detected", 1)
                    mark("last_hazard_ts", ts)
                    # write to safety stream
                    try:
                        stream = os.getenv("SAFETY_STREAM", "safety_events")
                        event = {
                            "ts": ts,
                            "kind": "gas",
                            "source": source,
                            "data": payload,  # keep original fields, e.g., level
                        }
                        _rds.xadd(stream, {"blob": json.dumps(event, separators=(",", ":"))})
                    except Exception as e:
                        print(f"[hs] redis xadd failed: {e}")

            else:
                print("[hs] gas hazard suppressed by cooldown")
    elif kind == "water":
        # Accept state strings like "leak", "ok"
        state = str(payload.get("state", "")).lower()
        hazard = state in ("leak", "alarm", "on", "true", "1")
        cd_sec = _cfg.COOLDOWN_WATER_MIN * 60
        if hazard:
            ok = _redis_set_cooldown(_rds, _cooldown_key(kind, source), cd_sec)
            if ok:
                msg = f"Hazard WATER state={state} source={source or 'n/a'}"
                sent = False
                try:
                    sent = notify(msg, priority="high")
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
                if sent:
                    inc("hazards_detected", 1)
                    inc("water_detected", 1)
                    mark("last_hazard_ts", ts)
                    # write to safety stream
                    try:
                        stream = os.getenv("SAFETY_STREAM", "safety_events")
                        event = {
                            "ts": ts,
                            "kind": "water",
                            "source": source,
                            "data": payload,
                        }
                        _rds.xadd(stream, {"blob": json.dumps(event, separators=(",", ":"))})
                    except Exception as e:
                        print(f"[hs] redis xadd failed: {e}")
            else:
                print("[hs] water hazard suppressed by cooldown")
    elif kind == "power":
        state = str(payload.get("state", "")).lower()
        # Consider non-ok states as hazard (e.g., outage/down/off)
        hazard = state not in ("ok", "on", "normal", "true", "1")
        cd_sec = _cfg.COOLDOWN_POWER_MIN * 60
        if hazard:
            ok = _redis_set_cooldown(_rds, _cooldown_key(kind, source), cd_sec)
            if ok:
                msg = f"Hazard POWER state={state} source={source or 'n/a'}"
                sent = False
                try:
                    sent = notify(msg, priority="high")
                except Exception as e:
                    print(f"[hs] notify failed: {e}")
                if sent:
                    inc("hazards_detected", 1)
                    inc("power_detected", 1)
                    mark("last_hazard_ts", ts)
                    # write to safety stream
                    try:
                        stream = os.getenv("SAFETY_STREAM", "safety_events")
                        event = {
                            "ts": ts,
                            "kind": "power",
                            "source": source,
                            "data": payload,  # e.g., {"state": "..."}
                        }
                        _rds.xadd(stream, {"blob": json.dumps(event, separators=(",", ":"))})
                    except Exception as e:
                        print(f"[hs] redis xadd failed: {e}")
            else:
                print("[hs] power hazard suppressed by cooldown")
    else:
        # Unknown hazard kind: ignore silently
        return


def _on_message(_client: mqtt.Client, _userdata, msg: mqtt.MQTTMessage) -> None:
    # English comments only
    try:
        p = json.loads(msg.payload.decode("utf-8"))
    except Exception:
        p = {}
    if msg.topic.startswith("hazard/"):
        _handle_hazard(msg.topic, p)


def _worker() -> None:
    # English comments only
    global _running, _last_connect_rc
    while _running:
        try:
            c = _connect_client()
            _last_connect_rc = 0
            c.subscribe("hazard/+", qos=0)
            c.on_message = _on_message
            c.loop_forever()
        except Exception as e:
            _last_connect_rc = -1
            print(f"[hs] mqtt loop error: {e}")
            time.sleep(2.0)


def start(cfg: HSConfig, r: Redis) -> None:
    # English comments only
    global _running, _thread, _cfg, _rds
    if _running:
        return
    _cfg = cfg
    _rds = r
    _running = True
    _thread = threading.Thread(target=_worker, name="hs-subscriber", daemon=True)
    _thread.start()
    print("[subscriber] started")


def stop() -> None:
    # English comments only
    global _running
    _running = False


def status() -> dict:
    # English comments only
    return {
        "running": _running,
        "last_connect_rc": _last_connect_rc,
        "last_msg_ts": _last_msg_ts,
    }
