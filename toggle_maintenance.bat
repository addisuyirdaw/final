@echo off
setlocal
cd /d "%~dp0"

echo ================================================================
echo           DBU PORTAL MODE SWITCHER (1-CLICK TOGGLE)
echo ================================================================
echo.

if exist "C:\Users\DBU\Desktop\nodejs\node-v20.17.0-win-x64\node.exe" (
    "C:\Users\DBU\Desktop\nodejs\node-v20.17.0-win-x64\node.exe" scratch\toggle_mode.js
) else (
    node scratch\toggle_mode.js
)

echo.
echo If your local dev server is running (http://localhost:5173),
echo the mode has ALREADY updated in your browser via hot-reload!
echo.
set /p PUSH="Do you also want to push this mode to live Vercel? (y/n): "
if /i "%PUSH%"=="y" (
    echo.
    echo Pushing mode to Vercel production...
    git add dbu-student-union21-main/project/src/config/maintenance.js
    git commit -m "chore: toggle maintenance mode"
    git push origin main
    echo [DONE] Deployed to Vercel!
)

echo.
pause
