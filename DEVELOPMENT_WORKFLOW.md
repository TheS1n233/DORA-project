# DORA项目开发工作流程

## 🎯 开发任务分类

### 1. 前端开发任务
**涉及模块**: `/client` (管理员端Web应用)
- **路由管理**: 修改 `src/routes/App.jsx`
- **组件开发**: 修改 `src/components/` 下的组件
- **样式调整**: 修改 `src/` 下的CSS/样式文件
- **API集成**: 修改 `vite.config.js` 代理配置

### 2. 后端服务任务
**涉及模块**: `/server/{service-name}`
- **API开发**: 修改各服务的 `index.js` 或主文件
- **数据库操作**: 修改数据模型和查询逻辑
- **服务集成**: 修改服务间通信逻辑
- **配置管理**: 修改环境变量和配置文件

### 3. Android应用任务
**涉及模块**: `/333` (老人端Android TV应用)
- **功能开发**: 修改 `app/src/main/java/com/example/a333/MainActivity.kt`
- **UI调整**: 修改 `app/src/main/res/layout/` 下的XML文件
- **资源管理**: 修改 `app/src/main/res/values/` 下的资源文件
- **权限配置**: 修改 `app/src/main/AndroidManifest.xml`

### 4. 数据处理任务
**涉及模块**: `/health_monitoring_service`, `/ble_bp_collector`
- **数据收集**: 修改数据采集逻辑
- **数据处理**: 修改数据转换和存储逻辑
- **规则引擎**: 修改业务规则和阈值设置

### 5. 智能家居集成任务
**涉及模块**: `/Home Assistant`, `/home_assistant_integration`
- **设备控制**: 修改设备控制逻辑
- **数据同步**: 修改数据同步机制
- **配置管理**: 修改HA配置和集成设置

## 🔄 开发流程

### 1. 需求分析
- 确定需要修改的模块
- 分析影响范围
- 制定开发计划

### 2. 代码修改
- 根据任务类型选择对应模块
- 遵循现有代码结构
- 保持代码风格一致

### 3. 测试验证
- 本地测试功能
- 集成测试
- 端到端测试

### 4. 部署更新
- 更新相关配置
- 重启相关服务
- 验证部署结果

## 🛠️ 常用开发命令

### 前端开发
```bash
# 启动开发服务器
cd /workspaces/dora/client
npm run dev

# 构建生产版本
npm run build

# 安装依赖
npm install
```

### 后端服务
```bash
# 启动所有服务
cd /workspaces/dora
docker-compose up

# 启动单个服务
cd /workspaces/dora/server/{service-name}
npm start

# 查看服务日志
docker-compose logs {service-name}
```

### Android应用
```bash
# 构建应用
cd /workspaces/dora/333
./gradlew build

# 安装到模拟器
./gradlew installDebug

# 查看日志
adb logcat | grep "333"
```

### 健康数据服务
```bash
# 启动服务
cd /workspaces/dora/health_monitoring_service
python main.py

# 安装依赖
pip install -r requirements.txt
```

## 📋 调试指南

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
- 使用 `adb logcat` 查看日志
- 检查网络权限
- 验证API调用
- 测试UI交互

### 网络调试
- 使用 `curl` 测试API
- 检查端口占用
- 验证代理配置
- 测试跨域访问

## 🚨 常见问题解决

### 端口冲突
```bash
# 查看端口占用
lsof -i :5173
lsof -i :8300

# 杀死进程
kill -9 {PID}
```

### 服务无法启动
```bash
# 检查Docker状态
docker ps
docker-compose ps

# 重启服务
docker-compose restart {service-name}
```

### 网络连接问题
```bash
# 测试网络连接
curl http://localhost:8300/api/health
ping 10.0.2.2

# 检查防火墙
sudo ufw status
```

### 数据库连接问题
```bash
# 检查数据库状态
docker-compose logs postgres
docker-compose logs mongodb

# 重启数据库
docker-compose restart postgres
```

## 📝 开发规范

### 代码风格
- 保持现有代码结构
- 使用一致的命名规范
- 添加必要的注释
- 遵循模块化设计

### 提交规范
- 提交前测试功能
- 添加清晰的提交信息
- 避免提交临时文件
- 保持代码整洁

### 文档更新
- 更新相关文档
- 记录重要变更
- 保持文档同步
- 添加使用说明

---

**文档版本**: v1.0  
**创建日期**: 2024年1月  
**最后更新**: 2024年1月  
**维护者**: DORA开发团队
