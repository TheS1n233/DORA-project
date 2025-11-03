#!/bin/bash

echo "🔍 调试统一挂断机制 - 详细检查"
echo "================================"

# 后端服务地址
BACKEND_URL="http://127.0.0.1:8300"

# 1. 检查后端服务状态
echo "1️⃣ 检查后端服务状态..."
curl -s ${BACKEND_URL}/ping || { echo "后端服务未运行"; exit 1; }
echo ""

# 2. 发起呼叫
echo "2️⃣ 发起呼叫..."
CALL_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin-001",
    "elder_id": "elder-001",
    "call_type": "regular",
    "message": "调试统一挂断"
  }')
echo "呼叫响应: ${CALL_RESPONSE}"
ROOM_ID=$(echo ${CALL_RESPONSE} | jq -r '.room_id')
echo "房间ID: ${ROOM_ID}"
echo ""

# 3. 检查初始状态
echo "3️⃣ 检查初始状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "初始状态: ${STATUS_RESPONSE}"
echo ""

# 4. 模拟接听
echo "4️⃣ 模拟接听..."
ANSWER_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/answer \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "'"${ROOM_ID}"'",
    "user_id": "elder-001",
    "action": "accept"
  }')
echo "接听响应: ${ANSWER_RESPONSE}"
echo ""

# 5. 检查接听后状态
echo "5️⃣ 检查接听后状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "接听后状态: ${STATUS_RESPONSE}"
echo ""

# 6. 模拟老人端挂断 (调用 /api/calls/end)
echo "6️⃣ 模拟老人端挂断..."
END_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/end \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "'"${ROOM_ID}"'"
  }')
echo "挂断响应: ${END_RESPONSE}"
echo ""

# 7. 检查挂断后状态
echo "7️⃣ 检查挂断后状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "挂断后状态: ${STATUS_RESPONSE}"
echo ""

# 8. 检查通话日志
echo "8️⃣ 检查通话日志..."
LOGS_RESPONSE=$(curl -s "${BACKEND_URL}/api/calls/logs?limit=3")
echo "最近日志: ${LOGS_RESPONSE}"
echo ""

echo "✅ 调试完成！"
echo ""
echo "📋 检查清单："
echo "1. 后端服务是否正常运行？"
echo "2. /api/calls/status/:room_id 接口是否返回正确状态？"
echo "3. /api/calls/end 接口是否正确设置状态为 'ended'？"
echo "4. 管理员端轮询是否检测到 'ended' 状态？"
echo "5. 老人端挂断时是否调用了 /api/calls/end 接口？"
