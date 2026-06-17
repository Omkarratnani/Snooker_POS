@echo off
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies. This will only run the first time...
    call npm install
)
if not exist dist (
    echo Compiling production build. This will only run once...
    call npm run build
)
echo Starting Snooker & Pool POS Production Server...
start cmd /k "node server.js"
timeout /t 3 /nobreak >nul
start http://localhost:5001/
exit
