#!/bin/bash

echo "🐛 Starting ColdCalling CRM Application (DEBUG MODE)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill processes on specific ports
kill_port() {
    if command_exists lsof; then
        local pid=$(lsof -ti :$1 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo "🔄 Cleaning up port $1..."
            # Kill all processes using this port
            echo "$pid" | xargs -r kill -9 2>/dev/null
            sleep 2
            
            # Double-check and force kill if still running
            local remaining_pid=$(lsof -ti :$1 2>/dev/null)
            if [ ! -z "$remaining_pid" ]; then
                echo "🔥 Force killing stubborn process on port $1..."
                echo "$remaining_pid" | xargs -r kill -9 2>/dev/null
                sleep 1
            fi
        fi
    fi
}

# Check for Node.js and npm
if ! command_exists node; then
    echo "❌ Error: Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/ and try again."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Error: npm is not installed."
    echo "Please install npm and try again."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the crm-app directory."
    exit 1
fi

# Check if monitor.js exists
if [ ! -f "monitor.js" ]; then
    echo "❌ Error: monitor.js not found. Debug monitoring requires the monitor script."
    exit 1
fi

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
kill_port 3000
kill_port 5000
kill_port 5001
kill_port 3030
kill_port 3031

# Install dependencies if missing
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⬇️  Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
fi

if [ ! -d "client/node_modules" ]; then
    echo "⬇️  Installing frontend dependencies..."
    cd client && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
fi

# Check and install Chrome Extension backend dependencies
echo "📦 Checking Chrome Extension backend dependencies..."
if [ ! -d "../chromeExtensionRealtor/backend/node_modules" ]; then
    echo "⬇️  Installing Chrome Extension backend dependencies..."
    cd ../chromeExtensionRealtor/backend && npm install && cd ../../crm-app
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Chrome Extension backend dependencies"
        exit 1
    fi
else
    echo "✅ Chrome Extension backend dependencies already installed"
fi

# Check and install VvebJS dependencies
echo "📦 Checking VvebJS dependencies..."
if [ ! -d "../vvebjs/node_modules" ]; then
    echo "⬇️  Installing VvebJS dependencies..."
    cd ../vvebjs && npm install && cd ../crm-app
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install VvebJS dependencies"
        exit 1
    fi
else
    echo "✅ VvebJS dependencies already installed"
fi

# Ensure .env file exists for Chrome Extension backend
echo "🔧 Checking Chrome Extension backend configuration..."
if [ ! -f "../chromeExtensionRealtor/backend/.env" ]; then
    if [ -f "../chromeExtensionRealtor/backend/.env.example" ]; then
        echo "📝 Creating .env file from .env.example..."
        cd ../chromeExtensionRealtor/backend
        cp .env.example .env
        # Update the port to 5001
        sed -i 's/PORT=3001/PORT=5001/' .env
        cd ../../crm-app
    else
        echo "📝 Creating basic .env file..."
        cat > ../chromeExtensionRealtor/backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=realtor_data
DB_USER=postgres
DB_PASSWORD=

# Server Configuration
PORT=5001
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=dev_secret_change_in_production
EOF
    fi
    echo "✅ Chrome Extension backend .env file configured"
fi

# Function to start Chrome Extension backend
start_chrome_extension_backend() {
    echo "🚀 Starting Chrome Extension backend on port 5001..."
    cd ../chromeExtensionRealtor/backend
    
    # Ensure logs directory exists
    mkdir -p logs
    
    # Clear old logs
    > logs/error.log
    > logs/combined.log
    
    # Start the backend with proper error handling
    npm start > logs/startup.log 2>&1 &
    CHROME_EXT_PID=$!
    cd ../../crm-app
    
    # Wait and verify the backend started
    echo "⏳ Waiting for Chrome Extension backend to start..."
    sleep 5
    
    if kill -0 $CHROME_EXT_PID 2>/dev/null; then
        echo "✅ Chrome Extension backend started successfully (PID: $CHROME_EXT_PID)"
        
        # Test the health endpoint with multiple attempts
        local attempts=0
        local max_attempts=6
        while [ $attempts -lt $max_attempts ]; do
            if command_exists curl; then
                if curl -s http://localhost:5001/health >/dev/null 2>&1; then
                    echo "✅ Chrome Extension backend health check passed"
                    return 0
                fi
            fi
            attempts=$((attempts + 1))
            if [ $attempts -lt $max_attempts ]; then
                echo "⏳ Health check attempt $attempts/$max_attempts failed, retrying..."
                sleep 2
            fi
        done
        echo "⚠️  Chrome Extension backend started but health check failed (this may be normal if backend is still initializing)"
    else
        echo "❌ Chrome Extension backend failed to start"
        if [ -f "../chromeExtensionRealtor/backend/logs/startup.log" ]; then
            echo "📋 Startup log:"
            tail -20 ../chromeExtensionRealtor/backend/logs/startup.log
        fi
        if [ -f "../chromeExtensionRealtor/backend/logs/error.log" ]; then
            echo "📋 Error log:"
            tail -10 ../chromeExtensionRealtor/backend/logs/error.log
        fi
        return 1
    fi
}

# Function to start VvebJS server
start_vvebjs_server() {
    echo "🚀 Starting VvebJS server on port 3030..."
    cd ../vvebjs
    
    # Start the VvebJS server
    npm run serve-realtor > vvvebjs.log 2>&1 &
    VVEBJS_PID=$!
    cd ../crm-app
    
    # Wait and verify the server started
    echo "⏳ Waiting for VvebJS server to start..."
    sleep 3
    
    if kill -0 $VVEBJS_PID 2>/dev/null; then
        echo "✅ VvebJS server started successfully (PID: $VVEBJS_PID)"
        
        # Test the server with multiple attempts
        local attempts=0
        local max_attempts=5
        while [ $attempts -lt $max_attempts ]; do
            if command_exists curl; then
                if curl -s http://localhost:3030/ >/dev/null 2>&1; then
                    echo "✅ VvebJS server health check passed"
                    return 0
                fi
            fi
            attempts=$((attempts + 1))
            if [ $attempts -lt $max_attempts ]; then
                echo "⏳ VvebJS health check attempt $attempts/$max_attempts failed, retrying..."
                sleep 2
            fi
        done
        echo "⚠️  VvebJS server started but health check failed (this may be normal if server is still initializing)"
    else
        echo "❌ VvebJS server failed to start"
        if [ -f "../vvebjs/vvvebjs.log" ]; then
            echo "📋 VvebJS log:"
            tail -10 ../vvebjs/vvvebjs.log
        fi
        return 1
    fi
}

# Function to start VvebJS Save Server
start_vvebjs_save_server() {
    echo "🚀 Starting VvebJS Save Server on port 3031..."
    cd ../vvebjs
    
    # Start the VvebJS Save Server
    npm run start-save-server > save-server.log 2>&1 &
    VVEBJS_SAVE_PID=$!
    cd ../crm-app
    
    # Wait and verify the server started
    echo "⏳ Waiting for VvebJS Save Server to start..."
    sleep 3
    
    if kill -0 $VVEBJS_SAVE_PID 2>/dev/null; then
        echo "✅ VvebJS Save Server started successfully (PID: $VVEBJS_SAVE_PID)"
        
        # Test the server with multiple attempts
        local attempts=0
        local max_attempts=5
        while [ $attempts -lt $max_attempts ]; do
            if command_exists curl; then
                if curl -s http://localhost:3031/health >/dev/null 2>&1; then
                    echo "✅ VvebJS Save Server health check passed"
                    return 0
                fi
            fi
            attempts=$((attempts + 1))
            if [ $attempts -lt $max_attempts ]; then
                echo "⏳ VvebJS Save Server health check attempt $attempts/$max_attempts failed, retrying..."
                sleep 2
            fi
        done
        echo "⚠️  VvebJS Save Server started but health check failed (this may be normal if server is still initializing)"
    else
        echo "❌ VvebJS Save Server failed to start"
        if [ -f "../vvebjs/save-server.log" ]; then
            echo "📋 VvebJS Save Server log:"
            tail -10 ../vvebjs/save-server.log
        fi
        return 1
    fi
}

# Function to start health monitor
start_health_monitor() {
    echo "🏥 Starting health monitor (DEBUG MODE)..."
    
    # Start the health monitor with 1-minute intervals for debug mode
    node monitor.js monitor 1 > monitor.log 2>&1 &
    MONITOR_HEALTH_PID=$!
    
    echo "✅ Health monitor started (PID: $MONITOR_HEALTH_PID)"
    echo "📊 Monitor log: monitor.log"
    echo "📈 Health status file: health-status.json"
    
    return 0
}

# Function to monitor Chrome Extension backend
monitor_chrome_extension() {
    while true; do
        if ! kill -0 $CHROME_EXT_PID 2>/dev/null; then
            echo "⚠️  Chrome Extension backend crashed, restarting..."
            start_chrome_extension_backend
        fi
        sleep 5
    done
}

# Function to monitor VvebJS server
monitor_vvebjs() {
    while true; do
        if ! kill -0 $VVEBJS_PID 2>/dev/null; then
            echo "⚠️  VvebJS server crashed, restarting..."
            start_vvebjs_server
        fi
        sleep 5
    done
}

# Function to monitor VvebJS Save Server
monitor_vvebjs_save() {
    while true; do
        if ! kill -0 $VVEBJS_SAVE_PID 2>/dev/null; then
            echo "⚠️  VvebJS Save Server crashed, restarting..."
            start_vvebjs_save_server
        fi
        sleep 5
    done
}

# Determine startup mode
echo ""
echo "🐛 Starting CRM in DEBUG Mode..."
echo "   • Frontend (React): http://localhost:3000 (Hot Reload)"
echo "   • Backend (API): http://localhost:5000"
echo "   • Chrome Extension Backend: http://localhost:5001"
echo "   • VvebJS Server: http://localhost:3030"
echo "   • VvebJS Save Server: http://localhost:3031"
echo "   • Health Monitor: Running with 1-minute intervals"
echo "   • All servers will start automatically with monitoring"
echo ""
echo "🔍 Debug Features:"
echo "   • Real-time health monitoring"
echo "   • Detailed service status logging"
echo "   • Automatic crash detection and alerts"
echo "   • System resource monitoring"
echo "   • Monitor log: monitor.log"
echo "   • Health status: health-status.json"
echo ""

# Check if concurrently is available for running both servers
if npm list concurrently >/dev/null 2>&1; then
    echo "🎯 Launching all servers with DEBUG monitoring..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 DEBUG Tips:"
    echo "   • Your browser will open automatically to http://localhost:3000"
    echo "   • Health monitor runs every 1 minute for detailed debugging"
    echo "   • Check monitor.log for continuous health updates"
    echo "   • Check health-status.json for latest system status"
    echo "   • All crashes and issues will be logged in detail"
    echo "   • System resource usage is continuously monitored"
    echo "   • Press Ctrl+C to stop all servers and monitoring"
    echo ""
    
    # Start Chrome Extension backend in background
    echo "🚀 Starting Chrome Extension backend..."
    start_chrome_extension_backend
    
    # Start VvebJS server in background
    echo "🚀 Starting VvebJS server..."
    start_vvebjs_server
    
    # Start VvebJS Save Server in background
    echo "🚀 Starting VvebJS Save Server..."
    start_vvebjs_save_server
    
    # Start health monitor in background
    echo "🏥 Starting health monitor..."
    start_health_monitor
    
    # Start monitoring in background
    monitor_chrome_extension &
    MONITOR_PID=$!
    
    monitor_vvebjs &
    VVEBJS_MONITOR_PID=$!
    
    monitor_vvebjs_save &
    VVEBJS_SAVE_MONITOR_PID=$!
    
    # Wait a moment for all services to start
    sleep 3
    
    # Try to open browser automatically after a delay
    if command_exists xdg-open; then
        (sleep 5 && xdg-open http://localhost:3000) &
    elif command_exists open; then
        (sleep 5 && open http://localhost:3000) &
    fi
    
    # Setup cleanup function
    cleanup() {
        echo ""
        echo "🛑 Shutting down all servers and monitoring..."
        kill $CHROME_EXT_PID 2>/dev/null
        kill $VVEBJS_PID 2>/dev/null
        kill $VVEBJS_SAVE_PID 2>/dev/null
        kill $MONITOR_PID 2>/dev/null
        kill $VVEBJS_MONITOR_PID 2>/dev/null
        kill $VVEBJS_SAVE_MONITOR_PID 2>/dev/null
        kill $MONITOR_HEALTH_PID 2>/dev/null
        kill_port 5001
        kill_port 3030
        kill_port 3031
        echo "🏥 Final health check saved to health-status.json"
        echo "📊 Debug session complete. Check monitor.log for details."
        exit 0
    }
    trap cleanup SIGINT SIGTERM
    
    # Show initial health status
    echo "🏥 Running initial health check..."
    node monitor.js once
    echo ""
    echo "🚀 Starting CRM servers with concurrently..."
    
    # Start both CRM servers using concurrently with better output
    npm run dev
else
    echo "⚠️  Starting servers manually with DEBUG monitoring..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 Manual DEBUG Setup:"
    echo "   1. Starting Chrome Extension backend on port 5001"
    echo "   2. Starting VvebJS server on port 3030"
    echo "   3. Starting VvebJS Save Server on port 3031"
    echo "   4. Starting health monitor with 1-minute intervals"
    echo "   5. This terminal will start the CRM backend server on port 5000"
    echo "   6. Open another terminal and run: cd client && npm start"
    echo "   7. Frontend will be at http://localhost:3000"
    echo "   8. Backend will be at http://localhost:5000"
    echo "   9. Chrome Extension backend will be at http://localhost:5001"
    echo "   10. VvebJS editor will be at http://localhost:3030/editor.html"
    echo "   11. Realtor directory will be at http://localhost:3030/generated-realtors/"
    echo "   12. VvebJS Save API will be at http://localhost:3031"
    echo "   13. Monitor log: monitor.log"
    echo "   14. Health status: health-status.json"
    echo ""
    
    # Start Chrome Extension backend in background
    echo "🚀 Starting Chrome Extension backend..."
    start_chrome_extension_backend
    
    # Start VvebJS server in background
    echo "🚀 Starting VvebJS server..."
    start_vvebjs_server
    
    # Start VvebJS Save Server in background
    echo "🚀 Starting VvebJS Save Server..."
    start_vvebjs_save_server
    
    # Start health monitor in background
    echo "🏥 Starting health monitor..."
    start_health_monitor
    
    # Start monitoring in background
    monitor_chrome_extension &
    MONITOR_PID=$!
    
    monitor_vvebjs &
    VVEBJS_MONITOR_PID=$!
    
    monitor_vvebjs_save &
    VVEBJS_SAVE_MONITOR_PID=$!
    
    # Wait a moment for all services to start
    sleep 4
    
    # Setup cleanup function
    cleanup() {
        echo ""
        echo "🛑 Shutting down Chrome Extension backend, VvebJS server, VvebJS Save Server, and health monitor..."
        kill $CHROME_EXT_PID 2>/dev/null
        kill $VVEBJS_PID 2>/dev/null
        kill $VVEBJS_SAVE_PID 2>/dev/null
        kill $MONITOR_PID 2>/dev/null
        kill $VVEBJS_MONITOR_PID 2>/dev/null
        kill $VVEBJS_SAVE_MONITOR_PID 2>/dev/null
        kill $MONITOR_HEALTH_PID 2>/dev/null
        kill_port 5001
        kill_port 3030
        kill_port 3031
        echo "🏥 Final health check saved to health-status.json"
        echo "📊 Debug session complete. Check monitor.log for details."
        exit 0
    }
    trap cleanup SIGINT SIGTERM
    
    # Show initial health status
    echo "🏥 Running initial health check..."
    node monitor.js once
    echo ""
    
    read -p "Press Enter to start the CRM backend server..."
    
    echo "🖥️  Starting CRM backend server..."
    npm run server
fi
