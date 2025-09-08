@echo off
echo 🚀 Starting CSV-to-CRM Application in Development Mode...
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

REM Check if dependencies are installed
if not exist node_modules (
    echo ⚠️  Backend dependencies not installed. Installing now...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
)

if not exist client\node_modules (
    echo ⚠️  Frontend dependencies not installed. Installing now...
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
echo 🔧 Configuration:
echo    • Backend Server: http://localhost:5000
echo    • Frontend Server: http://localhost:3000
echo    • Mode: Development (Hot Reload Enabled)
echo.

REM Check if concurrently is available
npm list concurrently >nul 2>nul
if %errorlevel% equ 0 (
    echo 🎯 Starting both frontend and backend servers...
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 📝 Development Tips:
    echo    • Frontend changes auto-reload at http://localhost:3000
    echo    • Backend changes auto-restart with nodemon
    echo    • Both servers will start in parallel
    echo    • Press Ctrl+C to stop both servers
    echo.
    
    REM Try to open browser automatically after a delay
    start "" timeout /t 5 /nobreak >nul 2>nul && start http://localhost:3000
    
    REM Start both servers using concurrently
    npm run dev
) else (
    echo ⚠️  concurrently not available. Starting servers manually...
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 🔧 Manual Setup Required:
    echo    1. This window will start the backend server
    echo    2. Open a second command prompt and run: cd client ^&^& npm start
    echo    3. The frontend will be available at http://localhost:3000
    echo.
    pause
    
    echo 🖥️  Starting backend server...
    npm run server
)

pause
