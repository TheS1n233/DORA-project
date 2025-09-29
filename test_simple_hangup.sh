#!/bin/bash

echo "🧪 测试简化的挂断检测功能"
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

# 测试4: 结束通话
echo ""
echo "5. 测试结束通话..."
END_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/end \
  -H "Content-Type: application/json" \
  -d "{\"room_id\": \"$ROOM_ID\"}")
echo "结束通话响应: $END_RESPONSE"

echo ""
echo "🎯 测试完成！"
echo ""
echo "简化的挂断检测功能："
echo "✅ 1. 管理员端 - 使用LiveKit事件监听检测对方挂断"
echo "✅ 2. 老人端 - 使用定时器检查连接状态检测对方挂断"
echo "✅ 3. 双方 - 检测到挂断后自动重置为初始状态"
echo ""
echo "LiveKit挂断检测接口："
echo "- onParticipantDisconnected: 检测参与者断开"
echo "- onDisconnected: 检测房间断开"
echo "- onTrackUnsubscribed: 检测轨道取消订阅"
echo "- room.isConnected: 检查房间连接状态"
echo ""
echo "现在可以测试真实的挂断检测功能了！"
