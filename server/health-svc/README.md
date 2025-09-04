# Health Monitoring Service (HM)

## 简介
Health Monitoring Service 负责生理指标（如心率/血氧/体温）接入、规则判定、日常提醒/紧急告警、导出（预留）。当前镜像名：`dora/health-svc:<tag>`。


## 运行与依赖
- 依赖：Redis、Mosquitto（MQTT）
- 推荐：通过顶层 `Makefile` 与 compose 运行  
  ```bash
  make down || true
  make up-core-build-tagged
  make wait-all

# API
## 1) GET /ping
    curl -s http://127.0.0.1:8100/ping

# 2) GET /health/live
## 进程活跃状态。

# 3) GET /health/ready
## 就绪检查，包含订阅器/调度器状态、最近一次测量时间戳与指标计数：
{
  "redis": true,
  "mqtt_dns": true,
  "scheduler": true,
  "subscriber": true,
  "last_msg_ts": 1754927061,
  "notify_env": {"has_token": true, "has_chat": true},
  "metrics": {
    "alerts_sent": 2,
    "emergencies_sent": 1,
    "spo2_events": 1,
    "temp_events": 1,
    "last_alert_ts": 1754998163,
    "last_emergency_ts": 1754998154
  }
}


## 指标接入与规则
- 订阅：vitals/ingest（JSON：ts, metric, value, unit, source）
- 已内置规则与冷却：
   - 心率高：HR_HIGH，冷却 HR_ALERT_COOLDOWN_MIN
   - 无测量提醒：窗口 NO_MEASURE_WINDOW_MIN，冷却 REMINDER_COOLDOWN_MIN
   - SpO₂ 低：SPO2_LOW（≤ 触发），冷却 SPO2_ALERT_COOLDOWN_MIN
   - 体温高：TEMP_HIGH（≥ 触发），冷却 TEMP_ALERT_COOLDOWN_MIN
- 调度：默认每 10s 执行一次“无测量提醒”检查（可通过 env 控制启停）

## 通知
- 模板统一前缀：[ALERT] / [EMERGENCY]
- 依赖 .env：TELEGRAM_TOKEN、TELEGRAM_CHAT_ID
- 进程级限流：NOTIFY_COOLDOWN_SEC（默认 10s）

## 演示与自测
python scripts/publish_vitals.py --metric hr   --value 140 --unit bpm
python scripts/publish_vitals.py --metric spo2 --value 90  --unit %
python scripts/publish_vitals.py --metric temp --value 38.6 --unit C
make logs-hm | head

## 关键环境变量（简表）
- 规则：HR_HIGH、HR_LOW、NO_MEASURE_WINDOW_MIN
- 冷却：HR_ALERT_COOLDOWN_MIN、REMINDER_COOLDOWN_MIN
- 调度：START_SUBSCRIBER、START_SCHEDULER、DAILY_SUMMARY_AT
- 通知：NOTIFY_COOLDOWN_SEC、TELEGRAM_*
完整清单见《ENV_VARS.md》。