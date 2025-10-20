#!/bin/bash
# DORA HA Bridge 启动脚本

echo "🚀 启动DORA Home Assistant桥接服务..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: 需要Node.js 18+，当前版本: $(node -v)"
    exit 1
fi

# 检查配置文件
if [ ! -f ".env.ha" ]; then
    echo "❌ 错误: 未找到配置文件 .env.ha"
    echo "请先配置HA_TOKEN"
    exit 1
fi

# 检查HA_TOKEN是否已配置
if grep -q "在此粘贴你的HA长效Token" .env.ha; then
    echo "⚠️  警告: 请先在 .env.ha 中配置HA_TOKEN"
    echo "编辑 .env.ha 文件，将'在此粘贴你的HA长效Token'替换为实际的令牌"
    exit 1
fi

echo "✅ 环境检查通过"
echo "🌐 启动桥接服务..."

# 启动服务
node ha_bridge.js


