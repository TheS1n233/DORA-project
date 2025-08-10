import json
import os
import threading
import time
from datetime import datetime
from typing import Optional, Dict

import paho.mqtt.client as mqtt  # from redis import Redis


from .core.redis import get_redis
from .notify.telegram import notify

_client: Optional[mqtt.Client] = None
_thread: Optional[threading.Thread] = None
_stop = threading.Event()

# Inactivity tracking
_LAST_ACTIVE: Dict[str, int] = {}  # room -> last active ts
_LAST_ALERTED: Dict[str, int] = {}  # room -> last alert ts
_NEXT_CHECK_TS: float = 0.0


def _mqtt_host_port() -> tuple[str, int, int]:
    """Read MQTT connection params from environment."""
    host = os.getenv("MQTT_HOST", "localhost")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))
    return host, port, keepalive


def _connect_client() -> mqtt.Client:
    """Create and connect a dedicated MQTT client for subscription."""
    host, port, keepalive = _mqtt_host_port()
    c = mqtt.Client(client_id=f"home-safety-svc-sub-{int(time.time())}")
    user = os.getenv("MQTT_USER")
    pwd = os.getenv("MQTT_PASS")
    if user:
        c.username_pw_set(user, pwd or None)

    # Enable automatic reconnect with backoff inside paho loop
    # Note: initial connect will be handled by our retry loop in _worker.
    c.reconnect_delay_set(min_delay=3, max_delay=10)

    def on_connect(client: mqtt.Client, userdata, flags, rc):
        print(f"[subscriber] connected rc={rc} host={host}:{port}")
        # Subscribe topics
        client.subscribe("hazard/#")
        client.subscribe("sensor/motion/#")
        client.subscribe("sensor/door/#")
        client.subscribe("sensor/window/#")
        client.subscribe("doorbell/ring")
        client.subscribe("power/status")
        client.subscribe("emergency/trigger")
        print("[subscriber] subscribed to topics")

    def on_disconnect(client: mqtt.Client, userdata, rc):
        # paho will try to reconnect thanks to reconnect_delay_set
        print(f"[subscriber] disconnected rc={rc}, will auto-reconnect")

    c.on_connect = on_connect
    c.on_disconnect = on_disconnect
    c.on_message = _on_message
    c.connect(host, port, keepalive=keepalive)
    c.loop_start()
    return c


def _xadd(stream: str, fields: dict) -> None:
    """Best-effort Redis stream add."""
    try:
        get_redis().xadd(stream, fields)
    except Exception as e:
        print(f"[subscriber] redis xadd failed: {e}")


def _in_silent_range(now_ts: int) -> bool:
    """Return True if current local time is within silence window 'HH:MM-HH:MM'."""
    rng = (
        os.getenv("INACTIVITY_SILENT_RANGE", "22:00-06:00")
        .strip()
        .strip('"')
        .strip("'")
    )
    try:
        start_s, end_s = rng.split("-")

        def to_min(s: str) -> int:
            h, m = s.split(":")
            return int(h) * 60 + int(m)

        start_m = to_min(start_s)
        end_m = to_min(end_s)
    except Exception:
        return False  # invalid format -> no silence

    lt = datetime.fromtimestamp(now_ts)
    cur = lt.hour * 60 + lt.minute
    if start_m <= end_m:
        return start_m <= cur < end_m
    else:
        # window across midnight
        return cur >= start_m or cur < end_m


def _check_inactivity() -> None:
    """Scan rooms and send inactivity alerts when exceeded the threshold."""
    global _LAST_ALERTED
    # Allow decimal minutes for fast demo
    try:
        minutes = float(os.getenv("INACTIVITY_MINUTES", "30"))
    except Exception:
        minutes = 30.0
    if minutes <= 0:
        return
    threshold_sec = int(minutes * 60)

    now = int(time.time())
    if _in_silent_range(now):
        return

    stream = os.getenv("SAFETY_STREAM", "safety_events")
    for room, ts_last in list(_LAST_ACTIVE.items()):
        idle = now - int(ts_last)
        if idle >= threshold_sec:
            last_alert = int(_LAST_ALERTED.get(room, 0))
            # Cooldown: reuse threshold
            if now - last_alert >= threshold_sec:
                _xadd(
                    stream,
                    {
                        "ts": now,
                        "kind": "inactivity",
                        "room": room,
                        "last_active": ts_last,
                        "minutes": int(idle // 60),
                    },
                )
                notify(
                    f"Inactivity alert: room={room}, last_active={int(idle // 60)} min",
                    priority="high",
                )
                _LAST_ALERTED[room] = now


def _on_message(client: mqtt.Client, userdata, msg) -> None:
    """Handle incoming MQTT messages and write to Redis/notify when needed."""
    topic = msg.topic or ""
    payload_raw = msg.payload.decode("utf-8") if msg.payload else ""
    now_ts = int(time.time())

    # Parse JSON if possible
    try:
        data = json.loads(payload_raw) if payload_raw else {}
    except json.JSONDecodeError:
        data = {}

    stream = os.getenv("SAFETY_STREAM", "safety_events")

    if topic.startswith("hazard/"):
        hazard_type = topic.split("/", 1)[1]  # gas|smoke|water
        level = int(data.get("level", 0))
        ts = int(data.get("ts", now_ts))
        source = str(data.get("source", "unknown"))
        _xadd(
            stream,
            {
                "ts": ts,
                "kind": "hazard",
                "type": hazard_type,
                "level": level,
                "source": source,
            },
        )
        threshold = int(os.getenv("HAZARD_LEVEL_THRESHOLD", "50"))
        if level >= threshold:
            notify(f"Hazard {hazard_type.upper()} level={level} source={source}")

    elif topic.startswith("sensor/motion/"):
        room = topic.split("/", 2)[2]
        ts = int(data.get("ts", now_ts))
        state = str(data.get("state", "active"))
        _xadd(stream, {"ts": ts, "kind": "motion", "room": room, "state": state})
        # Update last active on any motion
        _LAST_ACTIVE[room] = ts

    elif topic.startswith("sensor/door/"):
        sensor_id = topic.split("/", 2)[2]
        ts = int(data.get("ts", now_ts))
        state = str(data.get("state", "open"))
        _xadd(
            stream,
            {
                "ts": ts,
                "kind": "entry",
                "entry": "door",
                "id": sensor_id,
                "state": state,
            },
        )
        if state == "open" and os.getenv("AWAY_MODE", "false").lower() == "true":
            notify(f"Door opened (id={sensor_id})")

    elif topic.startswith("sensor/window/"):
        sensor_id = topic.split("/", 2)[2]
        ts = int(data.get("ts", now_ts))
        state = str(data.get("state", "open"))
        _xadd(
            stream,
            {
                "ts": ts,
                "kind": "entry",
                "entry": "window",
                "id": sensor_id,
                "state": state,
            },
        )
        if state == "open" and os.getenv("AWAY_MODE", "false").lower() == "true":
            notify(f"Window opened (id={sensor_id})")

    elif topic == "doorbell/ring":
        ts = int(data.get("ts", now_ts))
        source = str(data.get("source", "unknown"))
        _xadd(stream, {"ts": ts, "kind": "doorbell", "source": source})
        notify(f"Doorbell ring (source={source})")

    elif topic == "power/status":
        ts = int(data.get("ts", now_ts))
        state = str(data.get("state", "online"))
        _xadd(stream, {"ts": ts, "kind": "power", "state": state})
        notify(f"Power status: {state}")

    elif topic == "emergency/trigger":
        ts = int(data.get("ts", now_ts))
        message = str(data.get("message", "")).strip()
        _xadd(
            stream,
            {
                "ts": ts,
                "kind": "emergency",
                "action": "trigger",
                "source": "mqtt",
                "message": message,
            },
        )
        notify(
            (
                f"Emergency trigger received: {message}"
                if message
                else "Emergency trigger received"
            ),
            priority="high",
        )

    else:
        _xadd(
            stream,
            {"ts": now_ts, "kind": "unknown", "topic": topic, "raw": payload_raw},
        )


def _worker() -> None:
    """Subscriber thread body with retry and periodic inactivity checks."""
    global _client, _NEXT_CHECK_TS
    backoff = 3.0  # seconds, exponential up to 10s
    while not _stop.is_set():
        try:
            _client = _connect_client()
            _NEXT_CHECK_TS = time.time() + 2.0
            backoff = 3.0  # reset after successful connect
            while not _stop.is_set():
                now = time.time()
                if now >= _NEXT_CHECK_TS:
                    _check_inactivity()
                    _NEXT_CHECK_TS = now + 2.0  # check every 2s
                time.sleep(0.2)
        except Exception as e:
            print(f"[subscriber] connect/run error: {e}; retry in {backoff:.1f}s")
            # Best-effort cleanup
            try:
                if _client is not None:
                    _client.loop_stop()
                    _client.disconnect()
            except Exception:
                pass
            _client = None
            # Wait with backoff or exit if stopped
            if _stop.wait(backoff):
                break
            backoff = min(backoff * 1.7, 10.0)
        finally:
            if _stop.is_set():
                try:
                    if _client is not None:
                        _client.loop_stop()
                        _client.disconnect()
                except Exception as e:
                    print(f"[subscriber] disconnect error: {e}")
                _client = None


def start_subscriber() -> None:
    """Start subscriber thread once."""
    global _thread
    if _thread and _thread.is_alive():
        return
    _stop.clear()
    _thread = threading.Thread(target=_worker, name="mqtt-subscriber", daemon=True)
    _thread.start()
    print("[subscriber] started")


def stop_subscriber() -> None:
    """Stop subscriber thread."""
    _stop.set()
    if _thread:
        _thread.join(timeout=5.0)
    print("[subscriber] stopped")
