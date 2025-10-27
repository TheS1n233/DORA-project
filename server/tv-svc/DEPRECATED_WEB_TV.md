# ⚠️ 弃用功能：Web TV客户端

## 弃用原因
- **架构变更**: TV客户端是Android应用(333)，不是网页
- **功能重复**: Web TV客户端与Android应用功能重复
- **维护简化**: 统一使用Android应用，避免双端维护

## 弃用内容
- `static/tv.js` - Web TV客户端JavaScript代码
- 所有Web TV相关的HTML页面
- Web TV的轮询和呼叫处理逻辑

## 正确的TV客户端
- **Android应用**: `/workspaces/dora/333/` - 这是真正的TV客户端
- **主活动**: `app/src/main/java/com/example/a333/MainActivity.kt`
- **功能**: 视频通话接收、呼叫状态监控、健康数据展示

## 状态
- ❌ **已弃用** - 不再使用
- 🔄 **待清理** - 可以删除Web TV相关代码
- 📝 **已记录** - 防止误用

## 重要提醒
**TV端是Android模拟器中的333应用，不是网页！**

---
**弃用日期**: 2024年1月  
**弃用原因**: 架构变更，使用Android应用替代
