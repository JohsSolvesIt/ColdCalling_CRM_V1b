#!/bin/bash

# Clear terminal on startup
clear

# Parse command line arguments
BUILD_FLAG=false
for arg in "$@"; do
    case $arg in
        -build|--build)
            BUILD_FLAG=true
            shift
            ;;
        *)
            # unknown option
            ;;
    esac
done

echo "🚀 Starting ColdCalling CRM Application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build process if -build flag is provided
if [ "$BUILD_FLAG" = true ]; then
    echo "🔨 Build flag detected - Building application before starting..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Build frontend (React app)
    echo "📦 Building frontend..."
    cd client
    if npm run build; then
        echo "✅ Frontend build completed successfully"
    else
        echo "❌ Frontend build failed"
        exit 1
    fi
    cd ..
    
    # Install/update backend dependencies if needed
    echo "📦 Checking backend dependencies..."
    if npm install; then
        echo "✅ Backend dependencies updated"
    else
        echo "❌ Backend dependency installation failed"
        exit 1
    fi
    
    # Build Chrome Extension backend if it has a build script
    if [ -f "../chromeExtensionRealtor/backend/package.json" ]; then
        echo "📦 Building Chrome Extension backend..."
        cd ../chromeExtensionRealtor/backend
        if npm install; then
            echo "✅ Chrome Extension backend dependencies updated"
        else
            echo "❌ Chrome Extension backend dependency installation failed"
            exit 1
        fi
        cd ../../crm-app
    fi
    
    echo "✅ Build process completed successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

# First, kill any existing start.sh processes to prevent conflicts
echo "🧹 Killing any existing start.sh processes..."
# Kill other start.sh processes (but not this one)
CURRENT_PID=$$
START_PIDS=$(pgrep -f "start\.sh" 2>/dev/null | grep -v $CURRENT_PID)
if [ ! -z "$START_PIDS" ]; then
    echo "Found existing start.sh processes: $START_PIDS"
    echo "$START_PIDS" | xargs -r kill -9 2>/dev/null || true
    sleep 2
    echo "✅ Existing start.sh processes terminated"
else
    echo "✅ No existing start.sh processes found"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill processes on specific ports
kill_port() {
    if command_exists lsof; then
        local port=$1
        echo "🔄 Cleaning up port $port..."
        
        # Get all PIDs using this port
        local pids=$(lsof -ti :$port 2>/dev/null)
        
        if [ ! -z "$pids" ]; then
            # First try graceful kill
            echo "$pids" | xargs -r kill 2>/dev/null
            sleep 2
            
            # Check if any processes are still running
            local remaining_pids=$(lsof -ti :$port 2>/dev/null)
            if [ ! -z "$remaining_pids" ]; then
                echo "🔥 Force killing stubborn processes on port $port..."
                echo "$remaining_pids" | xargs -r kill -9 2>/dev/null
                sleep 1
                
                # Final check with system-level kill
                local final_pids=$(lsof -ti :$port 2>/dev/null)
                if [ ! -z "$final_pids" ]; then
                    sudo kill -9 $final_pids 2>/dev/null || true
                    sleep 1
                fi
            fi
        fi
        
        # Also kill any node processes that might be related to this port
        pkill -f ":$port" 2>/dev/null || true
        pkill -f "port.*$port" 2>/dev/null || true
        
        # Verify the port is actually free
        if lsof -ti :$port >/dev/null 2>&1; then
            echo "⚠️  Warning: Port $port still appears to be in use"
        else
            echo "✅ Port $port cleaned successfully"
        fi
    fi
}

# Check the start script
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

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."

# Kill any remaining Node processes that might be from previous CRM runs
echo "🔍 Killing any remaining CRM-related Node processes..."
# Kill node processes running on our ports
NODE_PIDS=$(lsof -ti :3000,:5000,:5001,:3030,:3031 2>/dev/null)
if [ ! -z "$NODE_PIDS" ]; then
    echo "Found Node processes on CRM ports: $NODE_PIDS"
    echo "$NODE_PIDS" | xargs -r kill -9 2>/dev/null || true
    sleep 2
fi

# Kill node processes with CRM-related patterns
pkill -f "server.js" 2>/dev/null || true
pkill -f "save-server.js" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "nodemon.*server" 2>/dev/null || true
sleep 1

# Now use the port cleanup function
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
echo "🔧 Starting CRM in Development Mode..."
echo "   • Frontend (React): http://localhost:3000 (Hot Reload)"
echo "   • Backend (API): http://localhost:5000"
echo "   • Chrome Extension Backend: http://localhost:5001"
echo "   • VvebJS Server: http://localhost:3030"
echo "   • VvebJS Save Server: http://localhost:3031"
echo "   • All servers will start automatically"
echo ""

# Check if concurrently is available for running both servers
if npm list concurrently >/dev/null 2>&1; then
    echo "🎯 Launching all servers (Frontend, Backend, Chrome Extension, VvebJS)..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 Tips:"
    echo "   • Your browser will open automatically to http://localhost:3000"
    echo "   • Changes to frontend code will auto-reload"
    echo "   • Changes to backend code will auto-restart"
    echo "   • Chrome Extension backend provides realtor data at port 5001"
    echo "   • VvebJS editor and realtor pages available at port 3030"
    echo "   • Access VvebJS editor: http://localhost:3030/editor.html"
    echo "   • Access realtor directory: http://localhost:3030/generated-realtors/"
    echo "   • Press Ctrl+C to stop all servers"
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
        echo "🛑 Shutting down all servers..."
        kill $CHROME_EXT_PID 2>/dev/null
        kill $VVEBJS_PID 2>/dev/null
        kill $VVEBJS_SAVE_PID 2>/dev/null
        kill $MONITOR_PID 2>/dev/null
        kill $VVEBJS_MONITOR_PID 2>/dev/null
        kill $VVEBJS_SAVE_MONITOR_PID 2>/dev/null
        kill_port 5001
        kill_port 3030
        kill_port 3031
        exit 0
    }
    trap cleanup SIGINT SIGTERM
    
    # Start both CRM servers using concurrently with better output
    npm run dev
else
    echo "⚠️  Starting servers manually (concurrently not available)..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 Manual Setup:"
    echo "   1. Starting Chrome Extension backend on port 5001"
    echo "   2. Starting VvebJS server on port 3030"
    echo "   3. Starting VvebJS Save Server on port 3031"
    echo "   4. This terminal will start the CRM backend server on port 5000"
    echo "   5. Open another terminal and run: cd client && npm start"
    echo "   6. Frontend will be at http://localhost:3000"
    echo "   7. Backend will be at http://localhost:5000"
    echo "   8. Chrome Extension backend will be at http://localhost:5001"
    echo "   9. VvebJS editor will be at http://localhost:3030/editor.html"
    echo "   10. Realtor directory will be at http://localhost:3030/generated-realtors/"
    echo "   11. VvebJS Save API will be at http://localhost:3031"
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
        echo "🛑 Shutting down Chrome Extension backend, VvebJS server, and VvebJS Save Server..."
        kill $CHROME_EXT_PID 2>/dev/null
        kill $VVEBJS_PID 2>/dev/null
        kill $VVEBJS_SAVE_PID 2>/dev/null
        kill $MONITOR_PID 2>/dev/null
        kill $VVEBJS_MONITOR_PID 2>/dev/null
        kill $VVEBJS_SAVE_MONITOR_PID 2>/dev/null
        kill_port 5001
        kill_port 3030
        kill_port 3031
        exit 0
    }
    trap cleanup SIGINT SIGTERM
    
    read -p "Press Enter to start the CRM backend server..."
    
    echo "🖥️  Starting CRM backend server..."
    npm run server
fi
