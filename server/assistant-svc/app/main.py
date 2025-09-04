# English comments only
import os, socket, asyncio
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .core.config import get_settings
from .api.assistant import router as assistant_router

app = FastAPI(title="assistant-svc", version=get_settings().version)

@app.get("/whoami")
async def whoami():
    s = get_settings()
    return {"service": s.service_name, "version": s.version}

@app.get("/health/ready")
async def ready():
    s = get_settings()
    errs = []
    # dns check for tv-svc
    try:
        socket.gethostbyname(s.tv_host)
        tv_dns = True
    except Exception:
        tv_dns = False
        errs.append("tv_dns")
    return {
        "ok": tv_dns,
        "tv": {"host": s.tv_host, "port": s.tv_port, "dns": tv_dns},
        "service": s.service_name,
        "version": s.version,
        "errors": errs,
    }

# routes
app.include_router(assistant_router)

# optional static (none for now)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "..", "static")), name="static")
