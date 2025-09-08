#!/bin/bash

# Script to ensure VvebJS save server is running
# This script checks if the save server is running and starts it if needed

# Resolve repo root as the directory containing this script, then vvvebjs within it
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAVE_SERVER_DIR="${SCRIPT_DIR}/vvebjs"
SAVE_SERVER_PORT=3031
LOG_FILE="${SAVE_SERVER_DIR}/save-server-startup.log"

echo "🔍 Checking VvebJS Save Server Status..."

# Check if save server is already running
if curl -s http://localhost:${SAVE_SERVER_PORT}/health >/dev/null 2>&1; then
    echo "✅ VvebJS Save Server is already running on port ${SAVE_SERVER_PORT}"
    exit 0
fi

echo "🚀 Starting VvebJS Save Server..."

# Change to the VvebJS directory
cd "${SAVE_SERVER_DIR}" || {
    echo "❌ Failed to change to VvebJS directory: ${SAVE_SERVER_DIR}"
    exit 1
}

# Start the save server in background
npm run start-save-server > "${LOG_FILE}" 2>&1 &
SAVE_SERVER_PID=$!

echo "🔄 Started save server with PID: ${SAVE_SERVER_PID}"

# Wait for server to start up (max 10 seconds)
for i in {1..10}; do
    if curl -s http://localhost:${SAVE_SERVER_PORT}/health >/dev/null 2>&1; then
        echo "✅ VvebJS Save Server is now running and responding on port ${SAVE_SERVER_PORT}"
        echo "📄 Log file: ${LOG_FILE}"
        exit 0
    fi
    echo "⏳ Waiting for save server to start... (${i}/10)"
    sleep 1
done

echo "❌ Save server failed to start within 10 seconds"
echo "📄 Check log file: ${LOG_FILE}"

# Show last few lines of log
if [ -f "${LOG_FILE}" ]; then
    echo "📄 Last 10 lines of log:"
    tail -10 "${LOG_FILE}"
fi

exit 1
