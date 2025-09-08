#!/bin/bash

# Realtor Page Generator - Complete Demo
# This script demonstrates the full VvebJS integration workflow

echo "🏠 REALTOR PAGE GENERATOR - VVEBJS INTEGRATION DEMO"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the vvebjs directory"
    exit 1
fi

echo "📊 SYSTEM STATUS"
echo "----------------"
node website-generator/cli.js status
echo ""

echo "🗄️ AVAILABLE DATABASES"
echo "---------------------"
node website-generator/cli.js ls
echo ""

echo "🎯 GENERATING SAMPLE PAGES (testD.db)"
echo "------------------------------------"
node website-generator/cli.js generate-db "testD.db"
echo ""

echo "🌐 STARTING API SERVER"
echo "---------------------"
echo "Starting server on http://localhost:3001"
echo "Press Ctrl+C to stop the server when done testing"
echo ""
echo "Available URLs:"
echo "  • API Status: http://localhost:3001/api/status"
echo "  • Generated Pages: http://localhost:3001/api/pages"
echo "  • Realtor Editor: http://localhost:3001/realtor-editor.html"
echo "  • Sample Page: http://localhost:3001/testd/claudio-madariaga.html"
echo ""
echo "VvebJS Features:"
echo "  ✅ Pages generated with VvebJS data attributes"
echo "  ✅ Real-time editing capabilities"
echo "  ✅ Webhook integration for automatic generation"
echo "  ✅ API endpoints for managing pages"
echo "  ✅ Template-based generation from actual CRM data"
echo ""

# Start the server
npm run serve
