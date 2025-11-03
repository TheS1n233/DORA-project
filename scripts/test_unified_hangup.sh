#!/bin/bash

echo "🧪 测试统一挂断机制"
echo "===================="

# 后端服务地址
BACKEND_URL="http://127.0.0.1:8300"

# 1. 检查后端服务状态
echo "1️⃣ 检查后端服务状态..."
curl -s ${BACKEND_URL}/ping || { echo "后端服务未运行"; exit 1; }
echo ""

# 2. 管理员发起呼叫
echo "2️⃣ 管理员发起呼叫..."
CALL_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin-001",
    "elder_id": "elder-001",
    "call_type": "regular",
    "message": "测试统一挂断机制"
  }')
echo "呼叫响应: ${CALL_RESPONSE}"
ROOM_ID=$(echo ${CALL_RESPONSE} | jq -r '.room_id')
echo "房间ID: ${ROOM_ID}"
echo ""

if [ "${ROOM_ID}" == "null" ] || [ -z "${ROOM_ID}" ]; then
  echo "❌ 呼叫失败，未获取到房间ID。"
  exit 1
fi

# 3. 检查通话状态（初始状态）
echo "3️⃣ 检查初始通话状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "初始状态: ${STATUS_RESPONSE}"
echo ""

# 4. 模拟老人接听
echo "4️⃣ 模拟老人接听..."
ANSWER_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/answer \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "'"${ROOM_ID}"'",
    "user_id": "elder-001",
    "action": "accept"
  }')
echo "接听响应: ${ANSWER_RESPONSE}"
echo ""

# 5. 检查接听后的状态
echo "5️⃣ 检查接听后的状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "接听后状态: ${STATUS_RESPONSE}"
echo ""

# 6. 模拟老人端挂断（调用 /api/calls/end）
echo "6️⃣ 模拟老人端挂断..."
END_RESPONSE=$(curl -s -X POST ${BACKEND_URL}/api/calls/end \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "'"${ROOM_ID}"'"
  }')
echo "挂断响应: ${END_RESPONSE}"
echo ""

# 7. 检查挂断后的状态
echo "7️⃣ 检查挂断后的状态..."
STATUS_RESPONSE=$(curl -s ${BACKEND_URL}/api/calls/status/${ROOM_ID})
echo "挂断后状态: ${STATUS_RESPONSE}"
echo ""

# 8. 检查通话日志
echo "8️⃣ 检查通话日志..."
LOGS_RESPONSE=$(curl -s "${BACKEND_URL}/api/calls/logs?limit=5")
echo "最近日志: ${LOGS_RESPONSE}"
echo ""

echo "✅ 测试完成！"
echo ""
echo "📱 现在请在管理员端："
echo "1. 发起呼叫"
echo "2. 在老人端点击'接听'"
echo "3. 在老人端点击'挂断'按钮"
echo "4. 检查管理员端是否在3秒内自动检测到'ended'状态并关闭LiveKit界面"
echo ""
echo "🔄 或者测试管理员端挂断："
echo "1. 发起呼叫并接听"
echo "2. 在管理员端点击'取消呼叫'"
echo "3. 检查老人端是否在3秒内检测到'ended'状态并自动结束通话"
