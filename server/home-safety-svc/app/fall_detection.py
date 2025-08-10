"""
Fall detection utilities.

This module avoids importing heavy CV libraries (opencv/mediapipe) at import time.
Angle-series based detection works without those dependencies.
"""

from __future__ import annotations


def _load_cv_stack():
    """Lazy import cv2 and mediapipe; return (cv2, mp) or (None, None) if not available."""
    try:
        import cv2  # type: ignore
        import mediapipe as mp  # type: ignore

        return cv2, mp
    except Exception:
        return None, None


def detect_fall_frame(frame_bgr) -> bool:
    """
    Optional path: detect fall directly from a BGR frame using MediaPipe Pose.
    Raises a RuntimeError if cv2/mediapipe is not installed.
    """
    cv2, mp = _load_cv_stack()
    if not cv2 or not mp:
        raise RuntimeError(
            "OpenCV/MediaPipe not installed; use detect_fall_angles() instead."
        )

    # Minimal placeholder: users of frame-based detection should implement full logic when needed.
    # For now, we return False to avoid false positives in demo environments without a full CV pipeline.
    return False


# Return True if series indicates a fall by knee-angle rule.
def detect_fall_angles(
    angle_series, knee_thresh: float = 105.0, window: int = 8, delta: float = 20.0
) -> bool:
    """
    English comments only:
    - Keep a sliding window of size `window`;
    - If all values in the window are below `knee_thresh` and peak-to-peak >= `delta`, consider as fall.
    """
    from collections import deque

    win = deque(maxlen=window)
    for ang in angle_series:
        win.append(ang)
        if len(win) == window:
            if all(a < knee_thresh for a in win) and (max(win) - min(win) >= delta):
                return True
    return False
