from __future__ import annotations

import time
from typing import Optional

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from ..subscriber import process_vitals

router = APIRouter(prefix="", tags=["vitals"])


class VitalsIn(BaseModel):
    metric: str = Field(description="Metric name, e.g. hr/spo2/glucose")
    value: float = Field(description="Numeric value of the metric")
    unit: Optional[str] = Field(
        default=None, description="Optional unit, e.g. bpm/%/mgdl"
    )
    ts: Optional[int] = Field(default=None, description="Unix seconds; default now")
    source: Optional[str] = Field(default="api", description="Source tag")


class VitalsResult(BaseModel):
    ok: bool
    ts: int
    critical: bool


@router.post(
    "/vitals",
    response_model=VitalsResult,
    status_code=status.HTTP_200_OK,
    summary="Ingest a vitals record via REST",
)
def post_vitals(payload: VitalsIn) -> VitalsResult:
    now = int(time.time())
    data = {
        "metric": payload.metric,
        "value": payload.value,
        "unit": payload.unit,
        "ts": payload.ts or now,
        "source": payload.source or "api",
    }
    res = process_vitals(data)
    return VitalsResult(ok=res["ok"], ts=res["ts"], critical=res["critical"])
