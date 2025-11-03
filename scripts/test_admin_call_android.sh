#!/bin/bash

# 测试管理员呼叫Android TV端功能
# Usage: ./scripts/test_admin_call_android.sh

echo "🚀 开始测试管理员呼叫Android TV端功能"
echo "================================================"

# 检查服务是否运行
echo "1. 检查tele-assist-svc服务状态..."
if curl -s http://127.0.0.1:8300/healthz > /dev/null; then
    echo "✅ tele-assist-svc服务正常运行"
else
    echo "❌ tele-assist-svc服务未运行，请先启动服务"
    echo "   运行: make up-ta"
    exit 1
fi

echo ""
echo "2. 测试管理员发起呼叫..."
ADMIN_CALL_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin-001",
    "elder_id": "elder-001", 
    "call_type": "regular",
    "message": "您好，我是管理员，想和您聊聊天"
  }')

echo "管理员呼叫响应: $ADMIN_CALL_RESPONSE"

if echo "$ADMIN_CALL_RESPONSE" | grep -q "room_id"; then
    echo "✅ 管理员呼叫成功发起"
    ROOM_ID=$(echo "$ADMIN_CALL_RESPONSE" | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)
    echo "   房间ID: $ROOM_ID"
else
    echo "❌ 管理员呼叫失败"
    exit 1
fi

echo ""
echo "3. 测试老人端查看待接听呼叫..."
ELDER_PENDING_RESPONSE=$(curl -s http://127.0.0.1:8300/api/calls/elder/pending-calls/elder-001)
echo "老人端待接听呼叫: $ELDER_PENDING_RESPONSE"

if echo "$ELDER_PENDING_RESPONSE" | grep -q "room_id"; then
    echo "✅ 老人端可以查看到待接听呼叫"
else
    echo "❌ 老人端无法查看待接听呼叫"
    exit 1
fi

echo ""
echo "4. 测试老人接听呼叫..."
ANSWER_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/answer \
  -H "Content-Type: application/json" \
  -d "{
    \"room_id\": \"$ROOM_ID\",
    \"user_id\": \"elder-001\",
    \"action\": \"accept\"
  }")

echo "老人接听响应: $ANSWER_RESPONSE"

if echo "$ANSWER_RESPONSE" | grep -q "answered"; then
    echo "✅ 老人成功接听呼叫"
else
    echo "❌ 老人接听呼叫失败"
fi

echo ""
echo "5. 测试管理员查看呼叫历史..."
ADMIN_CALLS_RESPONSE=$(curl -s http://127.0.0.1:8300/api/calls/admin/calls)
echo "管理员呼叫历史: $ADMIN_CALLS_RESPONSE"

echo ""
echo "6. 测试呼叫日志..."
CALL_LOGS_RESPONSE=$(curl -s http://127.0.0.1:8300/api/calls/logs)
echo "呼叫日志: $CALL_LOGS_RESPONSE"

echo ""
echo "================================================"
echo "🎉 测试完成！"
echo ""
echo "📱 Android TV端功能说明："
echo "1. Android应用会自动每5秒检查一次待接听呼叫"
echo "2. 当管理员发起呼叫时，TV端会弹出通知对话框"
echo "3. 老人可以选择接听或拒绝呼叫"
echo "4. 接听后会自动启动LiveKit通话"
echo ""
echo "🔧 如何测试Android端："
echo "1. 在Android模拟器中运行333应用"
echo "2. 运行此测试脚本发起呼叫"
echo "3. 观察Android应用是否弹出呼叫通知"
echo ""
echo "📋 API端点总结："
echo "- POST /api/calls/admin/call-elder     # 管理员发起呼叫"
echo "- GET  /api/calls/elder/pending-calls/{elder_id}  # 老人查看待接听呼叫"
echo "- POST /api/calls/answer              # 老人接听/拒绝呼叫"
echo "- GET  /api/calls/admin/calls          # 管理员查看呼叫历史"
echo "- GET  /api/calls/logs                 # 查看呼叫日志"
