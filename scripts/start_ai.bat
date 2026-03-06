@echo off
chcp 65001 > nul
cd /d "%~dp0.."
set "PYTHONPATH=%~dp0..\server"
echo 燕知 AI分类服务 启动中（端口 8001）...
venv\Scripts\python.exe -m uvicorn server.api_server:app --host 127.0.0.1 --port 8001
pause
