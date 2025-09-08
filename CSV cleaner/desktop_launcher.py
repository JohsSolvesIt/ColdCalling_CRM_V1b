#!/usr/bin/env python3
"""
CSV Cleaner Desktop Launcher
A Python-based launcher that works better with Linux Mint desktop environments
"""

import os
import sys
import subprocess
import tkinter as tk
from tkinter import messagebox
import threading

def show_error(title, message):
    """Show error message using tkinter"""
    try:
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        messagebox.showerror(title, message)
        root.destroy()
    except Exception:
        # Fallback to print if GUI fails
        print(f"ERROR: {title} - {message}")

def check_dependencies():
    """Check if all dependencies are available"""
    try:
        import tkinter
        import csv
        import configparser
        return True
    except ImportError as e:
        show_error("Missing Dependencies", 
                   f"Required Python modules are missing: {e}\n\n"
                   "Please install:\nsudo apt install python3-tk")
        return False

def launch_gui():
    """Launch the CSV Cleaner GUI"""
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    gui_path = os.path.join(script_dir, "gui.py")
    
    # Check if GUI file exists
    if not os.path.exists(gui_path):
        show_error("File Not Found", 
                   f"gui.py not found in:\n{script_dir}\n\n"
                   "Please ensure all files are in the correct location.")
        return False
    
    # Change to the script directory
    original_dir = os.getcwd()
    os.chdir(script_dir)
    
    try:
        # Launch the GUI using subprocess
        result = subprocess.run([sys.executable, "gui.py"], 
                              capture_output=False, 
                              text=True)
        
        if result.returncode != 0:
            show_error("Launch Error", 
                       "The CSV Cleaner GUI failed to start.\n\n"
                       "Please check that all dependencies are installed.")
            return False
        
        return True
        
    except Exception as e:
        show_error("Launch Error", 
                   f"Failed to start CSV Cleaner:\n{str(e)}")
        return False
    
    finally:
        # Restore original directory
        os.chdir(original_dir)

def main():
    """Main function"""
    # Check dependencies first
    if not check_dependencies():
        return 1
    
    # Launch the GUI
    if launch_gui():
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())
