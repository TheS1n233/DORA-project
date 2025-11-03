#!/bin/bash
# 测试老人端呼叫管理员功能

echo "🧪 测试老人端呼叫管理员功能"
echo "================================"

# 检查服务状态
echo "1. 检查后端服务状态..."
curl -s "http://localhost:8300/health" | head -5
echo ""

# 检查LiveKit服务
echo "2. 检查LiveKit服务..."
curl -s "http://localhost:7880" | head -5
echo ""

# 模拟老人端发起呼叫
echo "3. 模拟老人端发起呼叫..."
curl -X POST "http://localhost:8300/api/calls/elder/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "elder_id": "elder-001",
    "room_id": "test-call-'$(date +%s)'",
    "message": "Elder needs assistance"
  }' | jq .
echo ""

echo "✅ 测试完成！"
echo ""
echo "📱 在Android TV端："
echo "   - 点击 '📞 Call Caregiver' 按钮"
echo "   - 观察状态变化：'Calling caregiver...' -> 'Waiting for caregiver to answer...'"
echo "   - 管理员端应该收到呼叫通知"
echo ""
echo "🔧 管理员端操作："
echo "   - 在Web界面接听或拒绝呼叫"
echo "   - 观察老人端状态更新"


