import argparse
import json
import os
import time

import paho.mqtt.client as mqtt


def main() -> None:
    p = argparse.ArgumentParser(description="Publish hazard events")
    p.add_argument("--type", choices=["gas", "smoke", "water"], required=True)
    p.add_argument("--level", type=int, default=80)
    p.add_argument("--source", type=str, default="demo")
    p.add_argument("--count", type=int, default=1)
    p.add_argument("--interval", type=float, default=1.0)
    args = p.parse_args()

    host = os.getenv("MQTT_HOST", "127.0.0.1")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))

    c = mqtt.Client(
        client_id=f"pub-hazard-{int(time.time())}",
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )
    user = os.getenv("MQTT_USER")
    pwd = os.getenv("MQTT_PASS")
    if user:
        c.username_pw_set(user, pwd or None)
    c.connect(host, port, keepalive=keepalive)

    topic = f"hazard/{args.type}"
    for i in range(max(1, args.count)):
        payload = {"ts": int(time.time()), "level": int(args.level), "source": args.source}
        c.publish(topic, json.dumps(payload))
        print(f"[publish_hazard] {topic} {payload}")
        if i < args.count - 1:
            time.sleep(args.interval)

    c.disconnect()


if __name__ == "__main__":
    main()
