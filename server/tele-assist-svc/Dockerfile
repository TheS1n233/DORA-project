FROM python:3.11-slim
WORKDIR /app

# let Poetry be installed on the system layer, and uvicorn can directly place PATH
ENV POETRY_VIRTUALENVS_CREATE=false \
    POETRY_CACHE_DIR=/var/cache/pypoetry

COPY pyproject.toml .
RUN pip install --no-cache-dir poetry && poetry install --no-interaction --no-root

COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
