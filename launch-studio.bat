@echo off
title ForgeAI Reel Studio
cd /d "C:\Users\Admin\.gemini\antigravity-ide\scratch\ai-fullstack-builder"

:: Check if server is already running on port 3030
netstat -ano | findstr ":3030" >nul
if errorlevel 1 (
    echo [ForgeAI] Starting AI Reel Studio Server...
    start /b node server.js
    timeout /t 2 /nobreak >nul
)

:: Open in default browser
start http://localhost:3030
exit
