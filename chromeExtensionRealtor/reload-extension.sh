#!/bin/bash

echo "🔄 Reloading Chrome Extension for testing enhanced timeout system..."

# Create a simple reload script that the user can run manually
echo "To reload the extension:"
echo "1. Open Microsoft Edge"
echo "2. Go to edge://extensions/"
echo "3. Find 'Realtor Data Extractor'"
echo "4. Click the reload button (🔄)"
echo ""
echo "Or run this command to open the extensions page:"
echo "microsoft-edge edge://extensions/"

echo ""
echo "✅ Once reloaded, test with a realtor URL like:"
echo "https://www.realtor.com/realtor/John-Doe_12345?autoExtract=true"
echo ""
echo "The extension should now:"
echo "- ⏱️  Handle timeouts intelligently (activity-based)"
echo "- 🏠 Limit properties to 20 max per realtor"
echo "- 📊 Send progress messages to frontend"
echo "- 🔄 Continue extraction even if frontend times out"
echo ""
echo "Check the browser console for detailed extraction logs!"
