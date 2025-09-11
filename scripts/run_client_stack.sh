#!/usr/bin/env bash
# English comments only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 1) ensure external network exists
docker network create compose_dora-net >/dev/null 2>&1 || true

# 2) compose up: infra + tv + ta + client
docker compose \
  -f "$ROOT/ops/compose/docker-compose.mqtt.yml" \
  -f "$ROOT/ops/compose/docker-compose.tv.yml" \
  -f "$ROOT/ops/compose/docker-compose.ta.yml" \
  -f "$ROOT/ops/compose/docker-compose.client.yml" \
  up --build -d

echo "[OK] dora client stack is up:"
echo " - Client:           http://localhost:3000"
echo " - TV service:       http://localhost:8200/health/live"
echo " - Tele-assist svc:  http://localhost:8300/healthz"
echo " - MQTT:             tcp://localhost:1883"
echo " - Redis:            redis://localhost:6379"
