"""
fall-detection
--------------------------------
* readin BGR numpy frame → MediaPipe Pose
* threshold：head Y > hip Y  + margin → as falled
* return bool
"""

from __future__ import annotations

import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)


def detect_fall(frame_bgr: np.ndarray, margin_px: int = 40) -> bool:
    """Return True if fall detected on given BGR frame."""
    if frame_bgr is None:
        return False
    image_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    result = mp_pose.process(image_rgb)
    if not result.pose_landmarks:
        return False

    landmarks = result.pose_landmarks.landmark

    def _y(idx: int) -> float:  # pixel coordinate
        return landmarks[idx].y * frame_bgr.shape[0]

    # 0 nose, 24 left-hip, 23 right-hip
    head_y = _y(0)
    hip_y = (_y(23) + _y(24)) / 2
    return head_y > hip_y + margin_px
