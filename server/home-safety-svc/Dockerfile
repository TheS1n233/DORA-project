# English comments only
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=1.8.3 \
    POETRY_VIRTUALENVS_CREATE=false

# Runtime libs required by OpenCV/MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps via Poetry (no venv; system site-packages)
COPY pyproject.toml poetry.lock* ./
RUN pip install -U pip && pip install "poetry==${POETRY_VERSION}" \
 && poetry install -n --no-root

# Preinstall heavy CV deps in image to avoid runtime install
RUN pip install --no-cache-dir opencv-python-headless mediapipe

# Copy source last for better layer caching
COPY . .

EXPOSE 8000

# Base command; compose may append --reload via env RELOAD
CMD ["sh","-lc","uvicorn app.main:app --host 0.0.0.0 --port 8000"]
