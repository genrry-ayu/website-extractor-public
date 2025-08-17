#!/bin/bash

echo "🚀 网站信息提取器 - 公开部署脚本"
echo "=================================="
echo

# 检查Git状态
if [ ! -d ".git" ]; then
    echo "❌ 错误：当前目录不是Git仓库"
    echo "请先初始化Git仓库："
    echo "  git init"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    exit 1
fi

echo "📋 检查项目状态..."
echo

# 检查必需文件
required_files=("index.html" "styles.css" "script.js" "server.js" "package.json" "vercel.json" "config.html" "config.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo
    echo "❌ 缺少必需文件，请检查项目结构"
    exit 1
fi

echo
echo "📦 检查依赖包..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖包安装失败"
        exit 1
    fi
else
    echo "✅ 依赖包已存在"
fi

echo
echo "🔧 检查vercel.json配置..."
if [ -f "vercel.json" ]; then
    echo "✅ vercel.json 存在"
    echo "📋 当前配置："
    cat vercel.json | head -20
else
    echo "❌ vercel.json 不存在"
    exit 1
fi

echo
echo "📤 准备部署..."
echo

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 发现未提交的更改，正在提交..."
    git add .
    git commit -m "Update deployment configuration"
fi

echo "🌐 部署选项："
echo "1. 使用Vercel CLI部署（推荐）"
echo "2. 推送到GitHub并连接Vercel"
echo "3. 仅检查配置"
echo

read -p "请选择部署方式 (1-3): " choice

case $choice in
    1)
        echo "🚀 使用Vercel CLI部署..."
        if ! command -v vercel &> /dev/null; then
            echo "📦 安装Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "🔐 登录Vercel..."
        vercel login
        
        echo "📤 部署项目..."
        vercel --prod
        ;;
    2)
        echo "📤 推送到GitHub..."
        echo "请确保已设置GitHub远程仓库："
        echo "  git remote add origin https://github.com/your-username/your-repo.git"
        echo
        
        read -p "是否继续推送？(y/n): " push_choice
        if [ "$push_choice" = "y" ]; then
            git push origin main
            echo
            echo "✅ 已推送到GitHub"
            echo "🌐 请在Vercel中导入项目并设置为公开访问"
        fi
        ;;
    3)
        echo "✅ 配置检查完成"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo
echo "🎯 部署后检查清单："
echo "1. 确保Vercel项目设置为公开访问"
echo "2. 访问网站确认可以正常打开"
echo "3. 测试信息提取功能"
echo "4. 测试飞书配置功能"
echo
echo "📞 如果遇到问题，请参考 'Vercel公开部署指南.md'"
echo
echo "✨ 部署脚本完成！"
