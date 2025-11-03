#!/bin/bash

echo "🔍 调试通话状态问题"
echo "=================="

# 后端服务地址
BACKEND_URL="http://127.0.0.1:8300"

# 1. 发起呼叫
echo "1️⃣ 发起呼叫..."
CALL_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin-001",
    "elder_id": "elder-001",
    "call_type": "regular",
    "message": "调试通话状态"
  }')
echo "呼叫响应: ${CALL_RESPONSE}"
ROOM_ID=$(echo ${CALL_RESPONSE} | jq -r '.room_id')
echo "房间ID: ${ROOM_ID}"
echo ""

# 2. 立即检查状态
echo "2️⃣ 立即检查状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "状态响应: ${STATUS_RESPONSE}"
echo ""

# 3. 检查老人端待接听呼叫
echo "3️⃣ 检查老人端待接听呼叫..."
PENDING_CALLS=$(curl -s ${BACKEND_URL}/api/calls/elder/pending-calls/elder-001)
echo "待接听呼叫: ${PENDING_CALLS}"
echo ""

# 4. 再次检查状态
echo "4️⃣ 再次检查状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "状态响应: ${STATUS_RESPONSE}"
echo ""

# 5. 模拟接听
echo "5️⃣ 模拟接听..."
ANSWER_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/answer \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "'"${ROOM_ID}"'",
    "user_id": "elder-001",
    "action": "accept"
  }')
echo "接听响应: ${ANSWER_RESPONSE}"
echo ""

# 6. 接听后检查状态
echo "6️⃣ 接听后检查状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "接听后状态: ${STATUS_RESPONSE}"
echo ""

# 7. 检查老人端待接听呼叫（应该为空）
echo "7️⃣ 检查老人端待接听呼叫（应该为空）..."
PENDING_CALLS=$(curl -s ${BACKEND_URL}/api/calls/elder/pending-calls/elder-001)
echo "待接听呼叫: ${PENDING_CALLS}"
echo ""

# 8. 再次检查状态
echo "8️⃣ 再次检查状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "状态响应: ${STATUS_RESPONSE}"
echo ""

echo "✅ 调试完成！"
