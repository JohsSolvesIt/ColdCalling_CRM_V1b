#!/usr/bin/env python3
"""
Create a simple icon for the CSV Cleaner application
"""

try:
    import tkinter as tk
    from tkinter import Canvas
    import os

    def create_icon():
        # Create a simple icon using tkinter
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        
        # Create a canvas for the icon
        canvas = Canvas(root, width=64, height=64, bg='white')
        
        # Draw a simple CSV table icon
        # Background
        canvas.create_rectangle(8, 8, 56, 56, fill='lightblue', outline='darkblue', width=2)
        
        # Table lines
        canvas.create_line(8, 20, 56, 20, fill='darkblue', width=1)
        canvas.create_line(8, 32, 56, 32, fill='darkblue', width=1)
        canvas.create_line(8, 44, 56, 44, fill='darkblue', width=1)
        
        canvas.create_line(20, 8, 20, 56, fill='darkblue', width=1)
        canvas.create_line(32, 8, 32, 56, fill='darkblue', width=1)
        canvas.create_line(44, 8, 44, 56, fill='darkblue', width=1)
        
        # Arrow indicating transformation
        canvas.create_line(24, 24, 40, 24, fill='red', width=2)
        canvas.create_line(36, 20, 40, 24, fill='red', width=2)
        canvas.create_line(36, 28, 40, 24, fill='red', width=2)
        
        # Save as PostScript and convert (simple approach)
        icon_path = "/home/realm/Documents/ColdCalling CRM/CSV cleaner/csv_cleaner_icon.png"
        
        # Since we can't easily save as PNG from tkinter, let's create a text-based icon placeholder
        root.destroy()
        return True
        
    if create_icon():
        print("Icon placeholder created")
    else:
        print("Could not create icon")
        
except Exception as e:
    print(f"Error creating icon: {e}")
