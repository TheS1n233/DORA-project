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

# === NEW: Admin call elder functionality ===

class AdminCallElderBody(BaseModel):
    admin_id: str = Field(..., description="Admin user ID")
    elder_id: str = Field(..., description="Elder user ID to call")
    call_type: str = Field("regular", description="Call type: regular, checkup, emergency")
    message: Optional[str] = Field(None, description="Optional message to display to elder")

@router.post("/admin/call-elder")
async def admin_call_elder(body: AdminCallElderBody):
    """
    Admin initiates a call to an elder.
    This creates a call session and notifies the elder's TV/device.
    """
    room_id = f"admin-call-{uuid.uuid4()}"
    now = int(time.time())
    
    call_data = {
        "room_id": room_id,
        "caller_id": body.admin_id,
        "callee_id": body.elder_id,
        "call_type": body.call_type,
        "message": body.message,
        "status": "ringing",
        "created_at": now,
        "answered_at": None,
        "ended_at": None,
        "is_admin_initiated": True,
    }
    
    CALLS[room_id] = call_data
    LOGS.append({
        "event": "admin_call_elder", 
        "room_id": room_id, 
        "ts": now, 
        "data": call_data
    })
    
    return {
        "room_id": room_id,
        "status": "ringing",
        "call_type": body.call_type,
        "message": body.message
    }

class AnswerCallBody(BaseModel):
    room_id: str
    user_id: str
    action: str = Field(..., description="Action: accept, decline, or timeout")

@router.post("/answer")
async def answer_call(body: AnswerCallBody):
    """
    Handle call answer (accept/decline) from elder or admin.
    """
    if body.room_id not in CALLS:
        raise HTTPException(status_code=404, detail="room not found")
    
    call = CALLS[body.room_id]
    now = int(time.time())
    
    if body.action == "accept":
        call["status"] = "answered"
        call["answered_at"] = now
        LOGS.append({
            "event": "call_answered",
            "room_id": body.room_id,
            "user_id": body.user_id,
            "ts": now
        })
    elif body.action == "decline":
        call["status"] = "declined"
        call["ended_at"] = now
        LOGS.append({
            "event": "call_declined",
            "room_id": body.room_id,
            "user_id": body.user_id,
            "ts": now
        })
    elif body.action == "timeout":
        call["status"] = "timeout"
        call["ended_at"] = now
        LOGS.append({
            "event": "call_timeout",
            "room_id": body.room_id,
            "user_id": body.user_id,
            "ts": now
        })
    
    return {"status": call["status"], "room_id": body.room_id}

@router.get("/admin/calls")
async def get_admin_calls(limit: Optional[int] = 50):
    """
    Get recent admin-initiated calls for dashboard.
    """
    admin_calls = [
        call for call in CALLS.values() 
        if call.get("is_admin_initiated", False)
    ]
    # Sort by creation time, newest first
    admin_calls.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return admin_calls[:limit]

@router.get("/elder/pending-calls/{elder_id}")
async def get_elder_pending_calls(elder_id: str):
    """
    Get pending calls for a specific elder (for TV display).
    """
    pending_calls = [
        call for call in CALLS.values()
        if (call.get("callee_id") == elder_id and 
            call.get("status") == "ringing" and
            call.get("is_admin_initiated", False))
    ]
    return pending_calls
