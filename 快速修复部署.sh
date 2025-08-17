#!/bin/bash

echo "🔧 快速修复Vercel部署 - 设置为公开访问"
echo "========================================"
echo

echo "📋 检查当前状态..."
echo

# 检查Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安装Vercel CLI..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo "❌ Vercel CLI安装失败"
        exit 1
    fi
fi

echo "✅ Vercel CLI已安装"

# 检查是否已登录
echo "🔐 检查登录状态..."
vercel whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "🔐 需要登录Vercel..."
    vercel login
    if [ $? -ne 0 ]; then
        echo "❌ 登录失败"
        exit 1
    fi
fi

echo "✅ 已登录Vercel"

echo
echo "🚀 开始重新部署..."
echo "注意：在部署过程中，请确保选择以下选项："
echo "  - 选择 'Public'（公开）"
echo "  - 不设置密码保护"
echo "  - 允许公开访问"
echo

# 重新部署
echo "📤 执行部署..."
vercel --prod

echo
echo "🎯 部署完成！"
echo
echo "📋 验证步骤："
echo "1. 访问您的网站URL"
echo "2. 确认可以正常打开（不是401错误）"
echo "3. 测试信息提取功能"
echo "4. 测试飞书配置功能"
echo
echo "📞 如果仍有问题，请："
echo "1. 检查Vercel控制台的项目设置"
echo "2. 确认项目设置为公开访问"
echo "3. 查看部署日志"
echo
echo "✨ 修复完成！"
