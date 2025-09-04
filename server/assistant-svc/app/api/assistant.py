# English comments only
from fastapi import APIRouter, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import httpx
import time

from ..core.config import get_settings

router = APIRouter()

def _now() -> int:
    return int(time.time())

async def _post_tv_intent(payload: Dict[str, Any]) -> Dict[str, Any]:
    # best-effort POST to tv-svc /api/intent
    s = get_settings()
    url = f"http://{s.tv_host}:{s.tv_port}/api/intent?broadcast=1"
    if payload.get("cowatch"):
        url += "&cowatch=1"
    async with httpx.AsyncClient(timeout=3.0) as cli:
        r = await cli.post(url, json=payload)
        return {"status": r.status_code, "text": r.text}

@router.get("/ping")
async def ping():
    return {"ok": True, "service": "assistant", "ts": _now()}

@router.post("/intent")
async def post_intent(body: Dict[str, Any]):
    # shape: {"text": "...", "room": "demo", "cowatch": 0|1}
    text = (body.get("text") or "").strip()
    room = (body.get("room") or "").strip()
    cowatch = 1 if str(body.get("cowatch", "0")) in ("1", "true", "True") else 0
    upstream = await _post_tv_intent({"text": text, "room": room, "cowatch": cowatch})
    return {"ok": True, "intent": text, "room": room, "upstream": upstream}

@router.post("/tts")
async def tts(body: Dict[str, Any]):
    # minimal TTS proxy: send intent to TV; TV will say it if Auto TTS is ON
    text = (body.get("text") or "").strip()
    room = (body.get("room") or "").strip()
    if not text:
        return JSONResponse({"ok": False, "error": "text required"}, status_code=400)
    upstream = await _post_tv_intent({"text": text, "room": room})
    return {"ok": True, "tts": text, "room": room, "upstream": upstream}

@router.post("/stt")
async def stt(file: Optional[UploadFile] = File(None), lang: str = Form("en")):
    # placeholder: real STT will be integrated later
    # for now return a dummy transcript to keep the API contract stable
    transcript = "demo" if not file else f"audio-{file.filename or 'blob'}"
    return {"ok": True, "lang": lang, "text": transcript, "note": "placeholder STT"}
