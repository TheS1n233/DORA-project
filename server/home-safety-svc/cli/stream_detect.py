"""
Fall detection CLI for live camera streams.

Example:
  python -m server.home_safety_svc.cli.stream_detect \
      --camera 0 \
      --broker localhost \
      --port 1883 \
      --topic fall/detected
"""

import argparse
import os
import time
from collections import deque
from typing import Deque

import cv2
import mediapipe as mp
import numpy as np

from app.fall_detection import detect_fall_angles
from app.core.mqtt import publish_fall

POSE = mp.solutions.pose
POSE_LANDMARK_HIP_LEFT = 23
POSE_LANDMARK_KNEE_LEFT = 25
POSE_LANDMARK_ANKLE_LEFT = 27


def knee_angle(landmarks) -> float:
    """Return left-knee angle in degrees."""
    a = np.array(
        [landmarks[POSE_LANDMARK_HIP_LEFT].x, landmarks[POSE_LANDMARK_HIP_LEFT].y]
    )
    b = np.array(
        [landmarks[POSE_LANDMARK_KNEE_LEFT].x, landmarks[POSE_LANDMARK_KNEE_LEFT].y]
    )
    c = np.array(
        [landmarks[POSE_LANDMARK_ANKLE_LEFT].x, landmarks[POSE_LANDMARK_ANKLE_LEFT].y]
    )
    ba, bc = a - b, c - b
    denom = (np.linalg.norm(ba) * np.linalg.norm(bc)) or 1e-6
    cos_ang = np.dot(ba, bc) / denom
    cos_ang = float(np.clip(cos_ang, -1.0, 1.0))
    return float(np.degrees(np.arccos(cos_ang)))


def run(
    camera: int,
    broker: str | None,
    port: int | None,
    topic: str | None,
    cooldown: float,
) -> None:
    """Capture frames, compute knee angle, detect falls, publish MQTT via core helper."""
    # Optionally override MQTT settings via environment variables
    if broker is not None:
        os.environ["MQTT_HOST"] = broker
    if port is not None:
        os.environ["MQTT_PORT"] = str(port)
    if topic is not None:
        os.environ["MQTT_TOPIC_FALL"] = topic

    cap = cv2.VideoCapture(camera)
    if not cap.isOpened():
        print(f"[camera] cannot open index={camera}")
        return

    angle_buf: Deque[float] = deque(maxlen=16)
    last_event_ts = 0.0

    with POSE.Pose(
        static_image_mode=False, model_complexity=1, enable_segmentation=False
    ) as pose:
        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    print("[camera] frame read failed")
                    break

                image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                res = pose.process(image_rgb)

                if res.pose_landmarks:
                    ang = knee_angle(res.pose_landmarks.landmark)
                    angle_buf.append(ang)

                    if detect_fall_angles(list(angle_buf)):
                        now = time.time()
                        if now - last_event_ts >= cooldown:
                            publish_fall(True, list(angle_buf))
                            print("⚠️  Fall detected! MQTT event published.")
                            last_event_ts = now

                time.sleep(0.01)
        finally:
            cap.release()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Fall detection from live camera and MQTT publish"
    )
    p.add_argument("--camera", type=int, default=0, help="OpenCV camera index")
    p.add_argument(
        "--broker",
        type=str,
        default=None,
        help="Override MQTT host (default: env or localhost)",
    )
    p.add_argument(
        "--port",
        type=int,
        default=None,
        help="Override MQTT port (default: env or 1883)",
    )
    p.add_argument(
        "--topic",
        type=str,
        default=None,
        help="Override MQTT fall topic (default: env or fall/detected)",
    )
    p.add_argument(
        "--cooldown",
        type=float,
        default=10.0,
        help="Seconds to suppress repeated alarms",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    run(args.camera, args.broker, args.port, args.topic, args.cooldown)


if __name__ == "__main__":
    main()
