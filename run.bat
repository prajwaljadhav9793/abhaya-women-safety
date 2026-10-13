@echo off
setlocal EnableDelayedExpansion
title ABHAYA - One Click Launcher

echo =====================================================================
echo                     ABHAYA - Women Safety Platform
echo                          One-Click Launcher
echo =====================================================================
echo.

set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%backend" (
    set "PROJECT_ROOT=%SCRIPT_DIR%"
) else if exist "%SCRIPT_DIR%abhaya_full\abhaya\backend" (
    set "PROJECT_ROOT=%SCRIPT_DIR%abhaya_full\abhaya\"
) else (
    echo [ERROR] Could not find backend directory!
    pause
    exit /b 1
)

set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"
set "VENV_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"

where python >nul 2>&1
if %errorlevel% neq 0 (
    if not exist "%VENV_PYTHON%" (
        echo [ERROR] Python is not installed or not in PATH!
        echo Please install Python 3.10+ from https://python.org
        pause
        exit /b 1
    )
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

if not exist "%VENV_PYTHON%" (
    echo [*] Creating Python virtual environment...
    python -m venv "%BACKEND_DIR%\venv"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [*] Installing backend dependencies...
    "%VENV_PYTHON%" -m pip install -r "%BACKEND_DIR%\requirements.txt"
)

if not exist "%BACKEND_DIR%\.env" (
    echo [*] Creating backend .env file...
    if exist "%BACKEND_DIR%\.env.example" (
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
    )
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [*] Installing frontend npm packages...
    cd /d "%FRONTEND_DIR%"
    call npm install
)

if not exist "%FRONTEND_DIR%\.env" (
    echo [*] Creating frontend .env file...
    if exist "%FRONTEND_DIR%\.env.example" (
        copy "%FRONTEND_DIR%\.env.example" "%FRONTEND_DIR%\.env" >nul
    ) else (
        echo VITE_API_URL=http://127.0.0.1:5000/api > "%FRONTEND_DIR%\.env"
    )
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo.
echo [*] Starting Backend Server (Flask on http://127.0.0.1:5000)...
start "ABHAYA - Backend Server" cmd /c "cd /d "%BACKEND_DIR%" && "%VENV_PYTHON%" run.py"

echo [*] Starting Frontend Server (Vite on http://localhost:5173)...
start "ABHAYA - Frontend Server" cmd /c "cd /d "%FRONTEND_DIR%" && npm run dev -- --host 127.0.0.1 --port 5173"

echo [*] Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo [*] Opening ABHAYA in your default web browser...
start http://localhost:5173

cls
echo =====================================================================
echo                     ABHAYA IS RUNNING SUCCESSFULLY!
echo =====================================================================
echo.
echo  - Frontend Web App : http://localhost:5173
echo  - Backend API      : http://127.0.0.1:5000/api
echo  - Backend Status   : http://127.0.0.1:5000/api/status
echo.
echo ---------------------------------------------------------------------
echo  DEMO CREDENTIALS:
echo    User Login  : demo.user@abhaya.test  / Demo@12345
echo    Admin Login : demo.admin@abhaya.test / Admin@12345
echo ---------------------------------------------------------------------
echo.
echo  Keep this window open while using the application.
echo  Press any key to stop all services.
echo.
echo =====================================================================
pause >nul

echo.
echo [*] Shutting down ABHAYA services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo [OK] All services stopped.
timeout /t 2 /nobreak >nul
exit /b 0