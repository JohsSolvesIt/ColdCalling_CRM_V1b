#!/usr/bin/env python3
"""
CSV Cleaner - Standalone Application
Self-contained launcher for Linux systems
"""

import os
import sys
import tkinter as tk
from tkinter import messagebox, simpledialog

# Embed the path to avoid issues
APP_DIR = "/home/realm/Documents/ColdCalling CRM/CSV cleaner"

def main():
    """Main entry point"""
    try:
        # Change to application directory
        os.chdir(APP_DIR)
        
        # Import and run the GUI
        sys.path.insert(0, APP_DIR)
        
        # Check if gui.py exists
        if not os.path.exists(os.path.join(APP_DIR, "gui.py")):
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Error", f"CSV Cleaner files not found in:\n{APP_DIR}")
            return 1
        
        # Import and run the GUI module
        import importlib.util
        spec = importlib.util.spec_from_file_location("gui", os.path.join(APP_DIR, "gui.py"))
        gui_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(gui_module)
        
        # Run the main function from gui.py
        gui_module.main()
        
        return 0
        
    except ImportError as e:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Import Error", 
                           f"Missing required modules:\n{e}\n\n"
                           "Please install: sudo apt install python3-tk")
        return 1
        
    except Exception as e:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Error", f"Failed to start CSV Cleaner:\n{e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
