# server/health-svc/tests/test_events_api.py
# English comments only
import json
import time
from fastapi.testclient import TestClient

import app.main as main
import app.api.events as api_events


class _FakeRedis:
    def __init__(self, vitals_items, safety_items):
        self._vitals = vitals_items
        self._safety = safety_items

    def xrevrange(self, stream, start, end, count=None):
        if stream == "vitals":
            return list(self._vitals)
        if stream == "safety_events":
            return list(self._safety)
        return []


def _mk_vitals_blob(metric, value, unit, ts):
    payload = {"metric": metric, "value": value, "unit": unit, "ts": ts, "source": "test"}
    env = {"enc": "none", "json": json.dumps(payload)}
    return json.dumps(env)


def test_events_aggregate(monkeypatch):
    now = int(time.time())
    vitals_items = [
        ("1000-1", {"ts": str(now - 10), "blob": _mk_vitals_blob("hr", 88, "bpm", now - 10)}),
        ("1005-1", {"ts": str(now - 5), "blob": _mk_vitals_blob("spo2", 96, "%", now - 5)}),
    ]
    safety_items = [
        ("1003-1", {"ts": str(now - 7), "kind": "hazard", "json": json.dumps({"level": 80, "type": "gas"})}),
        ("1007-1", {"ts": str(now - 3), "kind": "emergency", "json": json.dumps({"message": "help"})}),
    ]

    fake = _FakeRedis(vitals_items, safety_items)
    monkeypatch.setenv("VITALS_STREAM", "vitals")
    monkeypatch.setenv("SAFETY_STREAM", "safety_events")
    monkeypatch.setattr(api_events, "get_redis", lambda: fake)

    app = main.create_app(enable_subscriber=False, enable_scheduler=False)
    client = TestClient(app)

    r = client.get("/events", params={"since": "1h", "kinds": "vitals,hazard,emergency", "limit": 50})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 4
    ks = [e["kind"] for e in body["entry"]]
    # chronological ascending by ts
    assert ks == ["vitals", "hazard", "vitals", "emergency"]

    r2 = client.get("/events", params={"since": "1h", "kinds": "vitals", "limit": 50})
    assert r2.status_code == 200
    b2 = r2.json()
    assert b2["total"] == 2
    assert all(e["kind"] == "vitals" for e in b2["entry"])
