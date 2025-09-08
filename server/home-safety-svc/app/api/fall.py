from __future__ import annotations

import json
import os
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel, Field
from redis import Redis  # sync redis-py

# English comments only: keep heavy deps lazy via inner imports
from ..core.redis import get_redis
from ..core.mqtt import publish_fall
from ..notify.telegram import notify
from ..metrics import inc, mark

router = APIRouter(prefix="/falls", tags=["falls"])

# English comments only: runtime tunables via environment variables (optional)
MAX_ANGLES = int(os.getenv("ANGLES_MAX_LEN", "200"))  # max accepted angles length
FRAME_B64_MAX_MB = float(os.getenv("FRAME_B64_MAX_MB", "5"))  # max base64 size in MB
STREAM_MAXLEN = int(os.getenv("FALLS_STREAM_MAXLEN", "1000"))  # Redis Stream trim len
STREAM_GROUP = os.getenv("FALLS_STREAM_GROUP", "falls_cg")  # consumer group name


class FallAnglesIn(BaseModel):
    """Request payload: knee-angle sequence from camera."""

    angles: List[float] = Field(..., min_items=1, description="Knee-angle list")
    ts: Optional[int] = Field(default_factory=lambda: int(time.time()))
    source: Optional[str] = Field(default=None, description="Optional source id")


class FallFrameIn(BaseModel):
    """Request payload: single frame in base64 (JPEG/PNG)."""

    image_b64: str = Field(..., description="Base64-encoded image (no data URI prefix)")
    ts: Optional[int] = Field(default_factory=lambda: int(time.time()))
    source: Optional[str] = Field(default=None, description="Optional source id")


class FallResult(BaseModel):
    """API response."""

    fall: bool
    ts: int


def _validate_angles(values: List[float]) -> None:
    # English comments only
    # Enforce length and numeric range constraints.
    if len(values) > MAX_ANGLES:
        raise HTTPException(
            status_code=413, detail=f"angles length exceeds limit {MAX_ANGLES}"
        )
    for v in values:
        try:
            fv = float(v)
        except Exception:
            raise HTTPException(status_code=422, detail="angles must be numbers")
        # plausible human knee angle bounds
        if not (0.0 <= fv <= 180.0):
            raise HTTPException(status_code=422, detail="angle out of [0,180]")


def _approx_b64_bytes(b64: str) -> int:
    # English comments only
    # Base64 expands by ~4/3; strip any newlines safely.
    n = len(b64.strip())
    return n * 3 // 4


def _ensure_stream_group(redis: Redis) -> None:
    # English comments only
    # Create consumer group once; ignore if it already exists.
    try:
        redis.xgroup_create(name="falls", groupname=STREAM_GROUP, id="0", mkstream=True)
    except Exception as e:
        msg = str(e)
        if "BUSYGROUP" in msg:
            return
        print(f"[falls] xgroup_create ignored: {e}")


@router.post(
    "",
    response_model=FallResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze knee-angle sequence and push event if fall",
)
def analyse_fall(
    payload: FallAnglesIn, redis: Redis = Depends(get_redis)
) -> FallResult:
    """
    English comments only:
    - Validate payload length/range.
    - Lazy import detection to avoid heavy deps at import time.
    - On fall=True: XADD with MAXLEN, MQTT publish, Telegram notify, in-memory metrics inc/mark.
    - Publishing/notifying failures are non-fatal (no 500).
    """
    _validate_angles(payload.angles)

    try:
        from ..fall_detection import detect_fall_angles  # lazy import
    except Exception as e:
        print(f"[falls] lazy import failed: {e}")
        is_fall = False
    else:
        try:
            is_fall = bool(detect_fall_angles(payload.angles))
        except Exception as e:
            print(f"[falls] detect error: {e}")
            is_fall = False

    if is_fall:
        _ensure_stream_group(redis)
        try:
            redis.xadd(
                "falls",
                {
                    "ts": payload.ts,
                    "angles": json.dumps(payload.angles[:MAX_ANGLES]),
                    "method": "cv-knee-angle",
                    "source": payload.source or "",
                },
                maxlen=STREAM_MAXLEN,
                approximate=True,
            )
        except Exception as e:
            print(f"[falls] redis xadd failed: {e}")
        try:
            publish_fall(True, payload.angles)
        except Exception as e:
            print(f"[falls] mqtt publish failed: {e}")
        try:
            notify("Fall detected", priority="high")
        except Exception as e:
            print(f"[falls] notify failed: {e}")
        # metrics
        inc("falls_detected", 1)
        inc("angles_detected", 1)
        mark("last_fall_ts", payload.ts)

    return FallResult(fall=is_fall, ts=payload.ts)


@router.post(
    "/frame",
    response_model=FallResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze a single frame (base64) and push event if fall",
)
def analyse_fall_frame(
    payload: FallFrameIn, redis: Redis = Depends(get_redis)
) -> FallResult:
    """
    English comments only:
    - Enforce base64 size limit before decoding.
    - Lazy import detect_fall_frame; if missing heavy deps, return 501.
    - On fall=True: XADD, MQTT publish, Telegram notify, in-memory metrics inc/mark.
    """
    limit_bytes = int(FRAME_B64_MAX_MB * 1024 * 1024)
    if _approx_b64_bytes(payload.image_b64) > limit_bytes:
        raise HTTPException(status_code=413, detail="image too large")

    try:
        from ..fall_detection import detect_fall_frame  # lazy import
    except Exception as e:
        print(f"[falls/frame] lazy import failed: {e}")
        raise HTTPException(status_code=501, detail="frame detection unavailable")

    result = None
    try:
        result = detect_fall_frame(payload.image_b64)
    except Exception as e:
        print(f"[falls/frame] detect error: {e}")
        raise HTTPException(status_code=500, detail="frame detection error")

    if result is None:
        raise HTTPException(status_code=501, detail="cv/mediapipe not available")

    is_fall = bool(result)
    if is_fall:
        _ensure_stream_group(redis)
        try:
            redis.xadd(
                "falls",
                {
                    "ts": payload.ts,
                    "angles": "[]",
                    "method": "cv-frame-pose",
                    "source": payload.source or "",
                },
                maxlen=STREAM_MAXLEN,
                approximate=True,
            )
        except Exception as e:
            print(f"[falls/frame] redis xadd failed: {e}")
        try:
            publish_fall(True, [], method="cv-frame-pose")

        except Exception as e:
            print(f"[falls/frame] mqtt publish failed: {e}")
        try:
            notify("Fall detected (frame)", priority="high")
        except Exception as e:
            print(f"[falls/frame] notify failed: {e}")
        # metrics
        inc("falls_detected", 1)
        inc("frame_detected", 1)
        mark("last_fall_ts", payload.ts)

    return FallResult(fall=is_fall, ts=payload.ts)
