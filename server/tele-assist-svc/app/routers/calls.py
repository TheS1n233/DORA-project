# server/teleassist-svc/app/routers/calls.py
# REST endpoints for creating/ending calls and simple in-memory logs
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import uuid
import time

router = APIRouter()

# In-memory stores (replace with Redis/DB in production)
CALLS: Dict[str, dict] = {}
LOGS: List[dict] = []

class CreateCallBody(BaseModel):
    caller_id: str = Field(..., description="Unique ID of the caller")
    callee_id: str = Field(..., description="Unique ID of the callee")
    emergency: bool = Field(False, description="Emergency flag for auto-answer policies (if any)")

@router.post("/create")
async def create_call(body: CreateCallBody):
    # Generate deterministic room key by UUID to avoid collisions
    room_id = f"room-{uuid.uuid4()}"
    now = int(time.time())
    CALLS[room_id] = {
        "room_id": room_id,
        "caller_id": body.caller_id,
        "callee_id": body.callee_id,
        "emergency": body.emergency,
        "status": "ringing",
        "created_at": now,
        "answered_at": None,
        "ended_at": None,
    }
    # For audit
    LOGS.append({"event": "create", "room_id": room_id, "ts": now, "data": CALLS[room_id]})
    return {"room_id": room_id, "status": "ringing"}

class EndCallBody(BaseModel):
    room_id: str

@router.post("/end")
async def end_call(body: EndCallBody):
    if body.room_id not in CALLS:
        raise HTTPException(status_code=404, detail="room not found")
    CALLS[body.room_id]["status"] = "ended"
    CALLS[body.room_id]["ended_at"] = int(time.time())
    LOGS.append({"event": "end", "room_id": body.room_id, "ts": int(time.time())})
    return {"status": "ended", "room_id": body.room_id}

@router.get("/get/{room_id}")
async def get_call(room_id: str):
    if room_id not in CALLS:
        raise HTTPException(status_code=404, detail="room not found")
    return CALLS[room_id]

@router.get("/logs")
async def get_logs(limit: Optional[int] = 100):
    # Return newest first
    return list(reversed(LOGS))[:limit]
