@echo off
title ABHAYA - Stop Services
echo =====================================================================
echo                     Stopping ABHAYA Services
echo =====================================================================
echo.
echo [*] Terminating services on port 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    echo Killing PID %%a on port 5000
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo Killing PID %%a on port 5173
    taskkill /F /PID %%a >nul 2>&1
)
echo.
echo [OK] All ABHAYA services stopped successfully.
timeout /t 2 /nobreak >nul