#!/bin/bash

echo "🧪 测试管理员呼叫老人功能"
echo "================================"

# 测试管理员发起呼叫
echo "1. 测试管理员发起呼叫..."
curl -X POST http://localhost:8300/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin-001",
    "elder_id": "elder-001",
    "call_type": "regular",
    "message": "您好，我是管理员，想和您聊聊天"
  }'

echo -e "\n\n2. 检查老人待接听呼叫..."
curl http://localhost:8300/api/calls/elder/pending-calls/elder-001

echo -e "\n\n3. 测试老人接听呼叫..."
# 首先获取room_id，这里假设是room-123
curl -X POST http://localhost:8300/api/calls/answer \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "admin-call-123",
    "user_id": "elder-001",
    "action": "accept"
  }'

echo -e "\n\n4. 获取管理员呼叫历史..."
curl http://localhost:8300/api/calls/admin/calls

echo -e "\n\n✅ 测试完成！"
echo "请确保tele-assist-svc在8300端口运行"
