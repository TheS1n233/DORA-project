# TEMPORARY(ONLY FOR MYSELF)
# DORA 事件协议（Module 1: Home Safety）

本文档规定 Home Safety 模块在“跌倒检测”场景下的事件发布与消费协议，覆盖 MQTT 主题、JSON 负载、时间戳与可靠性约定，以及 Redis Stream 的补充规范。该文档仅描述当前实现所需的最小集合，后续扩展将按兼容策略演进。

---

## 1. 作用范围

- 生产者（Producer）
  - server/home-safety-svc 提供的：
    - REST 路由：`POST /falls`
    - CLI 工具：`server/home-safety-svc/cli/stream_detect.py`
- 消费者（Consumer）
  - Home Assistant（后续集成）
  - 其他内部微服务（通知、统计等）

---

## 2. MQTT 主题

- 主题（Topic）：`fall/detected`
- 语义：仅在**检测结果为跌倒（fall=true）**时发布一条事件；不发布“未跌倒”事件。
- 命名空间：后续如需按住户/设备区分，可在网关侧做主题前缀扩展（例如 `dora/<household_id>/fall/detected`），当前版本不强制。

---

## 3. 消息负载（JSON Schema）

### 3.1 字段定义

| 字段名   | 类型     | 必填 | 说明                                                                 |
|----------|----------|------|----------------------------------------------------------------------|
| ts       | integer  | 是   | 事件产生时间的 UNIX Epoch（秒，UTC）。显示层面按 Europe/Rome 转换。   |
| fall     | boolean  | 是   | 固定为 `true`。当前版本仅发布“确认为跌倒”的事件。                     |
| angles   | number[] | 否   | 检测窗口内的膝关节角度序列（单位：度，建议范围 0–180）。               |
| method   | string   | 是   | 检测方法标识。当前固定 `"cv-knee-angle"`。                            |

说明：
- `angles` 为可选字段；若存在，序列长度≥1。用于事后审计与可视化。
- `ts` 由生产者产生；消费者不得改写。

### 3.2 示例

```json
{
  "ts": 1733728652,
  "fall": true,
  "angles": [174.2, 171.8, 165.5, 142.3, 118.9, 96.4, 88.1, 91.0, 90.5],
  "method": "cv-knee-angle"
}
```

---

## 4. 发布策略

- 触发条件：当检测函数判定 `fall == true` 时立即发布。
- 去抖/冷却：生产者**应**在连续触发间隔内进行抑制（CLI 默认冷却 10 秒）。服务端 REST 路由不强制，但上游调用方应避免风暴。
- 幂等性：同一实际事件可能因重试导致重复发布；消费者**应**以时间窗口+相似度去重（例如同源设备在 10 秒内仅取首条）。
- 时序：允许乱序；消费者以 `ts` 为准进行排序。

---

## 5. 可靠性与保留

- QoS：默认 `0`（最多一次）。可按需提升为 `1`。
- Retain：默认 `false`。避免历史告警在新订阅时重复弹出。
- Broker：默认连接 `MQTT_HOST=localhost`，`MQTT_PORT=1883`；可通过环境变量覆盖。

---

## 6. 环境变量（生产者侧）

| 变量名           | 默认值         | 说明                         |
|------------------|----------------|------------------------------|
| MQTT_HOST        | `localhost`    | MQTT 服务器主机名/IP         |
| MQTT_PORT        | `1883`         | 端口                         |
| MQTT_KEEPALIVE   | `60`           | keepalive 秒数               |
| MQTT_TOPIC_FALL  | `fall/detected`| 事件主题                     |
| MQTT_QOS         | `0`            | 发送 QoS 等级（0/1/2）       |
| MQTT_RETAIN      | `false`        | 是否保留消息                 |
| MQTT_USER        | （未设置）     | 可选用户名                   |
| MQTT_PASS        | （未设置）     | 可选密码                     |

---

## 7. Redis Stream（附录）

用于内部服务消费与离线分析的补充通道，当前由 REST 路由在“fall=true”时写入。

- Stream 名称：`falls`
- 条目字段：

| 字段名 | 类型    | 说明                                 |
|-------|---------|--------------------------------------|
| ts    | integer | 与 MQTT 消息相同的 Epoch 秒（UTC）    |
| angles| string  | 角度序列的 JSON 字符串（兼容现实现）  |
| method| string  | 与 MQTT 消息相同                      |

示例（逻辑视图）：
```
XADD falls * ts=1733728652 angles="[174.2,171.8,...]" method="cv-knee-angle"
```

注意：
- Redis 内部暂不存储 `fall` 字段（默认为 true 的语义）；如后续需要，也可补充字段，保持向后兼容。

---

## 8. 兼容性与版本策略

- 版本字段：当前负载**未包含**显式 `ver` 字段；默认视为 `v1`。后续若引入 `ver`，不设置时等价于 `1`。
- 向后兼容：新增**可选**字段（如 `source`, `patient_id`）不影响既有消费者；新增**必填**字段或修改语义需提升主版本并公告。
- 主题演进：未来如引入分区/多主体，可通过主题前缀或多主题策略实现（例如 `dora/<household_id>/fall/detected`），消费者可订阅通配符。

---

## 9. 安全与隐私

- 不在消息体中包含可识别个人身份的信息（PII）。
- 若必须加入主体标识，应使用**脱敏或匿名化**标识，并在安全通道内下发映射。
- 如启用鉴权，建议使用独立的 MQTT 账户，并设定最小订阅/发布权限。

---

## 10. 验证方式（开发期）

- 订阅：
  ```
  mosquitto_sub -h <host> -p <port> -t fall/detected -v
  ```
- 触发（示例）：
  - 运行 CLI：`python -m server.home_safety_svc.cli.stream_detect --camera 0`
  - 或调用 REST：`POST /falls`，传入角度序列（详见服务 API）

---

## 11. 变更日志

- v1（当前）
  - 定义 `fall/detected` 主题与最小 JSON 负载。
  - 规定 `ts` 为 Epoch 秒（UTC），显示时区为 Europe/Rome。
  - 指定 QoS=0、Retain=false 为默认。
  - 补充 Redis Stream 附录（`falls`，字段与 MQTT 对齐）。

# EOF
