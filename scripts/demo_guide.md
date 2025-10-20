# ONLY FOR YUJIE MU USING
# DORA Demo Guide（本地直跑 & Compose）

本指南覆盖四服务（HS/HM/TV/TA）在**本地直跑**与**Compose**两种模式下的一键演示、自检与排障速查。

---

## 1. 前置
- Docker 可用；Python 3.11；根目录存在四个 `scripts/run_*_local.sh`。
- 根 `.env` 中配置好 `TELEGRAM_TOKEN/TELEGRAM_CHAT_ID`（可选）。

---

## 2. 启动（本地直跑）
在四个终端分别执行：
```bash
bash scripts/run_hs_local.sh
bash scripts/run_hm_local.sh
bash scripts/run_tv_local.sh
bash scripts/run_ta_local.sh
```
### 2.1 自检
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

## 3. 演示步骤
### 3.1 hazard → 安全事件 → 通知

```bash
docker compose -f ops/compose/docker-compose.mqtt.yml exec mosquitto \
  mosquitto_pub -h 127.0.0.1 -t hazard/gas \
  -m '{"ts":'$(date +%s)',"level":82,"source":"kitchen"}'

docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  redis-cli XREVRANGE safety_events + - COUNT 3
```
### 3.2 跌倒检测

```bash
curl -s -X POST http://127.0.0.1:8000/falls \
  -H 'Content-Type: application/json' \
  -d '{"angles":[180,175,170,160,150,140,120,100,80,65,50,40,30,25,20],"source":"lab"}' | jq .

docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  redis-cli XREVRANGE falls + - COUNT 3
```
### 3.3 体征入库与 FHIR 导出
```bash
curl -s -X POST http://127.0.0.1:8100/vitals \
  -H 'Content-Type: application/json' \
  -d '{"metric":"hr","value":130,"unit":"bpm","source":"demo"}' | jq .

docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  redis-cli XREVRANGE vitals + - COUNT 3

SINCE=$(( $(date +%s) - 3600 ))
curl -s "http://127.0.0.1:8100/export/fhir?since=${SINCE}&limit=10" | jq '.entry | length'
```
### 3.4 TV/TA 共看 & 语音（基础）
- 打开：
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

## 4. Compose 模式（可选）
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
  up -d
```
↑👆↑👆↑👆↑👆up -d只是直接启动已有的镜像容器
↓👇↓👇↓👇↓👇up -d --build是重建
```bash
docker compose \
  -f ops/compose/docker-compose.mqtt.yml \
  -f ops/compose/docker-compose.hm.yml \
  -f ops/compose/docker-compose.hs.yml \
  -f ops/compose/docker-compose.tv.yml \
  -f ops/compose/docker-compose.ta.yml \
  -f ops/compose/docker-compose.as.yml \
  -f ops/compose/docker-compose.client.yml \
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
- Compose 下请在根 .env 内使用容器内 DNS：MQTT_HOST=mosquitto、REDIS_HOST=redis。

## 5. 排障速查
 - /whoami 分辨端口是否跑对服务；
 - /health/ready 看 mqtt_dns/redis/notify_env；
 - grep stream 枚举 Redis 流名：
```bash
docker compose -f ops/compose/docker-compose.mqtt.yml exec redis \
  sh -lc 'redis-cli --raw keys "*" | while read k; do printf "%s " "$k"; redis-cli --raw type "$k"; done | grep stream'
```

---

## 6. assistant-svc（M3）与 TA 路由
- 启动（本地直跑）：`bash scripts/run_as_local.sh`
- Compose：叠加 `-f ops/compose/docker-compose.as.yml`
- 路由开关（环境变量）：  
  - `TA_INTENT_TARGET=assistant` → TA `/api/intent` 统一转发到 assistant（再转到 TV）  
  - `TA_INTENT_TARGET=tv`（默认） → TA 直转 TV

### 6.1 通过 TA → assistant → TV
```bash
curl -s -X POST "http://127.0.0.1:8300/api/intent?via=assistant" \
  -H 'Content-Type: application/json' \
  -d '{"text":"play","room":"demo","cowatch":1}' | jq .
```
### 预期：8200 出现 INTENT 与 COWATCH 卡片（已加入房间时），并播报（Auto TTS=ON）。
## 6.2 直接 TA → TV
```bash
curl -s -X POST "http://127.0.0.1:8300/api/intent?via=tv" \
  -H 'Content-Type: application/json' \
  -d '{"text":"pause","room":"demo","cowatch":1}' | jq .
```

---

## 7. 快速呼叫占位（M4）
- TA 后端提供：`POST /api/call/start|answer|hang`（体：`{"room":"demo"}`；可选 `url` 指定会议地址）
- TV 前端：收到 `cowatch` 的 `action: call|answer|hang` 时，显示/隐藏振铃覆盖层，并在 Answer 后显示一个占位的视频通话（Jitsi iframe）。

### 7.1 发起/应答/挂断
```bash
curl -s -X POST http://127.0.0.1:8300/api/call/start \
  -H 'Content-Type: application/json' -d '{"room":"demo"}' | jq .

curl -s -X POST http://127.0.0.1:8300/api/call/answer \
  -H 'Content-Type: application/json' -d '{"room":"demo"}' | jq .

curl -s -X POST http://127.0.0.1:8300/api/call/hang \
  -H 'Content-Type: application/json' -d '{"room":"demo"}' | jq .
```
### 备注：Jitsi 仅作占位；后续可替换为本地 WebRTC。