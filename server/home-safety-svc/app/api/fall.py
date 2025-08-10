from __future__ import annotations

import json
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from redis import Redis  # sync redis-py

from ..fall_detection import detect_fall_angles
from ..core.redis import get_redis  # sync client
from ..core.mqtt import publish_fall  # MQTT publisher
from ..notify.telegram import notify  # Telegram notifier

router = APIRouter(prefix="/falls", tags=["falls"])


class FallAnglesIn(BaseModel):
    """Request payload: knee-angle sequence from camera."""

    angles: List[float] = Field(..., min_items=1, description="Knee-angle list")
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
def analyse_fall(
    payload: FallAnglesIn, redis: Redis = Depends(get_redis)
) -> FallResult:
    """Run detection and publish to Redis Stream & MQTT when fall=True."""
    is_fall = detect_fall_angles(payload.angles)
    if is_fall:
        # Push to Redis Stream for downstream consumers
        redis.xadd(
            "falls",
            {
                "ts": payload.ts,
                "angles": json.dumps(payload.angles),
                "method": "cv-knee-angle",
            },
        )
        # Publish MQTT event for Home Assistant or other consumers
        publish_fall(True, payload.angles)
        # Send high-priority notification
        notify("Fall detected", priority="high")
    return FallResult(fall=is_fall, ts=payload.ts)
