import os
from fastapi import FastAPI
from app.api.vitals import router as vitals_router
from app.subscriber import start_subscriber, stop_subscriber
from app.scheduler import start_scheduler, stop_scheduler


def create_app(
    enable_subscriber: bool = False, enable_scheduler: bool = False
) -> FastAPI:
    """Create FastAPI app; defaults off for tests."""
    app = FastAPI(title="health-svc")

    # Routers
    app.include_router(vitals_router)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"msg": "pong"}

    @app.on_event("startup")
    def _startup() -> None:
        if (
            enable_subscriber
            and os.getenv("START_SUBSCRIBER", "true").lower() == "true"
        ):
            start_subscriber()
        if enable_scheduler and os.getenv("START_SCHEDULER", "true").lower() == "true":
            start_scheduler()

    @app.on_event("shutdown")
    def _shutdown() -> None:
        stop_scheduler()
        stop_subscriber()

    return app


# Normal runtime enables both
app = create_app(enable_subscriber=True, enable_scheduler=True)
