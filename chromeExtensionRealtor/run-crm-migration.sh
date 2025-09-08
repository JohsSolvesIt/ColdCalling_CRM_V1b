#!/bin/bash

# Script to run the CRM migration for the Chrome Extension database
# This adds CRM tracking fields that allow status codes to persist after refresh

echo "🔄 Running CRM migration for Chrome Extension database..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/database/crm_migration.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Default database connection parameters (adjust as needed)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-realtor_data}"
DB_USER="${DB_USER:-postgres}"

echo "📊 Database connection:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) is not installed or not in PATH"
    echo "Please install PostgreSQL client tools and try again"
    exit 1
fi

# Run the migration
echo "🚀 Executing migration..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo ""
    echo "✅ CRM migration completed successfully!"
    echo ""
    echo "📝 The following CRM fields have been added to the agents table:"
    echo "   - crm_notes: For storing contact notes"
    echo "   - crm_status: For status codes (No Answer, Interested, etc.)"
    echo "   - last_contacted: Last contact timestamp" 
    echo "   - follow_up_at: Follow-up scheduling"
    echo "   - texts_sent: SMS tracking"
    echo "   - emails_sent: Email tracking"
    echo "   - follow_up_priority: Priority level"
    echo "   - crm_data: Additional CRM data as JSON"
    echo ""
    echo "🔄 Please restart your Chrome Extension backend server and CRM application"
    echo "   to pick up the database schema changes."
    echo ""
    echo "🎉 Status codes will now persist after page refresh!"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again."
    echo ""
    echo "💡 Common issues:"
    echo "   - Database connection parameters are incorrect"
    echo "   - Database doesn't exist"
    echo "   - User doesn't have sufficient permissions"
    echo "   - PostgreSQL server is not running"
    exit 1
fi
