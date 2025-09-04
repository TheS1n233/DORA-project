# English comments only
from datetime import datetime, timedelta, timezone
from typing import Optional

import os
import jwt  # PyJWT
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

LK_URL = os.getenv("LK_URL", "")
LK_API_KEY = os.getenv("LK_API_KEY", "")
LK_API_SECRET = os.getenv("LK_API_SECRET", "")

class TokenReq(BaseModel):
    room: Optional[str] = "demo"
    identity: Optional[str] = None  # stable user identity from client
    role: Optional[str] = "caregiver"  # optional; can be used for scopes

@router.post("/token")
def issue_token(req: TokenReq):
    # basic validation
    if not LK_URL or not LK_API_KEY or not LK_API_SECRET:
        raise HTTPException(status_code=503, detail="LiveKit not configured")

    room = req.room or "demo"
    identity = req.identity or f"user-{int(datetime.now().timestamp())}"

    # Standard LiveKit access token payload (JWT HS256)
    now = datetime.now(tz=timezone.utc)
    payload = {
        "iss": LK_API_KEY,
        "sub": identity,
        "nbf": int(now.timestamp()) - 10,
        "exp": int((now + timedelta(hours=1)).timestamp()),
        "name": identity,
        "video": {
            "room": room,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }
    token = jwt.encode(payload, LK_API_SECRET, algorithm="HS256")
    return {"url": LK_URL, "token": token, "room": room}
