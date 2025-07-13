from fastapi.testclient import TestClient
from app.main import create_app

client = TestClient(create_app())


def test_ping():
    assert client.get("/ping").json() == {"msg": "pong"}
