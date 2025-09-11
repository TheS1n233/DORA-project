# English comments only
from __future__ import annotations

import os
import socket
from contextlib import asynccontextmanager
from fastapi import FastAPI

from .core.redis import get_redis
from .metrics import snapshot as metrics_snapshot
from .api.fall import router as fall_router
from .api.emergency import router as emergency_router

# Optional subscriber (may not exist in some builds)
try:
    from . import subscriber as _subscriber  # type: ignore[attr-defined]
except Exception:
    _subscriber = None  # type: ignore


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Health checks and optional background subscriber
    r = get_redis()

    # Probe Redis (best-effort)
    try:
        r.ping()
        app.state._hs_redis_ok = True
    except Exception:
        app.state._hs_redis_ok = False

    # Probe MQTT DNS (best-effort)
    try:
        socket.gethostbyname(os.getenv("MQTT_HOST", "mosquitto"))
        app.state._hs_mqtt_dns_ok = True
    except Exception:
        app.state._hs_mqtt_dns_ok = False

    # Start subscriber if available and enabled
    start_sub = os.getenv("START_SUBSCRIBER", "true").lower() in ("1", "true", "yes", "on")
    if _subscriber and start_sub:
        try:
            cfg = None
            # Lazy import to avoid circulars
            from .core.config import load_config  # type: ignore
            cfg = load_config()
            _subscriber.start(cfg, r)  # type: ignore
            app.state._hs_sub_running = True
        except Exception as e:
            print(f"[hs] subscriber start failed: {e}")
            app.state._hs_sub_running = False
    else:
        app.state._hs_sub_running = False

    yield

    # Stop subscriber on shutdown
    if _subscriber and getattr(app.state, "_hs_sub_running", False):
        try:
            _subscriber.stop()  # type: ignore
        except Exception:
            pass


def create_app() -> FastAPI:
    app = FastAPI(title="home-safety-svc", lifespan=lifespan)

    # Routers
    app.include_router(fall_router)
    app.include_router(emergency_router)

    @app.get("/health/live")
    def live():
        return {"status": "live"}

    @app.get("/health/ready")
    def ready():
        return {
            "redis": bool(getattr(app.state, "_hs_redis_ok", False)),
            "mqtt_dns": bool(getattr(app.state, "_hs_mqtt_dns_ok", False)),
            "subscriber": bool(getattr(app.state, "_hs_sub_running", False)),
            "metrics": metrics_snapshot(),
        }

    return app


# For uvicorn entry if ever needed: `python -m app.main`
def run():
    import uvicorn
    uvicorn.run(create_app(), host=os.getenv("HS_HOST", "0.0.0.0"), port=int(os.getenv("HS_PORT", "8000")))

# >>> Add this line to satisfy "uvicorn app.main:app"
app = create_app()
