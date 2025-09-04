# English comments only
from typing import Optional, Dict


def intent_to_cowatch(text: str) -> Optional[Dict]:
    """
    Map a very small set of English intents to co-watch payloads.
    Return a dict like {"action":"play", "play":True, "url": "..."} or None.
    """
    if not text:
        return None

    s = text.strip().lower()

    # play / pause / stop
    if s in ("play", "resume", "start"):
        return {"action": "play", "play": True}
    if s in ("pause", "stop", "hold"):
        return {"action": "pause", "play": False}

    # load <url>
    # examples: "load /static/sample.mp4", "load http://example.com/xxx.mp4"
    if s.startswith("load "):
        url = s[5:].strip()
        if url:
            return {"action": "load", "url": url}

    # join <room> -> informational only (handled on UI), do not force on server
    # call caregiver -> not implemented here (future: webrtc dialing)
    return None
