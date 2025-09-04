#!/usr/bin/env bash
set -euo pipefail
svc="$1"                       # e.g. home-safety-svc
dir="server/$svc"

echo "🆕  Generating skeleton for $svc → $dir"

mkdir -p "$dir/app/api" "$dir/app/core" "$dir/app/models" "$dir/tests"

cat > "$dir/app/main.py" <<PY

from fastapi import FastAPI

def create_app() -> FastAPI:
    app = FastAPI(title="${svc}")

    @app.get("/ping")
    def ping() -> dict[str, str]:
        return {"msg": "pong"}

    return app

app = create_app()
PY

cat > "$dir/pyproject.toml" <<TOML

[tool.poetry]
name = "$svc"
version = "0.1.0"
description = "DORA micro-service: $svc"
authors = ["yujie <yujie@example.com>"]

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.111.0"
uvicorn = {extras = ["standard"], version = "^0.30.1"}

[tool.poetry.group.dev.dependencies]
pytest = "^8.2.1"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
TOML

cat > "$dir/Dockerfile" <<DOCKER
FROM python:3.11-slim
WORKDIR /app

ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_CACHE_DIR=/var/cache/pypoetry

RUN pip install poetry && poetry install --no-interaction --no-root
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
DOCKER


cat > "$dir/tests/test_ping.py" <<'PY'
from fastapi.testclient import TestClient
from app.main import create_app

client = TestClient(create_app())

def test_ping():
    assert client.get("/ping").json() == {"msg": "pong"}
PY
