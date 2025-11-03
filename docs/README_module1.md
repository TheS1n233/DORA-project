# Module 1 — Home Safety (HS1~HS5)

This module provides the minimum available implementation of home safety: fall (HS1), environmental hazard (HS2), doorbell/window and door (HS3), abnormal stationary (HS4), emergency trigger (HS5), and power status occupancy. Events are triggered via MQTT/REST, uniformly written to Redis Streams, and notified via Telegram/console.


## starting
```bash
# Dependency (first)
pip install -U fastapi uvicorn redis paho-mqtt

# Run dependency container
docker rm -f dora-redis dora-mqtt >/dev/null 2>&1 || true
docker run -d --name dora-redis -p 6379:6379 redis:7-alpine
mkdir -p .local/mosquitto
cat > .local/mosquitto/mosquitto.conf <<'EOF'
listener 1883 0.0.0.0
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_type error warning notice information
EOF
docker run -d --name dora-mqtt -p 1883:1883 \
  -v "$(pwd)/.local/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro" \
  eclipse-mosquitto:2

# Start-up services
export MQTT_HOST=127.0.0.1
export REDIS_HOST=127.0.0.1
export PYTHONPATH="$(pwd)/server/home-safety-svc:${PYTHONPATH}"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

#command for presentation
bash scripts/demo_all.sh
