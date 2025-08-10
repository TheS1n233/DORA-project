import argparse
import json
import os
import urllib.request
import time

import paho.mqtt.client as mqtt


def via_rest(message: str | None) -> None:
    url = "http://127.0.0.1:8000/emergency/trigger"
    data = json.dumps({"message": message} if message else {}).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        print(resp.read().decode("utf-8"))


def via_mqtt(message: str | None) -> None:
    host = os.getenv("MQTT_HOST", "127.0.0.1")
    port = int(os.getenv("MQTT_PORT", "1883"))
    keepalive = int(os.getenv("MQTT_KEEPALIVE", "60"))
    c = mqtt.Client(client_id=f"trigger-emergency-{int(time.time())}")
    user = os.getenv("MQTT_USER")
    pwd = os.getenv("MQTT_PASS")
    if user:
        c.username_pw_set(user, pwd or None)
    c.connect(host, port, keepalive=keepalive)
    payload = {"ts": int(time.time())}
    if message:
        payload["message"] = message
    c.publish("emergency/trigger", json.dumps(payload))
    c.disconnect()
    print("published to emergency/trigger")


def main() -> None:
    p = argparse.ArgumentParser(description="Trigger emergency via REST or MQTT")
    p.add_argument("--via", choices=["rest", "mqtt"], default="rest")
    p.add_argument("--message", type=str, default=None)
    args = p.parse_args()
    if args.via == "rest":
        via_rest(args.message)
    else:
        via_mqtt(args.message)


if __name__ == "__main__":
    main()
