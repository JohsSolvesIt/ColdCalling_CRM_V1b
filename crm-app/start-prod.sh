#!/bin/bash

echo "🚀 Starting CSV-to-CRM Application (Production Mode)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
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

# Check if setup has been run
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencies not installed. Running setup first..."
    ./setup.sh
    if [ $? -ne 0 ]; then
        echo "❌ Setup failed. Please check the error messages above."
        exit 1
    fi
fi

# Check if client is built
if [ ! -d "client/build" ]; then
    echo "⚠️  Client not built. Building now..."
    cd client && npm run build && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build client"
        exit 1
    fi
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "🔧 Configuration:"
echo "   • Server: http://localhost:5000"
echo "   • Mode: Production (Optimized Build)"
echo "   • Static Files: Served from client/build"
echo ""

# Try to open browser automatically
if command_exists xdg-open; then
    echo "🌐 Opening browser automatically..."
    (sleep 3 && xdg-open http://localhost:5000) &
elif command_exists open; then
    echo "🌐 Opening browser automatically..."
    (sleep 3 && open http://localhost:5000) &
else
    echo "🌐 Open your browser and navigate to: http://localhost:5000"
fi

echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the server
npm start
