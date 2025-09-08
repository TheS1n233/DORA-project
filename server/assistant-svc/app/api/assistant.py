# server/assistant-svc/app/api/assistant.py
# English comments only
from fastapi import (
    APIRouter,
    Request,
    UploadFile,
    File,
    Form,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import JSONResponse, PlainTextResponse
from typing import Optional, Dict, Any, DefaultDict, Set
from collections import defaultdict
import httpx
import time
import os

from ..core.config import get_settings

router = APIRouter()


# ---------- helpers ----------
def _now() -> int:
    return int(time.time())


def _expected_ws_key() -> str:
    # empty means "no auth required"
    return (os.getenv("ASSIST_WS_KEY") or "").strip()


async def _post_tv_intent(payload: Dict[str, Any]) -> Dict[str, Any]:
    # best-effort POST to tv-svc /api/intent
    s = get_settings()
    url = f"http://{s.tv_host}:{s.tv_port}/api/intent?broadcast=1"
    if payload.get("cowatch"):
        url += "&cowatch=1"
    async with httpx.AsyncClient(timeout=3.0) as cli:
        r = await cli.post(url, json=payload)
        return {"status": r.status_code, "text": r.text}


# ---------- health ----------
@router.get("/healthz")
async def healthz():
    return PlainTextResponse("ok")


# ---------- HTTP endpoints ----------
@router.get("/ping")
async def ping():
    return {"ok": True, "service": "assistant", "ts": _now()}


@router.post("/intent")
async def post_intent(body: Dict[str, Any]):
    text = (body.get("text") or "").strip()
    room = (body.get("room") or "").strip()
    cowatch = 1 if str(body.get("cowatch", "0")) in ("1", "true", "True") else 0
    upstream = await _post_tv_intent({"text": text, "room": room, "cowatch": cowatch})
    return {"ok": True, "intent": text, "room": room, "upstream": upstream}


@router.post("/tts")
async def tts(body: Dict[str, Any]):
    text = (body.get("text") or "").strip()
    room = (body.get("room") or "").strip()
    if not text:
        return JSONResponse({"ok": False, "error": "text required"}, status_code=400)
    upstream = await _post_tv_intent({"text": text, "room": room})
    return {"ok": True, "tts": text, "room": room, "upstream": upstream}


@router.post("/stt")
async def stt(file: Optional[UploadFile] = File(None), lang: str = Form("en")):
    transcript = "demo" if not file else f"audio-{file.filename or 'blob'}"
    return {"ok": True, "lang": lang, "text": transcript, "note": "placeholder STT"}


# ---------- WebSocket: /ws ----------
_rooms: DefaultDict[str, Set[WebSocket]] = defaultdict(set)


@router.websocket("/ws")
async def ws_room(websocket: WebSocket):
    # ---- optional API key check ----
    expect = _expected_ws_key()
    if expect:
        supplied = (
            websocket.query_params.get("key")
            or websocket.headers.get("x-api-key")
            or ""
        ).strip()
        if supplied != expect:
            # 1008 Policy Violation is a reasonable close code
            await websocket.close(code=1008)
            return

    # ---- room ----
    room = (
        websocket.query_params.get("room") or websocket.headers.get("x-room") or ""
    ).strip()
    if not room:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    _rooms[room].add(websocket)

    async def _broadcast(msg: str):
        dead = []
        for ws in list(_rooms[room]):
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            _rooms[room].discard(ws)

    # announce join
    await _broadcast(f'{{"type":"presence","event":"join","room":"{room}"}}')

    try:
        while True:
            data = await websocket.receive_text()
            # fan-out to peers in the same room
            await _broadcast(data)
    except WebSocketDisconnect:
        pass
    finally:
        _rooms[room].discard(websocket)
        await _broadcast(f'{{"type":"presence","event":"leave","room":"{room}"}}')
