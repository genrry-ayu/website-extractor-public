#!/bin/bash

echo "🚀 网站信息提取器 - 一键修复脚本"
echo "=================================="
echo

echo "📋 当前问题："
echo "  - 网站返回401错误"
echo "  - 提取按钮不生效"
echo "  - 配置信息无法保存"
echo "  - 所有功能都无法使用"
echo

echo "🔍 根本原因：Vercel项目设置为私有，需要身份验证"
echo

echo "✅ 解决方案：重新部署为公开项目"
echo

# 检查Node.js
echo "📦 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到Node.js"
    echo "请先安装Node.js：https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js已安装 ($(node --version))"

# 检查依赖包
echo
echo "📦 检查依赖包..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖包安装失败"
        exit 1
    fi
fi
echo "✅ 依赖包已安装"

# 检查Vercel CLI
echo
echo "🔧 检查Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo "📦 安装Vercel CLI..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        echo "❌ Vercel CLI安装失败"
        exit 1
    fi
fi
echo "✅ Vercel CLI已安装"

# 检查登录状态
echo
echo "🔐 检查Vercel登录状态..."
vercel whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "🔐 需要登录Vercel..."
    echo "请在浏览器中完成登录..."
    vercel login
    if [ $? -ne 0 ]; then
        echo "❌ 登录失败"
        exit 1
    fi
fi
echo "✅ 已登录Vercel"

echo
echo "🚀 开始重新部署..."
echo
echo "⚠️  重要提示："
echo "在部署过程中，请确保选择以下选项："
echo "  ✅ Public（公开访问）"
echo "  ❌ 不设置密码保护"
echo "  ✅ 允许所有用户访问"
echo

# 提交当前更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 提交当前更改..."
    git add .
    git commit -m "Fix deployment configuration"
fi

# 重新部署
echo "📤 执行重新部署..."
vercel --prod

echo
echo "🎯 部署完成！"
echo
echo "📋 验证步骤："
echo "1. 访问新的网站URL"
echo "2. 确认可以正常打开（不是401错误）"
echo "3. 测试信息提取功能"
echo "4. 测试飞书配置功能"
echo
echo "🔧 如果仍有问题："
echo "1. 检查Vercel控制台的项目设置"
echo "2. 确认项目设置为公开访问"
echo "3. 查看部署日志"
echo
echo "✨ 修复完成！"
