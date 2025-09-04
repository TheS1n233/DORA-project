# English comments only
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import os, time, httpx

router = APIRouter()

def _now() -> int:
    return int(time.time())

def _cfg() -> Dict[str, Any]:
    return {
        "tv_host": os.getenv("TV_HOSTNAME", "tv-svc"),
        "tv_port": int(os.getenv("TV_PORT", "8200")),
    }

async def _post(url: str, json: Dict[str, Any]) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as cli:
            r = await cli.post(url, json=json)
            return {"status": r.status_code, "text": r.text}
    except Exception as e:
        return {"status": 599, "text": f"error: {e}"}

async def _broadcast_cowatch(room: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    # forward to tv-svc /api/intent with cowatch=1, broadcast disabled
    cfg = _cfg()
    url = f"http://{cfg['tv_host']}:{cfg['tv_port']}/api/intent?cowatch=1"
    body = {"room": room}
    body.update(payload)
    return await _post(url, body)

@router.post("/api/call/start")
async def call_start(body: Dict[str, Any]) -> JSONResponse:
    # shape: {"room":"demo","url": "<optional meeting url>"}
    room = (body.get("room") or "").strip()
    meet_url: Optional[str] = body.get("url")
    if not room:
        return JSONResponse({"ok": False, "error": "room required"}, status_code=400)
    payload: Dict[str, Any] = {"action": "call"}
    if meet_url: payload["url"] = meet_url
    up = await _broadcast_cowatch(room, payload)
    return JSONResponse({"ok": up.get("status") == 200, "forward_to": "tv", "upstream": up, "ts": _now()})

@router.post("/api/call/answer")
async def call_answer(body: Dict[str, Any]) -> JSONResponse:
    # shape: {"room":"demo"}
    room = (body.get("room") or "").strip()
    if not room:
        return JSONResponse({"ok": False, "error": "room required"}, status_code=400)
    up = await _broadcast_cowatch(room, {"action": "answer"})
    return JSONResponse({"ok": up.get("status") == 200, "forward_to": "tv", "upstream": up, "ts": _now()})

@router.post("/api/call/hang")
async def call_hang(body: Dict[str, Any]) -> JSONResponse:
    # shape: {"room":"demo"}
    room = (body.get("room") or "").strip()
    if not room:
        return JSONResponse({"ok": False, "error": "room required"}, status_code=400)
    up = await _broadcast_cowatch(room, {"action": "hang"})
    return JSONResponse({"ok": up.get("status") == 200, "forward_to": "tv", "upstream": up, "ts": _now()})
