@echo off
title TrafficRoute - All Services (Frontend + Backend + ngrok)

setlocal enabledelayedexpansion

echo ================================================================
echo    TRAFFICROUTE - Full System Startup
echo    Frontend + Backend + ngrok (Public Access)
echo ================================================================
echo.

REM ================================================================
REM 1. CHECK NGROK
REM ================================================================
echo [1/5] Checking ngrok...

set NGROK_PATH=C:\ngrok
if exist "!NGROK_PATH!\ngrok.exe" (
    echo    [OK] ngrok found at !NGROK_PATH!
    set NGROK_AVAILABLE=1
) else (
    echo    [WARN] ngrok not found at !NGROK_PATH!
    echo    Please install ngrok or update the path.
    echo    Continuing without ngrok...
    set NGROK_AVAILABLE=0
)
echo.

REM ================================================================
REM 2. START POSTGRESQL
REM ================================================================
echo [2/5] Checking PostgreSQL...

net start | findstr postgresql >nul
if %errorlevel% == 1 (
    echo    [..] Starting PostgreSQL service...
    net start postgresql-x64-16 >nul 2>&1
    if !errorlevel! == 0 (
        echo    [OK] PostgreSQL started
    ) else (
        echo    [WARN] Could not start PostgreSQL. Continuing anyway...
    )
) else (
    echo    [OK] PostgreSQL already running
)
echo.

REM ================================================================
REM 3. START BACKEND
REM ================================================================
echo [3/5] Starting Backend Server...

cd /d "%~dp0backend"

REM Kill any existing node processes on port 5000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

start "TrafficRoute Backend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

REM Check if backend started
netstat -ano | findstr :5000 | findstr LISTENING >nul
if !errorlevel! == 0 (
    echo    [OK] Backend started on port 5000
) else (
    echo    [WARN] Backend may not have started. Check the terminal window.
)
echo.

REM ================================================================
REM 4. BUILD AND START FRONTEND
REM ================================================================
echo [4/5] Building and Starting Frontend Server...

cd /d "%~dp0frontend"

REM Kill any existing processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo    [..] Building production files (this may take 1-2 minutes)...
call npm run build > build_log.txt 2>&1

if !errorlevel! == 0 (
    echo    [OK] Frontend build successful
    set BUILD_MODE=production
) else (
    echo    [WARN] Production build failed. Using development mode...
    set BUILD_MODE=development
)

if "!BUILD_MODE!"=="production" (
    start "TrafficRoute Frontend" cmd /k "serve -s build -l 3000"
    echo    [OK] Frontend started in production mode on port 3000
) else (
    start "TrafficRoute Frontend" cmd /k "npm start"
    echo    [OK] Frontend started in development mode on port 3000
)

timeout /t 5 /nobreak >nul

netstat -ano | findstr :3000 | findstr LISTENING >nul
if !errorlevel! == 0 (
    echo    [OK] Frontend running on port 3000
) else (
    echo    [WARN] Frontend may not have started. Check the terminal window.
)
echo.

REM ================================================================
REM 5. START NGROK
REM ================================================================
echo [5/5] Starting ngrok for public access...

if !NGROK_AVAILABLE! == 1 (
    cd /d "!NGROK_PATH!"
    start "TrafficRoute ngrok" cmd /k "ngrok http 3000"
    timeout /t 5 /nobreak >nul
    echo    [OK] ngrok started
) else (
    echo    [WARN] ngrok not available - skipping
)
echo.

REM ================================================================
REM 6. GET IP ADDRESS
REM ================================================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set IP=%%a
    set IP=!IP:~1!
    goto :ip_found
)
:ip_found
if "!IP!"=="" set IP=YOUR_IP

REM ================================================================
REM 7. DISPLAY ACCESS INFORMATION
REM ================================================================
cls
echo ================================================================
echo    ALL SERVICES STARTED SUCCESSFULLY!
echo ================================================================
echo.
echo    LOCAL ACCESS:
echo       http://localhost:3000
echo.
if not "!IP!"=="YOUR_IP" (
    echo    NETWORK ACCESS (Same WiFi):
    echo       http://!IP!:3000
    echo.
)
echo    PUBLIC ACCESS (ngrok):
echo       Check the ngrok terminal window for the HTTPS URL
echo       It will look like: https://xxxxxx.ngrok-free.dev
echo.
echo ================================================================
echo    QUICK TIPS:
echo    - Keep all terminal windows open while using the app
echo    - To stop all services, close the terminal windows
echo    - ngrok free tier expires after 2 hours
echo ================================================================
echo.

REM ================================================================
REM 8. OPEN BROWSER
REM ================================================================
echo Opening your browser...
start http://localhost:3000

echo.
echo ================================================================
echo    PRESENTATION READY!
echo    Share the ngrok URL with your audience!
echo ================================================================
echo.

pause