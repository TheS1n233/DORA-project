# English comments only
from __future__ import annotations

import asyncio
import json
import os
import socket
import threading
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Set

import paho.mqtt.client as mqtt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles


_WS_CLIENTS: Set[WebSocket] = set()
_WS_LOCK = threading.Lock()

# room -> set of websockets
_ROOMS: Dict[str, Set[WebSocket]] = {}
_ROOM_LOCK = threading.Lock()

_MQTT_THREAD: Optional[threading.Thread] = None
_MQTT_RUNNING = False
_LAST_MQTT_RC: Optional[int] = None
_LAST_MQTT_TS: Optional[int] = None
_ASYNC_LOOP: Optional[asyncio.AbstractEventLoop] = None  # main event loop


def _env(name: str, default: str) -> str:
    return os.getenv(name, default)


def _ws_token_ok(query_token: Optional[str]) -> bool:
    # English comments only
    expected = os.getenv("TV_WS_TOKEN", "")
    if not expected:
        return True
    return query_token == expected


def _mqtt_connect() -> mqtt.Client:
    # English comments only
    host = _env("MQTT_HOST", "mosquitto")
    port = int(_env("MQTT_PORT", "1883"))
    keepalive = 30
    c = mqtt.Client(client_id=f"tv-svc-{int(time.time())}")
    c.connect(host, port, keepalive=keepalive)
    return c


def _snapshot_ws() -> List[WebSocket]:
    # English comments only
    with _WS_LOCK:
        return list(_WS_CLIENTS)


def _snapshot_room(room: str) -> List[WebSocket]:
    # English comments only
    with _ROOM_LOCK:
        return list(_ROOMS.get(room, set()))


async def _broadcast_async(event: dict) -> None:
    # English comments only
    text = json.dumps(event)
    dead: List[WebSocket] = []
    for ws in _snapshot_ws():
        try:
            await ws.send_text(text)
        except Exception:
            dead.append(ws)
    if dead:
        with _WS_LOCK:
            for ws in dead:
                _WS_CLIENTS.discard(ws)


async def _broadcast_room_async(room: str, event: dict) -> None:
    # English comments only
    text = json.dumps(event)
    dead: List[WebSocket] = []
    for ws in _snapshot_room(room):
        try:
            await ws.send_text(text)
        except Exception:
            dead.append(ws)
    if dead:
        with _ROOM_LOCK:
            bag = _ROOMS.get(room)
            if bag:
                for ws in dead:
                    bag.discard(ws)


def _broadcast_from_thread(event: dict) -> None:
    # English comments only
    loop = _ASYNC_LOOP
    if loop is None:
        return
    try:
        asyncio.run_coroutine_threadsafe(_broadcast_async(event), loop)
    except Exception as e:
        print(f"[tv] broadcast schedule failed: {e}")


def _on_mqtt_message(_c: mqtt.Client, _u, msg: mqtt.MQTTMessage) -> None:
    # English comments only
    global _LAST_MQTT_TS
    try:
        payload = msg.payload.decode("utf-8")
        try:
            data = json.loads(payload)
        except Exception:
            data = {"raw": payload}
    except Exception:
        data = {"raw": "<decode-error>"}
    _LAST_MQTT_TS = int(time.time())
    event = {
        "type": "mqtt",
        "topic": msg.topic,
        "payload": data,
        "ts": _LAST_MQTT_TS,
    }
    _broadcast_from_thread(event)


def _mqtt_loop() -> None:
    # English comments only
    global _MQTT_RUNNING, _LAST_MQTT_RC
    while _MQTT_RUNNING:
        try:
            c = _mqtt_connect()
            _LAST_MQTT_RC = 0
            c.subscribe("fall/detected", qos=0)
            c.subscribe("hazard/+", qos=0)
            c.subscribe("vitals/ingest", qos=0)
            c.on_message = _on_mqtt_message
            print("[tv] mqtt connected and subscribed")
            c.loop_forever()
        except Exception as e:
            _LAST_MQTT_RC = -1
            print(f"[tv] mqtt loop error: {e}")
            time.sleep(2.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # English comments only
    global _MQTT_THREAD, _MQTT_RUNNING, _ASYNC_LOOP
    _ASYNC_LOOP = asyncio.get_running_loop()
    try:
        socket.gethostbyname(_env("MQTT_HOST", "mosquitto"))
        print("[tv] mqtt dns ok")
    except Exception as e:
        print(f"[tv] mqtt dns failed: {e}")
    _MQTT_RUNNING = True
    _MQTT_THREAD = threading.Thread(target=_mqtt_loop, name="tv-mqtt", daemon=True)
    _MQTT_THREAD.start()
    yield
    _MQTT_RUNNING = False


app = FastAPI(lifespan=lifespan)


# --- BEGIN WS manager (bind to app.state.ws_manager) ---
class _WSManager:
    # room-scoped broadcast; returns True for best-effort fire-and-forget
    def broadcast(self, room: str, msg: dict):
        try:
            asyncio.create_task(_broadcast_room_async(room, msg))
            return True
        except Exception:
            return False

    # global broadcast to all /ws clients; returns True for best-effort
    def broadcast_all(self, msg: dict):
        try:
            asyncio.create_task(_broadcast_async(msg))
            return True
        except Exception:
            return False


# expose to other routers (e.g. /api/intent)
try:
    app.state.ws_manager = _WSManager()
except Exception:
    pass
# --- END WS manager (bind to app.state.ws_manager) ---

_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=_static_dir), name="static")


@app.get("/whoami")
def whoami():
    import app as _pkg

    return {"service": "tv", "import_path": getattr(_pkg, "__file__", "")}


@app.get("/")
def index():
    # English comments only
    html = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/static/index.html"></head><body></body></html>'
    return HTMLResponse(content=html, status_code=200)


@app.get("/ping")
def ping():
    # English comments only
    return {"msg": "pong"}


@app.get("/health/live")
def health_live():
    # English comments only
    return {"status": "live"}


@app.get("/health/ready")
def health_ready():
    # English comments only
    ok_dns = False
    try:
        socket.gethostbyname(_env("MQTT_HOST", "mosquitto"))
        ok_dns = True
    except Exception:
        ok_dns = False
    with _WS_LOCK:
        ws_count = len(_WS_CLIENTS)
    with _ROOM_LOCK:
        rooms = {k: len(v) for k, v in _ROOMS.items()}
    return {
        "mqtt_dns": ok_dns,
        "mqtt_rc": _LAST_MQTT_RC,
        "mqtt_last_ts": _LAST_MQTT_TS,
        "ws_clients": ws_count,
        "rooms": rooms,
        "has_ws_token": bool(os.getenv("TV_WS_TOKEN")),
    }


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    # English comments only
    token = ws.query_params.get("token")
    if not _ws_token_ok(token):
        await ws.close(code=4401)
        return
    await ws.accept()
    with _WS_LOCK:
        _WS_CLIENTS.add(ws)
    try:
        await ws.send_text(json.dumps({"type": "hello", "ts": int(time.time())}))
        while True:
            msg = await ws.receive_text()
            try:
                data = json.loads(msg)
            except Exception:
                data = {"raw": msg}
            event = {"type": "client", "payload": data, "ts": int(time.time())}
            await _broadcast_async(event)
    except WebSocketDisconnect:
        pass
    finally:
        with _WS_LOCK:
            _WS_CLIENTS.discard(ws)


@app.websocket("/ws/room")
async def ws_room(ws: WebSocket):
    # English comments only
    token = ws.query_params.get("token")
    room = (ws.query_params.get("room") or "").strip()
    if not room:
        await ws.close(code=4400)
        return
    if not _ws_token_ok(token):
        await ws.close(code=4401)
        return
    await ws.accept()
    with _ROOM_LOCK:
        bag = _ROOMS.setdefault(room, set())
        bag.add(ws)
    try:
        await ws.send_text(
            json.dumps({"type": "hello-room", "room": room, "ts": int(time.time())})
        )
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                data = {"raw": raw}
            event = {
                "type": "cowatch",
                "room": room,
                "payload": data,
                "ts": int(time.time()),
            }
            await _broadcast_room_async(room, event)
    except WebSocketDisconnect:
        pass
    finally:
        with _ROOM_LOCK:
            bag = _ROOMS.get(room)
            if bag:
                bag.discard(ws)
                if not bag:
                    _ROOMS.pop(room, None)


# legacy echo endpoint is renamed to avoid shadowing the new /api/intent router
@app.post("/api/intent_echo")
async def intent_echo(req: Request):
    body = await req.json()
    text = str(body.get("text", "")).strip()
    if not text:
        return JSONResponse({"ok": False, "err": "empty"}, status_code=400)
    event = {"type": "intent", "text": text, "ts": int(time.time())}
    await _broadcast_async(event)
    return {"ok": True, "echo": text}


@app.post("/api/stt")
async def stt(req: Request):
    # English comments only
    body = await req.json()
    if "audio_b64" not in body:
        return JSONResponse({"ok": False, "err": "audio_b64 required"}, status_code=400)
    transcript = body.get("hint", "call caregiver")
    event = {"type": "stt", "text": transcript, "ts": int(time.time())}
    await _broadcast_async(event)
    return {"ok": True, "text": transcript}


# --- BEGIN PATCH (tv-svc mount /api/intent) ---
from app.api import intent as _intent_api  # noqa: E402

try:
    app.include_router(_intent_api.router)
except Exception:
    # best-effort: do not crash if app is not yet defined in this scope
    pass
# --- END PATCH ---


def run():
    # English comments only
    import uvicorn

    host = os.getenv("TV_HOST", "0.0.0.0")
    port = int(os.getenv("TV_PORT", "8200"))
    uvicorn.run(
        "app.main:app", host=host, port=port, reload=os.getenv("RELOAD", "0") == "1"
    )
