# TEMPORARY(ONLY FOR MYSELF)
# DORA 事件协议（Module 1：Home Safety & Health）

本文档定义当前实现用到的**最小事件集合**与 Redis Stream 规范，覆盖 HS 的 hazard/fall 与 HM 的 vitals。后续扩展按兼容策略演进。

---

## 1. 作用范围
- 生产者  
  - HS：`POST /falls`（跌倒检测）、MQTT 订阅 `hazard/…` → 安全事件流  
  - HM：`POST /vitals`（体征入库）
- 消费者  
  - TV/TA（看板与联动）、Home Assistant（自动化）、离线分析任务等

---

## 2. MQTT 主题（订阅）
- `hazard/gas`：`{"ts":<unix>,"level":<int|float>,"source":"kitchen"}`  
- `hazard/water`：`{"ts":<unix>,"leak":true,"source":"bathroom"}`  
- `hazard/power`：`{"ts":<unix>,"state":"off|on","source":"grid"}`

说明：HS 订阅以上主题。通过冷却去抖后触发通知与写库。

---

## 3. 安全事件流（HS → Redis Stream）
- **Stream 名**：`SAFETY_STREAM`（默认 `safety_events`）  
- **字段**：单字段 `blob`（字符串），内容为 JSON 对象：
```json
{"ts": 1733728652, "kind": "gas|water|power", "source": "kitchen", "data": {...}}

-示例
XADD safety_events * blob "{\"ts\":1733728652,\"kind\":\"gas\",\"source\":\"kitchen\",\"data\":{\"level\":82,\"ts\":1733728652}}"
```
- 说明
  - data 保留原 MQTT 负载；
  - 冷却期内若被抑制，可扩展 "suppressed": true（兼容）。

## 4. 跌倒流（HS → Redis Stream）
  - 触发：POST /falls
  - Stream 名：falls
  - 字段：单字段 blob，内容为：
```json
{"ts": 1733728652, "angles": [180,175,...], "method": "cv-knee-angle", "source": "lab"}
```
  - 说明：fall 判定为 true 时入库。

## 5. 生命体征流（HM → Redis Stream）
  - Stream 名：VITALS_STREAM（默认 vitals）
  - 字段：单字段 blob，包封格式：
    - 明文：
```json
{"enc": "none", "json": "{\"metric\":\"hr\",\"value\":130,\"unit\":\"bpm\",\"ts\":...}"}
```
    - AES-GCM：
```json
{"enc":"aesgcm","iv":"<b64>","ct":"<b64>"}
``` 
  - 阈值示例：HR_HIGH=120、SPO2_LOW=90、TEMP_HIGH=38.5 → critical:true 时通知。

## 6. 时间戳与可靠性
  - ts 为 Unix 秒（UTC）；客户端若缺省由服务端补齐。
  - Redis 使用 XADD；消费者可使用 XREADGROUP。故障时允许“写库成功/通知失败”的短暂不一致。

## 7. 兼容性
  - 负载不含显式 ver 字段；新增字段保持向后兼容。