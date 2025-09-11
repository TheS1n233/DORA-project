# syntax=docker/dockerfile:1

# English comments only
FROM python:3.11-slim

# No apt-get here to avoid mirror issues

WORKDIR /app

# Install Poetry
RUN pip install --no-cache-dir poetry==1.8.3

# Copy pyproject to resolve deps with layer cache
COPY pyproject.toml /app/

# Configure poetry and lock (fallback when lock exists)
RUN poetry config virtualenvs.create false \
 && (poetry lock --no-update || poetry lock) \
 && poetry install --no-interaction --no-ansi

# Copy application source
COPY app /app/app
COPY static /app/static

ENV TV_HOST=0.0.0.0
ENV TV_PORT=8200
EXPOSE 8200

# Start service
CMD ["python", "-c", "import app.main as m; m.run()"]
