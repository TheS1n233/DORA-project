# English comments only
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Query
from ..core.redis import get_redis

# Best-effort import for decrypt helper. The crypto module in this project
# exposes an envelope with {"enc":"aesgcm","iv","ct"} or {"enc":"none","json"}.
# Its decrypt function returns a dict or None on failure.
try:
    from ..core.crypto import decrypt_envelope  # type: ignore
except Exception:  # pragma: no cover
    decrypt_envelope = None  # type: ignore

router = APIRouter()


def _parse_duration_to_seconds(s: Optional[str]) -> Optional[int]:
    """Parse '24h', '15m', '30s', or integer seconds to seconds."""
    if not s:
        return None
    s = s.strip().lower()
    if s.endswith("h"):
        return int(float(s[:-1]) * 3600)
    if s.endswith("m"):
        return int(float(s[:-1]) * 60)
    if s.endswith("s"):
        return int(float(s[:-1]))
    # fallback: integer seconds
    try:
        return int(float(s))
    except Exception:
        return None


def _iso8601(ts: int) -> str:
    """Convert unix seconds to ISO8601 string."""
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def _decrypt_blob(blob_raw: str) -> Optional[Dict]:
    """Decrypt/deserialize the blob envelope to a dict payload."""
    try:
        env = json.loads(blob_raw)
    except Exception:
        return None

    enc = env.get("enc")
    # Plain JSON envelope: {"enc":"none","json":"{...}"}
    if enc == "none":
        try:
            return json.loads(env.get("json", "{}"))
        except Exception:
            return None

    # AES-GCM envelope: delegate to crypto helper if available
    if enc == "aesgcm" and decrypt_envelope:
        try:
            data = decrypt_envelope(env)  # returns dict or None
            if isinstance(data, dict):
                return data
        except Exception:
            return None

    return None


def _entry_ts(entry_id: str) -> Optional[int]:
    """Extract seconds from Redis Stream ID 'ms-seq'."""
    # ID format: "<milliseconds>-<seq>"
    try:
        ms = int(str(entry_id).split("-")[0])
        return int(ms // 1000)
    except Exception:
        return None


def _coerce_int(v, default: Optional[int] = None) -> Optional[int]:
    try:
        return int(v)
    except Exception:
        return default


def _map_metric_to_loinc(metric: str) -> Tuple[str, str]:
    """Minimal mapping for demo. Extend as needed."""
    m = metric.lower()
    if m in ("hr", "heart_rate", "heart-rate", "bpm"):
        return ("8867-4", "Heart rate")
    if m in ("spo2", "sao2", "oxygen", "o2"):
        return ("59408-5", "Oxygen saturation in Arterial blood by Pulse oximetry")
    if m in ("temp", "temperature", "body_temp"):
        return ("8310-5", "Body temperature")
    return ("00000-0", metric)


@router.get("/export/fhir")
def export_fhir(
    metric: Optional[str] = Query(
        default=None,
        description="Comma separated metrics to include (e.g., 'hr,spo2').",
    ),
    since: Optional[str] = Query(
        default="24h",
        description="Time window. Accepts '24h','1h','15m','30s' or integer seconds.",
    ),
    limit: int = Query(
        default=200,
        ge=1,
        le=2000,
        description="Max number of recent entries to scan from the stream.",
    ),
):
    """
    Export vitals as a minimal FHIR Bundle.
    The service reads the Redis Stream of vitals, decrypts payloads, filters, and returns Observations.
    """
    # Resolve stream name
    stream_name = os.getenv("VITALS_STREAM", "vitals")

    # Parse filters
    wanted: Optional[set] = None
    if metric:
        wanted = {m.strip().lower() for m in metric.split(",") if m.strip()}

    seconds = _parse_duration_to_seconds(since) or 24 * 3600
    now = int(time.time())
    since_ts = now - seconds

    r = get_redis()
    # Read newest first then reverse to chronological order
    items: List[Tuple[str, Dict[str, str]]] = r.xrevrange(stream_name, '+', '-', count=limit) or []
    items.reverse()

    entries = []
    for entry_id, fields in items:
        # Decrypt payload if possible
        payload: Optional[Dict] = None
        blob_raw = fields.get("blob")
        if blob_raw:
            payload = _decrypt_blob(blob_raw)

        # Compute event timestamp with robust fallback chain:
        # 1) payload.ts (if present)
        # 2) fields.ts (if present)
        # 3) stream id milliseconds
        # 4) current time
        ts = (
            _coerce_int((payload or {}).get("ts"))  # type: ignore
            or _coerce_int(fields.get("ts"))
            or _entry_ts(entry_id)
            or now
        )

        # Skip if outside time window
        if ts < since_ts:
            continue

        if not payload:
            # Without payload we cannot construct Observation reliably
            continue

        met = str(payload.get("metric", "")).lower()
        if wanted and met and met not in wanted:
            continue

        value = payload.get("value")
        unit = payload.get("unit") or ""
        if value is None:
            # Nothing to export
            continue

        loinc, display = _map_metric_to_loinc(met or "unknown")

        # Important: tests expect code.text to be the raw metric key (e.g., 'hr', 'spo2')
        obs = {
            "resourceType": "Observation",
            "status": "final",
            "code": {
                "coding": [
                    {"system": "http://loinc.org", "code": loinc, "display": display}
                ],
                "text": met,  # <<<<<< must be the raw metric key to satisfy tests
            },
            "effectiveDateTime": _iso8601(ts),
            "valueQuantity": {"value": value, "unit": unit},
        }
        entries.append({"resource": obs})

    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "total": len(entries),
        "entry": entries,
        "meta": {
            "generated": _iso8601(int(time.time())),
            "stream": stream_name,
            "since": since,
            "limit": limit,
            "filtered": bool(wanted),
        },
    }
    return bundle
