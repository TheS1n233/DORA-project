# Home Assistant 模拟数据实体说明

## 概述

本文档记录了DORA项目中Home Assistant（HA）中通过 `input_number` 计数器模拟的健康和环境数据实体。这些实体通过自动化每分钟更新一次，用于演示和测试目的。

## 自动化配置

所有模拟数据通过以下自动化配置每分钟更新一次：

```yaml
automation:
  - alias: "模拟数据更新"
    description: "每60秒更新一次模拟数据"
    trigger:
      - platform: time_pattern
        minutes: "/1"  # 每1分钟触发一次
    action:
      # 各种数据更新动作...
```

## 模拟数据实体列表

### 1. 健康监测数据

#### 体温 (Body Temperature)
- **实体ID**: `input_number.dora_body_temperature_c`
- **说明**: 身体温度，单位摄氏度
- **模拟范围**: 30.0℃ - 45.0℃
- **更新频率**: 每分钟

#### 皮肤电活动 (Electrodermal Activity)
- **实体ID**: `input_number.dora_eda_usiemens`
- **说明**: 皮肤电活动，单位微西门子
- **模拟范围**: 0.0 - 20.0 μS
- **更新频率**: 每分钟

#### 血糖 (Glucose)
- **实体ID**: `input_number.dora_glucose_mgdl`
- **说明**: 血糖浓度，单位 mg/dL
- **模拟范围**: 40 - 140 mg/dL
- **更新频率**: 每分钟

#### 心率 (Heart Rate)
- **实体ID**: `input_number.dora_heart_rate_bpm`
- **说明**: 心率，单位 bpm
- **模拟范围**: 60 - 100 bpm
- **更新频率**: 每分钟

#### 心率变异性 (Heart Rate Variability)
- **实体ID**: `input_number.dora_hrv_rmssd_ms`
- **说明**: 心率变异性 RMSSD，单位毫秒
- **模拟范围**: 10 - 110 ms
- **更新频率**: 每分钟

#### 血氧饱和度 (SpO2)
- **实体ID**: `input_number.dora_spo2_percent`
- **说明**: 血氧饱和度，单位百分比
- **模拟范围**: 90% - 100%
- **更新频率**: 每分钟

#### 睡眠质量评分 (Sleep Score)
- **实体ID**: `input_number.dora_sleep_score`
- **说明**: 睡眠质量评分
- **模拟范围**: 60 - 90 分
- **更新频率**: 每分钟

#### 步数 (Steps)
- **实体ID**: `input_number.dora_steps_today`
- **说明**: 今日步数
- **模拟范围**: 0 - 5000 步
- **更新频率**: 每分钟

### 2. 环境监测数据

#### 室内温度 (Indoor Temperature)
- **实体ID**: `input_number.dora_indoor_temp_c`
- **说明**: 室内温度，单位摄氏度
- **模拟范围**: 15.0℃ - 40.0℃
- **更新频率**: 每分钟

#### 室内湿度 (Indoor Humidity)
- **实体ID**: `input_number.dora_indoor_humidity_percent`
- **说明**: 室内湿度，单位百分比
- **模拟范围**: 0% - 100%
- **更新频率**: 每分钟

#### 气体浓度 (Gas Concentration)
- **实体ID**: `input_number.dora_gas_ppm`
- **说明**: 气体浓度，单位 ppm
- **模拟范围**: 0 - 500 ppm
- **更新频率**: 每分钟

### 3. 血压监测数据（手动设置）

#### 收缩压 (Systolic Blood Pressure)
- **实体ID**: `input_number.bp_systolic`
- **说明**: 收缩压，单位 mmHg
- **数据来源**: 手动设置或外部设备
- **更新频率**: 手动触发

#### 舒张压 (Diastolic Blood Pressure)
- **实体ID**: `input_number.bp_diastolic`
- **说明**: 舒张压，单位 mmHg
- **数据来源**: 手动设置或外部设备
- **更新频率**: 手动触发

#### 脉搏 (Pulse)
- **实体ID**: `input_number.pulse`
- **说明**: 脉搏，单位 bpm
- **数据来源**: 手动设置或外部设备
- **更新频率**: 手动触发

## 数据访问方式

### 通过HA API访问
```bash
# 获取单个实体状态
curl -H "Authorization: Bearer <HA_TOKEN>" \
  http://localhost:8123/api/states/input_number.dora_heart_rate_bpm

# 获取所有实体状态
curl -H "Authorization: Bearer <HA_TOKEN>" \
  http://localhost:8123/api/states
```

### 通过DORA HA数据读取服务访问
```bash
# 获取血压数据
curl http://localhost:9098/api/bp-data

# 获取所有实体列表
curl http://localhost:9098/api/entities
```

## 数据格式示例

### 单个实体状态
```json
{
  "entity_id": "input_number.dora_heart_rate_bpm",
  "state": "75",
  "attributes": {
    "unit_of_measurement": "bpm",
    "friendly_name": "Heart Rate",
    "min": 0,
    "max": 200,
    "step": 1
  },
  "last_changed": "2025-01-01T10:30:00.000Z",
  "last_updated": "2025-01-01T10:30:00.000Z"
}
```

### 血压数据组合
```json
{
  "success": true,
  "timestamp": "2025-01-01T10:30:00.000Z",
  "data": {
    "systolic": {
      "state": "120",
      "attributes": {...},
      "last_changed": "..."
    },
    "diastolic": {
      "state": "80", 
      "attributes": {...},
      "last_changed": "..."
    },
    "pulse": {
      "state": "75",
      "attributes": {...},
      "last_changed": "..."
    }
  }
}
```

## 注意事项

1. **模拟数据**: 所有数据都是通过随机数生成的模拟数据，仅用于演示和测试
2. **更新频率**: 大部分数据每分钟更新一次，血压数据需要手动设置
3. **数据范围**: 所有模拟数据都在合理的生理范围内
4. **单位**: 每个实体都有明确的单位标识
5. **持久化**: 数据会保存在HA的状态中，重启后保持

## 相关服务

- **HA数据读取服务**: `http://localhost:9098` - 提供血压数据API
- **健康监测服务**: `http://localhost:8088` - 处理健康数据存储
- **前端代理**: `http://localhost:5173` - 前端访问HA数据的代理

## 更新历史

- **2025-01-01**: 初始创建，包含所有模拟数据实体
- **2025-01-01**: 添加血压监测实体说明
- **2025-01-01**: 完善数据格式示例和访问方式
