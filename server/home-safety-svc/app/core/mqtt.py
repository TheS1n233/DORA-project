import json
import time
import paho.mqtt.client as mqtt

_client = mqtt.Client()
_client.connect("localhost", 1883, 60)


def publish_fall(flag: bool, angles: list[float] | None = None) -> None:
    payload = {
        "ts": int(time.time()),
        "fall": flag,
        "angles": angles or [],
        "method": "cv-knee-angle",
    }
    _client.publish("fall/detected", json.dumps(payload), qos=0, retain=False)
