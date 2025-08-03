"""
Fall detection CLI for live camera streams

Usage
-----
python -m server.home_safety_svc.cli.stream_detect \
    --broker  localhost \
    --topic   fall/detected

"""

import argparse
import json
import time
from collections import deque
from typing import Deque
import cv2
import mediapipe as mp
import numpy as np
import paho.mqtt.client as mqtt
from tqdm import tqdm
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))
from app.fall_detection import detect_fall_angles  # noqa: E402

# ------------------------- MediaPipe initialize -------------------------
mp_pose = mp.solutions.pose
POSE_LANDMARK_KNEE_LEFT = mp_pose.PoseLandmark.LEFT_KNEE.value
POSE_LANDMARK_HIP_LEFT = mp_pose.PoseLandmark.LEFT_HIP.value
POSE_LANDMARK_ANKLE_LEFT = mp_pose.PoseLandmark.LEFT_ANKLE.value


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
    cos_ang = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return np.degrees(np.arccos(np.clip(cos_ang, -1.0, 1.0)))


def mqtt_publish(client: mqtt.Client, topic: str, payload: dict) -> None:
    """Publish JSON payload."""
    client.publish(topic, json.dumps(payload), qos=1, retain=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--broker", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--topic", default="fall/detected")
    parser.add_argument(
        "--source",
        default="tests/resources/user_fall_00.mp4",
        help="camera num (0/1/…) or MP4 path",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=8,
        help="Slide the window length to align with detect_fall_angles",
    )
    args = parser.parse_args()

    # ------------------------- MQTT -------------------------
    client = mqtt.Client(client_id=f"fall-detector-{int(time.time())}")
    client.connect(args.broker, args.port, keepalive=60)
    rc = client.connect(args.broker, args.port, keepalive=60)
    ("connect rc =", rc)  # 0 == successful connection
    client.loop_start()

    # ------------------------- camera -------------------------
    src = int(args.source) if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        raise RuntimeError("can not open camera.")

    angle_buf: Deque[float] = deque(maxlen=args.window)
    last_event_ts = 0.0

    with mp_pose.Pose(static_image_mode=False) as pose:
        pbar = tqdm(total=0, position=0, bar_format="{desc}")
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # convert to RGB
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = pose.process(rgb)

                if result.pose_landmarks:
                    ang = knee_angle(result.pose_landmarks.landmark)
                    angle_buf.append(ang)

                    # Detect only when the sliding window is full
                    if len(angle_buf) == angle_buf.maxlen:
                        fallen = detect_fall_angles(list(angle_buf))

                        if fallen and time.time() - last_event_ts > 10:
                            # 10 seconds to suppress repeated alarms
                            payload = {
                                "ts": int(time.time()),
                                "angles": list(angle_buf),
                                "method": "cv-knee-angle",
                            }
                            mqtt_publish(client, args.topic, payload)
                            pbar.set_description_str(
                                f"⚠️  Fall detected! 发布到 {args.topic}"
                            )
                            last_event_ts = time.time()

                # Press q to quit
        #                if cv2.waitKey(1) & 0xFF == ord("q"):
        #                    break
        finally:
            cap.release()
            client.loop_stop()


if __name__ == "__main__":
    main()
