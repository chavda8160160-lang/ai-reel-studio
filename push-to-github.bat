@echo off
title Push AI Reel Studio to GitHub
cd /d "C:\Users\Admin\.gemini\antigravity-ide\scratch\ai-fullstack-builder"
echo ========================================================
echo   Pushing AI Reel Studio to GitHub (chavda8160160-lang)
echo ========================================================
echo.
git add -A
git commit -m "Auto update AI Reel Studio code"
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   SUCCESS! All code has been pushed to your GitHub!
    echo ========================================================
) else (
    echo.
    echo If GitHub asks for login, please sign in above.
)
echo.
pause
