# server/teleassist-svc/app/main.py
# FastAPI app entrypoint with REST and WebSocket for signaling
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import calls, signaling

app = FastAPI(title="DORA Teleassist Signaling Service", version="1.0.0")

# CORS: allow all for demo; restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(calls.router, prefix="/api/calls", tags=["calls"])
app.include_router(signaling.router, tags=["signaling"])

# Healthcheck
@app.get("/health")
async def health():
    return {"status": "ok"}
