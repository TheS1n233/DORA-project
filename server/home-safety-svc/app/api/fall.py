from __future__ import annotations

import json
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from redis import Redis  # redis-py
from ..fall_detection import detect_fall_angles
from ..core.redis import get_redis
from ..core.mqtt import publish_fall

router = APIRouter(prefix="/falls", tags=["falls"])


class FallAnglesIn(BaseModel):
    """Payload schema coming from camera / edge device."""

    angles: List[float] = Field(..., min_items=1, description="Knee-angle sequence")
    ts: Optional[int] = Field(default_factory=lambda: int(time.time()))


class FallResult(BaseModel):
    """API response."""

    fall: bool
    ts: int


@router.post(
    "",
    response_model=FallResult,
    status_code=status.HTTP_200_OK,
    summary="Analyze knee-angle sequence and push event if fall",
)
async def analyse_fall(
    payload: FallAnglesIn,
    redis: Redis = Depends(get_redis),
) -> FallResult:
    """Receive angle list, run detection, push to Redis stream when fall=True."""
    is_fall = detect_fall_angles(payload.angles)
    if is_fall:
        # Push event for downstream consumers (e.g. notification service)
        redis.xadd(
            "falls",
            {
                "ts": payload.ts,
                "angles": json.dumps(payload.angles),
                "method": "cv-knee-angle",
            },
        )
        publish_fall(True, payload.angles)
    return FallResult(fall=is_fall, ts=payload.ts)
