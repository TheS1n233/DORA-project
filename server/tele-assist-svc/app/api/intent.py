# English comments only
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import os, time, httpx

router = APIRouter()


def _now() -> int:
    return int(time.time())


def _cfg():
    # Environment-driven routing
    return {
        "target": os.getenv("TA_INTENT_TARGET", "tv")
        .strip()
        .lower(),  # "tv" or "assistant"
        "tv_host": os.getenv("TV_HOSTNAME", "tv-svc"),
        "tv_port": int(os.getenv("TV_PORT", "8200")),
        "as_host": os.getenv("ASSISTANT_HOSTNAME", "assistant-svc"),
        "as_port": int(os.getenv("ASSISTANT_PORT", "8400")),
    }


async def _post(url: str, json: Dict[str, Any]) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as cli:
            r = await cli.post(url, json=json)
            return {"status": r.status_code, "text": r.text}
    except Exception as e:
        return {"status": 599, "text": f"error: {e}"}


def _intent_to_action(text: str) -> str:
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
    request: Request, via: Optional[str] = None, broadcast: int = 1, cowatch: int = 0
):
    # Accept both {"text","room","url","position"} and extra fields
    body: Dict[str, Any] = {}
    try:
        body = await request.json()
    except Exception:
        pass

    text: str = (body.get("text") or "").strip()
    room: str = (body.get("room") or "").strip()
    url: Optional[str] = body.get("url")
    position = body.get("position")
    action: str = body.get("action") or _intent_to_action(text)

    cfg = _cfg()
    target = (via or cfg["target"] or "tv").lower()

    # Route A: forward to assistant-svc (and let assistant call tv-svc)
    if target == "assistant":
        as_url = f"http://{cfg['as_host']}:{cfg['as_port']}/intent"
        payload = {"text": text, "room": room, "cowatch": 1 if cowatch else 0}
        upstream = await _post(as_url, payload)
        return JSONResponse(
            {
                "ok": upstream.get("status") == 200,
                "forward_to": "assistant",
                "upstream": upstream,
                "ts": _now(),
            }
        )

    # Route B: direct to tv-svc /api/intent
    tv_url = f"http://{cfg['tv_host']}:{cfg['tv_port']}/api/intent?broadcast={1 if broadcast else 0}"
    if cowatch:
        tv_url += "&cowatch=1"
    payload = {"text": text, "room": room, "action": action}
    if url:
        payload["url"] = url
    if position is not None:
        payload["position"] = position
    upstream = await _post(tv_url, payload)
    return JSONResponse(
        {
            "ok": upstream.get("status") == 200,
            "forward_to": "tv",
            "upstream": upstream,
            "ts": _now(),
        }
    )
