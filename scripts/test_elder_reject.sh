#!/bin/bash

echo "🧪 测试老人拒绝通话的反馈机制"
echo "================================"

# 1. 检查后端服务
echo "1️⃣ 检查后端服务状态..."
curl -s http://127.0.0.1:8300/ping || echo "后端服务未运行"

# 2. 管理员发起呼叫
echo ""
echo "2️⃣ 管理员发起呼叫..."
CALL_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin-001",
    "elder_id": "elder-001", 
    "call_type": "regular",
    "message": "测试老人拒绝反馈"
  }')

echo "呼叫响应: $CALL_RESPONSE"
ROOM_ID=$(echo $CALL_RESPONSE | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)
echo "房间ID: $ROOM_ID"

# 3. 检查老人端待接听呼叫
echo ""
echo "3️⃣ 检查老人端待接听呼叫..."
PENDING_CALLS=$(curl -s http://127.0.0.1:8300/api/calls/elder/pending-calls/elder-001)
echo "待接听呼叫: $PENDING_CALLS"

# 4. 模拟老人拒绝呼叫
echo ""
echo "4️⃣ 模拟老人拒绝呼叫..."
REJECT_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/answer \
  -H "Content-Type: application/json" \
  -d "{
    \"room_id\": \"$ROOM_ID\",
    \"elder_id\": \"elder-001\",
    \"action\": \"decline\"
  }")

echo "拒绝响应: $REJECT_RESPONSE"

# 5. 检查通话状态
echo ""
echo "5️⃣ 检查通话状态..."
STATUS_RESPONSE=$(curl -s http://127.0.0.1:8300/api/calls/status/$ROOM_ID)
echo "通话状态: $STATUS_RESPONSE"

# 6. 检查通话日志
echo ""
echo "6️⃣ 检查通话日志..."
LOGS_RESPONSE=$(curl -s "http://127.0.0.1:8300/api/calls/logs?limit=5")
echo "最近日志: $LOGS_RESPONSE"

echo ""
echo "✅ 测试完成！"
echo ""
echo "📱 现在请在管理员端："
echo "1. 发起呼叫"
echo "2. 观察通话状态显示"
echo "3. 在老人端点击'拒绝'"
echo "4. 检查管理员端是否收到拒绝通知并自动关闭LiveKit界面"
