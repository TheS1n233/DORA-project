# DORA Home Assistant Bridge

这是一个独立的Node.js服务，用于从Home Assistant读取健康设备数据，并在管理员端展示。

## 🚀 快速开始

### 1. 获取Home Assistant Token

1. 打开 http://localhost:8123
2. 点击左下角用户头像
3. 滚动到底部，点击"创建令牌"
4. 输入令牌名称：`DORA Bridge`
5. 复制生成的令牌

### 2. 配置环境变量

编辑 `.env.ha` 文件，将 `HA_TOKEN` 替换为实际的令牌：

```env
HA_BASE_URL=http://localhost:8123
HA_TOKEN=你的实际令牌
HA_ENTITIES=sensor.heart_rate,sensor.glucose,sensor.spo2,sensor.body_temperature
HA_BRIDGE_PORT=9099
```

### 3. 启动服务

```bash
# 方法1: 使用启动脚本
./start_ha_bridge.sh

# 方法2: 直接启动
npm start

# 方法3: 手动启动
node ha_bridge.js
```

### 4. 测试服务

打开浏览器访问：
- 健康检查: http://localhost:9099/ha/health
- 管理员界面: 打开 `admin-ha-test.html`

## 📡 API端点

### 健康检查
```
GET /ha/health
```

### 获取所有实体状态
```
GET /ha/states
```

### 获取特定实体状态
```
GET /ha/states/{entity_id}
GET /ha/state?entity_id={entity_id}
```

### 获取健康数据汇总
```
GET /ha/health/summary
GET /ha/health/summary?entities=sensor.heart_rate,sensor.glucose
```

## 🔧 配置说明

- `HA_BASE_URL`: Home Assistant基础URL
- `HA_TOKEN`: Home Assistant长效访问令牌
- `HA_ENTITIES`: 默认监控的实体ID列表（逗号分隔）
- `HA_BRIDGE_PORT`: 桥接服务端口

## 🧪 测试命令

```bash
# 健康检查
curl http://localhost:9099/ha/health

# 获取特定传感器
curl http://localhost:9099/ha/states/sensor.heart_rate

# 获取健康汇总
curl http://localhost:9099/ha/health/summary
```

## 📊 管理员界面

打开 `admin-ha-test.html` 文件，可以：
- 实时查看健康传感器数据
- 自动刷新（每5秒）
- 查看原始JSON响应
- 自定义监控的实体

## 🔍 故障排除

1. **Token错误**: 检查 `.env.ha` 中的 `HA_TOKEN` 是否正确
2. **连接失败**: 确认Home Assistant正在运行在8123端口
3. **实体不存在**: 检查 `HA_ENTITIES` 中的实体ID是否正确
4. **CORS问题**: 服务已配置CORS，支持跨域访问


