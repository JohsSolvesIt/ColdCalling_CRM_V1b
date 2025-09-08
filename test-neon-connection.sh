#!/bin/bash

# 🧪 Test Neon Database Connection
# Quick script to test your Neon database connection and check setup

echo "🧪 Neon Database Connection Test"
echo "================================"
echo ""

if [ -z "$1" ]; then
    echo "Usage: ./test-neon-connection.sh 'your-connection-string'"
    echo ""
    echo "Example:"
    echo "./test-neon-connection.sh 'postgresql://user:pass@host:5432/db?sslmode=require'"
    exit 1
fi

CONNECTION_STRING="$1"

echo "🔗 Testing connection to: $(echo $CONNECTION_STRING | sed 's/:[^:]*@/:***@/')"
echo ""

# Test basic connection
echo "1️⃣ Testing basic connection..."
if psql "$CONNECTION_STRING" -c "SELECT 'Connection successful!' as status;" 2>/dev/null; then
    echo "   ✅ Basic connection works"
else
    echo "   ❌ Connection failed"
    exit 1
fi

# Check if tables exist
echo ""
echo "2️⃣ Checking database schema..."

TABLES=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('agents', 'properties', 'extraction_logs', 'recommendations');" 2>/dev/null)

if [ "$TABLES" = "4" ]; then
    echo "   ✅ All required tables exist"
else
    echo "   ⚠️  Expected 4 tables, found $TABLES"
    echo "   Run ./setup-neon-db.sh to create schema"
fi

# Check views
echo ""
echo "3️⃣ Checking views..."

VIEWS=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name IN ('agent_stats', 'recent_extractions');" 2>/dev/null)

if [ "$VIEWS" = "2" ]; then
    echo "   ✅ All required views exist"
else
    echo "   ⚠️  Expected 2 views, found $VIEWS"
fi

# Test sample query
echo ""
echo "4️⃣ Testing sample queries..."

AGENT_COUNT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM agents;" 2>/dev/null)
echo "   📊 Total agents: $AGENT_COUNT"

PROPERTY_COUNT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM properties;" 2>/dev/null)
echo "   🏠 Total properties: $PROPERTY_COUNT"

echo ""
echo "🎉 Database test completed!"
echo ""
echo "💡 Ready for Netlify deployment with this DATABASE_URL:"
echo "$CONNECTION_STRING"
