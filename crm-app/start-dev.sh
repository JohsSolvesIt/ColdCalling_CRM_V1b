#!/bin/bash

echo "🚀 Starting CSV-to-CRM Application in Development Mode..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    if command_exists lsof; then
        if lsof -i :$1 >/dev/null 2>&1; then
            return 1  # Port is in use
        fi
    fi
    return 0  # Port is available
}

# Function to kill processes on specific ports
kill_port() {
    if command_exists lsof; then
        local pid=$(lsof -ti :$1)
        if [ ! -z "$pid" ]; then
            echo "🔄 Killing existing process on port $1..."
            kill -9 $pid 2>/dev/null
            sleep 1
        fi
    fi
}

# Check for Node.js
if ! command_exists node; then
    echo "❌ Error: Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check for npm
if ! command_exists npm; then
    echo "❌ Error: npm is not installed. Please install npm and try again."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the crm-app directory."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "⚠️  Backend dependencies not installed. Installing now..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install backend dependencies"
        exit 1
    fi
fi

if [ ! -d "client/node_modules" ]; then
    echo "⚠️  Frontend dependencies not installed. Installing now..."
    cd client && npm install && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
fi

# Kill any existing processes on our ports
kill_port 3000  # React dev server
kill_port 5000  # Express server

echo ""
echo "🔧 Configuration:"
echo "   • Backend Server: http://localhost:5000"
echo "   • Frontend Server: http://localhost:3000"
echo "   • Mode: Development (Hot Reload Enabled)"
echo ""

# Check if concurrently is available (for running both servers)
if command_exists npx && npm list concurrently >/dev/null 2>&1; then
    echo "🎯 Starting both frontend and backend servers..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📝 Development Tips:"
    echo "   • Frontend changes auto-reload at http://localhost:3000"
    echo "   • Backend changes auto-restart with nodemon"
    echo "   • Both servers will start in parallel"
    echo "   • Press Ctrl+C to stop both servers"
    echo ""
    
    # Try to open browser automatically after a delay
    if command_exists xdg-open; then
        (sleep 5 && xdg-open http://localhost:3000) &
    elif command_exists open; then
        (sleep 5 && open http://localhost:3000) &
    fi
    
    # Start both servers using concurrently
    npm run dev
else
    echo "⚠️  concurrently not available. Starting servers manually..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 Manual Setup Required:"
    echo "   1. This terminal will start the backend server"
    echo "   2. Open a second terminal and run: cd client && npm start"
    echo "   3. The frontend will be available at http://localhost:3000"
    echo ""
    read -p "Press Enter to start the backend server..."
    
    echo "🖥️  Starting backend server..."
    npm run server
fi
