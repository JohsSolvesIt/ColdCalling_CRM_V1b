#!/bin/bash

# Chrome Extension Diagnostic Script
echo "🔍 CHROME EXTENSION DIAGNOSTIC"
echo "================================"

# Check if backend servers are running
echo "📡 Checking backend servers..."
curl -s http://localhost:5001/health && echo " ✅ Port 5001 responding" || echo " ❌ Port 5001 not responding"
curl -s http://localhost:5000/health && echo " ✅ Port 5000 responding" || echo " ❌ Port 5000 not responding"

# Check database connection
echo ""
echo "🗄️ Checking database..."
sudo -u postgres psql -d realtor_data -c "SELECT COUNT(*) FROM agents;" 2>/dev/null && echo " ✅ Database accessible" || echo " ❌ Database connection failed"

# Check for recent extraction logs
echo ""
echo "📊 Recent extraction activity..."
sudo -u postgres psql -d realtor_data -c "SELECT COUNT(*) as 'Extractions Today' FROM extraction_logs WHERE DATE(created_at) = CURRENT_DATE;" 2>/dev/null

echo ""
echo "🔧 Testing extension endpoint..."
curl -s -X POST http://localhost:5001/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"test","pageType":"agent","agentData":{"name":"Test Agent"}}' \
  && echo " ✅ Extract endpoint responding" || echo " ❌ Extract endpoint failed"

echo ""
echo "📋 Last 5 backend log entries:"
tail -5 backend/logs/combined.log | jq -r '.message' 2>/dev/null || tail -5 backend/logs/combined.log
