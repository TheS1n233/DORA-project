#!/bin/bash

# Home Assistant 数据读取服务启动脚本

echo "🚀 启动HA数据读取服务..."

# 检查环境变量
if [ -z "$HA_TOKEN" ]; then
    echo "❌ 错误: HA_TOKEN 环境变量未设置"
    echo "请设置你的Home Assistant Token:"
    echo "export HA_TOKEN=你的实际令牌"
    echo ""
    echo "或者创建 .env.ha 文件:"
    echo "HA_BASE_URL=http://localhost:8123"
    echo "HA_TOKEN=你的实际令牌"
    echo "HA_READER_PORT=9098"
    exit 1
fi

# 检查HA服务是否运行
echo "🔍 检查Home Assistant服务..."
if ! curl -s http://localhost:8123/api/ > /dev/null; then
    echo "❌ 错误: Home Assistant服务未运行或无法访问"
    echo "请确保HA服务正在运行在 http://localhost:8123"
    exit 1
fi

echo "✅ Home Assistant服务正常"

# 启动HA数据读取服务
echo "🚀 启动HA数据读取服务..."
cd /workspaces/dora/client/server

# 设置环境变量
export HA_BASE_URL=${HA_BASE_URL:-"http://localhost:8123"}
export HA_READER_PORT=${HA_READER_PORT:-9098}

# 启动服务
node ha_data_reader.js






