FROM python:3.11-slim
WORKDIR /app

# 关键：让 Poetry 装到系统层，uvicorn 才在 PATH
ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_CACHE_DIR=/var/cache/pypoetry

COPY pyproject.toml .
RUN pip install --no-cache-dir poetry && poetry install --no-interaction --no-root

COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
