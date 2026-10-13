# ABHAYA - One-Click Launcher (PowerShell)
$Host.UI.RawUI.WindowTitle = "ABHAYA - Women Safety Platform Launcher"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "       ABHAYA - Women Safety Platform Launcher       " -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (Test-Path "$ScriptDir\backend") {
    $ProjectRoot = $ScriptDir
} elseif (Test-Path "$ScriptDir\abhaya_full\abhaya\backend") {
    $ProjectRoot = "$ScriptDir\abhaya_full\abhaya"
} else {
    Write-Error "Could not find backend directory!"
    exit 1
}

$BackendDir = "$ProjectRoot\backend"
$FrontendDir = "$ProjectRoot\frontend"
$VenvPython = "$BackendDir\venv\Scripts\python.exe"

Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "[*] Starting Backend Server (Flask on http://127.0.0.1:5000)..." -ForegroundColor Gray
Start-Process -FilePath $VenvPython -ArgumentList "run.py" -WorkingDirectory $BackendDir

Write-Host "[*] Starting Frontend Server (Vite on http://localhost:5173)..." -ForegroundColor Gray
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host 127.0.0.1 --port 5173" -WorkingDirectory $FrontendDir

Write-Host "[*] Waiting for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "[*] Launching browser..." -ForegroundColor Gray
Start-Process "http://localhost:5173"

Clear-Host
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "            ABHAYA IS RUNNING SUCCESSFULLY!         " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Frontend Web App : http://localhost:5173" -ForegroundColor Yellow
Write-Host " Backend API      : http://127.0.0.1:5000/api" -ForegroundColor Yellow
Write-Host " Backend Status   : http://127.0.0.1:5000/api/status" -ForegroundColor Yellow
Write-Host ""
Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
Write-Host " DEMO CREDENTIALS:" -ForegroundColor White
Write-Host "   Regular User : demo.user@abhaya.test  / Demo@12345" -ForegroundColor White
Write-Host "   Administrator: demo.admin@abhaya.test / Admin@12345" -ForegroundColor White
Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Magenta
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "`n[*] Stopping ABHAYA services..." -ForegroundColor Gray
Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Write-Host "[OK] All services stopped." -ForegroundColor Green