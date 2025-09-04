#!/usr/bin/env bash
# English comments only
set -euo pipefail

# Load repo .env if present
set -a; [ -f ./.env ] && . ./.env; set +a

# Force localhost endpoints unless DOCKER_NET=1
if [ "${DOCKER_NET:-0}" != "1" ]; then
  export TV_HOSTNAME=127.0.0.1
  export TV_PORT="${TV_PORT:-8200}"
fi

echo "[boot] TV_HOSTNAME=$TV_HOSTNAME TV_PORT=$TV_PORT"

exec env -i PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH" \
  PYTHONPATH="server/assistant-svc" \
  TV_HOSTNAME="$TV_HOSTNAME" TV_PORT="$TV_PORT" \
  python3 -m uvicorn app.main:app --app-dir server/assistant-svc --host 0.0.0.0 --port 8400 --reload
