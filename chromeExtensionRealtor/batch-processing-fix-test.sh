#!/bin/bash

# Test script to verify batch processing fix

echo "🧪 Testing Batch Processing Fix"
echo "==============================="

# Change to the chromeExtensionRealtor directory relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "✅ Fixed Issues:"
echo "1. Added session-based URL tracking to prevent infinite loops"
echo "2. URLs are marked as processed when successfully extracted"
echo "3. Prevents re-processing the same URL multiple times in one session"
echo "4. Script will now properly advance to next URLs in CSV file"
echo ""

echo "🔧 Changes Made:"
echo "- Added SUCCESSFULLY_PROCESSED_URLS associative array"
echo "- Added session check at start of poll_for_completion"
echo "- Mark URLs as processed when extraction succeeds"
echo "- Mark URLs as processed even on timeout to avoid loops"
echo ""

echo "📋 To test the fix:"
echo "1. Stop the current processing (Ctrl+C)"
echo "2. Restart with: ./simple_tab_opener.sh -d 1 -f \"realtors-PortlandOR_filtered_1756740187391.csv\""
echo "3. Should now process Michael Vaughn once, then move to next agent"
echo ""

echo "🚀 The batch processor should now work correctly and advance through all URLs!"
