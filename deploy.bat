@echo off
chcp 65001 >nul
echo ============================================
echo   CAD 审计系统 — 云端部署助手
echo ============================================
echo.

REM ---- 检查 Node.js ----
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
   echo [错误] 未找到 Node.js，请先安装 Node.js 18+
   pause & exit /b 1
)
echo [✓] Node.js 版本: 
node -v

REM ---- 检查 Git ----
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 未找到 Git，部署到云平台需要 Git
)
echo [✓] Git 版本: 
git --version 2>nul || echo 未安装
echo.

echo -------------------------------------------
echo   请选择操作：
echo -------------------------------------------
echo   [1] 本地启动 (前后端一起运行)
echo   [2] 部署到 Render (免费云平台)
echo   [3] 部署到 Railway (推荐稳定版)
echo   [4] 构建项目 (重新编译前后端)
echo   [0] 退出
echo.
set /p choice=请输入选项编号: 

if "%choice%"=="1" goto LOCAL_START
if "%choice%"=="2" goto RENDER_DEPLOY
if "%choice%"=="3" goto RAILWAY_DEPLOY
if "%choice%"=="4" goto BUILD
if "%choice%"=="0" goto END

echo 无效选项
pause & exit /b 1

:LOCAL_START
echo.
echo [启动中] 正在清理旧进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTEN') do taskkill /F /PID %%a >nul 2>nul
echo [启动中] 删除旧数据库...
del /f "server\memory-db.json" >nul 2>nul
del /f "server\data\memory-db.json" >nul 2>nul
echo [启动中] 启动全栈服务...
cd /d server && node serve.js
goto END

:BUILD
echo.
echo [构建中] 编译后端 TypeScript...
cd server && npx tsc --skipLibCheck 2>nul
if %ERRORLEVEL% NEQ 0 echo [警告] 后端编译有警告，继续...
echo [构建中] 构建前端...
cd ..\client && npm install && npm run build
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [✓] 构建完成！
    echo     前端产物: client\dist\
    echo     后端产物: server\dist\
) else (
    echo [错误] 前端构建失败
)
pause
goto END

:RENDER_DEPLOY
echo.
echo ============================================
echo   Render 云部署指南
echo ============================================
echo.
echo 步骤 1/5: 注册 Render 账号
echo   打开 https://render.com 注册 (支持 GitHub 登录)
echo.
echo 步骤 2/5: 推送代码到 GitHub
echo   git init
echo   git add .
echo   git commit -m "CAD审计系统初始版本"
echo   git remote add origin <你的GitHub仓库地址>
echo   git push -u origin main
echo.
echo 步骤 3/5: 创建 Web Service
echo   在 Render Dashboard 点击 "New +"
echo   选择 "Web Service"
echo   连接你的 GitHub 仓库
echo.
echo 步骤 4/5: 配置构建参数
echo   Runtime: Node.js
echo   Build Command:
echo   cd server ^&^& npm install ^&^& npx tsc --skipLibCheck ^&^& cd ../client ^&^& npm install ^&^& npm run build
echo   Start Command: cd server ^&^& node serve.js
echo   Instance: Free ($0/月)
echo.
echo 步骤 5/5: 访问系统
echo   等待构建完成后，Render 会提供一个 xxx.onrender.com 地址
echo   使用 admin@cad-audit.com / Cad@2026 登录
echo.
start https://render.com
pause
goto END

:RAILWAY_DEPLOY
echo.
echo ============================================
echo   Railway 云部署指南
echo ============================================
echo.
echo 步骤 1/5: 安装 Railway CLI
echo   npm install -g @railway/cli
echo.
echo 步骤 2/5: 登录 Railway
echo   railway login
echo.
echo 步骤 3/5: 初始化项目
echo   railway init
echo.
echo 步骤 4/5: 部署
echo   railway up
echo.
echo 步骤 5/5: 访问
echo   railway domain 获取访问地址
echo.
echo   或直接打开: https://railway.app
start https://railway.app
pause
goto END

:END
exit /b 0
