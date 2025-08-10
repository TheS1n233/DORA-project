from fastapi.testclient import TestClient

import app.main as main
import app.api.emergency as emergency


class _FakeRedis:
    def __init__(self) -> None:
        self.records = []

    def xadd(self, stream: str, fields: dict) -> None:
        self.records.append((stream, fields))


def test_emergency_trigger(monkeypatch):
    # Patch get_redis and notify to avoid side effects
    fake = _FakeRedis()
    monkeypatch.setattr(emergency, "get_redis", lambda: fake)
    monkeypatch.setattr(emergency, "notify", lambda *a, **k: None)

    client = TestClient(main.create_app())
    r = client.post("/emergency/trigger", json={"message": "unit-test"})
    assert r.status_code == 200, r.text

    assert fake.records, "no xadd recorded"
    stream, fields = fake.records[-1]
    assert stream == "safety_events"
    assert fields.get("kind") == "emergency"
    assert fields.get("action") == "trigger"
    assert fields.get("source") == "api"
    assert fields.get("message") == "unit-test"
