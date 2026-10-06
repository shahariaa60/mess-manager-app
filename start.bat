@echo off
title Mess Manager (App)
cd /d "%~dp0"
echo ==========================================
echo     MESS MANAGER APP - START
echo ==========================================
echo.
echo Starting Server (port 3001)...
start "Mess Manager Server" cmd /k "cd /d "%~dp0server" && node index.js"
echo.
echo Starting Client (port 5173)...
start "Mess Manager Client" cmd /k "cd /d "%~dp0client" && npx vite"
echo.
echo ==========================================
echo  Server: http://localhost:3001
echo  Client: http://localhost:5173
echo ==========================================
start "" "http://localhost:5173"
timeout /t 3 >nul