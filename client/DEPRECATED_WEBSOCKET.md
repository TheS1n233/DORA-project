# ⚠️ 弃用功能：WebSocket连接

## 弃用原因
- **UI简化**: 护理员界面不再需要WebSocket连接
- **功能移除**: 已从护理员页面移除WebSocket相关组件
- **维护简化**: 减少不必要的网络连接复杂度

## 弃用内容
- `src/components/WsProvider.jsx` - WebSocket提供者组件
- `src/components/WsStatusChip.jsx` - WebSocket状态显示
- `src/components/WsOverlay.jsx` - WebSocket覆盖层
- `src/components/WsSwitch.jsx` - WebSocket开关
- `vite.config.js` 中的 `/ws` 代理配置

## 已移除的引用
- `src/routes/App.jsx` - 已移除WebSocket相关导入
- `src/routes/CaregiverPage.jsx` - 已移除WebSocket相关组件
- `src/app-care.jsx` - 已移除WsProvider包装

## 状态
- ❌ **已弃用** - 不再使用
- 🗑️ **已清理** - 相关代码已移除
- 📝 **已记录** - 防止误用

---
**弃用日期**: 2024年1月  
**弃用原因**: UI简化，功能移除
