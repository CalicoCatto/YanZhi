@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ================================================
echo  燕知 YanZhi -- 一键安装
echo ================================================
echo.

:: 检查 Node.js
where node > nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 20+
    echo 下载地址：https://nodejs.org/zh-cn/download
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js %%v

:: 检查 Python
where python > nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.9+
    echo 下载地址：https://www.python.org/downloads/
    echo 安装时务必勾选 "Add Python to PATH"
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do echo [OK] %%v

:: 复制 .env
if not exist ".env" (
    copy .env.example .env > nul
    echo [OK] 已创建 .env -- 请用记事本打开，填写 SILICONFLOW_API_KEY
) else (
    echo [OK] .env 已存在
)

echo.
echo [1/4] 安装 Node.js 依赖...
call npm install
if errorlevel 1 ( echo [错误] npm install 失败 & pause & exit /b 1 )
echo [OK] Node.js 依赖安装完成

echo.
echo [2/4] 初始化数据库...
call npx prisma migrate dev --name init
if errorlevel 1 ( echo [错误] 数据库初始化失败 & pause & exit /b 1 )
echo [OK] 数据库初始化完成

echo.
echo [3/4] 创建 Python 虚拟环境...
python -m venv venv
if errorlevel 1 ( echo [错误] 创建虚拟环境失败 & pause & exit /b 1 )
echo [OK] 虚拟环境创建完成

echo.
echo [4/4] 安装 Python 依赖（mitmproxy + fastapi，约需 3-5 分钟）...
venv\Scripts\pip.exe install -r requirements.txt
if errorlevel 1 ( echo [错误] pip install 失败 & pause & exit /b 1 )
echo [OK] Python 依赖安装完成

echo.
echo ================================================
echo  安装完成！后续步骤：
echo.
echo  1. 用记事本打开 .env，填写 SILICONFLOW_API_KEY
echo  2. 双击 start.bat 启动服务
echo  3. 在 Windows 设置中开启系统代理：127.0.0.1:8080
echo  4. 首次运行：浏览器访问 http://mitm.it 安装证书
echo  5. 打开微信 PC 版，刷新订阅号消息，文章自动入库
echo  6. 浏览器访问 http://localhost:3000 查看文章
echo ================================================
pause
