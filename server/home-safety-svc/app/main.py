# English comments only
from fastapi import FastAPI
from app.api.fall import router as fall_router
from app.api.emergency import router as emergency_router
from app.subscriber import start_subscriber, stop_subscriber


def create_app() -> FastAPI:
    """Create FastAPI app and register routers and lifecycle hooks."""
    app = FastAPI(title="Home-Safety Service")

    # Routers
    app.include_router(fall_router)
    app.include_router(emergency_router)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"msg": "pong"}

    # Lifecycle
    @app.on_event("startup")
    def _startup() -> None:
        start_subscriber()

    @app.on_event("shutdown")
    def _shutdown() -> None:
        stop_subscriber()

    return app


app = create_app()
