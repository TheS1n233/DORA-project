set -euo pipefail

# load .env into current shell
set -a
. ./.env
set +a

# 1) start broker
docker compose -f ops/compose/docker-compose.mqtt.yml up -d mosquitto redis

# 2) start services in background and write logs
bash scripts/run_hs_local.sh >logs/hs.log 2>&1 &
bash scripts/run_hm_local.sh >logs/hm.log 2>&1 &
bash scripts/run_tv_local.sh >logs/tv.log 2>&1 &
bash scripts/run_ta_local.sh >logs/ta.log 2>&1 &

echo "[run_all] started. logs in ./logs/"
ps -ef | grep -E "uvicorn .*server/(home-safety-svc|health-svc|tv-svc|tele-assist-svc)" | grep -v grep || true
