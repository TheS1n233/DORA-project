# English comments only
import json
from fastapi.testclient import TestClient

import app.main as main
import app.api.emergency as emergency


class _FakeRedis:
    def __init__(self):
        self.records = []

    def xadd(self, stream, fields):
        # record stream name and fields
        self.records.append((stream, dict(fields)))


def test_emergency_writes_both_streams(monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setattr(emergency, "get_redis", lambda: fake)
    # ensure default stream names
    monkeypatch.setenv("SAFETY_STREAM", "safety_events")
    monkeypatch.setenv("EVENTS_STREAM", "events")
    # avoid real notify
    monkeypatch.setattr(emergency, "notify", lambda *a, **k: None)

    # NOTE: home-safety-svc create_app() does not accept kwargs; use no-arg form.
    client = TestClient(main.create_app())

    r = client.post("/emergency/trigger", json={"message": "unit-test"})
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True
    assert isinstance(body.get("ts"), int)

    # must have 2 xadd calls
    assert len(fake.records) == 2

    # legacy safety_events
    s1, f1 = fake.records[0]
    assert s1 == "safety_events"
    assert f1.get("kind") == "emergency"
    assert f1.get("action") == "trigger"
    assert f1.get("message") == "unit-test"
    assert isinstance(f1.get("ts"), int)

    # unified events
    s2, f2 = fake.records[1]
    assert s2 == "events"
    assert "json" in f2 and "kind" in f2 and "ts" in f2
    d = json.loads(f2["json"])
    assert d.get("kind") == "emergency"
    assert d.get("source") == "home-safety-svc"
    assert d.get("data", {}).get("action") == "trigger"
    assert d.get("data", {}).get("message") == "unit-test"
