#!/bin/bash

# Tab Opener Script for Chrome Extension Realtor
# Opens URLs from CSV file in Chrome tabs with progress tracking
# Includes backend startup and data verification

# Configuration
CSV_FILE="90028 realtors LINKS ONLY (copy).csv"
PROGRESS_FILE="tab_progress.txt"
BACKEND_PORT=5001
VERIFICATION_TIMEOUT=30  # seconds to wait for data verification

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get total number of URLs
get_total_urls() {
    wc -l < "$CSV_FILE"
}

# Function to get current progress
get_current_progress() {
    if [[ -f "$PROGRESS_FILE" ]]; then
        cat "$PROGRESS_FILE"
    else
        echo "0"
    fi
}

# Function to save progress
save_progress() {
    echo "$1" > "$PROGRESS_FILE"
}

# Function to check if backend is running
check_backend() {
    if curl -s -f http://localhost:$BACKEND_PORT/health >/dev/null 2>&1; then
        return 0  # Backend is running
    else
        return 1  # Backend is not running
    fi
}

# Function to start backend
start_backend() {
    print_info "Starting backend server..."
    
    if check_backend; then
        print_success "Backend is already running on port $BACKEND_PORT"
        return 0
    fi
    
    # Start the backend using the startup script
    if [[ -f "startup.sh" ]]; then
        ./startup.sh start > /dev/null 2>&1
        
        # Wait for backend to be ready
        local attempts=0
        local max_attempts=15
        
        while [ $attempts -lt $max_attempts ]; do
            if check_backend; then
                print_success "Backend is now running on port $BACKEND_PORT"
                return 0
            fi
            
            attempts=$((attempts + 1))
            print_info "Waiting for backend to start... (attempt $attempts/$max_attempts)"
            sleep 2
        done
        
        print_error "Backend failed to start after $max_attempts attempts"
        return 1
    else
        print_error "startup.sh not found. Cannot start backend."
        return 1
    fi
}

# Function to get recent database entries count
get_recent_entries_count() {
    local response=$(curl -s http://localhost:$BACKEND_PORT/api/realtors/count 2>/dev/null)
    
    if [[ $? -eq 0 ]] && [[ -n "$response" ]]; then
        # Try to extract count from JSON response
        local count=$(echo "$response" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
        
        if [[ -n "$count" ]]; then
            echo "$count"
        else
            echo "0"
        fi
    else
        echo "0"
    fi
}

# Function to check if URL already exists in database
check_url_exists() {
    local url="$1"
    local response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\"}" \
        http://localhost:$BACKEND_PORT/api/check-duplicate 2>/dev/null)
    
    if [[ $? -eq 0 ]] && [[ -n "$response" ]]; then
        # Check if isDuplicate is true
        if echo "$response" | grep -q '"isDuplicate":true'; then
            return 0  # URL exists
        else
            return 1  # URL doesn't exist
        fi
    else
        return 1  # Assume doesn't exist if can't check
    fi
}

# Function to verify data was extracted
verify_data_extraction() {
    local initial_count="$1"
    local url="$2"
    local row_num="$3"
    
    print_info "Verifying data extraction for row $row_num..."
    
    # First, check if this URL already exists in the database
    if check_url_exists "$url"; then
        print_success "✅ URL already exists in database (previously processed)"
        return 0
    fi
    
    # Wait a moment for Chrome extension to process
    sleep 3
    
    # Check for new data periodically
    local attempts=0
    local max_attempts=$((VERIFICATION_TIMEOUT / 3))
    
    while [ $attempts -lt $max_attempts ]; do
        # Check both count increase and URL existence
        local current_count=$(get_recent_entries_count)
        
        if [[ $current_count -gt $initial_count ]]; then
            local new_entries=$((current_count - initial_count))
            print_success "✅ Data extraction verified! $new_entries new entries found."
            return 0
        fi
        
        # Also check if the URL now exists (in case count didn't change due to updates)
        if check_url_exists "$url"; then
            print_success "✅ Data extraction verified! URL now exists in database."
            return 0
        fi
        
        attempts=$((attempts + 1))
        if [[ $attempts -lt $max_attempts ]]; then
            print_info "Waiting for data extraction... (attempt $attempts/$max_attempts)"
            sleep 3
        fi
    done
    
    print_warning "⚠️  No new data detected after ${VERIFICATION_TIMEOUT}s."
    print_info "This could mean:"
    print_info "  • Chrome extension is not loaded/active"
    print_info "  • Page didn't load completely" 
    print_info "  • Agent data was already in database"
    print_info "  • Extension failed to extract data from this page"
    
    # Ask user what to do
    echo -n "Continue anyway? (Y/n): "
    read -r continue_choice
    
    if [[ $continue_choice =~ ^[Nn]$ ]]; then
        return 1
    else
        return 0
    fi
}

# Function to open URL in Chrome
open_url_in_chrome() {
    local url="$1"
    if command -v google-chrome &> /dev/null; then
        google-chrome "$url" &
    elif command -v google-chrome-stable &> /dev/null; then
        google-chrome-stable "$url" &
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser "$url" &
    elif command -v chromium &> /dev/null; then
        chromium "$url" &
    else
        print_error "Chrome/Chromium not found. Please install Google Chrome."
        return 1
    fi
    return 0
}

# Function to get URL by line number
get_url_by_line() {
    local line_number="$1"
    sed -n "${line_number}p" "$CSV_FILE"
}

# Main function
main() {
    clear
    echo "========================================"
    echo "    Chrome Tab Opener for Realtors"
    echo "========================================"
    echo

    # Check if CSV file exists
    if [[ ! -f "$CSV_FILE" ]]; then
        print_error "CSV file '$CSV_FILE' not found!"
        exit 1
    fi

    # Start backend first
    print_info "Initializing backend server..."
    if ! start_backend; then
        print_error "Failed to start backend. Exiting."
        exit 1
    fi

    # Get initial database count
    initial_db_count=$(get_recent_entries_count)
    print_info "Current database entries: $initial_db_count"

    # Get total URLs
    total_urls=$(get_total_urls)
    current_progress=$(get_current_progress)

    print_info "Total URLs in file: $total_urls"
    print_info "Current progress: $current_progress"

    # Ask user about starting point
    if [[ $current_progress -gt 0 ]]; then
        echo
        print_warning "Previous progress found: Row $current_progress"
        echo -n "Do you want to continue from where you left off? (Y/n): "
        read -r continue_choice
        
        if [[ $continue_choice =~ ^[Nn]$ ]]; then
            echo -n "Enter the row number to start from (1-$total_urls): "
            read -r start_row
            
            if [[ ! $start_row =~ ^[0-9]+$ ]] || [[ $start_row -lt 1 ]] || [[ $start_row -gt $total_urls ]]; then
                print_error "Invalid row number. Starting from row 1."
                start_row=1
            fi
        else
            start_row=$((current_progress + 1))
        fi
    else
        echo -n "Enter the row number to start from (1-$total_urls) [default: 1]: "
        read -r start_row
        
        if [[ -z $start_row ]] || [[ ! $start_row =~ ^[0-9]+$ ]] || [[ $start_row -lt 1 ]] || [[ $start_row -gt $total_urls ]]; then
            start_row=1
        fi
    fi

    echo
    print_info "Starting from row $start_row"
    print_info "Press Ctrl+C at any time to quit and save progress."
    print_info ""
    print_info "Note: If a URL already exists in the database, it will be"
    print_info "      marked as verified without waiting for new extraction."
    echo

    # Main loop
    for ((i=start_row; i<=total_urls; i++)); do
        url=$(get_url_by_line "$i")
        
        if [[ -z "$url" ]]; then
            print_warning "Empty URL at row $i, skipping..."
            continue
        fi

        echo "----------------------------------------"
        print_info "Row $i of $total_urls"
        echo "URL: $url"
        echo

        # Get database count before opening tab
        pre_count=$(get_recent_entries_count)

        # Open URL in Chrome
        if open_url_in_chrome "$url"; then
            print_success "Opened tab for row $i"
            
            # Verify data extraction
            if verify_data_extraction "$pre_count" "$url" "$i"; then
                # Save progress only if verification passed
                save_progress "$i"
                
                # Ask user if they want to continue (unless it's the last URL)
                if [[ $i -lt $total_urls ]]; then
                    echo
                    echo -n "Open next tab? (Y/n): "
                    read -r choice
                    
                    if [[ $choice =~ ^[Nn]$ ]]; then
                        print_info "Stopping at user request."
                        print_info "Progress saved at row $i. You can resume later."
                        exit 0
                    fi
                fi
            else
                print_warning "Data verification failed for row $i"
                echo -n "Continue to next URL anyway? (Y/n): "
                read -r choice
                
                if [[ $choice =~ ^[Nn]$ ]]; then
                    print_info "Stopping due to verification failure."
                    print_info "Progress saved at row $((i-1))."
                    save_progress "$((i-1))"
                    exit 1
                else
                    # Still save progress if user chooses to continue
                    save_progress "$i"
                fi
            fi
        else
            print_error "Failed to open URL at row $i"
            echo -n "Continue anyway? (Y/n): "
            read -r choice
            
            if [[ $choice =~ ^[Nn]$ ]]; then
                print_info "Stopping due to error."
                print_info "Progress saved at row $((i-1))."
                save_progress "$((i-1))"
                exit 1
            fi
        fi
        
        echo
    done

    # Completed all URLs
    print_success "All URLs have been processed!"
    
    # Show final statistics
    final_db_count=$(get_recent_entries_count)
    total_extracted=$((final_db_count - initial_db_count))
    
    echo
    print_info "=== Final Statistics ==="
    print_info "Initial database entries: $initial_db_count"
    print_info "Final database entries: $final_db_count"
    print_success "Total new entries extracted: $total_extracted"
    
    print_info "Resetting progress file."
    save_progress "0"
}

# Handle Ctrl+C gracefully
trap 'echo; print_info "Process interrupted. Progress has been saved."; exit 0' INT

# Run main function
main
