# English comments only
import base64
import json
import os
from fastapi.testclient import TestClient

import app.main as main
import app.api.vitals as vitals
import app.subscriber as sub


class _FakeRedis:
    def __init__(self) -> None:
        self.records = []

    def xadd(self, stream: str, fields: dict) -> None:
        self.records.append((stream, fields))


def test_vitals_encrypted_and_alert(monkeypatch):
    # Provide a valid 32-byte key
    os.environ["HM_AES_KEY"] = base64.b64encode(b"a" * 32).decode()

    fake = _FakeRedis()
    monkeypatch.setenv("START_SUBSCRIBER", "false")  # avoid starting subscriber
    monkeypatch.setattr(vitals, "process_vitals", sub.process_vitals)
    monkeypatch.setattr(sub, "get_redis", lambda: fake)
    monkeypatch.setattr(sub, "notify", lambda *a, **k: None)

    client = TestClient(main.create_app(enable_subscriber=False))
    r = client.post("/vitals", json={"metric": "hr", "value": 130, "unit": "bpm"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["critical"] is True

    # Verify encrypted envelope stored into vitals stream
    assert any(s == "vitals" for s, _ in fake.records)
    stream, fields = next((s, f) for s, f in fake.records if s == "vitals")
    blob = json.loads(fields["blob"])
    assert blob.get("enc") == "aesgcm"
