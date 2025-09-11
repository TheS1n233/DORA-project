# English comments only

from importlib import import_module

_events = import_module("libs.dora-common.events")
make_event = _events.make_event

def test_make_event_minimal():
    e = make_event("system", "hm")
    assert e["kind"] == "system"
    assert e["source"] == "hm"
    assert isinstance(e["ts"], int)
    assert "id" in e and len(e["id"]) >= 16

def test_make_event_full():
    e = make_event("vital", "hm", room="bedroom", severity="crit", payload={"hr": 140}, ts=1700000000)
    assert e["room"] == "bedroom"
    assert e["severity"] == "crit"
    assert e["payload"]["hr"] == 140
    assert e["ts"] == 1700000000
