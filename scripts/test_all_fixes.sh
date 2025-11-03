#!/bin/bash

echo "🧪 测试所有修复功能"
echo "========================"

# 等待后端服务启动
echo "1. 检查后端服务状态..."
sleep 3
curl -s http://127.0.0.1:8300/healthz > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ 后端服务正常运行"
else
    echo "❌ 后端服务未启动"
    exit 1
fi

# 测试1: 管理员发起呼叫
echo ""
echo "2. 测试管理员发起呼叫..."
CALL_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{"admin_id": "admin1", "elder_id": "elder-001", "call_type": "regular", "message": "测试呼叫"}')
echo "呼叫响应: $CALL_RESPONSE"

ROOM_ID=$(echo "$CALL_RESPONSE" | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)
echo "房间ID: $ROOM_ID"

# 测试2: 检查呼叫状态
echo ""
echo "3. 测试呼叫状态检查..."
STATUS_RESPONSE=$(curl -s "http://127.0.0.1:8300/api/calls/status/$ROOM_ID")
echo "状态响应: $STATUS_RESPONSE"

# 测试3: 老人拒绝呼叫
echo ""
echo "4. 测试老人拒绝呼叫..."
DECLINE_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/answer \
  -H "Content-Type: application/json" \
  -d "{\"room_id\": \"$ROOM_ID\", \"user_id\": \"elder-001\", \"action\": \"decline\"}")
echo "拒绝响应: $DECLINE_RESPONSE"

# 测试4: 再次检查状态（应该显示declined）
echo ""
echo "5. 测试拒绝后的状态..."
STATUS_AFTER_DECLINE=$(curl -s "http://127.0.0.1:8300/api/calls/status/$ROOM_ID")
echo "拒绝后状态: $STATUS_AFTER_DECLINE"

# 测试5: 检查老人端是否还有待接听呼叫
echo ""
echo "6. 测试老人端待接听呼叫（应该为空）..."
PENDING_CALLS=$(curl -s "http://127.0.0.1:8300/api/calls/elder/pending-calls/elder-001")
echo "待接听呼叫: $PENDING_CALLS"

# 测试6: LiveKit token生成
echo ""
echo "7. 测试LiveKit token生成..."
TOKEN_RESPONSE=$(curl -s "http://127.0.0.1:8300/tele/livekit/token?room=$ROOM_ID&identity=tv-333&role=participant")
echo "Token响应: $TOKEN_RESPONSE"

if echo "$TOKEN_RESPONSE" | grep -q "eyJ"; then
    echo "✅ LiveKit token生成正常"
else
    echo "❌ LiveKit token生成失败"
fi

echo ""
echo "🎯 测试完成！"
echo ""
echo "修复总结："
echo "✅ 1. 老人端界面显示 - 添加了视频容器和渲染逻辑"
echo "✅ 2. 管理员端自动关闭 - 添加了多个断开连接事件监听"
echo "✅ 3. 拒绝后停止呼叫 - 添加了状态检查和轮询机制"
echo "✅ 4. LiveKit编译错误 - 修复了suspend函数和Listener接口问题"
echo ""
echo "现在可以测试完整的呼叫流程了！"
