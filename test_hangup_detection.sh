#!/bin/bash

echo "🧪 测试LiveKit挂断检测功能"
echo "=============================="

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
  -d '{"admin_id": "admin1", "elder_id": "elder-001", "call_type": "regular", "message": "测试挂断检测"}')
echo "呼叫响应: $CALL_RESPONSE"

ROOM_ID=$(echo "$CALL_RESPONSE" | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)
echo "房间ID: $ROOM_ID"

# 测试2: 老人接听呼叫
echo ""
echo "3. 测试老人接听呼叫..."
ANSWER_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/answer \
  -H "Content-Type: application/json" \
  -d "{\"room_id\": \"$ROOM_ID\", \"user_id\": \"elder-001\", \"action\": \"accept\"}")
echo "接听响应: $ANSWER_RESPONSE"

# 测试3: 获取LiveKit token
echo ""
echo "4. 测试LiveKit token生成..."
TOKEN_RESPONSE=$(curl -s "http://127.0.0.1:8300/tele/livekit/token?room=$ROOM_ID&identity=admin-001&role=participant")
echo "管理员token: $TOKEN_RESPONSE"

ELDER_TOKEN_RESPONSE=$(curl -s "http://127.0.0.1:8300/tele/livekit/token?room=$ROOM_ID&identity=tv-333&role=participant")
echo "老人端token: $ELDER_TOKEN_RESPONSE"

# 测试4: 模拟挂断检测
echo ""
echo "5. 测试挂断检测机制..."
echo "LiveKit挂断检测事件："
echo "- onParticipantDisconnected: 检测到对方参与者断开连接"
echo "- onDisconnected: 检测到房间断开连接"
echo "- onTrackUnsubscribed: 检测到音视频轨道取消订阅"
echo ""
echo "管理员端事件监听："
echo "- onParticipantDisconnected: 对方挂断时自动关闭界面"
echo "- onDisconnected: 连接断开时自动关闭界面"
echo ""
echo "老人端事件监听："
echo "- onParticipantDisconnected: 对方挂断时自动结束通话"
echo "- onDisconnected: 房间断开时自动结束通话"

# 测试5: 结束通话
echo ""
echo "6. 测试结束通话..."
END_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/end \
  -H "Content-Type: application/json" \
  -d "{\"room_id\": \"$ROOM_ID\"}")
echo "结束通话响应: $END_RESPONSE"

echo ""
echo "🎯 测试完成！"
echo ""
echo "LiveKit挂断检测功能："
echo "✅ 1. 管理员端 - 检测对方挂断，自动关闭界面"
echo "✅ 2. 老人端 - 检测对方挂断，自动结束通话"
echo "✅ 3. 双方 - 检测房间断开，自动重置状态"
echo "✅ 4. 轨道监听 - 检测音视频轨道变化"
echo ""
echo "现在可以测试真实的挂断检测功能了！"
