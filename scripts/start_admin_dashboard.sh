#!/bin/bash
# DORA 管理员血压监控界面启动脚本

echo "🏥 启动DORA管理员血压监控界面..."

# 检查健康监测服务是否运行
if ! curl -s http://localhost:8088/docs > /dev/null; then
    echo "❌ 健康监测服务未运行，请先启动："
    echo "   docker compose -f ops/compose/docker-compose.hm.yml up -d"
    exit 1
fi

echo "✅ 健康监测服务运行正常"

# 获取当前目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML_FILE="$SCRIPT_DIR/admin_blood_pressure_dashboard.html"

if [ ! -f "$HTML_FILE" ]; then
    echo "❌ 找不到界面文件: $HTML_FILE"
    exit 1
fi

echo "🌐 打开管理员界面..."
echo "   文件路径: $HTML_FILE"

# 尝试用默认浏览器打开
if command -v xdg-open > /dev/null; then
    xdg-open "$HTML_FILE"
elif command -v open > /dev/null; then
    open "$HTML_FILE"
else
    echo "请手动打开浏览器并访问:"
    echo "   file://$HTML_FILE"
fi

echo ""
echo "🎯 使用说明："
echo "1. 点击 '测试连接' 确认服务正常"
echo "2. 点击 '模拟血压' 生成测试数据"
echo "3. 点击 '获取数据' 查看血压信息"
echo "4. 开启自动刷新实时监控"
echo ""
echo "📊 界面功能："
echo "✅ 血压数据实时监控"
echo "✅ 血压分类（正常/警告/临界）"
echo "✅ 模拟数据测试"
echo "✅ 自动刷新"
echo "✅ 原始数据查看"


