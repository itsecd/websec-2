@echo off
cd /d "%~dp0"
echo WebSec 2 schedule app
echo Opening http://localhost:3000
start "" "http://localhost:3000"
node server.js
pause
