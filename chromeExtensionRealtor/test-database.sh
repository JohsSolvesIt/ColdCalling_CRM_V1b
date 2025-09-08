#!/bin/bash

echo "🧪 Testing Database Integration"
echo "=============================="

# Check if backend is running
echo "1. Checking backend server..."
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is not running"
    echo "   Start it with: ./start-backend.sh"
    exit 1
fi

# Test health endpoint
echo ""
echo "2. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:5001/health)
echo "Response: $HEALTH_RESPONSE"

# Test stats endpoint
echo ""
echo "3. Testing stats endpoint..."
STATS_RESPONSE=$(curl -s http://localhost:5001/api/stats)
echo "Response: $STATS_RESPONSE"

# Test duplicate check endpoint
echo ""
echo "4. Testing duplicate check..."
DUPLICATE_RESPONSE=$(curl -s -X POST http://localhost:5001/api/check-duplicate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.realtor.com/realestateagents/test123", "agentName": "Test Agent", "company": "Test Company"}')
echo "Response: $DUPLICATE_RESPONSE"

echo ""
echo "✅ Database integration tests completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Load your Chrome extension"
echo "   2. Visit a Realtor.com agent page"
echo "   3. Click 'Extract Data' in the extension"
echo "   4. Check the database for saved data"
echo ""
echo "🔍 Check database content:"
echo "   psql -d realtor_data -c 'SELECT COUNT(*) FROM agents;'"
echo "   psql -d realtor_data -c 'SELECT COUNT(*) FROM properties;'"
echo "   psql -d realtor_data -c 'SELECT COUNT(*) FROM extraction_logs;'"
