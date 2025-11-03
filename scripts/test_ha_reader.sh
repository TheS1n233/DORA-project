#!/bin/bash

# Home Assistant 数据读取服务测试脚本

echo "🧪 测试HA数据读取服务..."

# 检查服务是否运行
echo "🔍 检查HA数据读取服务状态..."
if ! curl -s http://localhost:9098/health > /dev/null; then
    echo "❌ 错误: HA数据读取服务未运行"
    echo "请先启动服务: ./scripts/start_ha_reader.sh"
    exit 1
fi

echo "✅ HA数据读取服务正在运行"

# 测试健康检查
echo ""
echo "1️⃣ 测试健康检查..."
curl -s http://localhost:9098/health | jq '.' || echo "健康检查响应: $(curl -s http://localhost:9098/health)"

# 测试HA连接
echo ""
echo "2️⃣ 测试HA连接..."
curl -s http://localhost:9098/api/test-ha | jq '.' || echo "HA连接测试响应: $(curl -s http://localhost:9098/api/test-ha)"

# 测试获取所有血压数据
echo ""
echo "3️⃣ 测试获取所有血压数据..."
curl -s http://localhost:9098/api/bp-data | jq '.' || echo "血压数据响应: $(curl -s http://localhost:9098/api/bp-data)"

# 测试获取单个参数
echo ""
echo "4️⃣ 测试获取单个参数..."
echo "收缩压:"
curl -s http://localhost:9098/api/bp-data/systolic | jq '.' || echo "收缩压响应: $(curl -s http://localhost:9098/api/bp-data/systolic)"

echo ""
echo "舒张压:"
curl -s http://localhost:9098/api/bp-data/diastolic | jq '.' || echo "舒张压响应: $(curl -s http://localhost:9098/api/bp-data/diastolic)"

echo ""
echo "脉搏:"
curl -s http://localhost:9098/api/bp-data/pulse | jq '.' || echo "脉搏响应: $(curl -s http://localhost:9098/api/bp-data/pulse)"

# 测试获取所有实体
echo ""
echo "5️⃣ 测试获取所有input_number实体..."
curl -s http://localhost:9098/api/entities | jq '.' || echo "实体列表响应: $(curl -s http://localhost:9098/api/entities)"

echo ""
echo "✅ 测试完成!"
echo ""
echo "📋 可用接口:"
echo "  GET  /health          - 健康检查"
echo "  GET  /api/bp-data     - 获取所有血压数据"
echo "  GET  /api/bp-data/:param - 获取单个血压参数"
echo "  GET  /api/test-ha     - 测试HA连接"
echo "  GET  /api/entities    - 获取所有input_number实体"






