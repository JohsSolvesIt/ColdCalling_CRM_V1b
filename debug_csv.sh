#!/bin/bash

# Simple URL counter to debug CSV parsing
csv_file="$1"

if [[ ! -f "$csv_file" ]]; then
    echo "CSV file not found: $csv_file"
    exit 1
fi

echo "Debugging CSV parsing for: $csv_file"
echo ""

urls=()
line_count=0

while IFS= read -r line; do
    ((line_count++))
    
    # Skip empty lines
    [[ -z "$line" ]] && continue
    
    # Skip header row (first line that contains common CSV headers)
    if [[ $line_count -eq 1 ]] && [[ "$line" =~ ^(URL|url|Link|link|Agent|agent|Name|name) ]]; then
        echo "Line $line_count: HEADER (skipped) - $line"
        continue
    fi
    
    # Extract URL (first column or the line itself)
    local url
    if [[ "$line" == *","* ]]; then
        # CSV with multiple columns - take first column
        url=$(echo "$line" | cut -d',' -f1 | tr -d '"' | tr -d "'" | xargs)
    else
        # Single column
        url=$(echo "$line" | xargs)
    fi
    
    # Validate URL
    if [[ "$url" =~ ^https?://.*realtor\.com.* ]]; then
        urls+=("$url")
        echo "Line $line_count: VALID URL - $url"
    else
        echo "Line $line_count: INVALID URL - $url"
    fi
done < "$csv_file"

echo ""
echo "SUMMARY:"
echo "Total lines in file: $line_count"
echo "Valid URLs found: ${#urls[@]}"
echo ""
echo "URLs to process:"
for i in "${!urls[@]}"; do
    echo "  $((i+1)). ${urls[$i]}"
done
