#!/bin/bash

# 🗄️ Neon Database Setup Script
# This script helps you set up your Neon PostgreSQL database for the CRM

echo "🚀 CRM Neon Database Setup"
echo "=========================="
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql (PostgreSQL client) is not installed."
    echo "   Install it with: sudo apt install postgresql-client"
    exit 1
fi

echo "📝 Instructions:"
echo "1. Go to https://console.neon.tech"
echo "2. Create a new project (e.g., 'crm-production')"
echo "3. Copy your connection string from the dashboard"
echo "4. Paste it below when prompted"
echo ""

# Prompt for Neon connection string
read -p "🔗 Enter your Neon connection string: " CONNECTION_STRING

# Extract connection string if it's in psql format
if [[ $CONNECTION_STRING =~ psql[[:space:]]+\'(.+)\' ]]; then
    CONNECTION_STRING="${BASH_REMATCH[1]}"
    echo "   Extracted connection string from psql format"
fi

# Validate connection string format
if [[ ! $CONNECTION_STRING =~ ^postgresql:// ]]; then
    echo "❌ Error: Invalid connection string format."
    echo "   Should start with 'postgresql://'"
    echo "   Examples:"
    echo "   - postgresql://user:pass@host:5432/db?sslmode=require"
    echo "   - psql 'postgresql://user:pass@host:5432/db?sslmode=require'"
    exit 1
fi

echo ""
echo "🔧 Testing connection to Neon database..."

# Test connection
if psql "$CONNECTION_STRING" -c "SELECT 1;" &> /dev/null; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed. Please check your connection string."
    exit 1
fi

echo ""
echo "📋 Creating database schema..."
echo "   This will create all tables, indexes, and views for the CRM"

# Execute the schema file
if psql "$CONNECTION_STRING" -f "crm-app/neon-setup.sql"; then
    echo ""
    echo "🎉 Database setup completed successfully!"
    echo ""
    echo "📊 Database Summary:"
    echo "   ✅ agents table (with CRM fields)"
    echo "   ✅ properties table"
    echo "   ✅ extraction_logs table"
    echo "   ✅ recommendations table"
    echo "   ✅ agent_stats view"
    echo "   ✅ recent_extractions view"
    echo "   ✅ Indexes for performance"
    echo "   ✅ Triggers for auto-updates"
    echo ""
    echo "🔗 Your DATABASE_URL for Netlify:"
    echo "$CONNECTION_STRING"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the DATABASE_URL above"
    echo "2. Go to Netlify and deploy your repository"
    echo "3. Add DATABASE_URL as an environment variable"
    echo "4. Set NODE_ENV=production"
    echo ""
else
    echo "❌ Error: Database setup failed."
    echo "   Check the error messages above for details."
    exit 1
fi
