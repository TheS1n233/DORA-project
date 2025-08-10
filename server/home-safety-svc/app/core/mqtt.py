import os
import json
import time
import paho.mqtt.client as mqtt

_client: mqtt.Client | None = None


def _get_client() -> mqtt.Client:
    """Lazily create a client and connect using env defaults."""
    global _client
    if _client is None:
        host = os.getenv("MQTT_HOST", "localhost")
        port = int(os.getenv("MQTT_PORT", "1883"))
        keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))
        c = mqtt.Client(client_id=f"home-safety-svc-{int(time.time())}")

        # Optional username/password
        user = os.getenv("MQTT_USER")
        pwd = os.getenv("MQTT_PASS")
        if user:
            c.username_pw_set(user, pwd or None)

        rc = c.connect(host, port, keepalive=keepalive)
        print(f"[mqtt] connect rc={rc} host={host}:{port}")  # for troubleshooting
        c.loop_start()
        _client = c
    return _client


def publish_fall(flag: bool, angles: list[float] | None = None) -> None:
    """Publish fall event JSON to the fixed topic."""
    topic = os.getenv("MQTT_TOPIC_FALL", "fall/detected")
    qos = int(os.getenv("MQTT_QOS", "0"))
    retain = os.getenv("MQTT_RETAIN", "false").lower() == "true"

    payload = {
        "ts": int(time.time()),
        "fall": flag,
        "angles": angles or [],
        "method": "cv-knee-angle",
    }
    _get_client().publish(topic, json.dumps(payload), qos=qos, retain=retain)
