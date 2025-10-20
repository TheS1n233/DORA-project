# -*- coding: utf-8 -*-
# rules.py
# Threshold-based classification and alert publication.

import os
import json
from typing import Tuple, Literal, Optional
import redis

Classification = Literal["normal", "warning", "critical"]

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
ALERT_CHANNEL = os.getenv("ALERT_CHANNEL", "alerts.health")

# Default thresholds; can be overridden via env
BP_SYS_WARN = float(os.getenv("BP_SYS_WARN", "140"))
BP_DIA_WARN = float(os.getenv("BP_DIA_WARN", "90"))
BP_SYS_CRIT = float(os.getenv("BP_SYS_CRIT", "180"))
BP_DIA_CRIT = float(os.getenv("BP_DIA_CRIT", "110"))

rcli = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def classify_bp(systolic: float, diastolic: float) -> Tuple[Classification, Optional[str]]:
    # Simple rule-based classification; extend with trend analysis later.
    if systolic >= BP_SYS_CRIT or diastolic >= BP_DIA_CRIT:
        return "critical", "BP over critical threshold"
    if systolic >= BP_SYS_WARN or diastolic >= BP_DIA_WARN:
        return "warning", "BP over warning threshold"
    return "normal", None

def publish_alert(event: dict):
    # Publish JSON alert for downstream consumers (notifications, TA escalation, logs).
    payload = json.dumps(event, ensure_ascii=False)
    rcli.publish(ALERT_CHANNEL, payload)

