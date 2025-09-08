#!/bin/bash

# Quick check script to verify Chrome Extension database connectivity
# and current schema status

echo "🔍 Checking Chrome Extension Database Status..."
echo ""

# Default database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-realtor_data}"
DB_USER="${DB_USER:-postgres}"

echo "📊 Connection Details:"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo "🔗 Testing database connection..."

# Test connection
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "❌ Cannot connect to database"
    echo ""
    echo "💡 Possible issues:"
    echo "   - PostgreSQL server is not running"
    echo "   - Database '$DB_NAME' doesn't exist"
    echo "   - Incorrect credentials"
    echo "   - Network connectivity issues"
    echo ""
    echo "🛠️  To create the database:"
    echo "   createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME"
    exit 1
fi

echo "✅ Database connection successful"
echo ""

# Check if agents table exists
echo "🏗️  Checking database schema..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM agents LIMIT 1;" >/dev/null 2>&1; then
    echo "✅ Agents table exists"
    
    # Check agent count
    AGENT_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM agents;")
    echo "📊 Total agents: $(echo $AGENT_COUNT | tr -d ' ')"
    
    # Check if CRM fields exist
    echo ""
    echo "🔍 Checking CRM fields..."
    
    CRM_FIELDS_QUERY="
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'agents' 
    AND column_name IN ('crm_status', 'crm_notes', 'last_contacted', 'follow_up_at', 'texts_sent', 'emails_sent')
    ORDER BY column_name;
    "
    
    CRM_FIELDS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$CRM_FIELDS_QUERY" | tr -d ' ' | grep -v '^$')
    
    if [ -z "$CRM_FIELDS" ]; then
        echo "❌ CRM fields not found - migration needed"
        echo ""
        echo "🚀 To fix status persistence issue:"
        echo "   ./run-crm-migration.sh"
        echo ""
        MIGRATION_NEEDED=true
    else
        echo "✅ CRM fields found:"
        echo "$CRM_FIELDS" | sed 's/^/   - /'
        
        # Check for any existing CRM data
        STATUS_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM agents WHERE crm_status != 'New';" 2>/dev/null || echo "0")
        echo ""
        echo "📈 Contacts with status set: $(echo $STATUS_COUNT | tr -d ' ')"
        MIGRATION_NEEDED=false
    fi
    
else
    echo "❌ Agents table not found"
    echo ""
    echo "🛠️  Please run the initial schema setup:"
    echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql"
    echo "   ./run-crm-migration.sh"
    exit 1
fi

# Check Chrome Extension backend status
echo ""
echo "🌐 Checking Chrome Extension backend..."
if curl -s "http://localhost:5001/health" >/dev/null 2>&1; then
    echo "✅ Chrome Extension backend is running (port 5001)"
else
    echo "❌ Chrome Extension backend not responding on port 5001"
    echo "💡 Start it with: cd chromeExtensionRealtor/backend && npm start"
fi

# Check CRM application status  
echo ""
echo "🖥️  Checking CRM application..."
if curl -s "http://localhost:3001/api/status" >/dev/null 2>&1; then
    echo "✅ CRM application is running (port 3001)"
else
    echo "❌ CRM application not responding on port 3001"
    echo "💡 Start it with: cd crm-app && npm start"
fi

echo ""
if [ "$MIGRATION_NEEDED" = "true" ]; then
    echo "⚠️  ACTION REQUIRED:"
    echo "   Run migration to fix status persistence: ./run-crm-migration.sh"
    echo ""
    exit 1
else
    echo "🎉 All systems check out! Status persistence should be working."
fi
