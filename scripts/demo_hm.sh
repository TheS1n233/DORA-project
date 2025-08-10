# for module 2222222222222222
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/server/health-svc"
LOG_DIR="${REPO_ROOT}/.local/hm_demo"
MOSQ_DIR="${REPO_ROOT}/.local/mosquitto"
UVICORN_LOG="${LOG_DIR}/uvicorn_hm.log"

mkdir -p "${LOG_DIR}" "${MOSQ_DIR}"

log() { printf "\n\033[1;32m[hm]\033[0m %s\n" "$*"; }

ensure_mosq_conf() {
  local conf="${MOSQ_DIR}/mosquitto.conf"
  if [[ ! -f "${conf}" ]]; then
    cat > "${conf}" <<'EOF'
listener 1883 0.0.0.0
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_type error warning notice information
EOF
  fi
}

ensure_container() {
  local name="$1" image="$2" ports="$3" extra="${4:-}"
  if ! docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    docker rm -f "${name}" >/dev/null 2>&1 || true
    # shellcheck disable=SC2086
    docker run -d --name "${name}" ${ports} ${extra} "${image}" >/dev/null
    log "started ${name}"
  else
    log "${name} already running"
  fi
}

start_deps() {
  ensure_container dora-redis redis:7-alpine "-p 6379:6379"
  ensure_mosq_conf
  ensure_container dora-mqtt eclipse-mosquitto:2 "-p 1883:1883" \
    "-v ${MOSQ_DIR}/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro"
}

start_app() {
  export MQTT_HOST="${MQTT_HOST:-127.0.0.1}"
  export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"

  # reset PYTHONPATH to avoid cross-service conflicts
  unset PYTHONPATH
  export PYTHONPATH="${APP_DIR}"

  if [[ -z "${HM_AES_KEY:-}" ]]; then
    export HM_AES_KEY="$(python - <<'PY'
import os,base64;print(base64.b64encode(os.urandom(32)).decode())
PY
)"
    log "generated HM_AES_KEY"
  fi

  pkill -f "uvicorn app.main:app" >/dev/null 2>&1 || true
  (cd "${APP_DIR}" && nohup uvicorn app.main:app --host 0.0.0.0 --port 8100 >"${UVICORN_LOG}" 2>&1 &)
  sleep 2
  log "uvicorn started (port 8100)"
}

publish() { docker exec -i dora-mqtt sh -lc "mosquitto_pub -t 'vitals/ingest' -m '$1'"; }
redis_last() { docker exec -i dora-redis sh -lc "redis-cli XREVRANGE $1 + - COUNT ${2:-5}"; }

main() {
  start_deps
  start_app

  log "check /ping"
  curl -s "http://127.0.0.1:8100/ping" || true

  log "send vitals (normal + critical)"
  ts=$(date +%s)
  publish "{\"ts\":$ts,\"metric\":\"hr\",\"value\":85,\"unit\":\"bpm\",\"source\":\"demo\"}"
  publish "{\"ts\":$ts,\"metric\":\"hr\",\"value\":130,\"unit\":\"bpm\",\"source\":\"demo\"}"
  publish "{\"ts\":$ts,\"metric\":\"spo2\",\"value\":96,\"unit\":\"%\",\"source\":\"demo\"}"
  publish "{\"ts\":$ts,\"metric\":\"spo2\",\"value\":88,\"unit\":\"%\",\"source\":\"demo\"}"
  publish "{\"ts\":$ts,\"metric\":\"glucose\",\"value\":150,\"unit\":\"mgdl\",\"source\":\"demo\"}"
  publish "{\"ts\":$ts,\"metric\":\"glucose\",\"value\":220,\"unit\":\"mgdl\",\"source\":\"demo\"}"

  sleep 1
  log "redis vitals (recent):"
  redis_last vitals 6

  log "redis safety_events (recent health alerts):"
  redis_last safety_events 6

  log "done. uvicorn logs tail:"
  tail -n 80 "${UVICORN_LOG}" || true
}

main "$@"
