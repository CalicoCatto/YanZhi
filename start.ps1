# 燕知 YanZhi -- 启动所有服务
Set-Location $PSScriptRoot

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "[错误] 未找到 Python 环境，请先运行：.\install.ps1" -ForegroundColor Red
    Read-Host "按 Enter 退出"
    exit 1
}
if (-not (Test-Path ".env")) {
    Write-Host "[错误] 未找到 .env 文件，请先运行：.\install.ps1" -ForegroundColor Red
    Read-Host "按 Enter 退出"
    exit 1
}

$root = $PSScriptRoot
Write-Host "正在启动燕知 YanZhi..." -ForegroundColor Cyan
Write-Host ""

# ── 启动 AI 分类服务（新窗口）─────────────────────────
$aiCmd = "Set-Location '$root'; `$env:PYTHONPATH='$root\server'; " +
         "Write-Host '燕知 AI分类服务 (端口 8001)' -ForegroundColor Cyan; " +
         ".\venv\Scripts\python.exe -m uvicorn server.api_server:app --host 127.0.0.1 --port 8001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $aiCmd

Start-Sleep -Seconds 2

# ── 启动 mitmproxy 拦截器（新窗口）────────────────────
$proxyCmd = "Set-Location '$root'; " +
            "Write-Host '燕知 微信流量拦截器 (端口 8080)' -ForegroundColor Cyan; " +
            "Write-Host '系统代理请设置为 127.0.0.1:8080'; " +
            "Write-Host '首次使用请访问 http://mitm.it 安装证书'; Write-Host ''; " +
            ".\venv\Scripts\mitmdump.exe -s windows\interceptor.py --listen-port 8080"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $proxyCmd

Start-Sleep -Seconds 2

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  服务已启动："
Write-Host ""
Write-Host "    Web   :  http://localhost:3000"
Write-Host "    代理  :  127.0.0.1:8080  (需在 Windows 设置中开启)"
Write-Host ""
Write-Host "  首次使用请访问 http://mitm.it 安装证书"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── 在当前窗口启动 Next.js（可看到日志）──────────────
npm run dev
