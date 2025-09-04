# only use for yujie
# 环境变量清单（ENV_VARS）

> 约定  
> - **本地直跑**：四个启动脚本会强制将 `MQTT_HOST/REDIS_HOST` 设为 `127.0.0.1`（除非显式 `DOCKER_NET=1`）。  
> - **Compose/容器网络**：使用根 `.env` 中的容器内 DNS（`mosquitto` / `redis`），由 `docker compose --env-file .env` 注入。  
> - `.env.example` 仅示例，不会被代码自动加载；根 `.env` 请勿提交到仓库。

---

## 通用（所有服务适用）
- `MQTT_HOST`：MQTT 主机名  
  - 本地直跑：`127.0.0.1`（由脚本覆盖）  
  - Compose：`mosquitto`（容器内 DNS）
- `MQTT_PORT`：MQTT 端口，默认 `1883`
- `REDIS_HOST`：Redis 主机名  
  - 本地直跑：`127.0.0.1`（由脚本覆盖）  
  - Compose：`redis`（容器内 DNS）
- `REDIS_PORT`：Redis 端口，默认 `6379`
- `TELEGRAM_TOKEN`：Telegram Bot Token（可选；启用通知则必填）
- `TELEGRAM_CHAT_ID`：Telegram Chat ID（可选；启用通知则必填）
- `NOTIFY_COOLDOWN_SEC`：全局通知去抖，默认 `10`

---

## Home Safety Service（HS）
- **安全事件流**  
  - `SAFETY_STREAM`：安全事件写入的 Redis Stream 名，默认 `safety_events`
- **跌倒检测（/falls）**  
  - 内部使用“膝角法”判定，REST 体见《事件协议》
- **订阅线程**  
  - `START_SUBSCRIBER`：是否订阅 MQTT 事件，默认 `true`
- **调度/定时**  
  - `START_SCHEDULER`：是否启用定时任务，默认 `true`

---

## Health Service（HM）
- **生命体征流**  
  - `VITALS_STREAM`：生命体征写入的 Redis Stream 名，默认 `vitals`
  - `HM_AES_KEY`：可选的 32 字节密钥（base64 或 hex）用于 AES-GCM 包封；缺省则明文 JSON（`enc:"none"`）
- **阈值（示例）**  
  - `HR_HIGH`（默认 `120`）、`SPO2_LOW`（默认 `90`）、`TEMP_HIGH`（默认 `38.5`）
- **订阅/调度**  
  - `START_SUBSCRIBER`、`START_SCHEDULER`：同 HS，默认 `true`

---

## TV Service（TV）
- 依赖 `MQTT_HOST/REDIS_HOST`；内置 WS 房间广播（详见 README）

---


## Tele Assist Service（TA）
- `TV_HOSTNAME`：TV 服务主机名  
  - 本地直跑：`127.0.0.1`（由脚本覆盖）  
  - Compose：`tv-svc`
- `TV_PORT`：TV 端口，默认 `8200`
- `TA_INTENT_TARGET`：意图路由目标（`tv`｜`assistant`），默认 `tv`  
  - `tv`：TA 直接转发到 `tv-svc /api/intent`  
  - `assistant`：TA 转发到 `assistant-svc /intent`，由 assistant 再转 `tv-svc`
- `ASSISTANT_HOSTNAME`：assistant-svc 主机名，默认 `assistant-svc`
- `ASSISTANT_PORT`：assistant-svc 端口，默认 `8400`

## 运行模式速记
- 本地直跑：四脚本会输出 `[boot] MQTT_HOST=... REDIS_HOST=...` 用于自查，whoami 在 `/:8000/8100/8200/8300`。  
- Compose：推荐使用 `docker compose -f ops/compose/docker-compose.mqtt.yml -f ... up -d`。

---

## 常见故障速查
- Telegram 无消息：查看 `/health/ready` 的 `notify_env`；确认四脚本已 `set -a; . ./.env; set +a` 注入根 `.env`。  
- MQTT/Redis 不通：`/health/ready` 看 `mqtt_dns/redis`；`docker exec` 内部 `mosquitto_pub`/`redis-cli PING` 验证。  
- 端口跑错服务：访问 `/:port/whoami` 直观确认（`service: hs|hm|tv|ta`）。  
