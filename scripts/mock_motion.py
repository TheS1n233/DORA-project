#!/usr/bin/env python3
# English comments only
import argparse
import json
import os
import time

import paho.mqtt.client as mqtt


def get_client() -> mqtt.Client:
    host = os.getenv("MQTT_HOST", "127.0.0.1")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))
    c = mqtt.Client(client_id=f"mock-motion-{int(time.time())}")
    user = os.getenv("MQTT_USER")
    pwd = os.getenv("MQTT_PASS")
    if user:
        c.username_pw_set(user, pwd or None)
    c.connect(host, port, keepalive=keepalive)
    c.loop_start()
    return c


def main() -> None:
    p = argparse.ArgumentParser(description="Publish motion heartbeats")
    p.add_argument("--room", type=str, default="living", help="Room name")
    p.add_argument(
        "--period", type=float, default=5.0, help="Seconds between heartbeats"
    )
    p.add_argument(
        "--count", type=int, default=5, help="How many heartbeats to send (0=infinite)"
    )
    args = p.parse_args()

    c = get_client()
    topic = f"sensor/motion/{args.room}"

    try:
        i = 0
        while args.count == 0 or i < args.count:
            payload = json.dumps({"ts": int(time.time()), "state": "active"})
            c.publish(topic, payload, qos=0, retain=False)
            print(f"[mock_motion] published {topic} {payload}")
            i += 1
            time.sleep(args.period)
    finally:
        c.loop_stop()
        c.disconnect()


if __name__ == "__main__":
    main()
