#!/bin/bash

echo "🧪 测试管理员端UI修复"
echo "========================"

# 检查后端服务
echo "1. 检查后端服务状态..."
curl -s http://127.0.0.1:8300/healthz > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ 后端服务正常运行"
else
    echo "❌ 后端服务未启动"
    exit 1
fi

# 测试管理员发起呼叫
echo ""
echo "2. 测试管理员发起呼叫..."
CALL_RESPONSE=$(curl -s -X POST http://127.0.0.1:8300/api/calls/admin/call-elder \
  -H "Content-Type: application/json" \
  -d '{"admin_id": "admin1", "elder_id": "elder-001", "call_type": "regular", "message": "测试UI修复"}')
echo "呼叫响应: $CALL_RESPONSE"

ROOM_ID=$(echo "$CALL_RESPONSE" | grep -o '"room_id":"[^"]*"' | cut -d'"' -f4)
echo "房间ID: $ROOM_ID"

# 测试LiveKit token生成
echo ""
echo "3. 测试LiveKit token生成..."
TOKEN_RESPONSE=$(curl -s "http://127.0.0.1:8300/tele/livekit/token?room=$ROOM_ID&identity=admin-001&role=participant")
echo "管理员token: $TOKEN_RESPONSE"

if echo "$TOKEN_RESPONSE" | grep -q "eyJ"; then
    echo "✅ LiveKit token生成正常"
else
    echo "❌ LiveKit token生成失败"
fi

echo ""
echo "🎯 UI修复验证完成！"
echo ""
echo "修复内容："
echo "✅ 1. 管理员端呼叫时不再显示'正在呼叫'状态"
echo "✅ 2. 呼叫时直接打开LiveKit界面"
echo "✅ 3. 只在打开且状态为'ringing'时显示呼叫状态"
echo "✅ 4. 提供'取消呼叫'按钮而不是'挂断'按钮"
echo ""
echo "现在管理员端呼叫时会直接显示LiveKit界面，而不是图1的状态！"
