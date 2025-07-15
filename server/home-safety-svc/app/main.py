from fastapi import FastAPI
from app.api import fall

def create_app() -> FastAPI:
    app = FastAPI(title="Home-Safety Service")
    app.include_router(fall.router)
    @app.get("/ping")
    def ping():
        return {"msg": "pong"}
    return app

app = create_app()