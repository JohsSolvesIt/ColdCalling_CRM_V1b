#!/bin/bash

echo "🚀 Starting Core CRM Application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Clean up only core CRM processes
echo "🧹 Cleaning up existing CRM processes..."
pkill -f "nodemon.*server/index.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Kill any processes on core ports
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true

sleep 3

echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting Core CRM Application..."
echo "   • Frontend (React): http://localhost:3000"
echo "   • Backend (API): http://localhost:5000"
echo ""
echo "💡 Open http://localhost:3000 to access the CRM"
echo "📱 Enhanced themes are available in the website generator!"
echo ""

# Start the core CRM application
npm run dev
