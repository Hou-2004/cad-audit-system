@echo off
chcp 65001 >nul
echo ============================================================
echo   CAD 文件规范审核系统 — 一键启动
echo ============================================================
echo.
cd /d "%~dp0"

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 检查依赖
if not exist "node_modules\express\index.js" (
    echo [提示] 正在安装后端依赖...
    call npm install --production
)

:: 检查编译产物
if not exist "dist\app.js" (
    echo [提示] 正在编译后端代码...
    call npx tsc
)

:: 检查前端
if not exist "..\client\dist\index.html" (
    echo [警告] 前端未构建，API 模式启动
    echo [提示] 运行 cd ..\client && npx vite build 可构建前端
)

:: 清理旧数据（可选，取消注释可每次重启时清空）
:: del /f data\memory-db.json 2>nul

echo.
echo [启动] 全栈一体化服务器...
echo [地址] http://localhost:3001
echo [停止] 按 Ctrl+C
echo.
node serve.js
pause
