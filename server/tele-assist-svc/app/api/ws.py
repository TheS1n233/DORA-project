from fastapi import APIRouter, WebSocket
import json

router = APIRouter()
clients = {}  # user_id -> WebSocket

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(ws: WebSocket, user_id: str):
    await ws.accept()
    clients[user_id] = ws
    try:
        while True:
            data = await ws.receive_text()
            message = json.loads(data)
            # Relay to target user
            target = message.get("to")
            if target in clients:
                await clients[target].send_text(json.dumps(message))
    except Exception:
        del clients[user_id]
