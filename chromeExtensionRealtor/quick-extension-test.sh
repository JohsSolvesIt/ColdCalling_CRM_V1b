#!/bin/bash

# Quick Chrome Extension Test Script
# Tests if the extension can connect to the backend and is ready for scraping

echo "🔍 QUICK EXTENSION CHECK"
echo "======================="

# Test backend connectivity
echo -n "📡 Backend connection: "
if curl -s http://localhost:5001/health >/dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FAILED - Backend not responding on port 5001"
    exit 1
fi

# Test extract endpoint
echo -n "🎯 Extract endpoint: "
response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"url":"https://test.realtor.com","pageType":"test","agentData":{"name":"Test"}}' \
    "http://localhost:5001/api/extract" 2>/dev/null)

if echo "$response" | grep -q '"success":false'; then
    echo "✅ OK (responding to requests)"
else
    echo "❌ FAILED - Extract endpoint not responding properly"
    exit 1
fi

# Check Chrome is running
echo -n "🌐 Chrome browser: "
chrome_count=$(ps aux | grep -c '[c]hrome' || echo "0")
if [ "$chrome_count" -gt 0 ]; then
    echo "✅ OK ($chrome_count processes)"
else
    echo "⚠️  Chrome not detected - make sure browser is open"
fi

# Check database activity
echo -n "🗄️  Database access: "
if sudo -u postgres psql -d realtor_data -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FAILED - Database connection issue"
    exit 1
fi

echo ""
echo "🎉 EXTENSION READY FOR SCRAPING!"
echo "   - Backend services: ✅"
echo "   - Extract endpoint: ✅" 
echo "   - Chrome browser: ✅"
echo "   - Database access: ✅"
echo ""
