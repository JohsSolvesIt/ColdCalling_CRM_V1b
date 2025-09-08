#!/bin/bash

# Realtor Page Generator - Quick Start Script
# This script helps you get started with generating realtor pages

echo "🏠 Realtor Page Generator - Quick Start"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the vvebjs directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "📊 Checking system status..."
node website-generator/cli.js status

echo ""
echo "🎯 Available commands:"
echo "  npm run generate           - Generate all realtor pages"
echo "  npm run serve              - Start API server on port 3001"
echo "  node website-generator/cli.js ls    - List all databases"
echo "  node website-generator/cli.js clean - Clean output directory"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Generate all pages now"
echo "2) Start API server"
echo "3) List databases first"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Generating all realtor pages..."
        node website-generator/cli.js generate
        echo ""
        echo "🎉 Generation complete! Check the generated-pages directory."
        ;;
    2)
        echo "🌐 Starting API server..."
        echo "Server will be available at: http://localhost:3001"
        echo "Press Ctrl+C to stop the server"
        npm run serve
        ;;
    3)
        echo "📊 Listing available databases..."
        node website-generator/cli.js ls
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
