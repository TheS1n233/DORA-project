##### for module222
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/server/health-svc"
LOG_DIR="${REPO_ROOT}/.local/hm_tts_demo"
MOSQ_DIR="${REPO_ROOT}/.local/mosquitto"
UVICORN_LOG="${LOG_DIR}/uvicorn_hm_tts.log"

mkdir -p "${LOG_DIR}" "${MOSQ_DIR}"

log() { printf "\n\033[1;36m[hm-tts]\033[0m %s\n" "$*"; }

ensure() {
  # start redis
  if ! docker ps --format '{{.Names}}' | grep -q '^dora-redis$'; then
    docker rm -f dora-redis >/dev/null 2>&1 || true
    docker run -d --name dora-redis -p 6379:6379 redis:7-alpine >/dev/null
  fi
  # start mosquitto with simple config
  local conf="${MOSQ_DIR}/mosquitto.conf"
  if [[ ! -f "${conf}" ]]; then
    cat > "${conf}" <<'EOF'
listener 1883 0.0.0.0
allow_anonymous true
EOF
  fi
  if ! docker ps --format '{{.Names}}' | grep -q '^dora-mqtt$'; then
    docker rm -f dora-mqtt >/dev/null 2>&1 || true
    docker run -d --name dora-mqtt -p 1883:1883 \
      -v "${conf}:/mosquitto/config/mosquitto.conf:ro" eclipse-mosquitto:2 >/dev/null
  fi
}

start_app() {
  export MQTT_HOST=127.0.0.1
  export REDIS_HOST=127.0.0.1
  unset PYTHONPATH
  export PYTHONPATH="${APP_DIR}"
  # speed up reminder & summary
  export HM_REMINDER_INTERVAL_MIN=0.1
  export HM_MAX_AGE_DEFAULT_MIN=0.05  # ~3s
  export HM_DAILY_SUMMARY_EVERY_MIN=0.1

  if [[ -z "${HM_AES_KEY:-}" ]]; then
    export HM_AES_KEY="$(python - <<'PY'
import os,base64;print(base64.b64encode(os.urandom(32)).decode())
PY
)"
  fi

  # reuse if already healthy
  if curl -s "http://127.0.0.1:8100/ping" | grep -q '"pong"'; then
    log "reuse running uvicorn on :8100"
    return
  fi

  pkill -f "uvicorn app.main:app" >/dev/null 2>&1 || true
  (cd "${APP_DIR}" && nohup uvicorn app.main:app --host 0.0.0.0 --port 8100 >"${UVICORN_LOG}" 2>&1 &)
  sleep 2
  log "uvicorn started (port 8100)"
}

stop_app() {
  log "stopping uvicorn on :8100"
  lsof -i:8100 -t | xargs -r kill || true
  pkill -f "server/health-svc.*uvicorn app.main:app" >/dev/null 2>&1 || true
}

pub() { docker exec -i dora-mqtt sh -lc "mosquitto_pub -t 'vitals/ingest' -m '$1'"; }
tail_logs() { tail -n 120 "${UVICORN_LOG}" || true; }

main() {
  case "${1:-run}" in
    run)
      ensure
      start_app

      log "seed some vitals for summary"
      ts=$(date +%s)
      pub "{\"ts\":$ts,\"metric\":\"hr\",\"value\":95,\"unit\":\"bpm\"}"
      pub "{\"ts\":$ts,\"metric\":\"spo2\",\"value\":96,\"unit\":\"%\"}"
      pub "{\"ts\":$ts,\"metric\":\"glucose\",\"value\":170,\"unit\":\"mgdl\"}"

      log "wait ~30s to observe reminder+summary notifications"
      for i in {1..6}; do
        sleep 5
        echo -n "."
      done
      echo
      log "uvicorn logs:"
      tail_logs
      ;;
    stop)
      stop_app
      ;;
    *)
      echo "Usage: $0 [run|stop]"
      exit 1
      ;;
  esac
}

main "$@"
