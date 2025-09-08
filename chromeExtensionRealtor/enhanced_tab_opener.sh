#!/bin/bash

# Enhanced Simple Tab Opener with Tagging Support
# Opens URLs from CSV in new tabs with optional tagging functionality
# No browser automation - just opens tabs naturally

set -euo pipefail

# Signal handlers for immediate stop
cleanup_and_exit() {
    echo
    print_essential "🛑 PROCESS STOPPED BY USER"
    print_essential "Cleaning up and exiting..."
    
    # Kill any background processes
    jobs -p | xargs -r kill -TERM 2>/dev/null || true
    
    # Remove any temporary files
    rm -f temp/urls_to_process.txt 2>/dev/null || true
    
    exit 0
}

# Set up signal traps for immediate response
trap cleanup_and_exit SIGTERM SIGINT

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DEFAULT_CSV_FILE="90028 realtors LINKS ONLY (copy).csv"
readonly PROGRESS_FILE="simple_batch_progress.json"
readonly LOG_FILE="logs/simple_batch_$(date +%Y%m%d_%H%M%S).log"
readonly BACKEND_PORT=5001

# Processing settings (configurable via command line)
BATCH_SIZE=3           # Process multiple URLs concurrently for speed  
TAB_DELAY=1           # Seconds between processing each URL (faster processing)
PROCESSING_WAIT=120   # Max seconds to wait for extension processing (2 minutes)
readonly POLLING_INTERVAL=1    # Seconds between polling checks (faster detection)
FORCE_REPROCESS=false # Skip duplicate checking when true

# Tagging settings
BATCH_TAGS=""         # Tags to apply to all processed URLs
ENABLE_TAGGING=false  # Whether tagging is enabled
TAG_DELAY=2          # Seconds to wait before applying tags

# Verbosity control
VERBOSE_MODE=false    # Set to true for detailed output
QUIET_MODE=true       # Set to false for normal output
SILENT_MODE=true      # Ultra-quiet mode for batch processing

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'

# Global variables
TOTAL_URLS=0
PROCESSED_URLS=0
SUCCESSFUL_EXTRACTIONS=0
SKIPPED_URLS=0
FAILED_URLS=0
TAGGED_AGENTS=0
LAST_REALTOR_NAME=""
LAST_REALTOR_URL=""

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

print_info() {
    if [[ "$VERBOSE_MODE" == "true" ]] || [[ "$QUIET_MODE" == "false" ]]; then
        echo -e "${BLUE}[INFO]${NC} $*"
    fi
    log "INFO: $*"
}

print_success() {
    if [[ "$QUIET_MODE" == "false" ]] && [[ "$SILENT_MODE" == "false" ]]; then
        echo -e "${GREEN}[SUCCESS]${NC} $*"
    fi
    log "SUCCESS: $*"
}

print_success_always() {
    # For critical success messages that should always show
    echo -e "${GREEN}[SUCCESS]${NC} $*"
    log "SUCCESS: $*"
}

print_warning() {
    if [[ "$QUIET_MODE" == "false" ]]; then
        echo -e "${YELLOW}[WARNING]${NC} $*"
    fi
    log "WARNING: $*"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $*"
    log "ERROR: $*"
}

print_tag_info() {
    if [[ "$ENABLE_TAGGING" == "true" ]]; then
        echo -e "${PURPLE}[TAG]${NC} $*"
        log "TAG: $*"
    fi
}

print_quiet() {
    # Always show these messages even in quiet mode, but not in silent mode
    if [[ "$SILENT_MODE" == "false" ]]; then
        echo -e "$*"
    fi
    log "DISPLAY: $*"
}

print_essential() {
    # Only the most essential output - shows even in silent mode
    echo -e "$*"
    log "ESSENTIAL: $*"
}

print_progress() {
    # Progress indicator that overwrites previous line
    printf "\r${BLUE}[PROGRESS]${NC} %s" "$*"
}

print_header() {
    if [[ "$QUIET_MODE" == "false" ]] && [[ "$SILENT_MODE" == "false" ]]; then
        print_quiet "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
        print_quiet "${BLUE}║${NC}     Enhanced Simple Tab Opener with Tags              ${BLUE}║${NC}"
        print_quiet "${BLUE}║${NC}        No automation - just opens tabs naturally        ${BLUE}║${NC}"
        print_quiet "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
        echo
        
        if [[ "$ENABLE_TAGGING" == "true" ]]; then
            print_quiet "${PURPLE}🏷️  Tagging enabled: $BATCH_TAGS${NC}"
            echo
        fi
    fi
}

# ============================================================================
# TAGGING FUNCTIONALITY
# ============================================================================

validate_tags() {
    local tags="$1"
    
    if [[ -z "$tags" ]]; then
        return 0
    fi
    
    # Basic validation - tags should be comma-separated, no special chars
    if [[ "$tags" =~ [^a-zA-Z0-9,_-] ]]; then
        print_error "Invalid characters in tags. Use only letters, numbers, commas, hyphens, and underscores."
        return 1
    fi
    
    # Check tag count (max 10 tags)
    local tag_count
    tag_count=$(echo "$tags" | tr ',' '\n' | wc -l)
    
    if [[ $tag_count -gt 10 ]]; then
        print_error "Too many tags (max 10). Provided: $tag_count"
        return 1
    fi
    
    print_info "Tags validated: $tags"
    return 0
}

add_tags_to_agent() {
    local agent_id="$1"
    local tags="$2"
    
    if [[ -z "$tags" || -z "$agent_id" ]]; then
        return 0
    fi
    
    print_tag_info "Adding tags to agent $agent_id: $tags"
    
    # Convert comma-separated tags to JSON array
    local tags_json
    tags_json=$(echo "$tags" | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')
    
    local response
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"agentId\":\"$agent_id\",\"tags\":$tags_json}" \
        "http://localhost:$BACKEND_PORT/api/agents/tags" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        local success
        success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
        
        if [[ "$success" == "true" ]]; then
            print_tag_info "✅ Tags added successfully"
            ((TAGGED_AGENTS++))
            return 0
        fi
    fi
    
    print_warning "Failed to add tags to agent $agent_id"
    return 1
}

get_agent_by_url() {
    local url="$1"
    
    # Extract agent ID from URL for search
    local agent_id
    agent_id=$(echo "$url" | sed 's|.*/||')
    
    local response
    response=$(curl -s "http://localhost:$BACKEND_PORT/api/agents/search?q=$agent_id" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        echo "$response" | jq -r '.agents[0] // null' 2>/dev/null
    else
        echo "null"
    fi
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

setup_environment() {
    mkdir -p logs
    mkdir -p temp
    
    # Clean up old filtered CSV files (keep only last 3)
    local filtered_files=($(ls -t *filtered*.csv 2>/dev/null || true))
    if [[ ${#filtered_files[@]} -gt 3 ]]; then
        local files_to_delete=("${filtered_files[@]:3}")
        print_info "Cleaning up ${#files_to_delete[@]} old filtered CSV files..."
        for file in "${files_to_delete[@]}"; do
            [[ -f "$file" ]] && rm "$file" && print_info "Removed: $file"
        done
    fi
    
    # Initialize log file
    echo "Enhanced Simple Tab Opener with Tagging - $(date)" > "$LOG_FILE"
    echo "=================================================" >> "$LOG_FILE"
    
    if [[ "$ENABLE_TAGGING" == "true" ]]; then
        echo "Batch Tags: $BATCH_TAGS" >> "$LOG_FILE"
    fi
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    # Check if xdg-open or similar is available for opening URLs
    if ! command -v xdg-open >/dev/null 2>&1; then
        if ! command -v open >/dev/null 2>&1; then  # macOS
            print_error "No URL opener found (xdg-open or open command)"
            return 1
        fi
    fi
    
    # Check backend
    if ! curl -s -f "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
        print_warning "Backend service not running on port $BACKEND_PORT"
        print_info "Please start the backend service first"
        return 1
    fi
    
    # Check Chrome Extension status
    local recent_extractions
    recent_extractions=$(curl -s "http://localhost:$BACKEND_PORT/api/agents?limit=1" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && echo "$recent_extractions" | grep -q '"agents"'; then
        print_info "Backend accessible"
    else
        print_warning "No recent extractions - Chrome Extension might not be working"
    fi
    
    # Test tagging endpoint if tagging is enabled
    if [[ "$ENABLE_TAGGING" == "true" ]]; then
        print_info "Testing tagging endpoint..."
        local tag_test
        tag_test=$(curl -s "http://localhost:$BACKEND_PORT/api/agents/tags" 2>/dev/null)
        
        if [[ $? -eq 0 ]]; then
            print_info "Tagging endpoint accessible"
        else
            print_warning "Tagging endpoint not accessible - tags may not work"
        fi
    fi
    
    print_info "Dependencies ready"
    return 0
}

# ============================================================================
# URL MANAGEMENT
# ============================================================================

load_urls_from_csv() {
    local csv_file="$1"
    
    if [[ ! -f "$csv_file" ]]; then
        print_error "CSV file not found: $csv_file"
        return 1
    fi
    
    print_info "Loading URLs from $csv_file..."
    
    # Read URLs, handling different CSV formats
    local temp_urls="temp/urls_to_process.txt"
    
    # Check if file has headers by looking at first line
    local first_line
    first_line=$(head -n 1 "$csv_file")
    
    if [[ "$first_line" =~ ^https?:// ]]; then
        # No headers, first line is a URL
        cat "$csv_file" > "$temp_urls"
    else
        # Has headers, skip first line
        tail -n +2 "$csv_file" > "$temp_urls"
    fi
    
    # Clean up URLs (remove quotes, whitespace, etc.)
    sed -i 's/[",]//g; s/^[[:space:]]*//; s/[[:space:]]*$//' "$temp_urls"
    
    # Remove empty lines
    sed -i '/^$/d' "$temp_urls"
    
    # Count total URLs
    TOTAL_URLS=$(wc -l < "$temp_urls")
    
    print_info "Loaded $TOTAL_URLS URLs for processing"
    
    if [[ $TOTAL_URLS -eq 0 ]]; then
        print_error "No valid URLs found in CSV file"
        return 1
    fi
    
    return 0
}

check_duplicate() {
    local url="$1"
    
    if [[ "$FORCE_REPROCESS" == "true" ]]; then
        return 1  # Not a duplicate when force reprocessing
    fi
    
    local response
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\"}" \
        "http://localhost:$BACKEND_PORT/api/check-duplicate" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        return 1  # Assume not duplicate if can't check
    fi
    
    local is_duplicate
    is_duplicate=$(echo "$response" | jq -r '.isDuplicate // false' 2>/dev/null)
    
    if [[ "$is_duplicate" == "true" ]]; then
        return 0  # Is duplicate
    fi
    
    return 1  # Not duplicate
}

# ============================================================================
# URL PROCESSING
# ============================================================================

open_url_in_browser() {
    local url="$1"
    
    # Determine the appropriate command to open URL
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then  # macOS
        open "$url" >/dev/null 2>&1 &
    else
        print_error "No URL opener found"
        return 1
    fi
    
    return 0
}

wait_for_extraction() {
    local url="$1"
    local max_wait="$2"
    
    local start_time=$(date +%s)
    local elapsed=0
    local dots=""
    
    while [[ $elapsed -lt $max_wait ]]; do
        # Show progress
        dots="${dots}."
        if [[ ${#dots} -gt 3 ]]; then
            dots="."
        fi
        print_progress "Waiting for extraction${dots} (${elapsed}s/${max_wait}s)"
        
        # Check if extraction completed
        local agent_data
        agent_data=$(get_agent_by_url "$url")
        
        if [[ "$agent_data" != "null" && "$agent_data" != "" ]]; then
            echo  # New line after progress
            
            # Extract agent details
            local agent_name
            local agent_id
            agent_name=$(echo "$agent_data" | jq -r '.name // "Unknown"' 2>/dev/null)
            agent_id=$(echo "$agent_data" | jq -r '.id // ""' 2>/dev/null)
            
            LAST_REALTOR_NAME="$agent_name"
            LAST_REALTOR_URL="$url"
            
            print_success "✅ Extracted: $agent_name"
            
            # Apply tags if enabled
            if [[ "$ENABLE_TAGGING" == "true" && -n "$BATCH_TAGS" && -n "$agent_id" ]]; then
                sleep $TAG_DELAY  # Brief delay before tagging
                add_tags_to_agent "$agent_id" "$BATCH_TAGS"
            fi
            
            return 0
        fi
        
        sleep $POLLING_INTERVAL
        elapsed=$(($(date +%s) - start_time))
    done
    
    echo  # New line after progress
    print_warning "⏰ Timeout waiting for extraction"
    return 1
}

process_url() {
    local url="$1"
    local index="$2"
    
    print_info "Processing URL $index/$TOTAL_URLS"
    
    # Check for duplicates
    if check_duplicate "$url"; then
        print_warning "⏩ Skipping duplicate: $(basename "$url")"
        ((SKIPPED_URLS++))
        return 0
    fi
    
    # Open URL in browser
    if ! open_url_in_browser "$url"; then
        print_error "❌ Failed to open URL: $url"
        ((FAILED_URLS++))
        return 1
    fi
    
    print_info "🌐 Opened: $(basename "$url")"
    
    # Wait for extraction
    if wait_for_extraction "$url" "$PROCESSING_WAIT"; then
        ((SUCCESSFUL_EXTRACTIONS++))
        return 0
    else
        ((FAILED_URLS++))
        return 1
    fi
}

# ============================================================================
# BATCH PROCESSING
# ============================================================================

process_batch() {
    local urls=("$@")
    local batch_size=${#urls[@]}
    
    print_info "Processing batch of $batch_size URLs"
    
    # Process URLs in parallel
    local pids=()
    local results=()
    
    for url in "${urls[@]}"; do
        ((PROCESSED_URLS++))
        
        # Process URL in background
        (
            process_url "$url" "$PROCESSED_URLS"
        ) &
        
        pids+=($!)
        
        # Add delay between opening tabs
        sleep "$TAB_DELAY"
    done
    
    # Wait for all processes to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
        results+=($?)
    done
    
    return 0
}

update_progress() {
    local progress_data
    progress_data=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "total_urls": $TOTAL_URLS,
  "processed_urls": $PROCESSED_URLS,
  "successful_extractions": $SUCCESSFUL_EXTRACTIONS,
  "skipped_urls": $SKIPPED_URLS,
  "failed_urls": $FAILED_URLS,
  "tagged_agents": $TAGGED_AGENTS,
  "progress_percentage": $((PROCESSED_URLS * 100 / TOTAL_URLS)),
  "tagging_enabled": $ENABLE_TAGGING,
  "batch_tags": "$BATCH_TAGS",
  "last_realtor_name": "$LAST_REALTOR_NAME",
  "last_realtor_url": "$LAST_REALTOR_URL",
  "processing_settings": {
    "batch_size": $BATCH_SIZE,
    "tab_delay": $TAB_DELAY,
    "processing_wait": $PROCESSING_WAIT,
    "force_reprocess": $FORCE_REPROCESS
  }
}
EOF
    )
    
    echo "$progress_data" > "$PROGRESS_FILE"
}

# ============================================================================
# MAIN PROCESSING
# ============================================================================

main_processing() {
    local csv_file="$1"
    
    print_header
    
    # Setup environment
    setup_environment
    
    # Check dependencies
    if ! check_dependencies; then
        return 1
    fi
    
    # Load URLs
    if ! load_urls_from_csv "$csv_file"; then
        return 1
    fi
    
    print_essential "🚀 Starting enhanced batch processing"
    print_essential "📊 Total URLs: $TOTAL_URLS"
    print_essential "⚙️  Batch size: $BATCH_SIZE"
    
    if [[ "$ENABLE_TAGGING" == "true" ]]; then
        print_essential "🏷️  Tags: $BATCH_TAGS"
    fi
    
    echo
    
    # Process URLs in batches
    local temp_urls="temp/urls_to_process.txt"
    local current_batch=()
    local batch_count=0
    
    while IFS= read -r url || [[ -n "$url" ]]; do
        [[ -z "$url" ]] && continue
        
        current_batch+=("$url")
        
        # Process batch when it reaches batch size
        if [[ ${#current_batch[@]} -eq $BATCH_SIZE ]]; then
            ((batch_count++))
            print_info "Starting batch $batch_count"
            
            process_batch "${current_batch[@]}"
            
            # Update progress
            update_progress
            
            # Clear batch
            current_batch=()
            
            # Add delay between batches if not the last batch
            if [[ $PROCESSED_URLS -lt $TOTAL_URLS ]]; then
                print_info "Waiting ${TAB_DELAY}s before next batch..."
                sleep "$TAB_DELAY"
            fi
        fi
    done < "$temp_urls"
    
    # Process remaining URLs in final batch
    if [[ ${#current_batch[@]} -gt 0 ]]; then
        ((batch_count++))
        print_info "Processing final batch $batch_count"
        process_batch "${current_batch[@]}"
        update_progress
    fi
    
    # Final summary
    print_essential ""
    print_essential "🎉 Batch processing completed!"
    print_essential "📊 Results Summary:"
    print_essential "   ✅ Successful: $SUCCESSFUL_EXTRACTIONS"
    print_essential "   ⏩ Skipped: $SKIPPED_URLS"
    print_essential "   ❌ Failed: $FAILED_URLS"
    
    if [[ "$ENABLE_TAGGING" == "true" ]]; then
        print_essential "   🏷️  Tagged: $TAGGED_AGENTS"
    fi
    
    print_essential ""
    print_essential "📁 Log file: $LOG_FILE"
    print_essential "📊 Progress file: $PROGRESS_FILE"
    
    return 0
}

# ============================================================================
# USAGE AND MAIN
# ============================================================================

show_usage() {
    cat << EOF
Enhanced Simple Tab Opener with Tagging Support

USAGE:
    $0 [OPTIONS] [CSV_FILE]

ARGUMENTS:
    CSV_FILE    Path to CSV file with URLs (default: $DEFAULT_CSV_FILE)

OPTIONS:
    -h, --help              Show this help message
    -b, --batch-size SIZE   Number of URLs to process concurrently (default: $BATCH_SIZE)
    -d, --delay SECONDS     Delay between opening tabs (default: $TAB_DELAY)
    -w, --wait SECONDS      Max wait time for extraction (default: $PROCESSING_WAIT)
    -t, --tags TAGS         Comma-separated tags to apply to all extracted agents
    -f, --force             Force reprocess URLs (skip duplicate check)
    -v, --verbose           Enable verbose output
    -q, --quiet             Reduce output (default: enabled)
    -s, --silent            Minimal output only

TAGGING EXAMPLES:
    # Apply tags to all extracted agents
    $0 --tags "luxury,beverly-hills,batch-2024"
    
    # Process with custom settings and tags
    $0 -b 5 -d 2 -t "new-leads,january" my_urls.csv
    
    # Force reprocess all URLs with tags
    $0 --force --tags "reprocessed,updated" existing_urls.csv

STANDARD EXAMPLES:
    # Basic usage with default settings
    $0
    
    # Custom CSV file
    $0 my_realtor_urls.csv
    
    # Custom batch settings
    $0 -b 5 -d 2 -w 180
    
    # Verbose mode
    $0 --verbose urls.csv

FEATURES:
    ✅ Real-time extraction monitoring
    ✅ Automatic tagging support
    ✅ Duplicate detection and skipping
    ✅ Progress tracking and reporting
    ✅ Concurrent batch processing
    ✅ Comprehensive logging
    ✅ Signal handling for clean exit

EOF
}

main() {
    local csv_file="$DEFAULT_CSV_FILE"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -b|--batch-size)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    BATCH_SIZE="$2"
                    shift 2
                else
                    print_error "Invalid batch size"
                    exit 1
                fi
                ;;
            -d|--delay)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    TAB_DELAY="$2"
                    shift 2
                else
                    print_error "Invalid delay value"
                    exit 1
                fi
                ;;
            -w|--wait)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    PROCESSING_WAIT="$2"
                    shift 2
                else
                    print_error "Invalid wait value"
                    exit 1
                fi
                ;;
            -t|--tags)
                if [[ -n "${2:-}" ]]; then
                    BATCH_TAGS="$2"
                    ENABLE_TAGGING=true
                    shift 2
                else
                    print_error "Tags value required"
                    exit 1
                fi
                ;;
            -f|--force)
                FORCE_REPROCESS=true
                shift
                ;;
            -v|--verbose)
                VERBOSE_MODE=true
                QUIET_MODE=false
                SILENT_MODE=false
                shift
                ;;
            -q|--quiet)
                QUIET_MODE=true
                VERBOSE_MODE=false
                shift
                ;;
            -s|--silent)
                SILENT_MODE=true
                QUIET_MODE=true
                VERBOSE_MODE=false
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
    
    # Validate tags if provided
    if [[ "$ENABLE_TAGGING" == "true" ]] && ! validate_tags "$BATCH_TAGS"; then
        exit 1
    fi
    
    # Run main processing
    main_processing "$csv_file"
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
