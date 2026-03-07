# 燕知 YanZhi -- 一键安装
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  燕知 YanZhi -- 一键安装" -ForegroundColor Cyan
Write-Host "================================================"
Write-Host ""

# ── 检查 Node.js ────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未找到 Node.js，请先安装 Node.js 20+" -ForegroundColor Red
    Write-Host "       下载地址：https://nodejs.org/zh-cn/download"
    Read-Host "`n按 Enter 退出"
    exit 1
}
Write-Host "[OK] Node.js $(node -v)" -ForegroundColor Green

# ── 检查 Python（优先 py 启动器，其次 python）───────────
$pythonCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
}
if (-not $pythonCmd) {
    Write-Host "[错误] 未找到 Python，请先安装 Python 3.9+" -ForegroundColor Red
    Write-Host "       下载地址：https://www.python.org/downloads/"
    Write-Host "       安装时务必勾选 'Add Python to PATH'"
    Read-Host "`n按 Enter 退出"
    exit 1
}
Write-Host "[OK] $(& $pythonCmd --version) (命令: $pythonCmd)" -ForegroundColor Green

# ── 复制 .env ───────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] 已创建 .env  ← 请填写 SILICONFLOW_API_KEY" -ForegroundColor Yellow
} else {
    Write-Host "[OK] .env 已存在" -ForegroundColor Green
}

# ── 1/4 Node 依赖 ───────────────────────────────────────
Write-Host ""
Write-Host "[1/4] 安装 Node.js 依赖..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] npm install 失败" -ForegroundColor Red; Read-Host; exit 1
}
Write-Host "[OK] Node.js 依赖安装完成" -ForegroundColor Green

# ── 2/4 数据库 ─────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] 初始化数据库..."
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 数据库初始化失败" -ForegroundColor Red; Read-Host; exit 1
}
Write-Host "[OK] 数据库初始化完成" -ForegroundColor Green

# ── 3/4 Python 虚拟环境 ────────────────────────────────
Write-Host ""
Write-Host "[3/4] 创建 Python 虚拟环境..."
& $pythonCmd -m venv venv
if ($LASTEXITCODE -ne 0) {
    Write-Host "[提示] venv 创建失败，尝试 virtualenv 作为备选..." -ForegroundColor Yellow
    & $pythonCmd -m pip install --quiet virtualenv
    & $pythonCmd -m virtualenv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 虚拟环境创建失败" -ForegroundColor Red
        Write-Host "       请从 https://www.python.org/downloads/ 重新安装官网版 Python"
        Write-Host "       安装时务必勾选 'Add Python to PATH'"
        Read-Host; exit 1
    }
}
Write-Host "[OK] 虚拟环境创建完成" -ForegroundColor Green

# ── 4/4 Python 依赖 ────────────────────────────────────
Write-Host ""
Write-Host "[4/4] 安装 Python 依赖（mitmproxy + fastapi，约需 3-5 分钟）..."
.\venv\Scripts\pip.exe install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] pip install 失败" -ForegroundColor Red; Read-Host; exit 1
}
Write-Host "[OK] Python 依赖安装完成" -ForegroundColor Green

# ── 完成 ───────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  安装完成！接下来：" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. 用记事本打开 .env，填写 SILICONFLOW_API_KEY"
Write-Host "  2. 在 PowerShell 中运行：  .\start.ps1"
Write-Host "  3. Windows 设置开启系统代理：127.0.0.1:8080"
Write-Host "  4. 首次运行：浏览器访问 http://mitm.it 安装证书"
Write-Host "  5. 打开微信 PC，刷新订阅号消息，文章自动入库"
Write-Host "  6. 浏览器访问 http://localhost:3000"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "按 Enter 退出"
