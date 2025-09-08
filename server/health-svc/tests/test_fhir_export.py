# English comments only
import json
import time
from typing import List, Tuple, Dict, Any

from fastapi.testclient import TestClient

import app.main as main
import app.api.export as api_export


class _FakeRedis:
    def __init__(self, items: List[Tuple[str, Dict[str, str]]]) -> None:
        self._items = items

    def xrevrange(self, stream: str, start: str, end: str, count: int = 200):
        return list(self._items)[:count]

    def get(self, key: str):
        return None


def test_export_fhir_bundle(monkeypatch):
    now = int(time.time())
    # Two vitals (hr/spo2) envelopes; decrypted payloads provided via monkeypatch
    items = [
        (
            "1-0",
            {
                "ts": str(now - 10),
                "blob": json.dumps(
                    {
                        "enc": "none",
                        "json": json.dumps(
                            {"metric": "hr", "value": 130, "unit": "bpm"}
                        ),
                    }
                ),
            },
        ),
        (
            "2-0",
            {
                "ts": str(now - 5),
                "blob": json.dumps(
                    {
                        "enc": "none",
                        "json": json.dumps(
                            {"metric": "spo2", "value": 88, "unit": "%"}
                        ),
                    }
                ),
            },
        ),
    ]
    fake = _FakeRedis(items)
    monkeypatch.setattr(api_export, "get_redis", lambda: fake)

    client = TestClient(
        main.create_app(enable_subscriber=False, enable_scheduler=False)
    )
    r = client.get("/export/fhir", params={"since": now - 3600, "limit": 10})
    assert r.status_code == 200
    body = r.json()
    assert body["resourceType"] == "Bundle"
    assert body["type"] == "collection"
    assert body["total"] == 2
    assert len(body["entry"]) == 2
    obs = body["entry"][0]["resource"]
    assert obs["resourceType"] == "Observation"
    assert "effectiveDateTime" in obs
    assert "valueQuantity" in obs and "value" in obs["valueQuantity"]


def test_export_metric_filter(monkeypatch):
    now = int(time.time())
    items = [
        (
            "1-0",
            {
                "ts": str(now - 10),
                "blob": json.dumps(
                    {
                        "enc": "none",
                        "json": json.dumps(
                            {"metric": "hr", "value": 90, "unit": "bpm"}
                        ),
                    }
                ),
            },
        ),
        (
            "2-0",
            {
                "ts": str(now - 5),
                "blob": json.dumps(
                    {
                        "enc": "none",
                        "json": json.dumps(
                            {"metric": "spo2", "value": 96, "unit": "%"}
                        ),
                    }
                ),
            },
        ),
        (
            "3-0",
            {
                "ts": str(now - 3),
                "blob": json.dumps(
                    {
                        "enc": "none",
                        "json": json.dumps(
                            {"metric": "glucose", "value": 150, "unit": "mgdl"}
                        ),
                    }
                ),
            },
        ),
    ]
    fake = _FakeRedis(items)
    monkeypatch.setattr(api_export, "get_redis", lambda: fake)

    client = TestClient(
        main.create_app(enable_subscriber=False, enable_scheduler=False)
    )
    r = client.get(
        "/export/fhir", params={"since": now - 3600, "limit": 10, "metric": "hr,spo2"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    codes = [e["resource"]["code"]["text"] for e in body["entry"]]
    assert set(codes) == {"hr", "spo2"}
