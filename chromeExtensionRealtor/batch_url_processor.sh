#!/bin/bash

# Enhanced Chrome Extension Batch Processor for Realtor URLs
# Based on Chrome Extension Complete Analysis
# Processes URLs from CSV file with intelligent batching and monitoring

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Default configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DEFAULT_CSV_FILE="90028 realtors LINKS ONLY (copy).csv"
readonly PROGRESS_FILE="batch_progress.json"
readonly LOG_FILE="logs/batch_extraction_$(date +%Y%m%d_%H%M%S).log"
readonly BACKEND_PORT=5001
readonly CHROME_BINARY="/usr/bin/google-chrome"

# Processing configuration
readonly BATCH_SIZE=5           # Number of tabs to process simultaneously
readonly TAB_DELAY=3           # Seconds between opening tabs
readonly EXTRACTION_TIMEOUT=30 # Seconds to wait for extraction per tab
readonly BACKEND_TIMEOUT=60    # Seconds to wait for backend startup
readonly MAX_RETRIES=3         # Maximum retry attempts per URL

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# ============================================================================
# LOGGING AND OUTPUT FUNCTIONS
# ============================================================================

log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
    log "INFO" "$*"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
    log "SUCCESS" "$*"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
    log "WARNING" "$*"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $*"
    log "ERROR" "$*"
}

print_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $*"
    log "DEBUG" "$*"
}

print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}              Chrome Extension Batch URL Processor                ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}          Based on Chrome Extension Complete Analysis            ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Create necessary directories
setup_directories() {
    mkdir -p logs
    mkdir -p temp
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate dependencies
check_dependencies() {
    print_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command_exists "google-chrome" && ! command_exists "google-chrome-stable" && ! command_exists "chromium"; then
        missing_deps+=("Chrome/Chromium")
    fi
    
    if ! command_exists "curl"; then
        missing_deps+=("curl")
    fi
    
    if ! command_exists "jq"; then
        missing_deps+=("jq")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_info "Please install missing dependencies and retry"
        exit 1
    fi
    
    print_success "All dependencies satisfied"
}

# ============================================================================
# PROGRESS TRACKING
# ============================================================================

# Initialize progress file
init_progress() {
    local total_urls="$1"
    
    cat > "$PROGRESS_FILE" << EOF
{
    "total_urls": $total_urls,
    "processed": 0,
    "successful": 0,
    "failed": 0,
    "skipped": 0,
    "start_time": "$(date -Iseconds)",
    "last_update": "$(date -Iseconds)",
    "current_batch": 0,
    "failed_urls": [],
    "processing_stats": {
        "avg_time_per_url": 0,
        "estimated_completion": null
    }
}
EOF
}

# Update progress
update_progress() {
    local processed="$1"
    local successful="$2"
    local failed="$3"
    local skipped="$4"
    local failed_url="${5:-}"
    
    local temp_file=$(mktemp)
    
    jq --arg processed "$processed" \
       --arg successful "$successful" \
       --arg failed "$failed" \
       --arg skipped "$skipped" \
       --arg failed_url "$failed_url" \
       --arg timestamp "$(date -Iseconds)" \
       '.processed = ($processed | tonumber) |
        .successful = ($successful | tonumber) |
        .failed = ($failed | tonumber) |
        .skipped = ($skipped | tonumber) |
        .last_update = $timestamp |
        (if $failed_url != "" then .failed_urls += [$failed_url] else . end)' \
       "$PROGRESS_FILE" > "$temp_file"
    
    mv "$temp_file" "$PROGRESS_FILE"
}

# Get progress stats
get_progress() {
    if [[ -f "$PROGRESS_FILE" ]]; then
        jq -r '.processed, .successful, .failed, .skipped' "$PROGRESS_FILE" | tr '\n' ' '
    else
        echo "0 0 0 0"
    fi
}

# ============================================================================
# BACKEND MANAGEMENT
# ============================================================================

# Check if backend is running
check_backend() {
    curl -s -f "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1
}

# Start backend service
start_backend() {
    print_info "Starting Chrome Extension backend service..."
    
    if check_backend; then
        print_success "Backend already running on port $BACKEND_PORT"
        return 0
    fi
    
    # Navigate to backend directory
    cd "$SCRIPT_DIR/backend"
    
    # Check if backend exists
    if [[ ! -f "server.js" ]]; then
        print_error "Backend server.js not found in $SCRIPT_DIR/backend"
        return 1
    fi
    
    # Start backend in background
    print_info "Starting backend server..."
    nohup node server.js > ../logs/backend.log 2>&1 &
    local backend_pid=$!
    
    # Wait for backend to be ready
    local attempts=0
    local max_attempts=30
    
    while [[ $attempts -lt $max_attempts ]]; do
        if check_backend; then
            print_success "Backend started successfully (PID: $backend_pid)"
            echo "$backend_pid" > "../temp/backend.pid"
            cd "$SCRIPT_DIR"
            return 0
        fi
        
        attempts=$((attempts + 1))
        print_info "Waiting for backend... ($attempts/$max_attempts)"
        sleep 2
    done
    
    print_error "Backend failed to start after $max_attempts attempts"
    cd "$SCRIPT_DIR"
    return 1
}

# Stop backend service
stop_backend() {
    if [[ -f "temp/backend.pid" ]]; then
        local pid=$(cat temp/backend.pid)
        if kill -0 "$pid" 2>/dev/null; then
            print_info "Stopping backend (PID: $pid)..."
            kill "$pid"
            rm -f temp/backend.pid
            print_success "Backend stopped"
        fi
    fi
}

# ============================================================================
# CHROME MANAGEMENT
# ============================================================================

# Get Chrome binary path
get_chrome_binary() {
    if command_exists "google-chrome"; then
        echo "google-chrome"
    elif command_exists "google-chrome-stable"; then
        echo "google-chrome-stable"
    elif command_exists "chromium"; then
        echo "chromium"
    else
        echo ""
    fi
}

# Start Chrome with extension
start_chrome_with_extension() {
    local chrome_binary
    chrome_binary=$(get_chrome_binary)
    
    if [[ -z "$chrome_binary" ]]; then
        print_error "Chrome/Chromium not found"
        return 1
    fi
    
    print_info "Starting Chrome with extension..."
    
    # Chrome arguments for extension and automation
    local chrome_args=(
        "--load-extension=$SCRIPT_DIR"
        "--no-first-run"
        "--no-default-browser-check"
        "--disable-web-security"
        "--disable-features=VizDisplayCompositor"
        "--remote-debugging-port=9222"
        "--user-data-dir=$SCRIPT_DIR/temp/chrome_profile"
    )
    
    # Start Chrome in background
    "$chrome_binary" "${chrome_args[@]}" >/dev/null 2>&1 &
    local chrome_pid=$!
    
    echo "$chrome_pid" > "temp/chrome.pid"
    print_success "Chrome started with extension (PID: $chrome_pid)"
    
    # Wait for Chrome to be ready
    sleep 5
    
    return 0
}

# Stop Chrome
stop_chrome() {
    if [[ -f "temp/chrome.pid" ]]; then
        local pid=$(cat temp/chrome.pid)
        if kill -0 "$pid" 2>/dev/null; then
            print_info "Stopping Chrome (PID: $pid)..."
            kill "$pid"
            rm -f temp/chrome.pid
            print_success "Chrome stopped"
        fi
    fi
}

# ============================================================================
# URL PROCESSING
# ============================================================================

# Check if URL exists in database
check_url_exists() {
    local url="$1"
    
    local response
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\"}" \
        "http://localhost:$BACKEND_PORT/api/check-duplicate" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && echo "$response" | jq -e '.isDuplicate' >/dev/null 2>&1; then
        return 0  # URL exists
    else
        return 1  # URL doesn't exist
    fi
}

# Extract data from URL using Chrome DevTools
extract_url_data() {
    local url="$1"
    local timeout="$2"
    
    print_debug "Processing URL: $url"
    
    # Open tab and trigger extraction
    local tab_response
    tab_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\"}" \
        "http://localhost:9222/json/new" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to create new tab for $url"
        return 1
    fi
    
    # Extract tab ID
    local tab_id
    tab_id=$(echo "$tab_response" | jq -r '.id' 2>/dev/null)
    
    if [[ -z "$tab_id" || "$tab_id" == "null" ]]; then
        print_error "Failed to get tab ID for $url"
        return 1
    fi
    
    # Wait for page load and extraction
    sleep "$timeout"
    
    # Close tab
    curl -s -X POST "http://localhost:9222/json/close/$tab_id" >/dev/null 2>&1
    
    return 0
}

# Process a single URL
process_url() {
    local url="$1"
    local index="$2"
    local total="$3"
    
    print_info "Processing URL $index/$total: $(basename "$url")"
    
    # Check if URL already exists
    if check_url_exists "$url"; then
        print_warning "URL already exists in database, skipping: $url"
        return 2  # Skipped
    fi
    
    # Attempt extraction with retries
    local attempt=1
    while [[ $attempt -le $MAX_RETRIES ]]; do
        print_debug "Extraction attempt $attempt/$MAX_RETRIES for $url"
        
        if extract_url_data "$url" "$EXTRACTION_TIMEOUT"; then
            # Verify extraction was successful
            sleep 2
            if check_url_exists "$url"; then
                print_success "Successfully extracted data for $url"
                return 0  # Success
            else
                print_warning "Extraction appeared to succeed but data not found in database"
            fi
        fi
        
        attempt=$((attempt + 1))
        if [[ $attempt -le $MAX_RETRIES ]]; then
            print_warning "Retrying in 5 seconds... (attempt $attempt/$MAX_RETRIES)"
            sleep 5
        fi
    done
    
    print_error "Failed to extract data after $MAX_RETRIES attempts: $url"
    return 1  # Failed
}

# Process URLs in batches
process_batch() {
    local urls=("$@")
    local batch_size=${#urls[@]}
    
    print_info "Processing batch of $batch_size URLs"
    
    local successful=0
    local failed=0
    local skipped=0
    
    for i in "${!urls[@]}"; do
        local url="${urls[$i]}"
        local global_index=$((PROCESSED + i + 1))
        
        case "$(process_url "$url" "$global_index" "$TOTAL_URLS")" in
            0) ((successful++)) ;;
            1) ((failed++)) ;;
            2) ((skipped++)) ;;
        esac
        
        # Add delay between URLs in batch
        if [[ $i -lt $((batch_size - 1)) ]]; then
            sleep "$TAB_DELAY"
        fi
    done
    
    print_info "Batch completed: $successful successful, $failed failed, $skipped skipped"
    
    return 0
}

# ============================================================================
# MAIN PROCESSING LOGIC
# ============================================================================

# Process CSV file
process_csv() {
    local csv_file="$1"
    local start_line="${2:-1}"
    
    if [[ ! -f "$csv_file" ]]; then
        print_error "CSV file not found: $csv_file"
        return 1
    fi
    
    # Read URLs from CSV
    mapfile -t urls < <(tail -n +$start_line "$csv_file")
    readonly TOTAL_URLS=${#urls[@]}
    
    if [[ $TOTAL_URLS -eq 0 ]]; then
        print_error "No URLs found in CSV file"
        return 1
    fi
    
    print_info "Found $TOTAL_URLS URLs to process"
    
    # Initialize progress tracking
    init_progress "$TOTAL_URLS"
    
    # Process URLs in batches
    local processed=0
    local total_successful=0
    local total_failed=0
    local total_skipped=0
    
    while [[ $processed -lt $TOTAL_URLS ]]; do
        local batch_start=$processed
        local batch_end=$((processed + BATCH_SIZE))
        
        if [[ $batch_end -gt $TOTAL_URLS ]]; then
            batch_end=$TOTAL_URLS
        fi
        
        local current_batch=("${urls[@]:$batch_start:$((batch_end - batch_start))}")
        
        print_info "Processing batch $((batch_start / BATCH_SIZE + 1)): URLs $((batch_start + 1)) to $batch_end"
        
        # Store current progress for batch processing
        PROCESSED=$processed
        
        # Process current batch
        process_batch "${current_batch[@]}"
        
        # Update counters (simplified - would need more sophisticated tracking)
        processed=$batch_end
        
        # Update progress file
        update_progress "$processed" "$total_successful" "$total_failed" "$total_skipped"
        
        # Progress report
        local progress_percent=$((processed * 100 / TOTAL_URLS))
        print_info "Progress: $processed/$TOTAL_URLS ($progress_percent%)"
        
        # Small delay between batches
        if [[ $processed -lt $TOTAL_URLS ]]; then
            print_info "Waiting before next batch..."
            sleep 10
        fi
    done
    
    # Final summary
    print_success "Processing completed!"
    print_info "Total URLs processed: $processed"
    print_info "See $LOG_FILE for detailed logs"
    print_info "See $PROGRESS_FILE for detailed progress tracking"
}

# ============================================================================
# CLEANUP AND SIGNAL HANDLING
# ============================================================================

cleanup() {
    print_info "Cleaning up..."
    stop_chrome
    stop_backend
    # Cross-platform cleanup of temp directory
    if command -v npx >/dev/null 2>&1; then
        npx --yes rimraf temp/ >/dev/null 2>&1 || rm -rf temp/
    else
        rm -rf temp/
    fi
}

# Set up signal handlers
trap cleanup EXIT
trap 'print_error "Interrupted by user"; exit 130' INT TERM

# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] [CSV_FILE]

Chrome Extension Batch URL Processor

OPTIONS:
    -h, --help          Show this help message
    -s, --start LINE    Start processing from line number (default: 1)
    -b, --batch SIZE    Batch size for parallel processing (default: $BATCH_SIZE)
    -t, --timeout SEC   Extraction timeout per URL (default: $EXTRACTION_TIMEOUT)
    -r, --retries NUM   Maximum retries per URL (default: $MAX_RETRIES)
    -v, --verbose       Enable verbose logging

ARGUMENTS:
    CSV_FILE           Path to CSV file with URLs (default: $DEFAULT_CSV_FILE)

EXAMPLES:
    $0                                    # Process default CSV file
    $0 my_urls.csv                       # Process custom CSV file
    $0 -s 100 -b 10 urls.csv            # Start from line 100, batch size 10
    $0 --start 1 --batch 3 --verbose    # Verbose mode, small batches

EOF
}

# Parse command line arguments
parse_arguments() {
    local csv_file="$DEFAULT_CSV_FILE"
    local start_line=1
    local verbose=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -s|--start)
                start_line="$2"
                shift 2
                ;;
            -b|--batch)
                BATCH_SIZE="$2"
                shift 2
                ;;
            -t|--timeout)
                EXTRACTION_TIMEOUT="$2"
                shift 2
                ;;
            -r|--retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                csv_file="$1"
                shift
                ;;
        esac
    done
    
    echo "$csv_file $start_line $verbose"
}

# ============================================================================
# MAIN FUNCTION
# ============================================================================

main() {
    # Parse arguments
    read -r csv_file start_line verbose <<< "$(parse_arguments "$@")"
    
    # Setup
    print_header
    setup_directories
    check_dependencies
    
    print_info "Configuration:"
    print_info "  CSV File: $csv_file"
    print_info "  Start Line: $start_line"
    print_info "  Batch Size: $BATCH_SIZE"
    print_info "  Extraction Timeout: $EXTRACTION_TIMEOUT seconds"
    print_info "  Max Retries: $MAX_RETRIES"
    print_info "  Log File: $LOG_FILE"
    echo
    
    # Start services
    if ! start_backend; then
        print_error "Failed to start backend service"
        exit 1
    fi
    
    if ! start_chrome_with_extension; then
        print_error "Failed to start Chrome with extension"
        exit 1
    fi
    
    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    sleep 10
    
    # Process URLs
    process_csv "$csv_file" "$start_line"
    
    print_success "Batch processing completed successfully!"
}

# Run main function with all arguments
main "$@"
