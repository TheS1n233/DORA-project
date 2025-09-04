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

export PYTHONPATH="server/health-svc"
: "${TELEGRAM_TOKEN:?missing TELEGRAM_TOKEN in .env}"
: "${TELEGRAM_CHAT_ID:?missing TELEGRAM_CHAT_ID in .env}"

: "${HM_AES_KEY:=}" # optional

echo "[boot] MQTT_HOST=$MQTT_HOST REDIS_HOST=$REDIS_HOST"

exec python3 -m uvicorn app.main:app \
  --app-dir server/health-svc \
  --reload-dir server/health-svc \
  --host 0.0.0.0 --port 8100 --reload
