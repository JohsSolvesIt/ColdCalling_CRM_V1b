#!/bin/bash

# Cleanup script for filtered CSV files
# Keeps only the 3 most recent filtered CSV files

# Resolve chromeExtensionRealtor directory relative to this script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROME_EXT_DIR="$(cd "$SCRIPT_DIR/chromeExtensionRealtor" && pwd)"

echo "🧹 Filtered CSV Cleanup Script"
echo "==============================="

cd "$CHROME_EXT_DIR" || {
    echo "❌ Failed to change to directory: $CHROME_EXT_DIR"
    exit 1
}

# Count current filtered files
TOTAL_FILES=$(ls -1 *filtered*.csv 2>/dev/null | wc -l)
echo "📊 Found $TOTAL_FILES filtered CSV files"

if [ $TOTAL_FILES -le 3 ]; then
    echo "✅ Only $TOTAL_FILES files found, no cleanup needed (keeping max 3)"
    exit 0
fi

# Get list of filtered files sorted by modification time (newest first)
echo "🔍 Getting file list..."
FILES_TO_DELETE=$(ls -t *filtered*.csv 2>/dev/null | tail -n +4)

if [ -z "$FILES_TO_DELETE" ]; then
    echo "✅ No files to delete"
    exit 0
fi

# Show what will be deleted
echo "🗑️  Files to be deleted (keeping 3 newest):"
echo "$FILES_TO_DELETE" | while read file; do
    if [ -f "$file" ]; then
        SIZE=$(du -h "$file" | cut -f1)
        DATE=$(date -r "$file" '+%Y-%m-%d %H:%M:%S')
        echo "   - $file ($SIZE, $DATE)"
    fi
done

# Calculate space to be freed
SPACE_TO_FREE=$(du -ch $FILES_TO_DELETE 2>/dev/null | tail -1 | cut -f1)

# Confirm deletion
read -p "🤔 Delete these files? This will free up $SPACE_TO_FREE of space. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

# Delete the files
DELETED_COUNT=0
echo "$FILES_TO_DELETE" | while read file; do
    if [ -f "$file" ]; then
        rm "$file" && echo "✅ Deleted: $file"
        ((DELETED_COUNT++))
    fi
done

echo "🎉 Cleanup complete! Deleted $DELETED_COUNT files, freed $SPACE_TO_FREE"
echo "📊 Remaining filtered CSV files:"
ls -la *filtered*.csv 2>/dev/null | wc -l | xargs echo "   Count:"
ls -la *filtered*.csv 2>/dev/null | tail -3
