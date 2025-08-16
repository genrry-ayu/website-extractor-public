#!/bin/bash

echo "🚀 启动社交媒体链接提取器..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm，请先安装npm"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
fi

# 启动服务器
echo "🌐 启动服务器..."
echo "📱 访问地址: http://localhost:3000"
echo "⏹️  按 Ctrl+C 停止服务器"
echo ""

npm start
