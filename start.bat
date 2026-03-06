@echo off
chcp 65001 > nul
cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo [错误] 未找到 Python 环境，请先双击运行 install.bat
    pause
    exit /b 1
)

if not exist ".env" (
    echo [错误] 未找到 .env 文件，请先双击运行 install.bat
    pause
    exit /b 1
)

echo 正在启动燕知 YanZhi...
echo.

:: 启动 AI 分类服务（新窗口）
start "燕知 AI服务" scripts\start_ai.bat
timeout /t 2 /nobreak > nul

:: 启动 mitmproxy 拦截器（新窗口）
start "燕知 拦截器" scripts\start_proxy.bat
timeout /t 2 /nobreak > nul

echo ================================================
echo  服务已启动：
echo.
echo    Web   :  http://localhost:3000
echo    代理  :  127.0.0.1:8080 （设为系统代理）
echo.
echo  首次使用请访问 http://mitm.it 安装证书
echo ================================================
echo.

:: 启动 Next.js（当前窗口，可看到日志）
npm run dev
