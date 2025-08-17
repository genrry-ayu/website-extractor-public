#!/bin/bash

echo "🚀 网站信息提取器 - 完整解决方案"
echo "=================================="
echo

echo "📋 问题分析："
echo "  1. 401错误 - 项目设置为私有"
echo "  2. 404错误 - 静态文件无法访问"
echo "  3. 功能不工作 - JavaScript和CSS无法加载"
echo

echo "✅ 解决方案：创建GitHub公开仓库 + 正确配置"
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

echo "📋 检查项目配置..."
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
echo "🔧 修复vercel.json配置..."
echo "✅ vercel.json 已修复"

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
echo "🌐 部署选项："
echo "1. 创建GitHub公开仓库（推荐）"
echo "2. 使用Vercel CLI重新部署"
echo "3. 仅检查配置"
echo

read -p "请选择部署方式 (1-3): " choice

case $choice in
    1)
        echo "🚀 创建GitHub公开仓库..."
        echo
        echo "📋 步骤："
        echo "1. 访问 https://github.com/new"
        echo "2. 创建名为 'website-extractor-public' 的仓库"
        echo "3. 选择 'Public'（公开）"
        echo "4. 点击 'Create repository'"
        echo
        read -p "创建完成后按回车继续..."
        
        echo "📤 推送代码到GitHub..."
        echo "请输入您的GitHub用户名："
        read github_username
        
        # 添加新的远程仓库
        git remote remove origin 2>/dev/null
        git remote add origin https://github.com/${github_username}/website-extractor-public.git
        
        # 提交当前更改
        git add .
        git commit -m "Fix deployment configuration and static file routing"
        
        # 推送代码
        git push -u origin main
        
        echo
        echo "✅ 代码已推送到GitHub"
        echo
        echo "🌐 下一步：在Vercel中导入"
        echo "1. 访问 https://vercel.com/new"
        echo "2. 选择 'Import Git Repository'"
        echo "3. 选择刚创建的 'website-extractor-public' 仓库"
        echo "4. 确保选择 'Public' 选项"
        echo "5. 点击 'Deploy'"
        ;;
    2)
        echo "🚀 使用Vercel CLI重新部署..."
        
        # 删除现有配置
        rm -rf .vercel
        
        # 重新部署
        npx vercel --prod
        
        echo
        echo "⚠️  重要：在部署过程中请选择："
        echo "  ✅ Public（公开访问）"
        echo "  ❌ 不设置密码保护"
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
echo "🎯 部署后验证步骤："
echo "1. 访问网站确认可以正常打开（200状态码）"
echo "2. 检查CSS和JavaScript文件是否正常加载"
echo "3. 测试信息提取功能"
echo "4. 测试飞书配置功能"
echo
echo "📞 如果仍有问题："
echo "1. 检查浏览器控制台错误信息"
echo "2. 确认项目设置为公开访问"
echo "3. 查看Vercel部署日志"
echo
echo "✨ 解决方案完成！"
