#!/bin/bash

echo "🧪 测试LiveKit连接功能"
echo "========================"

# 测试1: 检查LiveKit token生成
echo "1. 测试LiveKit token生成..."
TOKEN_RESPONSE=$(curl -s "http://127.0.0.1:8300/tele/livekit/token?room=test-room&identity=test-user&role=participant")
echo "Token响应: $TOKEN_RESPONSE"

# 检查是否返回真实JWT token
if echo "$TOKEN_RESPONSE" | grep -q "eyJ"; then
    echo "✅ LiveKit token生成正常"
else
    echo "❌ LiveKit token生成失败"
    exit 1
fi

# 测试2: 测试管理员发起呼叫
echo ""
echo "2. 测试管理员发起呼叫..."
CALL_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{"admin_id": "admin1", "elder_id": "elder-001", "call_type": "regular", "message": "测试呼叫"}')
echo "呼叫响应: $CALL_RESPONSE"

# 提取room_id
ROOM_ID=$(echo "$CALL_RESPONSE" | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)
echo "房间ID: $ROOM_ID"

# 测试3: 测试老人端获取token
echo ""
echo "3. 测试老人端获取token..."
ELDER_TOKEN_RESPONSE=$(curl -s "http://127.0.0.1:8300/tele/livekit/token?room=$ROOM_ID&identity=tv-333&role=participant")
echo "老人端token响应: $ELDER_TOKEN_RESPONSE"

# 测试4: 测试老人接听呼叫
echo ""
echo "4. 测试老人接听呼叫..."
ANSWER_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/answer \
  -H "Content-Type: application/json" \
  -d "{\"room_id\": \"$ROOM_ID\", \"user_id\": \"elder-001\", \"action\": \"accept\"}")
echo "接听响应: $ANSWER_RESPONSE"

# 测试5: 测试结束通话
echo ""
echo "5. 测试结束通话..."
END_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/end \
  -H "Content-Type: application/json" \
  -d "{\"room_id\": \"$ROOM_ID\"}")
echo "结束通话响应: $END_RESPONSE"

echo ""
echo "🎯 测试完成！"
echo "如果所有测试都通过，说明LiveKit连接功能正常。"
echo "现在可以在Android应用中测试实际的视频通话功能。"