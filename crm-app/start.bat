@echo off
echo 🚀 Starting ColdCalling CRM Application...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: npm is not installed.
    echo Please install npm and try again.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ Error: package.json not found. Please run this script from the crm-app directory.
    pause
    exit /b 1
)

echo 📦 Checking dependencies...

REM Install dependencies if missing
if not exist node_modules (
    echo ⬇️  Installing backend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)

if not exist client
ode_modules (
    echo ⬇️  Installing frontend dependencies...
    cd client
    npm install
    cd ..
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo.
echo 🔧 Starting CRM in Development Mode...
echo    • Frontend (React): http://localhost:3000 (Hot Reload)
echo    • Backend (API): http://localhost:5000
echo    • Both servers will start automatically
echo.

REM Check if concurrently is available
npm list concurrently >nul 2>nul
if %errorlevel% equ 0 (
    echo 🎯 Launching both frontend and backend servers...
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 💡 Tips:
    echo    • Your browser will open automatically to http://localhost:3000
    echo    • Changes to frontend code will auto-reload
    echo    • Changes to backend code will auto-restart
    echo    • Press Ctrl+C to stop both servers
    echo.
    
    REM Try to open browser automatically after a delay
    start "" timeout /t 5 /nobreak >nul 2>nul && start http://localhost:3000
    
    REM Start both servers using concurrently
    npm run dev
) else (
    echo ⚠️  Starting servers manually (concurrently not available)...
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 🔧 Manual Setup:
    echo    1. This window will start the backend server
    echo    2. Open another command prompt and run: cd client ^&^& npm start
    echo    3. Frontend will be at http://localhost:3000
    echo    4. Backend will be at http://localhost:5000
    echo.
    pause
    
    echo 🖥️  Starting backend server...
    npm run server
)

pause