# server/health-svc/tests/test_stream_schema.py
# English comments only
import json
from fastapi.testclient import TestClient
import app.main as main
import app.api.vitals as vitals
import app.subscriber as sub

class _FakeRedis:
    def __init__(self) -> None:
        self.records = []
    def xadd(self, stream: str, fields: dict) -> None:
        self.records.append((stream, fields))

def test_stream_fields_have_ts_and_blob(monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setenv("START_SUBSCRIBER", "false")
    monkeypatch.setenv("START_SCHEDULER", "false")
    monkeypatch.setattr(vitals, "process_vitals", sub.process_vitals)
    monkeypatch.setattr(sub, "get_redis", lambda: fake)
    monkeypatch.setattr(sub, "notify", lambda *a, **k: None)

    client = TestClient(main.create_app(enable_subscriber=False, enable_scheduler=False))
    r = client.post("/vitals", json={"metric": "spo2", "value": 95, "unit": "%"})
    assert r.status_code == 200
    assert r.json()["ok"] is True

    assert any(s == "vitals" for s, _ in fake.records)
    _, fields = next((s, f) for s, f in fake.records if s == "vitals")
    assert "ts" in fields and isinstance(fields["ts"], int)
    assert "blob" in fields and isinstance(fields["blob"], str)
    blob = json.loads(fields["blob"])
    assert blob.get("enc") in ("none", "aesgcm")
