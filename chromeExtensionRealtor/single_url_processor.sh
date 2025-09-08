#!/bin/bash

# Single-URL Processor with Real-Time Detection
# Processes individual URLs with immediate feedback and optional tagging
# Part of Chrome Extension Batch Processing System

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKEND_PORT=5001
readonly REAL_TIME_LOG="realtime_processing.log"
readonly PROCESSING_STATUS_FILE="current_processing.json"

# Real-time detection settings
readonly DETECTION_TIMEOUT=60        # Maximum seconds to wait for detection
readonly POLLING_INTERVAL=2          # Seconds between status checks
readonly INITIAL_WAIT=5              # Seconds to wait before first check

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Global variables
URL=""
TAGS=""
BATCH_MODE=false
VERBOSE=false
TIMEOUT=$DETECTION_TIMEOUT

# ============================================================================
# LOGGING AND OUTPUT FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$REAL_TIME_LOG"
}

print_header() {
    echo -e "${CYAN}${BOLD}===============================================${NC}"
    echo -e "${CYAN}${BOLD}  Single-URL Real-Time Processor${NC}"
    echo -e "${CYAN}${BOLD}===============================================${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
    log "INFO: $*"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
    log "SUCCESS: $*"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
    log "WARNING: $*"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $*"
    log "ERROR: $*"
}

print_status() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}[STATUS]${NC} $*"
    fi
    log "STATUS: $*"
}

# ============================================================================
# BACKEND COMMUNICATION
# ============================================================================

check_backend() {
    print_info "Checking backend service..."
    
    if ! curl -s -f "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
        print_error "Backend service not running on port $BACKEND_PORT"
        print_info "Please start the backend service first:"
        print_info "  cd chromeExtensionRealtor/backend && npm start"
        return 1
    fi
    
    print_success "Backend service is running"
    return 0
}

check_duplicate() {
    local url="$1"
    
    print_status "Checking for duplicates..."
    
    local response
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\"}" \
        "http://localhost:$BACKEND_PORT/api/check-duplicate" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        print_warning "Could not check for duplicates"
        return 1
    fi
    
    local is_duplicate
    is_duplicate=$(echo "$response" | jq -r '.isDuplicate // false' 2>/dev/null)
    
    if [[ "$is_duplicate" == "true" ]]; then
        print_warning "URL already exists in database"
        return 0
    fi
    
    print_info "URL is new - proceeding with extraction"
    return 1
}

get_agent_by_url() {
    local url="$1"
    
    local response
    response=$(curl -s "http://localhost:$BACKEND_PORT/api/agents/search?q=$(echo "$url" | sed 's|.*/||')" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        echo "$response" | jq -r '.agents[0] // null' 2>/dev/null
    else
        echo "null"
    fi
}

# ============================================================================
# REAL-TIME DETECTION
# ============================================================================

update_processing_status() {
    local status="$1"
    local message="$2"
    local agent_data="${3:-null}"
    
    cat > "$PROCESSING_STATUS_FILE" <<EOF
{
  "url": "$URL",
  "status": "$status",
  "message": "$message",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "tags": "$TAGS",
  "agent_data": $agent_data
}
EOF
}

detect_extraction_completion() {
    local url="$1"
    local start_time=$(date +%s)
    local elapsed=0
    
    print_info "Starting real-time detection for URL processing..."
    print_info "Timeout: ${TIMEOUT}s | Polling interval: ${POLLING_INTERVAL}s"
    
    update_processing_status "waiting" "Waiting for initial processing to begin"
    
    # Initial wait for page load and extension activation
    print_status "Waiting ${INITIAL_WAIT}s for page load and extension activation..."
    sleep $INITIAL_WAIT
    
    update_processing_status "detecting" "Monitoring for extraction completion"
    
    while [[ $elapsed -lt $TIMEOUT ]]; do
        print_status "Checking extraction status... (${elapsed}s/${TIMEOUT}s)"
        
        # Check if agent data is now available
        local agent_data
        agent_data=$(get_agent_by_url "$url")
        
        if [[ "$agent_data" != "null" && "$agent_data" != "" ]]; then
            local agent_name
            agent_name=$(echo "$agent_data" | jq -r '.name // "Unknown"' 2>/dev/null)
            
            print_success "✅ Extraction detected! Agent: $agent_name"
            update_processing_status "completed" "Extraction completed successfully" "$agent_data"
            
            # Add tags if specified
            if [[ -n "$TAGS" ]]; then
                add_tags_to_agent "$agent_data" "$TAGS"
            fi
            
            return 0
        fi
        
        # Progress indicator
        local progress=$((elapsed * 100 / TIMEOUT))
        printf "\r${CYAN}[DETECTING]${NC} Progress: %d%% (%ds/%ds)" "$progress" "$elapsed" "$TIMEOUT"
        
        sleep $POLLING_INTERVAL
        elapsed=$(($(date +%s) - start_time))
    done
    
    echo ""
    print_warning "⏰ Timeout reached after ${TIMEOUT}s - extraction may still be in progress"
    update_processing_status "timeout" "Detection timeout reached"
    return 1
}

# ============================================================================
# TAGGING FUNCTIONALITY
# ============================================================================

add_tags_to_agent() {
    local agent_data="$1"
    local tags="$2"
    
    if [[ -z "$tags" ]]; then
        return 0
    fi
    
    local agent_id
    agent_id=$(echo "$agent_data" | jq -r '.id // empty' 2>/dev/null)
    
    if [[ -z "$agent_id" ]]; then
        print_warning "Could not add tags - agent ID not found"
        return 1
    fi
    
    print_info "Adding tags to agent: $tags"
    
    # Convert comma-separated tags to JSON array
    local tags_json
    tags_json=$(echo "$tags" | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')
    
    local response
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"agentId\":\"$agent_id\",\"tags\":$tags_json}" \
        "http://localhost:$BACKEND_PORT/api/agents/tags" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        print_success "Tags added successfully: $tags"
    else
        print_warning "Failed to add tags"
    fi
}

validate_tags() {
    local tags="$1"
    
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
    
    return 0
}

# ============================================================================
# URL PROCESSING
# ============================================================================

validate_url() {
    local url="$1"
    
    # Basic URL validation
    if [[ ! "$url" =~ ^https?:// ]]; then
        print_error "Invalid URL format. Must start with http:// or https://"
        return 1
    fi
    
    # Check if it's a Realtor.com URL
    if [[ ! "$url" =~ realtor\.com ]]; then
        print_warning "URL is not from realtor.com - extraction may not work"
    fi
    
    return 0
}

open_url() {
    local url="$1"
    
    print_info "Opening URL in default browser..."
    print_info "URL: $url"
    
    # Determine the appropriate command to open URL
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" &
    elif command -v open >/dev/null 2>&1; then  # macOS
        open "$url" &
    elif command -v start >/dev/null 2>&1; then  # Windows
        start "$url" &
    else
        print_error "No URL opener found. Please open manually: $url"
        return 1
    fi
    
    print_success "URL opened in browser"
    return 0
}

process_single_url() {
    local url="$1"
    local tags="$2"
    
    print_header
    print_info "Processing single URL with real-time detection"
    print_info "URL: $url"
    
    if [[ -n "$tags" ]]; then
        print_info "Tags: $tags"
    fi
    
    # Validate inputs
    if ! validate_url "$url"; then
        return 1
    fi
    
    if [[ -n "$tags" ]] && ! validate_tags "$tags"; then
        return 1
    fi
    
    # Check backend
    if ! check_backend; then
        return 1
    fi
    
    # Check for duplicates
    if check_duplicate "$url"; then
        print_info "Skipping duplicate URL"
        return 0
    fi
    
    # Open URL in browser
    if ! open_url "$url"; then
        return 1
    fi
    
    # Start real-time detection
    print_info "Starting real-time detection..."
    
    if detect_extraction_completion "$url"; then
        print_success "✅ Single URL processing completed successfully!"
        
        # Show final results
        local final_agent
        final_agent=$(get_agent_by_url "$url")
        
        if [[ "$final_agent" != "null" ]]; then
            local agent_name
            local agent_company
            agent_name=$(echo "$final_agent" | jq -r '.name // "Unknown"' 2>/dev/null)
            agent_company=$(echo "$final_agent" | jq -r '.company // "Unknown"' 2>/dev/null)
            
            print_success "Agent extracted: $agent_name"
            print_success "Company: $agent_company"
            
            if [[ -n "$tags" ]]; then
                print_success "Tags applied: $tags"
            fi
        fi
        
        return 0
    else
        print_error "❌ Real-time detection timed out"
        print_info "The extraction may still be in progress - check manually"
        return 1
    fi
}

# ============================================================================
# BATCH MODE INTEGRATION
# ============================================================================

process_batch_url() {
    local url="$1"
    local tags="$2"
    
    # Simplified processing for batch mode (no interactive output)
    if ! check_backend >/dev/null 2>&1; then
        echo "ERROR: Backend not available"
        return 1
    fi
    
    if check_duplicate "$url" >/dev/null 2>&1; then
        echo "SKIPPED: Duplicate"
        return 0
    fi
    
    # Open URL silently
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 &
    else
        echo "ERROR: Cannot open URL"
        return 1
    fi
    
    # Simplified detection for batch mode
    sleep $INITIAL_WAIT
    
    local start_time=$(date +%s)
    local elapsed=0
    
    while [[ $elapsed -lt $TIMEOUT ]]; do
        local agent_data
        agent_data=$(get_agent_by_url "$url")
        
        if [[ "$agent_data" != "null" && "$agent_data" != "" ]]; then
            # Add tags if specified
            if [[ -n "$tags" ]]; then
                add_tags_to_agent "$agent_data" "$tags" >/dev/null 2>&1
            fi
            
            echo "SUCCESS: Extracted"
            return 0
        fi
        
        sleep $POLLING_INTERVAL
        elapsed=$(($(date +%s) - start_time))
    done
    
    echo "TIMEOUT: No extraction detected"
    return 1
}

# ============================================================================
# MAIN FUNCTIONS
# ============================================================================

show_usage() {
    cat << EOF
Single-URL Processor with Real-Time Detection

USAGE:
    $0 [OPTIONS] URL [TAGS]

ARGUMENTS:
    URL     The Realtor.com URL to process
    TAGS    Comma-separated tags to apply (optional)

OPTIONS:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output
    -t, --timeout SEC   Detection timeout in seconds (default: $DETECTION_TIMEOUT)
    -b, --batch         Batch mode (minimal output)

EXAMPLES:
    # Process single URL with real-time detection
    $0 "https://www.realtor.com/realestateagents/john-doe-123456"
    
    # Process URL with tags
    $0 "https://www.realtor.com/realestateagents/jane-smith-789012" "luxury,beverly-hills,top-agent"
    
    # Process with custom timeout
    $0 -t 90 "https://www.realtor.com/realestateagents/bob-johnson-345678"
    
    # Batch mode (for integration with other scripts)
    $0 --batch "https://www.realtor.com/realestateagents/alice-brown-901234" "new-client"

FEATURES:
    ✅ Real-time extraction detection
    ✅ Automatic tagging support
    ✅ Duplicate prevention
    ✅ Progress monitoring
    ✅ Batch mode integration
    ✅ Comprehensive logging

EOF
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -t|--timeout)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    TIMEOUT="$2"
                    shift 2
                else
                    print_error "Invalid timeout value"
                    exit 1
                fi
                ;;
            -b|--batch)
                BATCH_MODE=true
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$URL" ]]; then
                    URL="$1"
                elif [[ -z "$TAGS" ]]; then
                    TAGS="$1"
                else
                    print_error "Too many arguments"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "$URL" ]]; then
        print_error "URL is required"
        show_usage
        exit 1
    fi
    
    # Initialize logging
    mkdir -p "$(dirname "$REAL_TIME_LOG")"
    echo "Single-URL Real-Time Processor - $(date)" > "$REAL_TIME_LOG"
    
    # Process URL
    if [[ "$BATCH_MODE" == "true" ]]; then
        process_batch_url "$URL" "$TAGS"
    else
        process_single_url "$URL" "$TAGS"
    fi
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
