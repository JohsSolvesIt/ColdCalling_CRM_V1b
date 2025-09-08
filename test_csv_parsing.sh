#!/bin/bash

# Test URL loading from the problematic CSV
csv_file="/home/realm/Downloads/realtor (4).csv"

echo "=== TESTING CSV PARSING ==="
echo "File: $csv_file"
echo "Content:"
cat "$csv_file"
echo
echo "=== URL EXTRACTION TEST ==="

line_count=0
urls=()

while IFS= read -r line; do
    ((line_count++))
    echo "Line $line_count: '$line'"
    
    # Skip empty lines
    [[ -z "$line" ]] && { echo "  -> SKIPPED (empty)"; continue; }
    
    # Extract URL (first column or the line itself)
    local url
    if [[ "$line" == *","* ]]; then
        # CSV with multiple columns - take first column
        url=$(echo "$line" | cut -d',' -f1 | tr -d '"' | tr -d "'" | xargs)
    else
        # Single column
        url=$(echo "$line" | xargs)
    fi
    echo "  Extracted URL: '$url'"
    
    # Skip header row (first line that doesn't look like a realtor.com URL)
    if [[ $line_count -eq 1 ]] && [[ ! "$url" =~ ^https?://.*realtor\.com.* ]]; then
        echo "  -> SKIPPED (header row)"
        continue
    fi
    
    # Validate URL
    if [[ "$url" =~ ^https?://.*realtor\.com.* ]]; then
        urls+=("$url")
        echo "  -> ADDED (valid realtor.com URL)"
    else
        echo "  -> SKIPPED (invalid URL)"
    fi
done < "$csv_file"

echo
echo "=== RESULTS ==="
echo "Total valid URLs: ${#urls[@]}"
for i in "${!urls[@]}"; do
    echo "$((i+1)). ${urls[i]}"
done
