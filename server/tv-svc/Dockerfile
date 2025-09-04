# English comments only
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir poetry==1.8.3

# copy only pyproject first to leverage docker cache
COPY pyproject.toml /app/

# ensure a fresh lock is created to avoid mismatch errors
RUN poetry config virtualenvs.create false \
 && (poetry lock --no-update || poetry lock) \
 && poetry install --no-interaction --no-ansi --no-root

# then copy the rest
COPY app /app/app
COPY static /app/static

ENV TV_HOST=0.0.0.0 \
    TV_PORT=8200

EXPOSE 8200
CMD ["python","-c","import app.main as m; m.run()"]
