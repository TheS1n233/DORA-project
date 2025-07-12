from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="Home-Safety Service")

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"msg": "pong"}

    return app


app = create_app()
