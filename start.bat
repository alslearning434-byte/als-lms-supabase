@echo off
setlocal
title ALS Learning LMS - Dev Stack Launcher
cd /d "%~dp0"

echo =====================================================
echo  ALS Learning LMS - Development Stack Launcher
echo =====================================================
echo.

if not exist node_modules (
    echo Installing dependencies, first run...
    call npm install
    if errorlevel 1 (
        echo.
        echo npm install failed. Please check the output above.
        pause
        exit /b 1
    )
)

echo [1/3] PocketBase database (http://127.0.0.1:8090) ...
netstat -ano | findstr /R /C:":8090 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       already running.
) else (
    start "ALS - PocketBase (8090)" cmd /k "pocketbase\pocketbase.exe serve --http=127.0.0.1:8090"
    echo       launching in new window...
)

echo [2/3] Express API (http://localhost:3001) ...
netstat -ano | findstr /R /C:":3001 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       already running.
) else (
    start "ALS - Express API (3001)" cmd /k "node server.js"
    echo       launching in new window...
)

echo [3/3] Vite dev server (http://localhost:5173) ...
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo       already running.
) else (
    start "ALS - Vite (5173)" cmd /k "npm run dev"
    echo       launching in new window...
)

echo.
echo =====================================================
echo  All services started.
echo.
echo   App:   http://localhost:5173
echo   Admin: http://127.0.0.1:8090/_/
echo.
echo  Each service runs in its own window.
echo  Close a window to stop that service.
echo =====================================================
echo.
pause
