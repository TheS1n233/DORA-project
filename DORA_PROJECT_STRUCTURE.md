# DORA项目功能结构文档

## 📁 项目整体架构

### 🏠 核心应用模块

#### `/client` - 管理员端Web应用
- **功能**: 管理员/护理员Web界面
- **技术栈**: React + Vite + Tailwind CSS
- **端口**: `localhost:5173`
- **主要页面**:
  - 登录页面 (`/login`) - 用户认证
  - 护理员页面 (`/caregiver`) - 健康数据监控
  - 管理员呼叫功能 (`AdminCallElder.jsx`) - 视频通话发起
- **关键文件**:
  - `src/routes/App.jsx` - 路由配置
  - `src/components/HealthDataMonitor.jsx` - 健康数据监控
  - `src/components/AdminCallElder.jsx` - 呼叫管理
  - `vite.config.js` - 代理配置

#### `/333` - 老人端Android TV应用
- **功能**: 老人使用的Android TV客户端
- **技术栈**: Kotlin + Android原生
- **主要功能**:
  - 视频通话接收和应答
  - 呼叫状态监控和轮询
  - 健康数据展示
  - 测试呼叫检查
- **关键文件**:
  - `app/src/main/java/com/example/a333/MainActivity.kt` - 主活动
  - `app/src/main/res/layout/activity_main.xml` - 布局文件
  - `app/src/main/res/values/strings.xml` - 字符串资源

### 🔧 后端服务模块 (`/server`)

#### `/server/tele-assist-svc` - 远程协助服务
- **功能**: 视频通话管理、LiveKit集成
- **端口**: `8300`
- **API端点**:
  - `POST /api/calls/initiate` - 发起呼叫
  - `GET /api/calls/elder/pending-calls/{elderId}` - 获取待接听呼叫
  - `POST /api/calls/elder/answer/{callId}` - 接听呼叫
  - `POST /api/calls/elder/decline/{callId}` - 拒绝呼叫
  - `POST /api/livekit/token` - 获取LiveKit令牌
- **技术**: Node.js + Express + LiveKit

#### `/server/health-svc` - 健康监测服务
- **功能**: 健康数据处理、阈值监控
- **端口**: `8200`
- **技术**: Node.js + Express

#### `/server/assistant-svc` - AI助手服务
- **功能**: 语音识别、智能对话
- **端口**: `8100`
- **技术**: Node.js + Express

#### `/server/home-safety-svc` - 居家安全服务
- **功能**: 跌倒检测、MediaPipe姿态识别
- **端口**: `8400`
- **技术**: Python + MediaPipe + MQTT

#### `/server/notification-svc` - 通知服务
- **功能**: 消息推送、警报管理
- **端口**: `8500`
- **技术**: Node.js + Express

#### `/server/tv-svc` - TV客户端服务
- **功能**: TV端Web界面（已弃用，现在使用Android应用）
- **端口**: `8600`
- **状态**: 仅保留静态文件，主要逻辑已迁移到Android应用

### 📊 数据处理模块

#### `/health_monitoring_service` - 健康数据服务
- **功能**: 健康数据收集、FHIR标准处理
- **技术栈**: Python + InfluxDB + FastAPI
- **关键文件**:
  - `main.py` - 主服务入口
  - `fhir.py` - FHIR数据处理
  - `models.py` - 数据模型
  - `rules.py` - 业务规则
- **端口**: `8000`

#### `/ble_bp_collector` - 蓝牙血压收集器
- **功能**: 蓝牙设备数据采集
- **技术栈**: Python + BLE
- **关键文件**:
  - `collector.py` - 数据收集器
- **端口**: `8001`

### 🏡 智能家居集成

#### `/Home Assistant` - Home Assistant集成
- **功能**: 智能家居设备控制
- **数据源**: 温度、湿度、煤气、血糖等传感器
- **端口**: `8123`
- **关键文件**:
  - `Home_Assistant_installation.md` - 安装指南

#### `/home_assistant_integration` - HA集成模块
- **功能**: HA数据读取、设备控制
- **技术**: Python + Home Assistant API

### 🛠️ 运维与测试

#### `/scripts` - 脚本工具
- **功能**: 部署脚本、测试脚本、演示脚本
- **关键文件**:
  - `demo_guide.md` - 演示指南
  - `run_*_local.sh` - 本地运行脚本
  - `test_*.sh` - 测试脚本
  - `demo_all.sh` - 完整演示脚本

#### `/docker` - Docker配置
- **功能**: 容器化部署配置
- **关键文件**:
  - `docker-compose.yml` - 服务编排
  - `Dockerfile` - 容器构建

### 📚 文档与数据

#### `/docs` - 项目文档
- **功能**: 技术文档、API文档

#### `/dataset` - 数据集
- **功能**: 跌倒检测训练数据、健康数据样本

#### `/reports` - 报告文件
- **功能**: 项目报告、分析结果

## 🔄 数据流架构

```
老人端(333) ←→ 管理员端(client)
     ↓              ↓
远程协助服务(tele-assist-svc) ←→ LiveKit视频通话
     ↓
健康监测服务(health-svc) ←→ Home Assistant数据
     ↓
AI助手服务(assistant-svc) ←→ 语音识别
     ↓
居家安全服务(home-safety-svc) ←→ 跌倒检测
```

## 🚀 快速启动命令

### 管理员端启动
```bash
cd /workspaces/dora/client
npm run dev
# 访问: http://localhost:5173
```

### 后端服务启动
```bash
cd /workspaces/dora
docker-compose up
```

### Android应用启动
```bash
# 在Android Studio中打开 /workspaces/dora/333 项目
# 运行到Android TV模拟器
```

### 健康数据服务启动
```bash
cd /workspaces/dora/health_monitoring_service
python main.py
```

## 🔧 开发调试指南

### 前端开发
- **入口**: `/client/src/main.jsx`
- **路由**: `/client/src/routes/App.jsx`
- **代理配置**: `/client/vite.config.js`
- **主要组件**: `/client/src/components/`

### 后端开发
- **服务入口**: `/server/{service-name}/index.js`
- **API文档**: 各服务目录下的README.md
- **数据库**: PostgreSQL/MongoDB

### Android开发
- **主活动**: `/333/app/src/main/java/com/example/a333/MainActivity.kt`
- **布局**: `/333/app/src/main/res/layout/`
- **资源**: `/333/app/src/main/res/values/`

## 📋 常见问题解决

### 端口冲突
- 5173: 前端开发服务器
- 8300: 远程协助服务
- 8123: Home Assistant
- 8000: 健康监测服务

### 网络连接
- Android模拟器访问主机: `10.0.2.2`
- 本地开发: `localhost` 或 `127.0.0.1`
- Docker容器间通信: 服务名

### 调试工具
- 前端: 浏览器开发者工具
- 后端: 服务日志
- Android: `adb logcat`
- 网络: `curl` 测试API

---

**文档版本**: v1.0  
**创建日期**: 2024年1月  
**最后更新**: 2024年1月  
**维护者**: DORA开发团队
