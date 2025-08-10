# English comments only
from __future__ import annotations

import time
from typing import Optional

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from ..core.redis import get_redis
from ..notify.telegram import notify

router = APIRouter(prefix="/emergency", tags=["emergency"])


class EmergencyIn(BaseModel):
    """Request payload to trigger emergency."""

    message: Optional[str] = Field(default=None, description="Optional message")


class EmergencyResult(BaseModel):
    ok: bool
    ts: int


@router.post(
    "/trigger",
    response_model=EmergencyResult,
    status_code=status.HTTP_200_OK,
    summary="Trigger an emergency escalation",
)
def trigger_emergency(payload: EmergencyIn | None = None) -> EmergencyResult:
    """Store an emergency event and send high-priority notification."""
    ts = int(time.time())
    msg = (payload.message if payload else "") or ""
    get_redis().xadd(
        "safety_events",
        {
            "ts": ts,
            "kind": "emergency",
            "action": "trigger",
            "source": "api",
            "message": msg,
        },
    )
    notify(
        f"Emergency triggered: {msg}" if msg else "Emergency triggered", priority="high"
    )
    return EmergencyResult(ok=True, ts=ts)
