#!/bin/bash

# Script to run SMS templates migration for Chrome Extension backend

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Set default values if not provided
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-realtor_data}
DB_USER=${DB_USER:-postgres}

echo "🔧 Running SMS templates migration..."
echo "📊 Database: $DB_NAME@$DB_HOST:$DB_PORT"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) is not installed or not in PATH"
    exit 1
fi

# Run the migration
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/add_sms_templates.sql"

if [ $? -eq 0 ]; then
    echo "✅ SMS templates migration completed successfully!"
else
    echo "❌ Migration failed. Please check the output above for errors."
    exit 1
fi
