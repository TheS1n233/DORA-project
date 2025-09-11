# server/tv-svc/app/api/intent.py
# English comments only
from fastapi import APIRouter, Request, Query, Body
from pydantic import BaseModel
from typing import Optional, Any, Dict
import inspect

router = APIRouter()

class IntentIn(BaseModel):
    text: Optional[str] = None
    room: Optional[str] = None
    broadcast: Optional[bool] = None
    cowatch: Optional[bool] = None
    payload: Optional[Dict[str, Any]] = None
    action: Optional[str] = None  # optional explicit action

def _coerce_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    s = str(v).strip().lower()
    return s in ("1", "true", "yes", "y", "on")

def _infer_action(text: Optional[str]) -> str:
    if not text:
        return "noop"
    t = text.lower()
    if "play" in t:
        return "play"
    if "pause" in t:
        return "pause"
    if "resume" in t:
        return "play"
    if "stop" in t or "hang" in t:
        return "stop"
    if "seek" in t:
        return "seek"
    if "load" in t or "open" in t:
        return "load"
    return "noop"

async def _maybe_await(x):
    # Accept both sync and async functions
    if inspect.isawaitable(x):
        return await x
    return x

@router.post("/api/intent")
async def post_intent(
    request: Request,
    body: Optional[IntentIn] = Body(default=None),
    # Legacy query params fallback (backward compatible)
    text: Optional[str] = Query(default=None),
    room: Optional[str] = Query(default=None),
    broadcast: Optional[str | bool] = Query(default=None),
    cowatch: Optional[str | bool] = Query(default=None),
):
    try:
        data = {
            "text": body.text if body else text,
            "room": body.room if body and body.room is not None else room,
            "broadcast": body.broadcast if body and body.broadcast is not None else _coerce_bool(broadcast),
            "cowatch": body.cowatch if body and body.cowatch is not None else _coerce_bool(cowatch),
            "payload": (body.payload if body else None) or {},
            "action": (body.action if body else None) or _infer_action((body.text if body else text)),
        }
        if not data["room"]:
            data["room"] = "demo"

        evt = {
            "type": "intent",
            "action": data["action"],
            "text": data["text"] or "",
            "payload": data["payload"],
            "room": data["room"],
        }

        ws_manager = getattr(request.app.state, "ws_manager", None)
        dispatched = False
        if ws_manager:
            if data["cowatch"] and data["room"]:
                await _maybe_await(ws_manager.broadcast(data["room"], {"type": "cowatch", "payload": evt}))
                dispatched = True
            if data["broadcast"]:
                await _maybe_await(ws_manager.broadcast_all(evt))
                dispatched = True

        return {
            "ok": True,
            "dispatched": dispatched,
            "room": data["room"],
            "broadcast": bool(data["broadcast"]),
            "cowatch": bool(data["cowatch"]),
            "action": data["action"],
        }
    except Exception as e:
        # Always return JSON even on errors so 'jq' does not fail
        return {
            "ok": False,
            "error": str(e),
        }
