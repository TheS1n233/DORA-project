# TV端呼叫功能备份文档

## 重要说明
**TV端是Android模拟器中的333应用，不是网页！**

## 错误的修改记录

### 1. 错误修改的文件
- `/workspaces/dora/server/tv-svc/static/tv.js` - 错误添加了网页轮询逻辑
- `/workspaces/dora/debug_tv_call.html` - 错误的调试页面
- `/workspaces/dora/simple_test.html` - 错误的测试页面

### 2. 错误修改的内容
在 `tv.js` 中添加了以下错误逻辑：
- `pollPendingCalls()` 函数
- `startCallPolling()` 函数
- `answerCall()` 函数
- `declineCall()` 函数
- 自动启动轮询的代码

### 3. 正确的TV端
- **TV端是Android应用** - 位于 `333/app/src/main/java/com/example/a333/MainActivity.kt`
- **TV端通过Android代码轮询** - 使用 `checkPendingCalls()` 方法
- **TV端运行在Android模拟器中** - 不是网页

## 需要清理的内容
1. 删除 `tv.js` 中添加的轮询逻辑 ✅
2. 删除调试页面文件 ✅
3. 恢复 `tv.js` 到原始状态 ✅
4. 确保TV端使用Android应用，不是网页 ✅

## 正确的修改内容
1. **修改了 `AdminCallElder.jsx`** - 明确指向Android 333应用
2. **添加了重要说明** - 提醒用户启动Android模拟器
3. **修改了状态消息** - 明确指向Android 333应用
4. **修改了按钮文本** - 明确指向Android 333应用

## 正确的TV端访问方式
- **Android模拟器** - 运行333应用
- **端口8200** - 只是TV服务的WebSocket服务，不是TV端界面
- **TV端界面** - 在Android模拟器中显示
