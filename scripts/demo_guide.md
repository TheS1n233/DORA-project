# ONLY FOR YUJIE MU USING
# DORA Demo Guide (Local Run & Compose)

This guide covers one-click demos, self-checks, and troubleshooting for four services (HS/HM/TV/TA) in both **Local Run** and **Compose** modes.

---

## 1. Prerequisites
- Docker available; Python 3.11; four `scripts/run_*_local.sh` files exist in root directory.
- Configure `TELEGRAM_TOKEN/TELEGRAM_CHAT_ID` in root `.env` (optional).

---

## 2. Startup (Local Run)
Execute in four separate terminals:
```bash
bash scripts/run_hs_local.sh
bash scripts/run_hm_local.sh
bash scripts/run_tv_local.sh
bash scripts/run_ta_local.sh
```
### 2.1 Self-Check
```bash
# HS
curl -s http://127.0.0.1:8000/whoami | jq .
curl -s http://127.0.0.1:8000/health/ready | jq .
# HM
curl -s http://127.0.0.1:8100/health/ready | jq .
# TV/TA
curl -s http://127.0.0.1:8200/whoami | jq .
curl -s http://127.0.0.1:8300/whoami | jq .
```

## 3. Demo Steps
### 3.1 hazard → Safety Event → Notification

```bash
docker compose -f ops/compose/docker-compose.mqtt.yml exec mosquitto \
  mosquitto_pub -h 127.0.0.1 -t hazard/gas \
  -m '{"ts":'$(date +%s)',"level":82,"source":"kitchen"}'

docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  redis-cli XREVRANGE safety_events + - COUNT 3
```
### 3.2 Fall Detection

```bash
curl -s -X POST http://127.0.0.1:8000/falls \
  -H 'Content-Type: application/json' \
  -d '{"angles":[180,175,170,160,150,140,120,100,80,65,50,40,30,25,20],"source":"lab"}' | jq .

docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  redis-cli XREVRANGE falls + - COUNT 3
```
### 3.3 Vital Signs Storage and FHIR Export
```bash
curl -s -X POST http://127.0.0.1:8100/vitals \
  -H 'Content-Type: application/json' \
  -d '{"metric":"hr","value":130,"unit":"bpm","source":"demo"}' | jq .

docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  redis-cli XREVRANGE vitals + - COUNT 3

SINCE=$(( $(date +%s) - 3600 ))
curl -s "http://127.0.0.1:8100/export/fhir?since=${SINCE}&limit=10" | jq '.entry | length'
```
### 3.4 TV/TA Co-watch & Voice (Basic)
- Open:
    - TV: http://127.0.0.1:8200/static/index.html?room=demo
    - TA: http://127.0.0.1:8300/static/index.html?room=demo
```bash
curl -s -X POST http://127.0.0.1:8300/api/intent \
  -H 'Content-Type: application/json' \
  -d '{"text":"load https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4","room":"demo"}' | jq .

curl -s -X POST http://127.0.0.1:8300/api/intent \
  -H 'Content-Type: application/json' \
  -d '{"text":"play","room":"demo"}' | jq .
```

## 4. Compose Mode (Optional)
```bash
docker compose \
  -f ops/compose/docker-compose.ha.yml \
  -f ops/compose/docker-compose.hs.yml \
  -f ops/compose/docker-compose.hm.yml \
  -f ops/compose/docker-compose.tv.yml \
  -f ops/compose/docker-compose.ta.yml \
  -f ops/compose/docker-compose.as.yml \
  -f ops/compose/docker-compose.client.yml \
  -f ops/compose/docker-compose.ha-reader.yml \
  -f ops/compose/docker-compose.ta-logger.yml \
  up -d
```
↑👆↑👆↑👆↑👆 `up -d` only starts existing image containers directly
↓👇↓👇↓👇↓👇 `up -d --build` rebuilds
```bash
docker compose \
  -f ops/compose/docker-compose.ha.yml \
  -f ops/compose/docker-compose.hs.yml \
  -f ops/compose/docker-compose.hm.yml \
  -f ops/compose/docker-compose.tv.yml \
  -f ops/compose/docker-compose.ta.yml \
  -f ops/compose/docker-compose.as.yml \
  -f ops/compose/docker-compose.client.yml \
  -f ops/compose/docker-compose.ha-reader.yml \
  -f ops/compose/docker-compose.ta-logger.yml \
  up -d --build
```

```bash
docker compose \
  -f ops/compose/docker-compose.mqtt.yml \
  -f ops/compose/docker-compose.tv.yml \
  -f ops/compose/docker-compose.ta.yml \
  -f ops/compose/docker-compose.hm.yml \
  -f ops/compose/docker-compose.hs.yml \
  -f ops/compose/docker-compose.as.yml \
  up -d --force-recreate --no-deps tele-assist-svc
```
- In Compose mode, use container DNS in root .env: MQTT_HOST=mosquitto, REDIS_HOST=redis.

## 5. Troubleshooting Quick Reference
 - /whoami to identify which service is running on which port;
 - /health/ready to check mqtt_dns/redis/notify_env;
 - grep stream to enumerate Redis stream names:
```bash
docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  sh -lc 'redis-cli --raw keys "*" | while read k; do printf "%s " "$k"; redis-cli --raw type "$k"; done | grep stream'
```

---

## 6. assistant-svc (M3) and TA Routing
- Startup (local run): `bash scripts/run_as_local.sh`
- Compose: add `-f ops/compose/docker-compose.as.yml`
- Route switch (environment variable):  
  - `TA_INTENT_TARGET=assistant` → TA `/api/intent` forwards to assistant (then to TV)  
  - `TA_INTENT_TARGET=tv` (default) → TA forwards directly to TV

### 6.1 Via TA → assistant → TV
```bash
curl -s -X POST "http://127.0.0.1:8300/api/intent?via=assistant" \
  -H 'Content-Type: application/json' \
  -d '{"text":"play","room":"demo","cowatch":1}' | jq .
```
### Expected: 8200 shows INTENT and COWATCH cards (when room is joined), and broadcasts (Auto TTS=ON).
## 6.2 Direct TA → TV
```bash
curl -s -X POST "http://127.0.0.1:8300/api/intent?via=tv" \
  -H 'Content-Type: application/json' \
  -d '{"text":"pause","room":"demo","cowatch":1}' | jq .
```

---

## 7. Quick Call Placeholder (M4)
- TA backend provides: `POST /api/call/start|answer|hang` (body: `{"room":"demo"}`; optional `url` to specify meeting address)
- TV frontend: when receiving `cowatch` with `action: call|answer|hang`, show/hide ring overlay, and after Answer, show a placeholder video call (Jitsi iframe).

### 7.1 Initiate/Answer/Hang Up
```bash
curl -s -X POST http://127.0.0.1:8300/api/call/start \
  -H 'Content-Type: application/json' -d '{"room":"demo"}' | jq .

curl -s -X POST http://127.0.0.1:8300/api/call/answer \
  -H 'Content-Type: application/json' -d '{"room":"demo"}' | jq .

curl -s -X POST http://127.0.0.1:8300/api/call/hang \
  -H 'Content-Type: application/json' -d '{"room":"demo"}' | jq .
```
### Note: Jitsi is only a placeholder; can be replaced with local WebRTC later.

---

## 8. Co-Watch Synchronized Viewing Demo (FR4.5)

### 8.1 Start Co-Watch Related Services
```bash
# Start session audit log service
docker compose -f ops/compose/docker-compose.ta-logger.yml up -d --build

# Check service status
curl -s http://127.0.0.1:8088/events | jq .
```

### 8.2 Web Operator Console
1. Open web console: http://127.0.0.1:3000
2. Connect to LiveKit room (as leader)
3. In CoWatchController, enter media URL (e.g.: https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4)
4. Click "Load Media" → "Play"

### 8.3 Android TV End Synchronization
1. Start Android TV application
2. Connect to the same LiveKit room (as follower)
3. Observe ExoPlayer automatically synchronize playback

### 8.4 Acceptance Testing
```bash
# Check RTT logs
curl -s "http://127.0.0.1:8088/events?room=room-dora" | jq '.items[] | select(.event == "rtt")'

# Test synchronization accuracy (using phone stopwatch)
# 1. Web end clicks play
# 2. Measure time difference when TV end starts playing
# 3. Expected: ≤ 3 seconds synchronization, playback deviation < 1 second
```

### 8.5 Screen Share Mode
- Web end clicking "Start Screen Share" can replace URL synchronization
- TV end automatically receives screen share stream
- Supports system audio transmission (if browser supports)