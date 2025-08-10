import argparse
import json
import os
import time

import paho.mqtt.client as mqtt


def main() -> None:
    p = argparse.ArgumentParser(description="Publish vitals to MQTT (vitals/ingest)")
    p.add_argument("--metric", required=True, help="e.g. hr/spo2/glucose")
    p.add_argument("--value", type=float, required=True)
    p.add_argument("--unit", default="", help="e.g. bpm/%/mgdl")
    p.add_argument("--count", type=int, default=1)
    p.add_argument("--interval", type=float, default=1.0)
    args = p.parse_args()

    host = os.getenv("MQTT_HOST", "127.0.0.1")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))

    c = mqtt.Client(client_id=f"publish-vitals-{int(time.time())}")
    user = os.getenv("MQTT_USER")
    pwd = os.getenv("MQTT_PASS")
    if user:
        c.username_pw_set(user, pwd or None)
    c.connect(host, port, keepalive=keepalive)

    for i in range(max(1, args.count)):
        payload = {
            "ts": int(time.time()),
            "metric": args.metric,
            "value": float(args.value),
            "unit": args.unit,
            "source": "script",
        }
        c.publish("vitals/ingest", json.dumps(payload))
        print(f"[publish_vitals] vitals/ingest {payload}")
        if i < args.count - 1:
            time.sleep(args.interval)

    c.disconnect()


if __name__ == "__main__":
    main()
