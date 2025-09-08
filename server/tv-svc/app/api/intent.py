# English comments only
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict
import time

router = APIRouter()


def _now_ts() -> int:
    return int(time.time())


def _mgr(request: Request):
    # get the ws manager bound in app.main
    return getattr(request.app.state, "ws_manager", None)


def _intent_to_action(text: str) -> str:
    # very small ruleset; keep consistent with intent_rules.py if used
    t = (text or "").strip().lower()
    if t in ("play", "resume", "start"):
        return "play"
    if t in ("pause", "stop"):
        return "pause"
    if t.startswith("load "):
        return "load"
    if t.startswith("seek "):
        return "seek"
    return t or "noop"


@router.post("/api/intent")
async def post_intent(
    request: Request, broadcast: int = 1, cowatch: int = 0
) -> JSONResponse:
    body: Dict = {}
    try:
        body = await request.json()
    except Exception:
        pass

    text: str = (body.get("text") or "").strip()
    room: str = (body.get("room") or "").strip()
    action: str = body.get("action") or _intent_to_action(text)
    url: Optional[str] = body.get("url")
    position = body.get("position")

    mgr = _mgr(request)

    # 1) broadcast intent to all global /ws clients (if enabled)
    b_intent = False
    if broadcast and mgr:
        event = {
            "type": "intent",
            "text": text,
            "action": action,
            "room": room,
            "ts": _now_ts(),
        }
        try:
            b_intent = bool(mgr.broadcast_all(event))
        except Exception:
            b_intent = False

    # 2) also broadcast a cowatch message to the specific room (if enabled)
    b_cowatch = False
    if cowatch and room and mgr:
        payload = {"action": action}
        if url:
            payload["url"] = url
        if position is not None:
            payload["position"] = position
        msg = {
            "type": "cowatch",
            "room": room,
            "payload": payload,
            "ts": _now_ts(),
        }
        try:
            b_cowatch = bool(mgr.broadcast(room, msg))
        except Exception:
            b_cowatch = False

    # 3) reply to caller
    return JSONResponse(
        {
            "ok": True,
            "intent": text,
            "room": room,
            "broadcast_intent": 1 if b_intent else 0,
            "broadcast_cowatch": 1 if b_cowatch else 0,
            "action": action,
        }
    )
