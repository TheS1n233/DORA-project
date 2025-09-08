from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Set

from fastapi import APIRouter, Query
from ..core.redis import get_redis
from ..core.crypto import decrypt_json

router = APIRouter(prefix="/export", tags=["export"])


def _loinc_for(metric: str) -> Tuple[str, str]:
    """Return (code, display) for a given metric using LOINC where possible."""
    m = (metric or "").lower()
    if m in ("hr", "heart_rate", "bpm"):
        return "8867-4", "Heart rate"
    if m in ("spo2", "blood_oxygen", "o2sat"):
        return "59408-5", "Oxygen saturation in Arterial blood by Pulse oximetry"
    if m in ("glucose", "bg", "blood_glucose"):
        return "2339-0", "Glucose [Mass/volume] in Blood"
    return m or "unknown", metric or "Unknown"


def _to_iso_z(ts: int) -> str:
    return (
        datetime.fromtimestamp(ts, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    )


def _norm_metric(m: str) -> str:
    m = (m or "").strip().lower()
    if m in ("bpm", "heart_rate"):
        return "hr"
    if m in ("blood_oxygen", "o2sat"):
        return "spo2"
    if m in ("bg", "blood_glucose"):
        return "glucose"
    return m


def _obs_from_record(
    ts: int, metric: str, value: Optional[float], unit: Optional[str], rid: str
) -> Optional[Dict[str, Any]]:
    if value is None:
        return None
    code, display = _loinc_for(metric)
    return {
        "resourceType": "Observation",
        "id": f"{metric}-{ts}-{rid}",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs",
                    }
                ],
                "text": "Vital Signs",
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": code,
                    "display": display,
                }
            ],
            "text": metric,
        },
        "effectiveDateTime": _to_iso_z(ts),
        "valueQuantity": {
            "value": value,
            "unit": (unit or "").strip() or None,
        },
    }


@router.get("/fhir", summary="Export vitals to FHIR Bundle (JSON)")
def export_fhir(
    since: int = Query(default=0, description="Unix seconds lower bound (inclusive)."),
    limit: int = Query(
        default=200, ge=1, le=5000, description="Max records to export."
    ),
    metric: Optional[str] = Query(
        default=None, description="Comma-separated metric filter, e.g. 'hr,spo2'"
    ),
) -> Dict[str, Any]:
    """
    English comments only:
    - Read recent items from Redis stream VITALS_STREAM (default 'vitals') using XREVRANGE.
    - Decrypt each envelope if possible, derive metric/value/unit.
    - Filter by 'metric' if provided (normalized to hr/spo2/glucose).
    - Map to FHIR Observation; return a Bundle(type=collection).
    """
    r = get_redis()
    stream = "vitals"
    try:
        stream = r.get("VITALS_STREAM") or stream  # harmless attempt; we still default
    except Exception:
        pass
    items = r.xrevrange(stream, "+", "-", count=limit) or []

    # Build metric filter set
    mset: Set[str] = set()
    if metric:
        for part in metric.split(","):
            mm = _norm_metric(part)
            if mm:
                mset.add(mm)

    entries: List[Dict[str, Any]] = []
    exported = 0
    now = int(time.time())

    for rid, fields in items:
        try:
            ts = int(fields.get("ts", now))
            if since and ts < since:
                continue
            blob = json.loads(fields.get("blob", "{}"))
            data = decrypt_json(blob) or {}
            raw_metric = (data.get("metric") or fields.get("metric") or "").lower()
            norm_metric = _norm_metric(raw_metric)
            if mset and norm_metric not in mset:
                continue
            unit = (data.get("unit") or "").strip()
            v: Optional[float] = None
            if "value" in data:
                try:
                    v = float(data["value"])
                except Exception:
                    v = None
            obs = _obs_from_record(ts, norm_metric, v, unit, rid)
            if obs:
                entries.append({"resource": obs})
                exported += 1
        except Exception:
            continue

    bundle: Dict[str, Any] = {
        "resourceType": "Bundle",
        "type": "collection",
        "total": exported,
        "entry": list(reversed(entries)),  # chronological order
    }
    return bundle
