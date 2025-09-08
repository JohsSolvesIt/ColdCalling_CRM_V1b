#!/bin/bash

echo "🚀 Starting CORE CRM Application (Essential Services Only)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Clean up only core ports
echo "🧹 Cleaning up core CRM processes..."
pkill -f "nodemon.*server/index.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Kill any processes on core ports only
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true

sleep 3

echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔧 Starting Core CRM Application..."
echo "   • Frontend (React): http://localhost:3000"
echo "   • Backend (API): http://localhost:5000"
echo ""
echo "💡 Features available:"
echo "   ✅ Contact Management"
echo "   ✅ SMS Sending"
echo "   ✅ Enhanced Website Generation with Beautiful Themes"
echo "   ✅ Ultra Premium & Neon Cyber themes"
echo "   ✅ Advanced animations and effects"
echo ""
echo "🎨 Test your enhanced themes at: http://localhost:3000"
echo "   Click 'Website' button next to any contact!"
echo ""

# Start the core CRM application
npm run dev
