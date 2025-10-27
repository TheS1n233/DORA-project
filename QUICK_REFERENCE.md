# DORA项目快速参考

## 🚀 快速启动

### 1. 启动所有服务
```bash
cd /workspaces/dora
docker-compose up -d
```

### 2. 启动前端
```bash
cd /workspaces/dora/client
npm run dev
```

### 3. 启动Android应用
```bash
# 在Android Studio中打开 /workspaces/dora/333 项目
# 运行到Android TV模拟器
```

## 📍 关键文件位置

### 前端文件
- **路由配置**: `/client/src/routes/App.jsx`
- **健康监控**: `/client/src/components/HealthDataMonitor.jsx`
- **呼叫管理**: `/client/src/components/AdminCallElder.jsx`
- **代理配置**: `/client/vite.config.js`

### 后端服务
- **远程协助**: `/server/tele-assist-svc/index.js`
- **健康监测**: `/server/health-svc/index.js`
- **AI助手**: `/server/assistant-svc/index.js`
- **居家安全**: `/server/home-safety-svc/main.py`

### Android应用
- **主活动**: `/333/app/src/main/java/com/example/a333/MainActivity.kt`
- **布局文件**: `/333/app/src/main/res/layout/activity_main.xml`
- **字符串资源**: `/333/app/src/main/res/values/strings.xml`

## 🔧 常用命令

### 服务管理
```bash
# 查看服务状态
docker-compose ps

# 重启服务
docker-compose restart {service-name}

# 查看日志
docker-compose logs -f {service-name}

# 停止所有服务
docker-compose down
```

### 端口管理
```bash
# 查看端口占用
lsof -i :5173
lsof -i :8300

# 杀死占用进程
lsof -i :5173 -t | xargs -r kill -9
```

### 网络测试
```bash
# 测试API
curl http://localhost:8300/api/health
curl http://localhost:8200/api/health

# 测试HA数据
curl http://localhost:8000/api/health-data
```

### Android调试
```bash
# 查看设备
adb devices

# 查看日志
adb logcat | grep "333"

# 安装应用
adb install -r app-debug.apk
```

## 🌐 服务端口

| 服务 | 端口 | 功能 |
|------|------|------|
| 前端 | 5173 | 管理员Web界面 |
| 远程协助 | 8300 | 视频通话服务 |
| 健康监测 | 8200 | 健康数据处理 |
| AI助手 | 8100 | 语音识别服务 |
| 居家安全 | 8400 | 跌倒检测服务 |
| 通知服务 | 8500 | 消息推送服务 |
| TV服务 | 8600 | TV客户端服务 |
| 健康数据 | 8000 | 健康数据收集 |
| Home Assistant | 8123 | 智能家居控制 |

## 🔗 API端点

### 远程协助服务 (8300)
```
POST /api/calls/initiate - 发起呼叫
GET /api/calls/elder/pending-calls/{elderId} - 获取待接听呼叫
POST /api/calls/elder/answer/{callId} - 接听呼叫
POST /api/calls/elder/decline/{callId} - 拒绝呼叫
POST /api/livekit/token - 获取LiveKit令牌
```

### 健康监测服务 (8200)
```
GET /api/health-data - 获取健康数据
POST /api/health-data - 更新健康数据
GET /api/thresholds - 获取阈值设置
POST /api/thresholds - 更新阈值设置
```

### 健康数据服务 (8000)
```
GET /api/health-data - 获取健康数据
POST /api/health-data - 提交健康数据
GET /api/fhir - 获取FHIR数据
POST /api/fhir - 提交FHIR数据
```

## 🐛 常见问题

### 前端问题
- **5173无法访问**: 检查端口占用，重启前端服务
- **数据不显示**: 检查数据路径，验证API响应
- **呼叫失败**: 检查远程协助服务状态

### 后端问题
- **服务启动失败**: 检查Docker状态，查看服务日志
- **数据库连接失败**: 检查数据库容器，验证连接字符串
- **API调用失败**: 检查代理配置，验证CORS设置

### Android问题
- **无法接收呼叫**: 检查模拟器网络，验证API调用
- **网络连接失败**: 检查模拟器设置，验证主机IP
- **应用崩溃**: 查看崩溃日志，检查权限配置

## 📱 测试流程

### 1. 基础功能测试
1. 启动所有服务
2. 访问前端界面
3. 验证健康数据显示
4. 测试呼叫功能

### 2. 集成测试
1. 启动Android应用
2. 发起呼叫测试
3. 验证视频通话
4. 测试数据同步

### 3. 端到端测试
1. 完整用户流程
2. 异常情况处理
3. 性能测试
4. 稳定性测试

## 🔍 调试技巧

### 前端调试
- 使用浏览器开发者工具
- 检查网络请求
- 查看控制台错误
- 验证组件状态

### 后端调试
- 查看服务日志
- 测试API端点
- 检查数据库连接
- 验证服务间通信

### Android调试
- 使用adb logcat查看日志
- 检查网络权限
- 验证API调用
- 测试UI交互

## 📋 检查清单

### 启动前
- [ ] Docker服务运行
- [ ] 端口无冲突
- [ ] 网络正常
- [ ] 配置文件正确

### 运行时
- [ ] 前端可访问
- [ ] 后端API正常
- [ ] 数据库连接稳定
- [ ] 服务间通信正常

### 功能测试
- [ ] 用户登录
- [ ] 健康数据显示
- [ ] 呼叫功能
- [ ] 视频通话
- [ ] 数据同步

---

**文档版本**: v1.0  
**创建日期**: 2024年1月  
**最后更新**: 2024年1月  
**维护者**: DORA开发团队
