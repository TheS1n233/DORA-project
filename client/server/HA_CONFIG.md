# Home Assistant 配置说明

## 🔑 Token配置

### 1. 获取HA Token
1. 打开 http://localhost:8123
2. 点击左下角用户头像
3. 滚动到底部，点击"创建令牌"
4. 输入令牌名称（如：DORA血压监控）
5. 复制生成的令牌

### 2. 设置环境变量

创建 `.env.ha` 文件在 `/workspaces/dora/client/server/` 目录下：

```bash
# Home Assistant 配置
HA_BASE_URL=http://localhost:8123
HA_TOKEN=你的实际令牌
HA_READER_PORT=9098
```

### 3. 启动服务

```bash
cd /workspaces/dora/client/server
node ha_data_reader.js
```

## 📊 血压实体配置

在Home Assistant中创建以下实体：

1. **收缩压**: `input_number.bp_systolic`
2. **舒张压**: `input_number.bp_diastolic`  
3. **脉搏**: `input_number.pulse`

### 创建方法：
1. 进入HA → 设置 → 设备与服务
2. 点击"辅助元素" → "数字"
3. 创建三个数字输入框，分别命名为：
   - 收缩压 (bp_systolic)
   - 舒张压 (bp_diastolic)
   - 脉搏 (pulse)

## 🧪 测试验证

### 1. 测试HA连接
```bash
curl http://localhost:9098/api/test-ha
```

### 2. 获取血压数据
```bash
curl http://localhost:9098/api/bp-data
```

### 3. 获取单个参数
```bash
curl http://localhost:9098/api/bp-data/systolic
curl http://localhost:9098/api/bp-data/diastolic
curl http://localhost:9098/api/bp-data/pulse
```

## 🔄 实时更新

服务会自动从HA读取最新数据，前端可以通过轮询或WebSocket实现实时更新。






