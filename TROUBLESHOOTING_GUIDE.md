# DORA项目故障排除指南

## 🚨 常见问题及解决方案

### 1. 前端问题

#### 问题: `localhost:5173` 无法访问
**症状**: 浏览器显示无法连接或空白页面
**解决方案**:
```bash
# 检查端口占用
lsof -i :5173

# 杀死占用进程
lsof -i :5173 -t | xargs -r kill -9

# 重启前端服务
cd /workspaces/dora/client
npm run dev
```

#### 问题: 健康数据不显示
**症状**: 前端显示状态但无数值
**解决方案**:
1. 检查数据路径: `healthData.data?.bodyTemperature?.state`
2. 验证HA数据读取服务状态
3. 检查代理配置: `vite.config.js`
4. 验证API响应: `curl http://localhost:8000/api/health-data`

#### 问题: 呼叫功能失败
**症状**: "呼叫失败，请重试" 错误
**解决方案**:
1. 检查远程协助服务状态: `docker-compose ps tele-assist-svc`
2. 验证API端点: `curl http://localhost:8300/api/calls/health`
3. 检查LiveKit服务状态
4. 验证网络连接

### 2. 后端服务问题

#### 问题: 服务无法启动
**症状**: Docker容器启动失败
**解决方案**:
```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs {service-name}

# 重启服务
docker-compose restart {service-name}

# 完全重启
docker-compose down && docker-compose up
```

#### 问题: 数据库连接失败
**症状**: 服务日志显示数据库连接错误
**解决方案**:
1. 检查数据库容器状态
2. 验证连接字符串
3. 检查网络配置
4. 重启数据库服务

#### 问题: API调用失败
**症状**: 前端无法调用后端API
**解决方案**:
1. 检查代理配置
2. 验证CORS设置
3. 检查服务端口
4. 测试API端点

### 3. Android应用问题

#### 问题: 应用无法接收呼叫
**症状**: 管理员发起呼叫但Android应用无响应
**解决方案**:
1. 检查模拟器网络连接
2. 验证API调用: `http://10.0.2.2:8300/api/calls/elder/pending-calls/elder-001`
3. 检查应用权限
4. 查看应用日志: `adb logcat | grep "333"`

#### 问题: 网络连接失败
**症状**: 应用显示网络错误
**解决方案**:
1. 检查模拟器网络设置
2. 验证主机IP: `10.0.2.2`
3. 检查防火墙设置
4. 测试网络连接: `ping 10.0.2.2`

#### 问题: 应用崩溃
**症状**: 应用启动后立即崩溃
**解决方案**:
1. 查看崩溃日志: `adb logcat | grep "FATAL"`
2. 检查权限配置
3. 验证依赖版本
4. 重新构建应用

### 4. 智能家居集成问题

#### 问题: Home Assistant数据无法获取
**症状**: 健康数据服务无法读取HA数据
**解决方案**:
1. 检查HA服务状态: `curl http://localhost:8123/api/`
2. 验证API密钥
3. 检查实体ID配置
4. 重启HA数据读取服务

#### 问题: 传感器数据异常
**症状**: 传感器数据显示错误或缺失
**解决方案**:
1. 检查HA实体状态
2. 验证传感器配置
3. 检查数据格式
4. 重启相关服务

### 5. 网络连接问题

#### 问题: 跨域访问被阻止
**症状**: 浏览器显示CORS错误
**解决方案**:
1. 检查服务CORS配置
2. 验证代理设置
3. 检查请求头配置
4. 测试API直接访问

#### 问题: 端口被占用
**症状**: 服务启动失败，显示端口被占用
**解决方案**:
```bash
# 查看端口占用
lsof -i :{port}

# 杀死占用进程
kill -9 {PID}

# 或者使用
lsof -i :{port} -t | xargs -r kill -9
```

## 🔧 调试工具

### 网络调试
```bash
# 测试API端点
curl -X GET http://localhost:8300/api/health
curl -X POST http://localhost:8300/api/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{"elderId": "elder-001", "adminId": "admin-001"}'

# 检查端口状态
netstat -tulpn | grep :8300
```

### 服务状态检查
```bash
# 查看所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f {service-name}

# 检查服务健康状态
curl http://localhost:8300/health
curl http://localhost:8200/health
```

### Android调试
```bash
# 查看设备列表
adb devices

# 查看应用日志
adb logcat | grep "333"

# 安装应用
adb install -r /path/to/app.apk

# 启动应用
adb shell am start -n com.example.a333/.MainActivity
```

## 📋 检查清单

### 启动前检查
- [ ] 所有Docker容器运行正常
- [ ] 端口无冲突
- [ ] 网络连接正常
- [ ] 数据库服务可用
- [ ] 配置文件正确

### 运行时检查
- [ ] 前端服务可访问
- [ ] 后端API响应正常
- [ ] 数据库连接稳定
- [ ] 服务间通信正常
- [ ] 日志无错误

### 功能测试
- [ ] 用户登录正常
- [ ] 健康数据显示
- [ ] 呼叫功能正常
- [ ] 视频通话连接
- [ ] 数据同步正常

## 🆘 紧急恢复

### 完全重启
```bash
# 停止所有服务
docker-compose down

# 清理容器
docker system prune -f

# 重新启动
docker-compose up -d

# 启动前端
cd /workspaces/dora/client && npm run dev
```

### 数据备份
```bash
# 备份数据库
docker-compose exec postgres pg_dump -U user database > backup.sql

# 备份配置文件
cp -r /workspaces/dora/server /backup/server
cp -r /workspaces/dora/client /backup/client
```

### 日志收集
```bash
# 收集所有服务日志
docker-compose logs > all-services.log

# 收集系统日志
journalctl -u docker > system.log

# 收集网络日志
netstat -tulpn > network.log
```

---

**文档版本**: v1.0  
**创建日期**: 2024年1月  
**最后更新**: 2024年1月  
**维护者**: DORA开发团队
