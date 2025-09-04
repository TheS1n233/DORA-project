import argparse
import json
import os
import time

import paho.mqtt.client as mqtt


def publish(topic: str, message: dict) -> None:
    host = os.getenv("MQTT_HOST", "127.0.0.1")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))
    c = mqtt.Client(
        client_id=f"mock-entry-{int(time.time())}",
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )
    user = os.getenv("MQTT_USER")
    pwd = os.getenv("MQTT_PASS")
    if user:
        c.username_pw_set(user, pwd or None)
    c.connect(host, port, keepalive=keepalive)
    c.publish(topic, json.dumps(message))
    print(f"[mock_entry] {topic} {message}")
    c.disconnect()


def main() -> None:
    p = argparse.ArgumentParser(description="Publish entry/doorbell events")
    sub = p.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("door", help="Publish door state")
    d.add_argument("--id", default="front")
    d.add_argument("--state", choices=["open", "closed"], default="open")

    w = sub.add_parser("window", help="Publish window state")
    w.add_argument("--id", default="bedroom")
    w.add_argument("--state", choices=["open", "closed"], default="open")

    b = sub.add_parser("doorbell", help="Publish doorbell ring")
    b.add_argument("--source", default="front")

    args = p.parse_args()
    ts = int(time.time())

    if args.cmd == "door":
        publish(f"sensor/door/{args.id}", {"ts": ts, "state": args.state})
    elif args.cmd == "window":
        publish(f"sensor/window/{args.id}", {"ts": ts, "state": args.state})
    else:
        publish("doorbell/ring", {"ts": ts, "source": args.source})


if __name__ == "__main__":
    main()
