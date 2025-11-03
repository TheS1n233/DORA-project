# services/ta-session-logger/main.py
# FastAPI microservice to log Tele-assistance session metadata (FR4.6)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uvicorn

app = FastAPI(title="TA Session Logger", version="1.0.0")

class SessionEvent(BaseModel):
    room: str = Field(..., description="LiveKit room name")
    operator_id: str = Field(..., description="operator identity")
    elder_id: str = Field(..., description="older adult identity")
    event: str = Field(..., description="'start' | 'stop' | 'rtt'")
    ts: datetime = Field(default_factory=datetime.utcnow)
    avg_rtt_ms: Optional[float] = None

DB: List[SessionEvent] = []

@app.post("/events")
def post_event(ev: SessionEvent):
    if ev.event not in ("start", "stop", "rtt"):
        raise HTTPException(status_code=400, detail="invalid event")
    DB.append(ev)
    return {"ok": True, "count": len(DB)}

@app.get("/events")
def list_events(room: Optional[str] = None):
    items = [e for e in DB if (room is None or e.room == room)]
    return {"items": items, "count": len(items)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8088)
