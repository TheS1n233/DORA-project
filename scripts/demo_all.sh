# for module 111111111111111
set -euo pipefail

# --- paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/server/home-safety-svc"
LOG_DIR="${REPO_ROOT}/.local/demo"
MOSQ_DIR="${REPO_ROOT}/.local/mosquitto"
UVICORN_LOG="${LOG_DIR}/uvicorn.log"

mkdir -p "${LOG_DIR}" "${MOSQ_DIR}"

log() { printf "\n\033[1;32m[demo]\033[0m %s\n" "$*"; }
warn() { printf "\n\033[1;33m[demo]\033[0m %s\n" "$*"; }
err() { printf "\n\033[1;31m[demo]\033[0m %s\n" "$*"; }

ensure_mosquitto_conf() {
  local conf="${MOSQ_DIR}/mosquitto.conf"
  if [[ ! -f "${conf}" ]]; then
    cat > "${conf}" <<'EOF'
listener 1883 0.0.0.0
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_type error warning notice information
EOF
    log "created mosquitto.conf at ${conf}"
  fi
}

ensure_container() {
  local name="$1" image="$2" ports="$3" extra="${4:-}"
  if ! docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    docker rm -f "${name}" >/dev/null 2>&1 || true
    # shellcheck disable=SC2086
    docker run -d --name "${name}" ${ports} ${extra} "${image}" >/dev/null
    log "started container ${name}"
  else
    log "container ${name} already running"
  fi
}

start_deps() {
  log "starting dependencies (redis + mqtt)"
  ensure_container dora-redis redis:7-alpine "-p 6379:6379"
  ensure_mosquitto_conf
  ensure_container dora-mqtt eclipse-mosquitto:2 "-p 1883:1883" \
    "-v ${MOSQ_DIR}/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro"
}

start_app() {
  log "starting app with uvicorn"
  export MQTT_HOST="${MQTT_HOST:-127.0.0.1}"
  export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
  export AWAY_MODE="${AWAY_MODE:-true}"

  # reset PYTHONPATH to avoid package name conflicts across services
  unset PYTHONPATH
  export PYTHONPATH="${APP_DIR}"

  if ! command -v uvicorn >/dev/null; then
    err "uvicorn not found. Install deps: pip install fastapi uvicorn redis paho-mqtt"
    exit 1
  fi

  pkill -f "uvicorn app.main:app" >/dev/null 2>&1 || true
  (cd "${APP_DIR}" && nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 >"${UVICORN_LOG}" 2>&1 &)
  sleep 2
  log "uvicorn started (logs: ${UVICORN_LOG})"
}

wait_ping() {
  log "waiting for /ping..."
  for i in {1..20}; do
    if curl -s "http://127.0.0.1:8000/ping" | grep -q '"pong"'; then
      log "/ping OK"
      return 0
    fi
    sleep 0.5
  done
  err "app did not respond to /ping"
  tail -n 100 "${UVICORN_LOG}" || true
  exit 1
}

publish() { docker exec -i dora-mqtt sh -lc "mosquitto_pub -t '$1' -m '$2'"; }
redis_last() { docker exec -i dora-redis sh -lc "redis-cli XREVRANGE $1 + - COUNT ${2:-5}"; }

demo_hazard() {
  log "HS2 demo: hazards (gas/water >= threshold notify; smoke < threshold no notify)"
  local now; now=$(date +%s)
  publish "hazard/gas"   "{\"ts\":${now},\"level\":80,\"source\":\"kitchen\"}"
  publish "hazard/water" "{\"ts\":${now},\"level\":95,\"source\":\"bathroom\"}"
  publish "hazard/smoke" "{\"ts\":${now},\"level\":30,\"source\":\"living\"}"
  sleep 1
  log "redis safety_events (recent):"
  redis_last safety_events 6
}

demo_doorbell() {
  log "HS3 demo: doorbell ring (always notify)"
  local now; now=$(date +%s)
  publish "doorbell/ring" "{\"ts\":${now},\"source\":\"front\"}"
  sleep 1
  log "redis safety_events (recent):"
  redis_last safety_events 6
}

demo_entry() {
  log "HS3 demo: door/window opened with AWAY_MODE=${AWAY_MODE}"
  local now; now=$(date +%s)
  publish "sensor/door/front" "{\"ts\":${now},\"state\":\"open\"}"
  publish "sensor/window/bedroom" "{\"ts\":${now},\"state\":\"open\"}"
  sleep 1
  log "redis safety_events (recent):"
  redis_last safety_events 6
}

demo_power() {
  log "Power status demo (offline/online)"
  local now; now=$(date +%s)
  publish "power/status" "{\"ts\":${now},\"state\":\"offline\"}"
  sleep 1
  publish "power/status" "{\"ts\":${now},\"state\":\"online\"}"
  sleep 1
  log "redis safety_events (recent):"
  redis_last safety_events 6
}

demo_fall() {
  log "HS1 demo: fall detection via REST -> MQTT/Redis/Notify"
  local angles='{"angles":[150,150,130,104,100,95,90,85,80,75,70]}'
  curl -s -X POST "http://127.0.0.1:8000/falls" -H 'Content-Type: application/json' -d "${angles}" | tee "${LOG_DIR}/fall_response.json"
  sleep 1
  log "redis falls (recent):"
  redis_last falls 3
}

demo_emergency() {
  log "HS5 demo: emergency trigger (REST + MQTT)"
  curl -s -X POST "http://127.0.0.1:8000/emergency/trigger" -H 'Content-Type: application/json' -d '{"message":"demo"}' | tee "${LOG_DIR}/emergency_response.json"
  sleep 1
  local now; now=$(date +%s)
  publish "emergency/trigger" "{\"ts\":${now},\"message\":\"from-mqtt\"}"
  sleep 1
  log "redis safety_events (recent):"
  redis_last safety_events 6
}

demo_inactivity() {
  log "HS4 demo: inactivity alert"
  export INACTIVITY_MINUTES="${INACTIVITY_MINUTES:-0.1}"  # 6 seconds
  start_app
  wait_ping

  local now; now=$(date +%s)
  publish "sensor/motion/living" "{\"ts\":${now},\"state\":\"active\"}"
  sleep 2
  publish "sensor/motion/living" "{\"ts\":$((now+2)),\"state\":\"active\"}"

  log "waiting ~10s for inactivity alert..."
  sleep 10

  log "redis safety_events (recent):"
  redis_last safety_events 8
}

main() {
  start_deps
  start_app
  wait_ping

  demo_hazard
  demo_doorbell
  demo_entry
  demo_power
  demo_fall
  demo_emergency
  demo_inactivity

  log "demo finished. For live MQTT view, run:"
  echo "  docker exec -it dora-mqtt sh -lc \"mosquitto_sub -t 'hazard/#' -t 'doorbell/ring' -t 'sensor/door/#' -t 'sensor/window/#' -t 'fall/detected' -t 'power/status' -t 'emergency/trigger' -v\""
  log "uvicorn logs (tail):"
  tail -n 80 "${UVICORN_LOG}" || true
}

main "$@"
