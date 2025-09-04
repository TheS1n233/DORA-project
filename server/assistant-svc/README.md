# assistant-svc

最小语音/意图中枢（M3）。当前功能：
- `/whoami`、`/health/ready`
- `POST /intent`：将 `{text, room, cowatch?}` 透传到 tv-svc `/api/intent?broadcast=1[&cowatch=1]`
- `POST /tts`：最小 TTS 代理（以 INTENT 形态转给 TV；TV 端开启 Auto TTS 则播报）
- `POST /stt`：占位接口，返回占位转写结果

## 本地直跑
```bash
bash scripts/run_as_local.sh
```

## Compose（与既有 mqtt/redis/tv/ta/hm/hs 一并）
```bash
docker compose \
  -f ops/compose/docker-compose.mqtt.yml \
  -f ops/compose/docker-compose.tv.yml \
  -f ops/compose/docker-compose.ta.yml \
  -f ops/compose/docker-compose.hm.yml \
  -f ops/compose/docker-compose.hs.yml \
  -f ops/compose/docker-compose.as.yml \
  up -d
```


## 自测
```bash
# INTENT -> TV 显示卡片（房间可选）
curl -s -X POST http://127.0.0.1:8400/intent \
  -H 'Content-Type: application/json' \
  -d '{"text":"play","room":"demo","cowatch":1}' | jq .

# TTS -> TV 自动播报（需 TV 页面开启 Auto TTS）
curl -s -X POST http://127.0.0.1:8400/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"hello from assistant","room":"demo"}' | jq .
```
## 环境变量
- TV_HOSTNAME（默认 tv-svc）
- TV_PORT（默认 8200）

# 可选的一键验证（Compose 下）
```bash
# English comments only
# Start only assistant-svc alongside tv-svc stack
docker compose \
  -f ops/compose/docker-compose.mqtt.yml \
  -f ops/compose/docker-compose.tv.yml \
  -f ops/compose/docker-compose.as.yml \
  up -d

# Health check
curl -s http://127.0.0.1:8400/health/ready | jq .

# Trigger
curl -s -X POST http://127.0.0.1:8400/intent \
  -H 'Content-Type: application/json' \
  -d '{"text":"pause","room":"demo","cowatch":1}' | jq .
```
# Recreate 单独重建tele-assist-svc
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