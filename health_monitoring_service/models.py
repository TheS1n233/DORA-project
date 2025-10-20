# -*- coding: utf-8 -*-
# models.py
# Pydantic models and enums for vitals ingestion and responses.

from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field

MetricType = Literal["blood_pressure", "heart_rate", "spo2", "temperature", "glucose", "ecg", "steps", "sleep", "weight"]

class VitalBase(BaseModel):
    device_id: str = Field(..., description="Physical device identifier (MAC/IMEI/UUID)")
    user_id: str = Field(..., description="Logical user identifier")
    metric: MetricType = Field(..., description="Metric type")
    timestamp: Optional[datetime] = Field(default=None, description="Reading timestamp (ISO 8601); default now")

class BloodPressurePayload(VitalBase):
    metric: Literal["blood_pressure"] = "blood_pressure"
    systolic: float = Field(..., description="Systolic (mmHg)")
    diastolic: float = Field(..., description="Diastolic (mmHg)")
    map: Optional[float] = Field(default=None, description="Mean arterial pressure (mmHg)")
    pulse: Optional[float] = Field(default=None, description="Pulse rate (bpm)")
    unit: Literal["mmHg", "kPa"] = "mmHg"

class GenericVitalPayload(VitalBase):
    value: float = Field(..., description="Numeric value")
    unit: Optional[str] = Field(default=None, description="Unit of measure")

class IngestResponse(BaseModel):
    ok: bool
    classification: Optional[Literal["normal", "warning", "critical"]] = None
    reason: Optional[str] = None

class DailySummaryResponse(BaseModel):
    date: str
    user_id: str
    blood_pressure: Optional[dict] = None  # {"count": int, "systolic_avg": float, "diastolic_avg": float, ...}
    heart_rate: Optional[dict] = None
    spo2: Optional[dict] = None
    steps: Optional[dict] = None
    notes: Optional[str] = None
