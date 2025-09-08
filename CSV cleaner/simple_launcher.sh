#!/bin/bash

# Simple CSV Cleaner Launcher for Desktop
# This version is optimized for desktop shortcuts

# Remove exit-on-error for desktop compatibility
set +e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory
cd "$SCRIPT_DIR"

# Simple launch with error handling
if [ -f "gui.py" ]; then
    # Try to launch the GUI
    python3 gui.py
    exit_code=$?
    
    # If there was an error, show a simple message
    if [ $exit_code -ne 0 ]; then
        # Try to show error in a graphical way
        if command -v zenity &> /dev/null; then
            zenity --error --text="Failed to start CSV Cleaner. Please check dependencies:\n\n1. Python 3 installed\n2. tkinter installed (sudo apt install python3-tk)\n3. All files present in: $SCRIPT_DIR"
        elif command -v notify-send &> /dev/null; then
            notify-send "CSV Cleaner Error" "Failed to start. Check terminal for details."
        fi
        
        # Also try terminal output
        echo "ERROR: Failed to start CSV Cleaner"
        echo "Please ensure:"
        echo "1. Python 3 is installed"
        echo "2. tkinter is installed: sudo apt install python3-tk"
        echo "3. Working directory: $SCRIPT_DIR"
        
        # Keep terminal open if running in terminal
        if [ -t 0 ]; then
            echo "Press Enter to close..."
            read
        fi
    fi
else
    # GUI file not found
    if command -v zenity &> /dev/null; then
        zenity --error --text="gui.py not found in:\n$SCRIPT_DIR\n\nPlease ensure all files are in the correct location."
    else
        echo "ERROR: gui.py not found in $SCRIPT_DIR"
        if [ -t 0 ]; then
            echo "Press Enter to close..."
            read
        fi
    fi
fi
