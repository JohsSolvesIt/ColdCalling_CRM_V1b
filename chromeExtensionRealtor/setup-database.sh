#!/bin/bash

echo "🗄️ PostgreSQL Database Setup for Realtor Extractor"
echo "=================================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo "📦 Install PostgreSQL first:"
    echo "   Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "   CentOS/RHEL: sudo yum install postgresql postgresql-server"
    echo "   macOS: brew install postgresql"
    exit 1
fi

echo "✅ PostgreSQL found"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "📦 Install Node.js first:"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Get database credentials
echo ""
echo "🔐 Database Configuration"
echo "========================"

read -p "Database host (localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database port (5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database name (realtor_data): " DB_NAME
DB_NAME=${DB_NAME:-realtor_data}

read -p "Database user (postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -s -p "Database password: " DB_PASSWORD
echo ""

# Test database connection
echo "🔗 Testing database connection..."
export PGPASSWORD="$DB_PASSWORD"

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "\q" 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Please check your credentials and ensure PostgreSQL is running"
    exit 1
fi

# Create database if it doesn't exist
echo "📚 Creating database '$DB_NAME'..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"

# Run schema creation
echo "🏗️ Creating database schema..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/schema.sql; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

# Create .env file
echo "⚙️ Creating backend configuration..."
cd backend

cat > .env << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Server Configuration
PORT=3001
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=$(openssl rand -base64 32)

# Rate Limiting
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60

# CORS Origins
CORS_ORIGINS=chrome-extension://*,http://localhost:*
EOF

echo "✅ Configuration file created"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
if npm install; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create logs directory
mkdir -p logs

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 To start the backend server:"
echo "   cd backend"
echo "   npm start"
echo ""
echo "🔗 Server will run on: http://localhost:3001"
echo "📊 Health check: http://localhost:3001/health"
echo ""
echo "📝 Next steps:"
echo "   1. Start the backend server"
echo "   2. Load your Chrome extension"
echo "   3. Visit Realtor.com pages and extract data"
echo "   4. Data will be automatically saved to PostgreSQL"
echo ""
