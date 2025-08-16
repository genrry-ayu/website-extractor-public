#!/bin/bash

echo "🚀 开始部署准备..."

# 检查Git状态
if [ ! -d ".git" ]; then
    echo "📁 初始化Git仓库..."
    git init
fi

# 添加所有文件
echo "📦 添加文件到Git..."
git add .

# 提交更改
echo "💾 提交更改..."
git commit -m "Ready for production deployment - $(date)"

# 检查远程仓库
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  未检测到远程仓库，请手动添加："
    echo "   git remote add origin https://github.com/yourusername/your-repo-name.git"
    echo "   git push -u origin main"
else
    echo "📤 推送到远程仓库..."
    git push origin main
fi

echo ""
echo "✅ 代码已准备就绪！"
echo ""
echo "🌐 下一步部署步骤："
echo "1. 访问 https://vercel.com"
echo "2. 使用GitHub账号登录"
echo "3. 点击 'New Project'"
echo "4. 选择您的项目仓库"
echo "5. 点击 'Deploy'"
echo ""
echo "📋 部署配置："
echo "- Framework Preset: Node.js"
echo "- Root Directory: ./"
echo "- Build Command: npm run build"
echo "- Output Directory: .vercel/output"
echo ""
echo "🎉 部署完成后，您将获得一个类似 https://your-app.vercel.app 的URL"
echo ""
echo "📖 详细部署指南请查看：部署指南.md"
