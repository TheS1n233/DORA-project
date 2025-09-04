#!/usr/bin/env bash
# English comments only
set -euo pipefail

# Load repo .env if present
set -a; [ -f ./.env ] && . ./.env; set +a
# Force localhost unless DOCKER_NET=1
if [ "${DOCKER_NET:-0}" != "1" ]; then
  export MQTT_HOST=127.0.0.1
  export REDIS_HOST=127.0.0.1
fi

export SAFETY_STREAM="${SAFETY_STREAM:-safety_events}"

export PYTHONPATH="server/home-safety-svc"
: "${TELEGRAM_TOKEN:?missing TELEGRAM_TOKEN in .env}"
: "${TELEGRAM_CHAT_ID:?missing TELEGRAM_CHAT_ID in .env}"

echo "[boot] MQTT_HOST=$MQTT_HOST REDIS_HOST=$REDIS_HOST"

exec python3 -m uvicorn app.main:app \
  --app-dir server/home-safety-svc \
  --reload-dir server/home-safety-svc \
  --host 0.0.0.0 --port 8000 --reload
