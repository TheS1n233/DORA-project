# -*- coding: utf-8 -*-
# main.py
# FastAPI microservice for health monitoring ingestion, summary and FHIR export.

import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dateutil import tz

from models import (
    BloodPressurePayload,
    GenericVitalPayload,
    IngestResponse,
    DailySummaryResponse
)
from influx import write_vital, query_table
from rules import classify_bp, publish_alert
from fhir import bp_observation, bundle

APP_TZ = os.getenv("APP_TZ", "Europe/Rome")

app = FastAPI(title="DORA Health Monitoring Service", version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _now():
    return datetime.now(tz=tz.gettz(APP_TZ))

@app.post("/v1/vitals", response_model=IngestResponse)
def ingest_vital(payload: dict):
    # Dynamic dispatch based on metric
    metric = payload.get("metric")
    if metric == "blood_pressure":
        bp = BloodPressurePayload(**payload)
        ts = bp.timestamp or _now()
        tags = {"user_id": bp.user_id, "device_id": bp.device_id, "metric": "blood_pressure"}
        fields = {"systolic": bp.systolic, "diastolic": bp.diastolic}
        if bp.map is not None:
            fields["map"] = bp.map
        if bp.pulse is not None:
            fields["pulse"] = bp.pulse
        fields["unit"] = bp.unit
        write_vital(measurement="vitals", tags=tags, fields=fields, ts=ts)

        classification, reason = classify_bp(bp.systolic, bp.diastolic)
        if classification == "critical":
            publish_alert({
                "type": "bp_critical",
                "user_id": bp.user_id,
                "device_id": bp.device_id,
                "systolic": bp.systolic,
                "diastolic": bp.diastolic,
                "pulse": bp.pulse,
                "timestamp": ts.isoformat()
            })
        return IngestResponse(ok=True, classification=classification, reason=reason)

    else:
        gv = GenericVitalPayload(**payload)
        ts = gv.timestamp or _now()
        tags = {"user_id": gv.user_id, "device_id": gv.device_id, "metric": gv.metric}
        fields = {"value": gv.value}
        if gv.unit:
            fields["unit"] = gv.unit
        write_vital(measurement="vitals", tags=tags, fields=fields, ts=ts)
        return IngestResponse(ok=True)

@app.get("/v1/vitals/summary/daily", response_model=DailySummaryResponse)
def daily_summary(user_id: str, date: Optional[str] = None):
    # date format: YYYY-MM-DD in APP_TZ
    if date:
        day = datetime.fromisoformat(date).date()
    else:
        day = _now().date()

    start = datetime.combine(day, datetime.min.time(), tzinfo=tz.gettz(APP_TZ))
    end = start + timedelta(days=1)

    # Flux queries for BP averages
    flux_bp = f'''
from(bucket: "{os.getenv("INFLUX_BUCKET","vitals")}")
|> range(start: {start.isoformat()}, stop: {end.isoformat()})
|> filter(fn: (r) => r["_measurement"] == "vitals")
|> filter(fn: (r) => r["user_id"] == "{user_id}")
|> filter(fn: (r) => r["metric"] == "blood_pressure")
|> filter(fn: (r) => r["_field"] == "systolic" or r["_field"] == "diastolic" or r["_field"] == "pulse")
|> aggregateWindow(every: 24h, fn: mean, createEmpty: false)
|> yield(name: "daily")
'''
    rows = query_table(flux_bp)
    bp_stats: Dict[str, float] = {}
    count = 0

    # Collect means; since aggregateWindow gives one point per field we can parse directly.
    for r in rows:
        f = r.get("field")
        v = r.get("value")
        if f and v is not None:
            bp_stats[f"{f}_avg"] = float(v)
            count = max(count, 1)

    summary = DailySummaryResponse(
        date=str(day),
        user_id=user_id,
        blood_pressure=({"count": count, **bp_stats} if count > 0 else None),
        notes=None
    )
    return summary

@app.get("/v1/export/fhir/bp")
def export_fhir_bp(user_id: str, date: Optional[str] = None):
    if date:
        day = datetime.fromisoformat(date).date()
    else:
        day = _now().date()
    start = datetime.combine(day, datetime.min.time(), tzinfo=tz.gettz(APP_TZ))
    end = start + timedelta(days=1)

    flux = f'''
from(bucket: "{os.getenv("INFLUX_BUCKET","vitals")}")
|> range(start: {start.isoformat()}, stop: {end.isoformat()})
|> filter(fn: (r) => r["_measurement"] == "vitals")
|> filter(fn: (r) => r["user_id"] == "{user_id}")
|> filter(fn: (r) => r["metric"] == "blood_pressure")
|> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
|> keep(columns: ["_time","device_id","systolic","diastolic","pulse"])
'''
    rows = query_table(flux)
    obs = []
    for r in rows:
        ts = r.get("time")
        device_id = r.get("device_id")
        systolic = r.get("systolic")
        diastolic = r.get("diastolic")
        pulse = r.get("pulse")
        if ts and systolic is not None and diastolic is not None:
            obs.append(bp_observation(
                user_id=user_id,
                device_id=device_id or "unknown",
                ts=ts,
                systolic=float(systolic),
                diastolic=float(diastolic),
                pulse=float(pulse) if pulse is not None else None
            ))
    return bundle(obs)

