# Care.html 中显示的 Home Assistant 数据总结

## 概述

在 `care.html`（管理员/护理人员界面）中显示的所有数据都来自 Home Assistant (HA)，通过 `/api/health-data` API 接口获取。这些数据分为三大类：**健康监测数据**、**血压数据**和**环境监测数据**。

---

## 📊 数据分类说明

### 1. 🏥 健康监测数据 (Health Metrics)

这些是实时监测老年人的生理指标数据：

#### 🌡️ 体温 (Body Temperature)
- **HA实体ID**: `input_number.dora_body_temperature_c`
- **单位**: 摄氏度 (°C)
- **用途**: 监测身体温度，用于检测发热、低体温等异常情况
- **正常范围**: 36.0°C - 37.5°C
- **异常提示**:
  - ≥ 37.5°C: ⚠️ 发热警告（黄色）
  - < 36.0°C: ❌ 低体温危险（红色）

#### 💓 心率 (Heart Rate)
- **HA实体ID**: `input_number.dora_heart_rate_bpm`
- **单位**: 次/分钟 (bpm)
- **用途**: 监测心跳频率，反映心血管健康状态
- **正常范围**: 60-100 bpm
- **异常提示**:
  - ≥ 100 bpm: ⚠️ 心率过快（黄色）
  - < 60 bpm: ⚠️ 心率过慢（黄色）

#### 🫁 血氧饱和度 (SpO2)
- **HA实体ID**: `input_number.dora_spo2_percent`
- **单位**: 百分比 (%)
- **用途**: 监测血液中氧气含量，对呼吸系统健康至关重要
- **正常范围**: 95%-100%
- **异常提示**:
  - < 95%: ❌ 血氧偏低危险（红色）
  - 95%-98%: ⚠️ 轻微偏低（黄色）

#### 🩸 血糖 (Glucose)
- **HA实体ID**: `input_number.dora_glucose_mgdl`
- **单位**: 毫克/分升 (mg/dL)
- **用途**: 监测血糖浓度，对糖尿病患者尤为重要
- **正常范围**: 70-140 mg/dL
- **异常提示**:
  - ≥ 140 mg/dL: ⚠️ 高血糖（黄色）
  - < 70 mg/dL: ⚠️ 低血糖（黄色）

#### 📊 心率变异性 (HRV - Heart Rate Variability)
- **HA实体ID**: `input_number.dora_hrv_rmssd_ms`
- **单位**: 毫秒 (ms)
- **用途**: 评估自主神经系统功能和压力水平
- **正常范围**: 约 10-110 ms（因人而异）
- **说明**: HRV值越高通常表示压力越小、恢复能力越好

#### ⚡ 皮肤电活动 (EDA - Electrodermal Activity)
- **HA实体ID**: `input_number.dora_eda_usiemens`
- **单位**: 微西门子 (μS)
- **用途**: 监测皮肤电导率变化，反映情绪、压力、警觉性
- **正常范围**: 0-20 μS
- **说明**: EDA升高可能表示紧张、兴奋或压力增加

#### 😴 睡眠质量评分 (Sleep Score)
- **HA实体ID**: `input_number.dora_sleep_score`
- **单位**: 分数（无单位）
- **用途**: 综合评估睡眠质量，帮助了解休息恢复情况
- **正常范围**: 60-90 分
- **说明**: 分数越高表示睡眠质量越好

#### 👟 今日步数 (Steps Today)
- **HA实体ID**: `input_number.dora_steps_today`
- **单位**: 步数（无单位）
- **用途**: 追踪日常活动量，评估运动水平
- **正常范围**: 因人而异（通常建议每日 5000-10000 步）
- **说明**: 步数过低可能表示缺乏活动或行动不便

---

### 2. 💓 血压数据 (Blood Pressure)

这些数据通常由血压计设备测量后手动或自动上传到 HA：

#### 🔴 收缩压 (Systolic)
- **HA实体ID**: `input_number.bp_systolic`
- **单位**: 毫米汞柱 (mmHg)
- **用途**: 心脏收缩时动脉血管内的最高压力
- **正常范围**: 90-140 mmHg
- **异常提示**: 
  - ≥ 140 mmHg: ⚠️ 高血压
  - < 90 mmHg: ⚠️ 低血压

#### 🔵 舒张压 (Diastolic)
- **HA实体ID**: `input_number.bp_diastolic`
- **单位**: 毫米汞柱 (mmHg)
- **用途**: 心脏舒张时动脉血管内的最低压力
- **正常范围**: 60-90 mmHg
- **异常提示**: 
  - ≥ 90 mmHg: ⚠️ 高血压
  - < 60 mmHg: ⚠️ 低血压

#### 💗 脉搏 (Pulse)
- **HA实体ID**: `input_number.pulse`
- **单位**: 次/分钟 (bpm)
- **用途**: 与心率类似，但来自血压计测量
- **正常范围**: 60-100 bpm
- **说明**: 通常与心率数据交叉验证

---

### 3. 🌡️ 环境监测数据 (Environment)

这些数据监测老年人居住环境的安全性和舒适度：

#### 🌡️ 室内温度 (Indoor Temperature)
- **HA实体ID**: `input_number.dora_indoor_temp_c`
- **单位**: 摄氏度 (°C)
- **用途**: 监测居住环境温度，确保舒适和安全
- **正常范围**: 18°C - 26°C（舒适范围）
- **异常提示**: 
  - 过高或过低可能导致中暑或感冒风险增加

#### 💧 室内湿度 (Indoor Humidity)
- **HA实体ID**: `input_number.dora_indoor_humidity_percent`
- **单位**: 百分比 (%)
- **用途**: 监测空气湿度，影响呼吸舒适度和健康
- **正常范围**: 40%-60%（舒适范围）
- **异常提示**: 
  - 过高：容易滋生细菌、霉菌
  - 过低：导致皮肤干燥、呼吸不适

#### 🌪️ 气体浓度 (Gas Concentration)
- **HA实体ID**: `input_number.dora_gas_ppm`
- **单位**: 百万分之一 (ppm)
- **用途**: **安全监测** - 检测有毒气体（如一氧化碳、天然气等）
- **正常范围**: < 50 ppm（安全范围）
- **异常提示**: 
  - ≥ 50 ppm: ⚠️ 可能存在气体泄漏或污染
  - ≥ 200 ppm: ❌ 危险！需要立即处理
- **重要性**: 这是**安全关键指标**，需要特别关注

---

## 📡 数据获取流程

1. **前端请求**: `care.html` → `HealthDataMonitor.jsx` 组件
2. **API调用**: `GET /api/health-data` → 后端 HA 数据读取服务（端口 9098）
3. **后端查询**: 服务从 Home Assistant API 获取所有实体状态
4. **数据处理**: 后端汇总所有数据并返回 JSON
5. **前端显示**: 组件渲染数据卡片，包含数值、单位、状态分类（正常/警告/危险）

## 🔄 数据更新

- **自动刷新**: 用户可以开启"Auto Refresh (5s)"每5秒自动刷新
- **手动刷新**: 点击"Refresh Data"按钮立即刷新
- **模拟数据**: 点击"Simulate All Data"可以生成测试数据（用于开发测试）

## 📝 数据来源

所有数据都存储在 Home Assistant 的 `input_number` 实体中，可能通过以下方式更新：

1. **自动化脚本**: HA 自动化每分钟更新模拟数据（用于演示）
2. **实际设备**: 健康监测设备（如智能手环、血压计、体温计等）通过 MQTT 或其他协议上传
3. **手动设置**: 管理员或用户手动在 HA 中设置数值

## 🎯 使用场景

这些数据帮助护理人员：

1. **实时监控**: 随时了解老年人的健康状况
2. **异常预警**: 自动识别健康异常（如发热、低血氧、高血糖等）
3. **环境安全**: 监测居住环境是否安全舒适（温度、湿度、有害气体）
4. **趋势分析**: 通过历史数据了解健康状况变化趋势
5. **决策支持**: 根据数据做出是否需要医疗干预的判断

---

## 📋 数据实体完整列表

| 显示名称 | HA实体ID | 单位 | 类别 |
|---------|---------|------|------|
| Body temperature | `input_number.dora_body_temperature_c` | °C | 健康 |
| Heart rate | `input_number.dora_heart_rate_bpm` | bpm | 健康 |
| SpO2 | `input_number.dora_spo2_percent` | % | 健康 |
| Glucose | `input_number.dora_glucose_mgdl` | mg/dL | 健康 |
| HRV | `input_number.dora_hrv_rmssd_ms` | ms | 健康 |
| EDA | `input_number.dora_eda_usiemens` | μS | 健康 |
| Sleep score | `input_number.dora_sleep_score` | 分数 | 健康 |
| Steps today | `input_number.dora_steps_today` | 步数 | 健康 |
| Systolic | `input_number.bp_systolic` | mmHg | 血压 |
| Diastolic | `input_number.bp_diastolic` | mmHg | 血压 |
| Pulse | `input_number.pulse` | bpm | 血压 |
| Indoor temperature | `input_number.dora_indoor_temp_c` | °C | 环境 |
| Indoor humidity | `input_number.dora_indoor_humidity_percent` | % | 环境 |
| Gas concentration | `input_number.dora_gas_ppm` | ppm | 环境 |

---

## ⚠️ 注意事项

1. **模拟数据**: 当前大部分数据是通过 HA 自动化脚本生成的模拟数据，用于演示目的
2. **实际部署**: 在生产环境中，这些数据应该来自真实的健康监测设备
3. **数据准确性**: 请确保 HA 中的数据源准确可靠
4. **隐私保护**: 健康数据属于敏感信息，需要严格保护
5. **报警阈值**: 当前的前端显示有基本的异常分类，但可能需要根据实际需求调整阈值



