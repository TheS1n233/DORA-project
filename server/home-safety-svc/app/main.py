from fastapi import FastAPI
from app.api.fall import router as fall_router


def create_app() -> FastAPI:
    app = FastAPI(title="Home-Safety Service")

    app.include_router(fall_router)

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"msg": "pong"}

    return app


app = create_app()
