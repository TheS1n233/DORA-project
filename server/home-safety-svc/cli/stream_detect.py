"""
Webcam / video  → /detect-fall
------------------------------------------------------------
default *headless*(terminal print)；add --gui OpenCV window.
q  quit；--video path for testing in no camera environments.
"""

import argparse
import cv2
import requests
import pathlib
import time
import sys

p = argparse.ArgumentParser()
p.add_argument("--url", default="http://localhost:8001/detect-fall")
p.add_argument("--video", help="mp4/avi path（no camera）")
p.add_argument("--gui", action="store_true", help="Displays the OpenCV window")
args = p.parse_args()

cap = cv2.VideoCapture(0 if args.video is None else str(pathlib.Path(args.video)))
if not cap.isOpened():
    sys.exit("❌ Unable to open camera/video")

while True:
    ok, frame = cap.read()
    if not ok:
        break

    _, buf = cv2.imencode(".jpg", frame)
    try:
        r = requests.post(
            args.url,
            files={"img": ("f.jpg", buf.tobytes(), "image/jpeg")},
            timeout=1.0,
        )
        fall = r.json().get("fall", False)
    except Exception:
        fall = None

    label, color = (
        ("FALL", (0, 0, 255))
        if fall
        else ("OK", (0, 255, 0)) if fall is False else ("ERR", (0, 255, 255))
    )

    if args.gui:
        cv2.putText(frame, label, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.3, color, 2)
        cv2.imshow("DORA Fall Detection (q=quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    else:
        print(f"\r{label:<4}", end="")
        time.sleep(0.05)  # limit CPU usage

cap.release()
if args.gui:
    cv2.destroyAllWindows()
print()
