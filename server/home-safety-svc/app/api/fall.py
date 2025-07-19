from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np

from app.fall_detection import detect_fall
from app.core.redis import get_redis

router = APIRouter()


@router.post("/detect-fall")
async def detect_fall_endpoint(img: UploadFile = File(...)):
    if img.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(status_code=400, detail="only jpeg/png")

    data = await img.read()
    nparr = np.frombuffer(data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    fall = detect_fall(frame)
    if fall:
        await get_redis().publish("falls", '{"fall": true}')

    return {"fall": fall}
