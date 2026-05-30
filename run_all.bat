@echo off
title DBU Student Union Launcher
echo ===================================================
echo   DBU Student Union - Fullstack Application Launcher
echo ===================================================
echo.

echo [1/3] Starting Backend Server (Port 5000)...
start "DBU Backend" cmd /c "cd dbu-student-union21-main\backend && \"C:\Program Files\nodejs\node.exe\" server.js || node server.js"

echo [2/3] Starting Frontend Server (Port 5173)...
start "DBU Frontend" cmd /c "cd dbu-student-union21-main\project && \"C:\Program Files\nodejs\node.exe\" node_modules\vite\bin\vite.js || node node_modules\vite\bin\vite.js"

echo [3/3] Launching web browser...
timeout /t 3 >nul
start http://localhost:5173

echo.
echo ✅ Both servers have been launched in separate windows!
echo    - Frontend: http://localhost:5173
echo    - Backend:  http://localhost:5000 (API)
echo.
echo Close the newly opened command windows to stop the servers.
echo ===================================================
pause
