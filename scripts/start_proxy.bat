@echo off
chcp 65001 > nul
cd /d "%~dp0.."
echo 燕知 微信流量拦截器 启动中（端口 8080）...
echo.
echo 请确认 Windows 系统代理已设置为 127.0.0.1:8080
echo 首次使用请用浏览器访问 http://mitm.it 安装证书
echo.
venv\Scripts\mitmdump.exe -s windows\interceptor.py --listen-port 8080
pause
