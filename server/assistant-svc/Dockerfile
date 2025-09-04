# English comments only
FROM python:3.11-slim

WORKDIR /app
COPY server/assistant-svc/pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -e .

COPY server/assistant-svc /app
ENV PYTHONUNBUFFERED=1
EXPOSE 8400
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8400", "--workers", "1"]
