#!/bin/bash

echo "🔍 CRM Crash Investigation Tool"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
REPORT_FILE="crash_report_${TIMESTAMP}.txt"

echo "📝 Generating crash report: $REPORT_FILE"
echo ""

# Create report header
cat > "$REPORT_FILE" << EOF
CRM CRASH INVESTIGATION REPORT
Generated: $(date)
System: $(uname -a)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

# Function to add section to report
add_section() {
    echo "" >> "$REPORT_FILE"
    echo "═══ $1 ═══" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

echo "🔍 1. Checking current process status..."
add_section "CURRENT PROCESS STATUS"
ps aux | grep -E "(node|npm)" | grep -v grep >> "$REPORT_FILE" 2>&1

echo "🔍 2. Checking port usage..."
add_section "PORT USAGE"
netstat -tlnp 2>/dev/null | grep -E ":(3000|5000|5001|3030|3031)" >> "$REPORT_FILE" 2>&1

echo "🔍 3. Checking system resources..."
add_section "SYSTEM RESOURCES"
{
    echo "=== DISK USAGE ==="
    df -h
    echo ""
    echo "=== MEMORY USAGE ==="
    free -h
    echo ""
    echo "=== CPU/MEMORY TOP PROCESSES ==="
    ps aux --sort=-%cpu | head -10
    echo ""
    echo "=== LOAD AVERAGE ==="
    uptime
} >> "$REPORT_FILE" 2>&1

echo "🔍 4. Checking log files..."
add_section "LOG FILES"

# Check for crash logs
if [ -f "./crash.log" ]; then
    echo "=== CRM CRASH LOG ===" >> "$REPORT_FILE"
    tail -50 "./crash.log" >> "$REPORT_FILE" 2>&1
    echo "" >> "$REPORT_FILE"
fi

# Check Chrome Extension logs
if [ -f "../chromeExtensionRealtor/backend/logs/error.log" ]; then
    echo "=== CHROME EXTENSION ERROR LOG ===" >> "$REPORT_FILE"
    tail -50 "../chromeExtensionRealtor/backend/logs/error.log" >> "$REPORT_FILE" 2>&1
    echo "" >> "$REPORT_FILE"
fi

if [ -f "../chromeExtensionRealtor/backend/logs/combined.log" ]; then
    echo "=== CHROME EXTENSION COMBINED LOG ===" >> "$REPORT_FILE"
    tail -50 "../chromeExtensionRealtor/backend/logs/combined.log" >> "$REPORT_FILE" 2>&1
    echo "" >> "$REPORT_FILE"
fi

# Check VvebJS logs
if [ -f "../vvebjs/vvvebjs.log" ]; then
    echo "=== VVEBJS LOG ===" >> "$REPORT_FILE"
    tail -50 "../vvebjs/vvvebjs.log" >> "$REPORT_FILE" 2>&1
    echo "" >> "$REPORT_FILE"
fi

if [ -f "../vvebjs/save-server.log" ]; then
    echo "=== VVEBJS SAVE SERVER LOG ===" >> "$REPORT_FILE"
    tail -50 "../vvebjs/save-server.log" >> "$REPORT_FILE" 2>&1
    echo "" >> "$REPORT_FILE"
fi

echo "🔍 5. Checking system logs for crashes..."
add_section "SYSTEM LOGS"
{
    echo "=== RECENT SYSTEM ERRORS ==="
    journalctl --since "1 hour ago" | grep -i -E "(error|killed|segfault|out of memory|node)" | tail -20
    echo ""
    echo "=== DMESG RECENT ==="
    dmesg | tail -20
} >> "$REPORT_FILE" 2>&1

echo "🔍 6. Checking disk space details..."
add_section "DISK SPACE ANALYSIS"
{
    echo "=== DETAILED DISK USAGE ==="
    du -sh * 2>/dev/null | sort -hr | head -20
    echo ""
    echo "=== LARGE FILES IN LOGS ==="
    find . -name "*.log" -size +10M -exec ls -lh {} \; 2>/dev/null
    echo ""
    echo "=== NODE_MODULES SIZE ==="
    du -sh */node_modules 2>/dev/null
} >> "$REPORT_FILE" 2>&1

echo "🔍 7. Checking dependency status..."
add_section "DEPENDENCY STATUS"
{
    echo "=== NODE VERSION ==="
    node --version
    echo ""
    echo "=== NPM VERSION ==="
    npm --version
    echo ""
    echo "=== PACKAGE.JSON STATUS ==="
    if [ -f "package.json" ]; then
        echo "Main package.json exists"
        npm list --depth=0 2>&1 | head -20
    else
        echo "Main package.json NOT FOUND"
    fi
    echo ""
    echo "=== CLIENT DEPENDENCIES ==="
    if [ -f "client/package.json" ]; then
        echo "Client package.json exists"
        cd client && npm list --depth=0 2>&1 | head -10 && cd ..
    else
        echo "Client package.json NOT FOUND"
    fi
} >> "$REPORT_FILE" 2>&1

echo "🔍 8. Running health check..."
add_section "HEALTH CHECK"
if [ -f "./monitor.js" ]; then
    node ./monitor.js once >> "$REPORT_FILE" 2>&1
else
    echo "Health monitor not found" >> "$REPORT_FILE"
fi

echo "🔍 9. Checking recent file modifications..."
add_section "RECENT FILE CHANGES"
{
    echo "=== FILES MODIFIED IN LAST HOUR ==="
    find . -type f -mmin -60 -name "*.js" -o -name "*.json" -o -name "*.log" 2>/dev/null | head -20
    echo ""
    echo "=== LARGE LOG FILES ==="
    find . -name "*.log" -size +1M -exec ls -lh {} \; 2>/dev/null
} >> "$REPORT_FILE" 2>&1

echo "🔍 10. Generating recommendations..."
add_section "CRASH ANALYSIS & RECOMMENDATIONS"

# Analyze the data and provide recommendations
{
    echo "=== AUTOMATIC ANALYSIS ==="
    
    # Check disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 90 ]; then
        echo "🚨 CRITICAL: Disk usage is ${DISK_USAGE}% - This is likely causing crashes!"
        echo "   RECOMMENDATION: Free up disk space immediately"
        echo "   - Clear log files: find . -name '*.log' -size +10M -delete"
        echo "   - Clear node_modules: rm -rf node_modules client/node_modules"
        echo "   - Run: npm prune && npm cache clean --force"
        echo ""
    elif [ "$DISK_USAGE" -gt 80 ]; then
        echo "⚠️ WARNING: Disk usage is ${DISK_USAGE}% - Monitor closely"
        echo ""
    fi
    
    # Check memory
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEM_USAGE" -gt 90 ]; then
        echo "🚨 CRITICAL: Memory usage is ${MEM_USAGE}% - This may cause crashes!"
        echo "   RECOMMENDATION: Reduce memory usage"
        echo "   - Restart the system: ./restart.sh"
        echo "   - Close unnecessary VS Code extensions"
        echo "   - Reduce the number of concurrent services"
        echo ""
    fi
    
    # Check for running processes
    NODE_PROCESSES=$(ps aux | grep node | grep -v grep | wc -l)
    if [ "$NODE_PROCESSES" -gt 10 ]; then
        echo "⚠️ WARNING: $NODE_PROCESSES Node.js processes running - This may indicate memory leaks"
        echo "   RECOMMENDATION: Kill orphaned processes and restart"
        echo ""
    fi
    
    # Check if critical services are running
    if ! pgrep -f "node.*server" > /dev/null; then
        echo "❌ ISSUE: No Node.js server processes detected"
        echo "   RECOMMENDATION: Restart the CRM system with ./restart.sh"
        echo ""
    fi
    
    echo "=== GENERAL RECOMMENDATIONS ==="
    echo "1. Run: ./restart.sh to clean restart all services"
    echo "2. Monitor with: node monitor.js monitor"
    echo "3. Check logs regularly for early warning signs"
    echo "4. Free up disk space if usage > 80%"
    echo "5. Consider adding swap space if memory usage is consistently high"
    echo "6. Use PM2 for production deployment for automatic restarts"
    
} >> "$REPORT_FILE" 2>&1

# Display summary
echo ""
echo "✅ Crash investigation complete!"
echo ""
echo "📊 SUMMARY:"
echo "   • Report saved to: $REPORT_FILE"
echo "   • Current disk usage: $(df / | tail -1 | awk '{print $5}')"
echo "   • Current memory usage: $(free | grep Mem | awk '{printf "%.0f%%", $3/$2 * 100.0}')"
echo "   • Node processes running: $(ps aux | grep node | grep -v grep | wc -l)"
echo ""

# Quick recommendations
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "🚨 URGENT: Disk space critical (${DISK_USAGE}%) - This is likely the crash cause!"
    echo "   Run: find . -name '*.log' -size +10M -delete"
    echo ""
fi

echo "🔧 QUICK ACTIONS:"
echo "   • Restart system: ./restart.sh"
echo "   • Monitor health: node monitor.js monitor"
echo "   • View full report: cat $REPORT_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
