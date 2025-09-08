#!/bin/bash

# 🚀 Complete Netlify Deployment Script
# This script creates a Netlify project and deploys your CRM application

echo "🚀 CRM Netlify Deployment Script"
echo "================================="
echo ""

# Check if we're in the right directory
if [ ! -f "crm-app/netlify.toml" ] && [ ! -f "netlify.toml" ]; then
    echo "❌ Error: netlify.toml not found. Run this script from the project root."
    echo "   Expected: ./crm-app/netlify.toml or ./netlify.toml"
    exit 1
fi

# Set the base directory for Netlify CLI commands
if [ -f "crm-app/netlify.toml" ]; then
    BASE_DIR="--dir crm-app"
else
    BASE_DIR=""
fi

# Check if user is logged in to Netlify
echo "🔍 Checking Netlify CLI status..."
if netlify status 2>&1 | grep -q "Current Netlify User"; then
    echo "✅ Netlify CLI ready!"
else
    echo "❌ Error: Not logged in to Netlify CLI."
    echo "   Run: netlify login"
    exit 1
fi
echo ""

# Prompt for site name
echo "📝 Site Configuration:"
read -p "Enter your site name (leave empty for auto-generated): " SITE_NAME

if [ -z "$SITE_NAME" ]; then
    SITE_NAME_FLAG=""
    echo "   Using auto-generated site name"
else
    SITE_NAME_FLAG="--name $SITE_NAME"
    echo "   Using site name: $SITE_NAME"
fi

echo ""

# Prompt for DATABASE_URL
echo "🗄️ Database Configuration:"
echo "You'll need your Neon connection string from console.neon.tech"
echo "Format: postgresql://username:password@hostname:5432/database?sslmode=require"
echo ""
read -p "Enter your DATABASE_URL: " DATABASE_URL

# Validate DATABASE_URL
if [[ ! $DATABASE_URL =~ ^postgresql:// ]]; then
    echo "❌ Error: Invalid DATABASE_URL format."
    echo "   Should start with 'postgresql://'"
    exit 1
fi

echo ""

# Ask about optional services
echo "📧 Optional Services:"
read -p "Do you want to configure email service (Brevo)? (y/n): " SETUP_EMAIL
read -p "Do you want to configure SMS service (Twilio)? (y/n): " SETUP_SMS

echo ""

# Email configuration
if [[ $SETUP_EMAIL =~ ^[Yy]$ ]]; then
    echo "📧 Email Service Configuration:"
    read -p "Brevo API Key: " BREVO_API_KEY
    read -p "Sender Email: " SENDER_EMAIL
    read -p "Sender Name: " SENDER_NAME
fi

# SMS configuration
if [[ $SETUP_SMS =~ ^[Yy]$ ]]; then
    echo "📱 SMS Service Configuration:"
    read -p "Twilio Account SID: " TWILIO_ACCOUNT_SID
    read -p "Twilio Auth Token: " TWILIO_AUTH_TOKEN
    read -p "Twilio Phone Number: " TWILIO_PHONE_NUMBER
fi

echo ""
echo "🏗️  Creating Netlify site..."

# Create Netlify site from Git
if netlify sites:create $SITE_NAME_FLAG --repo https://github.com/JohsSolvesIt/ColdCalling_CRM_V1b $BASE_DIR; then
    echo "✅ Site created successfully!"
else
    echo "❌ Error creating site. Trying to link existing site..."
    netlify link $BASE_DIR
fi

echo ""
echo "🔧 Setting up environment variables..."

# Set required environment variables
netlify env:set DATABASE_URL "$DATABASE_URL" $BASE_DIR
netlify env:set NODE_ENV "production" $BASE_DIR

echo "✅ Set DATABASE_URL and NODE_ENV"

# Set optional email variables
if [[ $SETUP_EMAIL =~ ^[Yy]$ ]]; then
    netlify env:set BREVO_API_KEY "$BREVO_API_KEY" $BASE_DIR
    netlify env:set SENDER_EMAIL "$SENDER_EMAIL" $BASE_DIR
    netlify env:set SENDER_NAME "$SENDER_NAME" $BASE_DIR
    echo "✅ Set email service variables"
fi

# Set optional SMS variables
if [[ $SETUP_SMS =~ ^[Yy]$ ]]; then
    netlify env:set TWILIO_ACCOUNT_SID "$TWILIO_ACCOUNT_SID" $BASE_DIR
    netlify env:set TWILIO_AUTH_TOKEN "$TWILIO_AUTH_TOKEN" $BASE_DIR
    netlify env:set TWILIO_PHONE_NUMBER "$TWILIO_PHONE_NUMBER" $BASE_DIR
    echo "✅ Set SMS service variables"
fi

echo ""
echo "🚀 Deploying to production..."

# Deploy to production
if netlify deploy --prod $BASE_DIR; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    
    # Get site info
    SITE_INFO=$(netlify sites:list --json $BASE_DIR | jq -r '.[0] | "\(.name) | \(.url)"' 2>/dev/null || echo "site | unknown")
    SITE_URL=$(echo $SITE_INFO | cut -d'|' -f2 | xargs)
    
    echo "🌐 Your CRM is now live at:"
    echo "   $SITE_URL"
    echo ""
    echo "🔗 Useful URLs:"
    echo "   Frontend: $SITE_URL"
    echo "   API Status: $SITE_URL/.netlify/functions/api/database/status"
    echo "   Contacts API: $SITE_URL/.netlify/functions/api/contacts"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Test your deployment at the URL above"
    echo "   2. Verify database connectivity"
    echo "   3. Configure custom domain (optional)"
    echo "   4. Set up monitoring and analytics"
    echo ""
    echo "🛠️  Admin Panel:"
    echo "   Netlify Dashboard: https://app.netlify.com"
    echo "   Neon Dashboard: https://console.neon.tech"
    
else
    echo "❌ Deployment failed. Check the logs above for details."
    exit 1
fi
