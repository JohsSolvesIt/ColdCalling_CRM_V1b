@echo off
echo 🚀 Starting CSV-to-CRM Application (Production Mode)...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed. Please install Node.js and try again.
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ Error: package.json not found. Please run this script from the crm-app directory.
    pause
    exit /b 1
)

REM Check if setup has been run
if not exist node_modules (
    echo ⚠️  Dependencies not installed. Running setup first...
    call setup.bat
    if errorlevel 1 (
        echo ❌ Setup failed. Please check the error messages above.
        pause
        exit /b 1
    )
)

REM Check if client is built
if not exist client\build (
    echo ⚠️  Client not built. Building now...
    cd client
    npm run build
    cd ..
    if errorlevel 1 (
        echo ❌ Failed to build client
        pause
        exit /b 1
    )
)

echo.
echo ✅ All checks passed!
echo.
echo 🔧 Configuration:
echo    • Server: http://localhost:5000
echo    • Mode: Production (Optimized Build)
echo    • Static Files: Served from client/build
echo.

REM Try to open browser automatically
echo 🌐 Opening browser automatically...
start "" timeout /t 3 /nobreak >nul 2>nul && start http://localhost:5000

echo.
echo 🛑 Press Ctrl+C to stop the server
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Start the server
npm start

pause
