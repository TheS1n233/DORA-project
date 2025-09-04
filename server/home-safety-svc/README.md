# only use for yujie
# Home Safety Service (HS)

## 简介
Home Safety Service 负责环境危险/跌倒检测与告警，提供 REST API、MQTT 事件发布以及 Telegram 通知。当前镜像名：`dora/home-safety-svc:<tag>`。

## 运行与依赖
- 依赖：Redis、Mosquitto（MQTT）
- 推荐：通过顶层 `Makefile` 与 compose 运行  
  ```bash
  # English comments only
  make down || true
  make up-core-build-tagged
  make wait-all


# API
## 1) GET /ping 
- 健康探活。
  curl -s http://127.0.0.1:8000/ping

## 2) GET /health/live
- 进程活跃状态。
  curl -s http://127.0.0.1:8000/health/live

## 3) GET /health/ready
- 就绪检查，返回 Redis/MQTT、订阅器以及指标计数：
{
  "redis": true,
  "mqtt_dns": true,
  "subscriber": true,
  "notify_env": {"has_token": true, "has_chat": true},
  "metrics": {
    "falls_detected": 1,
    "angles_detected": 1,
    "frame_detected": 0,
    "hazards_detected": 1,
    "gas_detected": 1,
    "water_detected": 0,
    "power_detected": 0,
    "last_fall_ts": 1754915039,
    "last_hazard_ts": 1754997000
  }
}


## 4) POST /falls（角度序列）
  curl -s -X POST http://127.0.0.1:8000/falls \
  -H 'Content-Type: application/json' \
  -d '{"angles":[150,150,130,104,100,95,90,85,80,75,70], "source":"camera/living"}'

## 返回
 {"fall": true, "ts": 1754915039}

 校验：angles 为 1~200 长度、元素范围 [0,180]；超限 413/422。

 ## 5) POST /falls/frame（单帧 Base64）
  scripts/test_frame.sh               # tiny 测试（返回 false）
  scripts/test_frame.sh path/to.jpg   # 指定图片

## 返回：与 /falls 一致；若缺少 CV 依赖则 501。

# 环境危险（MQTT 订阅 → 去抖/阈值 → 通知）
- 订阅主题：hazard/+（gas/water/power）
- 典型 payload：
    - Gas：{"ts":..., "level":80, "source":"kitchen"}（level≥HS_GAS_WARN_LEVEL 触发）

    - Water：{"ts":..., "state":"leak", "source":"bath"}

    - Power：{"ts":..., "state":"outage", "source":"grid"}
- 去抖（冷却）：按种类与来源（source）做 Redis key 去重与 TTL；冷却期内抑制重复通知。
- 相关环境变量：HS_GAS_WARN_LEVEL、HS_COOLDOWN_GAS_MIN、HS_COOLDOWN_WATER_MIN、HS_COOLDOWN_POWER_MIN、HS_START_SUBSCRIBER。

# 事件与通知
- MQTT：fall/detected，payload 与 event_protocol.md 保持一致（ts, fall, method, source, angles(可截断)）
- Redis Stream：falls（已启用 MAXLEN≈1000）
- Telegram：启用需 .env 中设置 TELEGRAM_TOKEN 与 TELEGRAM_CHAT_ID

## 自测
  make smoke-hs
  python scripts/publish_hazard.py --type gas --level 80 --source kitchen

## 关键环境变量（简表）
- ANGLES_MAX_LEN（默认 200）
- FRAME_B64_MAX_MB（默认 5）
- FALLS_STREAM_MAXLEN / FALLS_STREAM_GROUP
- NOTIFY_COOLDOWN_SEC（默认 10）
- 通用：MQTT_HOST、REDIS_HOST、TELEGRAM_TOKEN、TELEGRAM_CHAT_ID
完整清单见《ENV_VARS.md》。