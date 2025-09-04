# English comments only
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=1.8.3 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

# Install Python deps via Poetry (no venv; system site-packages)
COPY pyproject.toml poetry.lock* ./
RUN pip install -U pip && pip install "poetry==${POETRY_VERSION}" \
 && poetry install -n --no-root

# Copy source
COPY . .

EXPOSE 8100

# Base command; compose may append --reload via env RELOAD
CMD ["sh","-lc","uvicorn app.main:app --host 0.0.0.0 --port 8100"]
