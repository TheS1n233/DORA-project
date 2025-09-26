# server/teleassist-svc/app/routers/signaling.py
# WebSocket signaling server: room-based routing for offer/answer/candidate/bye
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set
import json
import time

router = APIRouter()

# Connections
# room_id -> set of WebSocket
ROOMS: Dict[str, Set[WebSocket]] = {}
# socket -> metadata
META: Dict[WebSocket, dict] = {}

async def _broadcast_room(room_id: str, payload: dict, exclude: WebSocket = None):
    """Broadcast a message to all peers in the room, except 'exclude' if provided."""
    if room_id not in ROOMS:
        return
    dead = []
    for ws in list(ROOMS[room_id]):
        if exclude is not None and ws == exclude:
            continue
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
    # Cleanup dead sockets
    for ws in dead:
        await _safe_remove(ws)

async def _safe_remove(ws: WebSocket):
    """Remove a WebSocket from tracking maps."""
    room_id = META.get(ws, {}).get("room_id")
    if room_id and room_id in ROOMS and ws in ROOMS[room_id]:
        ROOMS[room_id].remove(ws)
        if len(ROOMS[room_id]) == 0:
            del ROOMS[room_id]
    META.pop(ws, None)
    try:
        await ws.close()
    except Exception:
        pass

@router.websocket("/ws")
async def ws_signaling(
    websocket: WebSocket,
    room_id: str = Query(..., description="Room ID obtained via /api/calls/create or agreed by peers"),
    user_id: str = Query(..., description="Client unique ID (e.g., admin-01, tv-001)"),
    role: str = Query("client", description="Optional role hint: admin or client"),
):
    """
    WebSocket signaling endpoint.
    Clients must connect with room_id + user_id (and optional role).
    """
    await websocket.accept()
    # Register
    META[websocket] = {"room_id": room_id, "user_id": user_id, "role": role, "joined_at": int(time.time())}
    ROOMS.setdefault(room_id, set()).add(websocket)

    # Notify others: joined
    await _broadcast_room(room_id, {"type": "peer-joined", "user_id": user_id, "role": role}, exclude=websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            # Forward signaling payloads within room
            msg_type = msg.get("type")
            msg["from"] = user_id  # enforce sender identity from server side

            if msg_type in ("offer", "answer", "candidate", "bye", "custom"):
                await _broadcast_room(room_id, msg, exclude=websocket)
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "ts": int(time.time())}))
            else:
                # Unknown type; echo back as error
                await websocket.send_text(json.dumps({"type": "error", "reason": "unknown_type", "got": msg_type}))
    except WebSocketDisconnect:
        # On disconnect, broadcast leave
        await _broadcast_room(room_id, {"type": "peer-left", "user_id": user_id})
        await _safe_remove(websocket)
    except Exception:
        # On error, cleanup
        await _broadcast_room(room_id, {"type": "peer-left", "user_id": user_id})
        await _safe_remove(websocket)
