#!/bin/bash

# CSV Cleaner GUI Launcher
# Simple script to launch the CSV cleaner GUI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUI_SCRIPT="$SCRIPT_DIR/gui.py"

# Check if GUI script exists
if [ ! -f "$GUI_SCRIPT" ]; then
    echo "Error: GUI script not found at $GUI_SCRIPT"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if tkinter is available
if ! python3 -c "import tkinter" 2>/dev/null; then
    echo "Error: tkinter is not available. Please install python3-tk:"
    echo "sudo apt install python3-tk"
    exit 1
fi

echo "Starting CSV Cleaner GUI..."
cd "$SCRIPT_DIR"
python3 "$GUI_SCRIPT"
