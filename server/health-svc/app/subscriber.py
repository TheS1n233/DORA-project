import json
import os
import threading
import time
from typing import Optional, Dict, Any

import paho.mqtt.client as mqtt
from .core.redis import get_redis
from .core.crypto import encrypt_json
from .notify.telegram import notify

_client: Optional[mqtt.Client] = None
_thread: Optional[threading.Thread] = None
_stop = threading.Event()


def _mqtt_host_port() -> tuple[str, int, int]:
    host = os.getenv("MQTT_HOST", "127.0.0.1")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))
    return host, port, keepalive


def _is_critical(metric: str, value: float) -> bool:
    m = metric.lower()
    try:
        hr_max = float(os.getenv("HM_THRESH_HR_MAX", "120"))
        spo2_min = float(os.getenv("HM_THRESH_SPO2_MIN", "90"))
        glucose_max = float(os.getenv("HM_THRESH_GLUCOSE_MAX", "180"))
    except Exception:
        hr_max, spo2_min, glucose_max = 120.0, 90.0, 180.0

    if m in ("hr", "heart_rate", "bpm"):
        return value > hr_max
    if m in ("spo2", "blood_oxygen"):
        return value < spo2_min
    if m in ("glucose", "bg", "blood_glucose"):
        return value > glucose_max
    return False


def _xadd(stream: str, fields: Dict[str, Any]) -> None:
    try:
        get_redis().xadd(stream, fields)
    except Exception as e:
        print(f"[health-svc] redis xadd failed: {e}")


def process_vitals(data: Dict[str, Any]) -> Dict[str, Any]:
    """Unified handler for both REST and MQTT paths."""
    ts = int(data.get("ts", time.time()))
    metric = str(data.get("metric", "")).lower()
    value = float(data.get("value", 0))
    unit = (data.get("unit") or "").strip()
    source = (data.get("source") or "mqtt").strip()

    vitals_stream = os.getenv("VITALS_STREAM", "vitals")
    safety_stream = os.getenv("SAFETY_STREAM", "safety_events")

    # Store encrypted payload (or plaintext envelope when key missing)
    envelope = encrypt_json(
        {
            "metric": metric,
            "value": value,
            "unit": unit,
            "source": source,
        }
    )
    _xadd(
        vitals_stream,
        {
            "ts": ts,
            "metric": metric,
            "enc": envelope.get("enc", "none"),
            "blob": json.dumps(envelope, separators=(",", ":")),
        },
    )

    critical = _is_critical(metric, value)
    if critical:
        _xadd(
            safety_stream,
            {
                "ts": ts,
                "kind": "health",
                "metric": metric,
                "value": str(value),
                "unit": unit or "",
                "critical": "1",
            },
        )
        notify(f"Health alert: {metric}={value}{unit and ' '+unit}", priority="high")

    return {"ok": True, "ts": ts, "critical": critical}


def _on_connect(client: mqtt.Client, userdata, flags, rc):
    host, port, _ = _mqtt_host_port()
    print(f"[vitals-subscriber] connected rc={rc} host={host}:{port}")
    client.subscribe("vitals/ingest")
    print("[vitals-subscriber] subscribed to vitals/ingest")


def _on_message(client: mqtt.Client, userdata, msg):
    payload_raw = msg.payload.decode("utf-8") if msg.payload else ""
    try:
        data = json.loads(payload_raw) if payload_raw else {}
    except json.JSONDecodeError:
        data = {}
    if msg.topic == "vitals/ingest":
        process_vitals(data)


def _connect_client() -> mqtt.Client:
    host, port, keepalive = _mqtt_host_port()
    c = mqtt.Client(client_id=f"health-svc-sub-{int(time.time())}")
    user, pwd = os.getenv("MQTT_USER"), os.getenv("MQTT_PASS")
    if user:
        c.username_pw_set(user, pwd or None)
    c.reconnect_delay_set(min_delay=3, max_delay=10)
    c.on_connect = _on_connect
    c.on_message = _on_message
    c.on_disconnect = lambda *_: print(
        "[vitals-subscriber] disconnected; auto-reconnect"
    )
    c.connect(host, port, keepalive=keepalive)
    c.loop_start()
    return c


def _worker() -> None:
    global _client
    backoff = 3.0
    while not _stop.is_set():
        try:
            _client = _connect_client()
            backoff = 3.0
            while not _stop.is_set():
                time.sleep(0.2)
        except Exception as e:
            print(
                f"[vitals-subscriber] connect/run error: {e}; retry in {backoff:.1f}s"
            )
            try:
                if _client:
                    _client.loop_stop()
                    _client.disconnect()
            except Exception:
                pass
            _client = None
            if _stop.wait(backoff):
                break
            backoff = min(backoff * 1.7, 10.0)
        finally:
            if _stop.is_set():
                try:
                    if _client:
                        _client.loop_stop()
                        _client.disconnect()
                except Exception:
                    pass
                _client = None


def start_subscriber() -> None:
    global _thread
    if _thread and _thread.is_alive():
        return
    _stop.clear()
    _thread = threading.Thread(target=_worker, name="vitals-subscriber", daemon=True)
    _thread.start()
    print("[vitals-subscriber] started")


def stop_subscriber() -> None:
    _stop.set()
    if _thread:
        _thread.join(timeout=5.0)
    print("[vitals-subscriber] stopped")
