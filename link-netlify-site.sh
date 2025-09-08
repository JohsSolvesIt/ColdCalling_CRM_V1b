#!/bin/bash

# 🔗 Quick Netlify Site Linking Script
# Use this if you already have a Netlify site and just want to link it

echo "🔗 Link Existing Netlify Site"
echo "============================="
echo ""

# Check if we're in the right directory
if [ ! -f "netlify.toml" ]; then
    echo "❌ Error: netlify.toml not found. Run this script from the project root."
    exit 1
fi

echo "🔍 Available sites in your account:"
netlify sites:list

echo ""
read -p "Enter the site name or ID to link: " SITE_ID

if [ -z "$SITE_ID" ]; then
    echo "❌ Error: Please provide a site name or ID."
    exit 1
fi

echo ""
echo "🔗 Linking to site: $SITE_ID"

if netlify link --name "$SITE_ID"; then
    echo "✅ Successfully linked to $SITE_ID"
    echo ""
    echo "🚀 You can now deploy with:"
    echo "   netlify deploy --prod"
    echo ""
    echo "🔧 Or set environment variables with:"
    echo "   netlify env:set KEY value"
else
    echo "❌ Failed to link site."
fi
