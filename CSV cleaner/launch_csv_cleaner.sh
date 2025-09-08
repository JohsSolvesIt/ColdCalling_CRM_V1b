#!/bin/bash

# CSV Cleaner Desktop Launcher
# This script launches the CSV Cleaner GUI with full environment setup

# Remove strict error handling for desktop compatibility
# set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to log messages
log_message() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Function to check and install dependencies
check_dependencies() {
    log_message "Checking dependencies..."
    
    # Check Python 3
    if ! command -v python3 &> /dev/null; then
        log_message "ERROR: Python 3 is not installed"
        return 1
    fi
    
    # Check tkinter
    if ! python3 -c "import tkinter" 2>/dev/null; then
        log_message "ERROR: tkinter is not available"
        log_message "Run: sudo apt install python3-tk"
        return 1
    fi
    
    # Check required Python modules
    python3 -c "
import sys
missing = []
try:
    import csv, os, re, random, string, threading, glob, configparser
    from datetime import datetime
    from tkinter import ttk, filedialog, messagebox, scrolledtext
except ImportError as e:
    missing.append(str(e))

if missing:
    print('Missing modules:', missing)
    sys.exit(1)
else:
    print('All required modules available')
" 2>/dev/null || return 1
    
    log_message "All dependencies satisfied"
    return 0
}

# Function to setup environment
setup_environment() {
    log_message "Setting up environment..."
    
    # Change to the script directory
    cd "$SCRIPT_DIR"
    
    # Add current directory to Python path
    export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"
    
    # Set up any ADB or other tool paths if needed
    if command -v adb &> /dev/null; then
        log_message "ADB found: $(which adb)"
        export ADB_PATH="$(which adb)"
    else
        log_message "ADB not found in PATH (this is OK if not needed)"
    fi
    
    # Ensure config file exists
    if [ ! -f "config.ini" ]; then
        log_message "Creating default config.ini..."
        python3 -c "
import configparser
config = configparser.ConfigParser()
config['COLUMN_MAPPING'] = {
    'REALTOR_URL_COL': '0',
    'PROFILE_PIC_COL': '1', 
    'NAME_COL': '2',
    'AGENCY_COL': '3',
    'EXPERIENCE_VALUE_COL': '5',
    'PHONE_COL': '7',
    'FOR_SALE_COL': '9',
    'LISTED_DATE_COL': '11'
}
config['OUTPUT_SETTINGS'] = {
    'DEFAULT_STATUS': 'New',
    'DEFAULT_NOTES': '',
    'DEFAULT_SOLD': '',
    'DEFAULT_LANGUAGES': '',
    'DEFAULT_LAST_CONTACTED': '',
    'DEFAULT_FOLLOW_UP_AT': ''
}
with open('config.ini', 'w') as f:
    config.write(f)
print('config.ini created')
"
    fi
    
    # Create necessary directories
    mkdir -p Cleaned
    mkdir -p csv
    
    log_message "Environment setup complete"
}

# Function to launch GUI
launch_gui() {
    log_message "Launching CSV Cleaner GUI..."
    
    # Check if GUI file exists
    if [ ! -f "gui.py" ]; then
        log_message "ERROR: gui.py not found in $SCRIPT_DIR"
        return 1
    fi
    
    # Launch the GUI
    python3 gui.py
    return $?
}

# Main execution
main() {
    log_message "Starting CSV Cleaner Tool..."
    log_message "Working directory: $SCRIPT_DIR"
    
    # Check dependencies
    if ! check_dependencies; then
        echo ""
        echo "Please install missing dependencies and try again."
        echo "Press Enter to close..."
        read
        exit 1
    fi
    
    # Setup environment
    setup_environment
    
    # Launch GUI
    if launch_gui; then
        log_message "GUI closed normally"
    else
        log_message "ERROR: GUI exited with error code $?"
        echo ""
        echo "An error occurred. Check the messages above."
        echo "Press Enter to close..."
        read
        exit 1
    fi
}

# Run main function
main "$@"
