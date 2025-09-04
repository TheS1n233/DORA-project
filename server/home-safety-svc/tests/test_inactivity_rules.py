import os
import time

import app.subscriber as sub


def test_inactivity_triggers(monkeypatch):
    # Disable silent window for determinism
    monkeypatch.setenv("INACTIVITY_SILENT_RANGE", "00:00-00:00")
    monkeypatch.setenv("INACTIVITY_MINUTES", "0.01")  # ~0.6s

    events = []

    # Patch xadd/notify to capture output
    monkeypatch.setattr(
        sub, "_xadd", lambda stream, fields: events.append((stream, fields))
    )
    monkeypatch.setattr(sub, "notify", lambda *a, **k: None)

    sub._LAST_ACTIVE.clear()
    sub._LAST_ALERTED.clear()

    # Make "living" idle long enough
    sub._LAST_ACTIVE["living"] = int(time.time()) - 120

    sub._check_inactivity()

    assert any(
        f.get("kind") == "inactivity" and f.get("room") == "living" for _, f in events
    )
