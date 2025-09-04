"""
fall-detection
--------------------------------
* 角度序列：窗口内膝关节角度低于阈值并伴随足够变化 → 判定跌倒
* 单帧：懒加载 MediaPipe Pose，计算膝关节角度 → 判定
"""

from __future__ import annotations


# English comments only
# Keep this function pure-Python, no heavy imports at module import time.
def detect_fall_angles(
    angle_series, knee_thresh: float = 105.0, window: int = 8, delta: float = 20.0
) -> bool:
    """
    Return True if series indicates a fall by knee-angle rule.
    - knee_thresh: threshold in degrees (angles below indicate strong flexion)
    - window: consecutive samples window length
    - delta: min swing (max-min) within the window
    """
    from collections import deque

    win = deque(maxlen=window)
    for ang in angle_series:
        win.append(ang)
        if len(win) == window:
            if all(a < knee_thresh for a in win) and (max(win) - min(win) >= delta):
                return True
    return False


# English comments only
# Lazy, optional dependency path for single-frame detection.
def detect_fall_frame(image_b64: str):
    """
    Return:
      - True/False: detection result
      - None: required libs (cv2/mediapipe) missing or not available

    Steps:
      - import cv2, numpy, mediapipe lazily
      - decode base64 -> BGR image
      - run MediaPipe Pose on static image
      - compute knee angle (hip-knee-ankle); if angle < 110 deg -> fall=True
    """
    try:
        import base64
        import numpy as np
        import cv2  # type: ignore
    except Exception:
        return None

    try:
        data = base64.b64decode(image_b64, validate=True)
    except Exception:
        return False

    np_arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return False

    try:
        import mediapipe as mp  # type: ignore
    except Exception:
        return None

    # Convert to RGB for MediaPipe
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_pose = mp.solutions.pose

    def _angle(a, b, c):
        # a,b,c are (x,y); compute angle ABC in degrees
        import math
        ang = math.degrees(
            math.atan2(c[1]-b[1], c[0]-b[0]) - math.atan2(a[1]-b[1], a[0]-b[0])
        )
        ang = abs(ang)
        if ang > 180:
            ang = 360 - ang
        return ang

    # static image mode for single frame
    with mp_pose.Pose(static_image_mode=True, model_complexity=1, enable_segmentation=False) as pose:
        res = pose.process(rgb)
        if not res.pose_landmarks:
            return False
        lm = res.pose_landmarks.landmark

        # Right: hip(24), knee(26), ankle(28); Left: hip(23), knee(25), ankle(27)
        def _pt(i):
            return (lm[i].x, lm[i].y, lm[i].visibility)

        r = (_pt(24), _pt(26), _pt(28))
        l = (_pt(23), _pt(25), _pt(27))

        def _pick(a, b):
            return a if (a[0][2]+a[1][2]+a[2][2]) >= (b[0][2]+b[1][2]+b[2][2]) else b

        hip, knee, ankle = _pick(r, l)
        knee_deg = _angle((hip[0], hip[1]), (knee[0], knee[1]), (ankle[0], ankle[1]))
        return knee_deg < 110.0
