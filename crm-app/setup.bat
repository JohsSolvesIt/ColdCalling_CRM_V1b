@echo off
echo 🚀 Setting up CSV-to-CRM Local Database Application...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm found

REM Install dependencies
echo 📦 Installing server dependencies...
npm install

echo 📦 Installing client dependencies...
cd client
npm install
cd ..

echo 🏗️  Building client application...
cd client
npm run build
cd ..

echo 📁 Creating necessary directories...
if not exist "databases" mkdir databases
if not exist "uploads" mkdir uploads

echo ✅ Setup complete!
echo.
echo 🎉 To start the application:
echo    npm start
echo.
echo 🌐 Then open your browser to: http://localhost:5000
echo.
echo 📝 For development (with auto-reload):
echo    npm run dev
pause
