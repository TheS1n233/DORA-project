#!/bin/bash

echo "🧪 测试完整的语音通话流程"
echo "================================"

# 1. 检查后端服务状态
echo "1️⃣ 检查后端服务..."
curl -s http://127.0.0.1:8300/health || echo "❌ 后端服务未运行"

# 2. 测试管理员呼叫老人
echo ""
echo "2️⃣ 测试管理员呼叫老人..."
call_response=$(curl -s -X POST http://127.0.0.1:8300/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{"elder_id": "elder-001", "admin_id": "admin-001"}')

echo "呼叫响应: $call_response"

# 3. 检查老人端是否有待接听呼叫
echo ""
echo "3️⃣ 检查老人端待接听呼叫..."
pending_response=$(curl -s http://127.0.0.1:8300/api/calls/elder/pending-calls/elder-001)
echo "待接听呼叫: $pending_response"

# 4. 测试LiveKit token
echo ""
echo "4️⃣ 测试LiveKit token..."
token_response=$(curl -s http://127.0.0.1:8300/tele/livekit/token)
echo "Token响应: $token_response"

# 5. 模拟老人接听呼叫
echo ""
echo "5️⃣ 模拟老人接听呼叫..."
# 从呼叫响应中提取room_id
room_id=$(echo "$call_response" | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)
echo "使用room_id: $room_id"

answer_response=$(curl -s -X POST http://127.0.0.1:8300/api/calls/answer \
  -H "Content-Type: application/json" \
  -d "{\"room_id\": \"$room_id\", \"user_id\": \"elder-001\", \"action\": \"accept\"}")

echo "接听响应: $answer_response"

echo ""
echo "✅ 测试完成！"
echo ""
echo "📱 现在请在Android TV上："
echo "1. 打开应用"
echo "2. 等待呼叫通知出现"
echo "3. 点击'接听'按钮"
echo "4. 检查是否成功连接到LiveKit"
