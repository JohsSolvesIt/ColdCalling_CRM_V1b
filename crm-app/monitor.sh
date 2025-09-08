#!/bin/bash

# System Monitor Script for CRM Application
# Monitors all services and provides automatic recovery

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$SCRIPT_DIR/system-monitor.log"
MAX_LOG_SIZE=10485760  # 10MB

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [MONITOR] $1" | tee -a "$LOG_FILE"
}

# Function to rotate log if too large
rotate_log() {
    if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE") -gt $MAX_LOG_SIZE ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        touch "$LOG_FILE"
        log "Log rotated due to size"
    fi
}

# Function to check if a port is listening
check_port() {
    local port=$1
    local service=$2
    if lsof -ti :$port >/dev/null 2>&1; then
        return 0  # Port is listening
    else
        log "❌ $service (port $port) is DOWN"
        return 1  # Port is not listening
    fi
}

# Function to check HTTP endpoint health
check_http_health() {
    local url=$1
    local service=$2
    local timeout=${3:-5}
    
    if curl -s --max-time $timeout "$url" >/dev/null 2>&1; then
        return 0  # Healthy
    else
        log "❌ $service health check failed: $url"
        return 1  # Unhealthy
    fi
}

# Function to check memory usage
check_memory() {
    local usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local swap_usage=$(free | grep Swap | awk '{if($2>0) printf "%.1f", $3/$2 * 100.0; else print "0.0"}')
    
    log "📊 Memory: ${usage}% RAM, ${swap_usage}% Swap"
    
    # Alert if memory usage is high
    if (( $(echo "$usage > 85.0" | bc -l) )); then
        log "⚠️ HIGH MEMORY USAGE: ${usage}%"
    fi
    
    if (( $(echo "$swap_usage > 50.0" | bc -l) )); then
        log "⚠️ HIGH SWAP USAGE: ${swap_usage}%"
    fi
}

# Function to check disk space
check_disk() {
    local usage=$(df / | awk 'NR==2 {printf "%.1f", $3/$2 * 100.0}')
    log "💾 Disk usage: ${usage}%"
    
    if (( $(echo "$usage > 90.0" | bc -l) )); then
        log "🚨 CRITICAL DISK SPACE: ${usage}%"
        # Clean up old logs and temp files
        find /tmp -type f -mtime +7 -delete 2>/dev/null || true
    # Clean user cache if accessible (best-effort)
    find "$HOME/.cache" -type f -mtime +7 -delete 2>/dev/null || true
    fi
}

# Function to monitor node processes
check_node_processes() {
    local high_memory_procs=$(ps aux | awk '$11 ~ /node/ && $6 > 500000 {print $2, $6/1024 "MB", $11}')
    if [ -n "$high_memory_procs" ]; then
        log "⚠️ High memory Node.js processes:"
        echo "$high_memory_procs" | while read line; do
            log "   $line"
        done
    fi
}

# Function to restart a service
restart_service() {
    local service=$1
    local port=$2
    
    log "🔄 Attempting to restart $service"
    
    # Kill any existing process on the port
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        log "Killing existing process $pid on port $port"
        kill -9 $pid 2>/dev/null
        sleep 2
    fi
    
    case $service in
        "Chrome Extension Backend")
            cd "$REPO_ROOT/chromeExtensionRealtor/backend"
            npm start > logs/restart.log 2>&1 &
            log "Started Chrome Extension Backend (PID: $!)"
            ;;
        "VvebJS Server")
            cd "$REPO_ROOT/vvebjs"
            npm run serve-realtor > restart.log 2>&1 &
            log "Started VvebJS Server (PID: $!)"
            ;;
        "VvebJS Save Server")
            cd "$REPO_ROOT/vvebjs"
            npm run start-save-server > save-restart.log 2>&1 &
            log "Started VvebJS Save Server (PID: $!)"
            ;;
        "CRM Backend")
            cd "$REPO_ROOT/crm-app"
            npm run server > server-restart.log 2>&1 &
            log "Started CRM Backend (PID: $!)"
            ;;
    esac
    
    sleep 5  # Give service time to start
}

# Main monitoring loop
main() {
    log "🚀 Starting CRM System Monitor"
    log "Monitoring services: Chrome Extension (5001), VvebJS (3030), VvebJS Save (3031), CRM Backend (5000)"
    
    while true; do
        rotate_log
        
        log "=== System Health Check ==="
        
        # Check system resources
        check_memory
        check_disk
        check_node_processes
        
        # Check services
        local services_down=0
        
        # Chrome Extension Backend (5001)
        if ! check_port 5001 "Chrome Extension Backend"; then
            restart_service "Chrome Extension Backend" 5001
            ((services_down++))
        elif ! check_http_health "http://localhost:5001/health" "Chrome Extension Backend"; then
            restart_service "Chrome Extension Backend" 5001
            ((services_down++))
        fi
        
        # VvebJS Server (3030)
        if ! check_port 3030 "VvebJS Server"; then
            restart_service "VvebJS Server" 3030
            ((services_down++))
        fi
        
        # VvebJS Save Server (3031)
        if ! check_port 3031 "VvebJS Save Server"; then
            restart_service "VvebJS Save Server" 3031
            ((services_down++))
        fi
        
        # CRM Backend (5000)
        if ! check_port 5000 "CRM Backend"; then
            restart_service "CRM Backend" 5000
            ((services_down++))
        fi
        
        if [ $services_down -eq 0 ]; then
            log "✅ All services are running normally"
        else
            log "⚠️ $services_down service(s) were restarted"
        fi
        
        log "=== End Health Check ==="
        log ""
        
        # Wait 30 seconds before next check
        sleep 30
    done
}

# Cleanup function
cleanup() {
    log "🛑 Monitor shutting down"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start monitoring
main
