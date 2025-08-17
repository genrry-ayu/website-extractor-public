@echo off
chcp 65001 >nul
echo 🚀 网站信息提取器 - 公开部署脚本
echo ==================================
echo.

REM 检查Git状态
if not exist ".git" (
    echo ❌ 错误：当前目录不是Git仓库
    echo 请先初始化Git仓库：
    echo   git init
    echo   git add .
    echo   git commit -m "Initial commit"
    pause
    exit /b 1
)

echo 📋 检查项目状态...
echo.

REM 检查必需文件
set "required_files=index.html styles.css script.js server.js package.json vercel.json config.html config.js"
set "missing_files="

for %%f in (%required_files%) do (
    if exist "%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ %%f (缺失)
        set "missing_files=1"
    )
)

if defined missing_files (
    echo.
    echo ❌ 缺少必需文件，请检查项目结构
    pause
    exit /b 1
)

echo.
echo 📦 检查依赖包...
if not exist "node_modules" (
    echo 📦 安装依赖包...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖包安装失败
        pause
        exit /b 1
    )
) else (
    echo ✅ 依赖包已存在
)

echo.
echo 🔧 检查vercel.json配置...
if exist "vercel.json" (
    echo ✅ vercel.json 存在
    echo 📋 当前配置：
    type vercel.json
) else (
    echo ❌ vercel.json 不存在
    pause
    exit /b 1
)

echo.
echo 📤 准备部署...
echo.

REM 检查是否有未提交的更改
git status --porcelain >nul 2>&1
if errorlevel 0 (
    echo 📝 发现未提交的更改，正在提交...
    git add .
    git commit -m "Update deployment configuration"
)

echo 🌐 部署选项：
echo 1. 使用Vercel CLI部署（推荐）
echo 2. 推送到GitHub并连接Vercel
echo 3. 仅检查配置
echo.

set /p choice="请选择部署方式 (1-3): "

if "%choice%"=="1" (
    echo 🚀 使用Vercel CLI部署...
    vercel --version >nul 2>&1
    if errorlevel 1 (
        echo 📦 安装Vercel CLI...
        npm install -g vercel
    )
    
    echo 🔐 登录Vercel...
    vercel login
    
    echo 📤 部署项目...
    vercel --prod
) else if "%choice%"=="2" (
    echo 📤 推送到GitHub...
    echo 请确保已设置GitHub远程仓库：
    echo   git remote add origin https://github.com/your-username/your-repo.git
    echo.
    
    set /p push_choice="是否继续推送？(y/n): "
    if /i "%push_choice%"=="y" (
        git push origin main
        echo.
        echo ✅ 已推送到GitHub
        echo 🌐 请在Vercel中导入项目并设置为公开访问
    )
) else if "%choice%"=="3" (
    echo ✅ 配置检查完成
) else (
    echo ❌ 无效选择
    pause
    exit /b 1
)

echo.
echo 🎯 部署后检查清单：
echo 1. 确保Vercel项目设置为公开访问
echo 2. 访问网站确认可以正常打开
echo 3. 测试信息提取功能
echo 4. 测试飞书配置功能
echo.
echo 📞 如果遇到问题，请参考 'Vercel公开部署指南.md'
echo.
echo ✨ 部署脚本完成！
pause
