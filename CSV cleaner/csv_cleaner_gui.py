#!/usr/bin/env python3
"""
CSV Cleaner GUI
A simple graphical interface for the CSV cleaner tool
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os
import sys
import threading
import queue
from datetime import datetime
import csv
import re
import random
import string
import glob

class CSVCleanerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("CSV Cleaner Tool")
        self.root.geometry("800x700")
        self.root.resizable(True, True)
        
        # Variables
        self.input_files = []
        self.output_directory = tk.StringVar()
        self.processing = False
        
        # Queue for thread communication
        self.message_queue = queue.Queue()
        
        self.setup_ui()
        self.check_message_queue()
    
    def setup_ui(self):
        """Set up the user interface"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="CSV Cleaner Tool", 
                               font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Input files section
        input_frame = ttk.LabelFrame(main_frame, text="Input Files", padding="10")
        input_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        input_frame.columnconfigure(0, weight=1)
        
        # File list
        self.file_listbox = tk.Listbox(input_frame, height=6, selectmode=tk.EXTENDED)
        self.file_listbox.grid(row=0, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Scrollbar for listbox
        scrollbar = ttk.Scrollbar(input_frame, orient=tk.VERTICAL, command=self.file_listbox.yview)
        scrollbar.grid(row=0, column=3, sticky=(tk.N, tk.S), pady=(0, 10))
        self.file_listbox.configure(yscrollcommand=scrollbar.set)
        
        # File buttons
        ttk.Button(input_frame, text="Add Files", 
                  command=self.add_files).grid(row=1, column=0, padx=(0, 5))
        ttk.Button(input_frame, text="Add Folder", 
                  command=self.add_folder).grid(row=1, column=1, padx=5)
        ttk.Button(input_frame, text="Remove Selected", 
                  command=self.remove_files).grid(row=1, column=2, padx=(5, 0))
        
        # Output directory section
        output_frame = ttk.LabelFrame(main_frame, text="Output Directory", padding="10")
        output_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        output_frame.columnconfigure(0, weight=1)
        
        ttk.Entry(output_frame, textvariable=self.output_directory, 
                 state="readonly").grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 10))
        ttk.Button(output_frame, text="Browse", 
                  command=self.browse_output_dir).grid(row=0, column=1)
        
        # Options section
        options_frame = ttk.LabelFrame(main_frame, text="Options", padding="10")
        options_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Default status
        self.default_status = tk.StringVar(value="New")
        ttk.Label(options_frame, text="Default Status:").grid(row=0, column=0, sticky=tk.W)
        status_combo = ttk.Combobox(options_frame, textvariable=self.default_status, 
                                   values=["New", "Contacted", "Interested", "Not Interested", "Follow Up"],
                                   width=15)
        status_combo.grid(row=0, column=1, padx=(10, 20))
        
        # Overwrite files option
        self.overwrite_files = tk.BooleanVar(value=False)
        ttk.Checkbutton(options_frame, text="Overwrite existing files", 
                       variable=self.overwrite_files).grid(row=0, column=2, sticky=tk.W)
        
        # Processing section
        process_frame = ttk.Frame(main_frame)
        process_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        process_frame.columnconfigure(0, weight=1)
        
        # Process button
        self.process_button = ttk.Button(process_frame, text="Process Files", 
                                        command=self.process_files, style="Accent.TButton")
        self.process_button.grid(row=0, column=0, pady=(0, 10))
        
        # Progress bar
        self.progress = ttk.Progressbar(process_frame, mode='indeterminate')
        self.progress.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Status label
        self.status_label = ttk.Label(process_frame, text="Ready to process files")
        self.status_label.grid(row=2, column=0)
        
        # Log section
        log_frame = ttk.LabelFrame(main_frame, text="Processing Log", padding="10")
        log_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(5, weight=1)
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, wrap=tk.WORD)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Clear log button
        ttk.Button(log_frame, text="Clear Log", 
                  command=self.clear_log).grid(row=1, column=0, pady=(10, 0))
        
        # Set default output directory
        default_output = os.path.join(os.getcwd(), "Cleaned")
        self.output_directory.set(default_output)
        
        self.log_message("CSV Cleaner Tool initialized")
        self.log_message(f"Default output directory: {default_output}")
    
    def add_files(self):
        """Add individual CSV files"""
        files = filedialog.askopenfilenames(
            title="Select CSV files",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        
        for file in files:
            if file not in self.input_files:
                self.input_files.append(file)
                self.file_listbox.insert(tk.END, os.path.basename(file))
        
        if files:
            self.log_message(f"Added {len(files)} file(s)")
    
    def add_folder(self):
        """Add all CSV files from a folder"""
        folder = filedialog.askdirectory(title="Select folder containing CSV files")
        
        if folder:
            csv_files = glob.glob(os.path.join(folder, "*.csv"))
            added_count = 0
            
            for file in csv_files:
                if file not in self.input_files:
                    self.input_files.append(file)
                    self.file_listbox.insert(tk.END, os.path.basename(file))
                    added_count += 1
            
            if added_count > 0:
                self.log_message(f"Added {added_count} CSV file(s) from folder: {folder}")
            else:
                self.log_message("No new CSV files found in selected folder")
    
    def remove_files(self):
        """Remove selected files from the list"""
        selected_indices = self.file_listbox.curselection()
        
        # Remove in reverse order to maintain indices
        for index in reversed(selected_indices):
            self.file_listbox.delete(index)
            del self.input_files[index]
        
        if selected_indices:
            self.log_message(f"Removed {len(selected_indices)} file(s)")
    
    def browse_output_dir(self):
        """Browse for output directory"""
        directory = filedialog.askdirectory(title="Select output directory")
        if directory:
            self.output_directory.set(directory)
            self.log_message(f"Output directory set to: {directory}")
    
    def clear_log(self):
        """Clear the log text area"""
        self.log_text.delete(1.0, tk.END)
    
    def log_message(self, message):
        """Add a message to the log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted_message = f"[{timestamp}] {message}\n"
        self.log_text.insert(tk.END, formatted_message)
        self.log_text.see(tk.END)
        self.root.update_idletasks()
    
    def check_message_queue(self):
        """Check for messages from worker thread"""
        try:
            while True:
                message = self.message_queue.get_nowait()
                self.log_message(message)
        except queue.Empty:
            pass
        
        # Schedule next check
        self.root.after(100, self.check_message_queue)
    
    def process_files(self):
        """Process the selected files"""
        if self.processing:
            return
        
        # Validate inputs
        if not self.input_files:
            messagebox.showerror("Error", "Please select at least one input file")
            return
        
        if not self.output_directory.get():
            messagebox.showerror("Error", "Please select an output directory")
            return
        
        # Start processing in separate thread
        self.processing = True
        self.process_button.configure(state="disabled", text="Processing...")
        self.progress.start()
        self.status_label.configure(text="Processing files...")
        
        # Start worker thread
        thread = threading.Thread(target=self.process_worker)
        thread.daemon = True
        thread.start()
    
    def process_worker(self):
        """Worker thread for processing files"""
        try:
            output_dir = self.output_directory.get()
            
            # Create output directory if it doesn't exist
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
                self.message_queue.put(f"Created output directory: {output_dir}")
            
            successful = 0
            failed = 0
            
            for i, input_file in enumerate(self.input_files):
                try:
                    # Generate output filename
                    base_name = os.path.splitext(os.path.basename(input_file))[0]
                    output_file = os.path.join(output_dir, f"cleaned_{base_name}.csv")
                    
                    # Check if file exists and overwrite option
                    if os.path.exists(output_file) and not self.overwrite_files.get():
                        self.message_queue.put(f"Skipping {base_name} - output file already exists")
                        continue
                    
                    self.message_queue.put(f"Processing {base_name}...")
                    
                    # Process the file
                    if self.clean_csv_file(input_file, output_file):
                        successful += 1
                        self.message_queue.put(f"✓ Successfully processed {base_name}")
                    else:
                        failed += 1
                        self.message_queue.put(f"✗ Failed to process {base_name}")
                        
                except Exception as e:
                    failed += 1
                    self.message_queue.put(f"✗ Error processing {os.path.basename(input_file)}: {str(e)}")
            
            # Final summary
            self.message_queue.put(f"\nProcessing complete!")
            self.message_queue.put(f"Successful: {successful}, Failed: {failed}")
            
            # Show completion dialog
            self.root.after(0, lambda: self.processing_complete(successful, failed))
            
        except Exception as e:
            self.message_queue.put(f"Fatal error: {str(e)}")
            self.root.after(0, lambda: self.processing_error(str(e)))
    
    def processing_complete(self, successful, failed):
        """Called when processing is complete"""
        self.processing = False
        self.process_button.configure(state="normal", text="Process Files")
        self.progress.stop()
        self.status_label.configure(text="Processing complete")
        
        if failed == 0:
            messagebox.showinfo("Success", f"Successfully processed {successful} file(s)!")
        else:
            messagebox.showwarning("Partial Success", 
                                 f"Processed {successful} file(s) successfully.\n{failed} file(s) failed.")
    
    def processing_error(self, error_msg):
        """Called when a fatal error occurs"""
        self.processing = False
        self.process_button.configure(state="normal", text="Process Files")
        self.progress.stop()
        self.status_label.configure(text="Error occurred")
        messagebox.showerror("Error", f"Processing failed: {error_msg}")
    
    def generate_id(self):
        """Generate a random ID similar to the format in the output file"""
        chars = string.ascii_lowercase + string.digits
        return ''.join(random.choice(chars) for _ in range(7))

    def extract_experience(self, experience_text):
        """Extract experience from text like '5 years 8 months' or empty string"""
        if not experience_text or experience_text.strip() == "":
            return ""
        return experience_text.strip()

    def extract_phone(self, phone_text):
        """Extract phone number, handling tel: prefix"""
        if not phone_text:
            return ""
        # Remove tel: prefix if present
        phone = phone_text.replace("tel:", "").strip()
        # Basic phone number validation/formatting
        phone = re.sub(r'[^\d\-\(\)\s\+]', '', phone)
        return phone.strip()

    def extract_for_sale(self, for_sale_text):
        """Extract for sale count from text"""
        if not for_sale_text or for_sale_text.strip() == "":
            return ""
        try:
            return str(int(for_sale_text))
        except (ValueError, TypeError):
            return ""
    
    def clean_csv_file(self, input_file, output_file):
        """Clean a single CSV file and convert to output format"""
        try:
            with open(input_file, 'r', encoding='utf-8', newline='') as infile:
                reader = csv.reader(infile)
                
                # Skip header row
                header = next(reader, None)
                if not header:
                    self.message_queue.put(f"Error: {os.path.basename(input_file)} is empty")
                    return False
                
                with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
                    writer = csv.writer(outfile)
                    
                    # Write output header
                    output_header = [
                        'REALTOR.COM', 'PROFILE PIC', 'NAME', 'AGENCY', 'Experience:', 
                        'Phone', 'For sale:', 'Sold:', 'Listed a house:', 'Languages:', 
                        'id', 'Notes', 'Status', 'LastContacted', 'FollowUpAt'
                    ]
                    writer.writerow(output_header)
                    
                    processed_count = 0
                    error_count = 0
                    
                    # Process each row
                    for row_num, row in enumerate(reader, start=2):
                        try:
                            # Ensure row has enough columns
                            while len(row) < 18:
                                row.append("")
                            
                            # Extract data from input columns
                            realtor_url = row[0] if len(row) > 0 else ""
                            profile_pic = row[1] if len(row) > 1 else ""
                            name = row[2] if len(row) > 2 else ""
                            agency = row[3] if len(row) > 3 else ""
                            experience = self.extract_experience(row[5] if len(row) > 5 else "")
                            phone = self.extract_phone(row[7] if len(row) > 7 else "")
                            for_sale = self.extract_for_sale(row[9] if len(row) > 9 else "")
                            sold = ""  # Not available in input
                            listed_date = row[11] if len(row) > 11 else ""
                            languages = ""  # Not available in input
                            record_id = self.generate_id()
                            notes = ""  # Empty by default
                            status = self.default_status.get()  # Use selected default status
                            last_contacted = ""  # Empty by default
                            follow_up_at = ""  # Empty by default
                            
                            # Write output row
                            output_row = [
                                realtor_url, profile_pic, name, agency, experience,
                                phone, for_sale, sold, listed_date, languages,
                                record_id, notes, status, last_contacted, follow_up_at
                            ]
                            writer.writerow(output_row)
                            processed_count += 1
                            
                        except Exception as e:
                            error_count += 1
                            continue
            
            self.message_queue.put(f"  Processed: {processed_count} rows, Errors: {error_count} rows")
            return True
            
        except Exception as e:
            self.message_queue.put(f"Error processing {os.path.basename(input_file)}: {str(e)}")
            return False

def main():
    """Main function to start the GUI application"""
    root = tk.Tk()
    
    # Set up style
    style = ttk.Style()
    
    # Try to use a modern theme
    try:
        style.theme_use('clam')  # Modern looking theme
    except:
        pass  # Fall back to default theme
    
    # Create and run the application
    app = CSVCleanerGUI(root)
    
    # Center the window
    root.update_idletasks()
    width = root.winfo_width()
    height = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (width // 2)
    y = (root.winfo_screenheight() // 2) - (height // 2)
    root.geometry(f"{width}x{height}+{x}+{y}")
    
    root.mainloop()

if __name__ == "__main__":
    main()
