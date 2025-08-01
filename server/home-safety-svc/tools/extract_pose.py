#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
batch extraction MediaPipe Pose → jsonl / csv
Usage:
  python tools/extract_pose.py \
      --video-dir server/home-safety-svc/tests/resources \
      --out-json-dir dataset/pose_json \
      --out-csv-dir dataset/angle_csv
"""
import cv2
import json
import math
from pathlib import Path
from tqdm import tqdm
import mediapipe as mp

mp_pose = mp.solutions.pose


def calc_angle(a, b, c):
    """return ∠ABC (°) given three (x, y) points"""
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    cosθ = (ba[0] * bc[0] + ba[1] * bc[1]) / (math.hypot(*ba) * math.hypot(*bc) + 1e-6)
    return math.degrees(math.acos(max(-1.0, min(1.0, cosθ))))


def process_video(path: Path, json_dir: Path, csv_dir: Path):
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        print(f"⚠️  Cannot open {path}")
        return
    json_path = json_dir / f"{path.stem}.jsonl"
    csv_path = csv_dir / f"{path.stem}.csv"
    with mp_pose.Pose(model_complexity=1) as pose, open(json_path, "w") as jf, open(
        csv_path, "w"
    ) as cf:
        cf.write("frame,left_knee_angle,left_elbow_angle,right_elbow_angle\n")
        f_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            res = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if res.pose_landmarks:
                lm = res.pose_landmarks.landmark
                jf.write(
                    json.dumps(
                        [{"x": L.x, "y": L.y, "z": L.z, "v": L.visibility} for L in lm]
                    )
                    + "\n"
                )
                # left knee angle
                lhip = (
                    lm[mp_pose.PoseLandmark.LEFT_HIP].x,
                    lm[mp_pose.PoseLandmark.LEFT_HIP].y,
                )
                lknee = (
                    lm[mp_pose.PoseLandmark.LEFT_KNEE].x,
                    lm[mp_pose.PoseLandmark.LEFT_KNEE].y,
                )
                lankle = (
                    lm[mp_pose.PoseLandmark.LEFT_ANKLE].x,
                    lm[mp_pose.PoseLandmark.LEFT_ANKLE].y,
                )
                l_knee_ang = calc_angle(lhip, lknee, lankle)
                # Left and right elbow angles
                lsho = (
                    lm[mp_pose.PoseLandmark.LEFT_SHOULDER].x,
                    lm[mp_pose.PoseLandmark.LEFT_SHOULDER].y,
                )
                lelbow = (
                    lm[mp_pose.PoseLandmark.LEFT_ELBOW].x,
                    lm[mp_pose.PoseLandmark.LEFT_ELBOW].y,
                )
                lwrist = (
                    lm[mp_pose.PoseLandmark.LEFT_WRIST].x,
                    lm[mp_pose.PoseLandmark.LEFT_WRIST].y,
                )
                relbow = (
                    lm[mp_pose.PoseLandmark.RIGHT_ELBOW].x,
                    lm[mp_pose.PoseLandmark.RIGHT_ELBOW].y,
                )
                rsho = (
                    lm[mp_pose.PoseLandmark.RIGHT_SHOULDER].x,
                    lm[mp_pose.PoseLandmark.RIGHT_SHOULDER].y,
                )
                rwrist = (
                    lm[mp_pose.PoseLandmark.RIGHT_WRIST].x,
                    lm[mp_pose.PoseLandmark.RIGHT_WRIST].y,
                )
                l_elb_ang = calc_angle(lsho, lelbow, lwrist)
                r_elb_ang = calc_angle(rsho, relbow, rwrist)
                cf.write(f"{f_idx},{l_knee_ang:.1f},{l_elb_ang:.1f},{r_elb_ang:.1f}\n")
            f_idx += 1
    cap.release()


def main():
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--video-dir", required=True)
    p.add_argument("--out-json-dir", required=True)
    p.add_argument("--out-csv-dir", required=True)
    args = p.parse_args()
    vdir = Path(args.video_dir)
    jdir = Path(args.out_json_dir)
    jdir.mkdir(parents=True, exist_ok=True)
    cdir = Path(args.out_csv_dir)
    cdir.mkdir(parents=True, exist_ok=True)
    videos = sorted(vdir.glob("*.mp4"))
    for v in tqdm(videos, desc="Processing"):
        process_video(v, jdir, cdir)


if __name__ == "__main__":
    main()
