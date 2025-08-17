@echo off
echo ========================================
echo    网站信息提取器 - 快速启动
echo ========================================
echo.

echo 正在检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到Node.js
    echo.
    echo 请先安装Node.js：
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载并安装LTS版本
    echo 3. 重启此脚本
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js已安装
echo.

echo 正在检查依赖包...
if not exist "node_modules" (
    echo 📦 正在安装依赖包，请稍候...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖包安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖包安装完成
) else (
    echo ✅ 依赖包已存在
)

echo.
echo 🚀 正在启动服务器...
echo.
echo 启动成功后，请打开浏览器访问：
echo http://localhost:3000
echo.
echo 按 Ctrl+C 可以停止服务器
echo.

npm start

pause
