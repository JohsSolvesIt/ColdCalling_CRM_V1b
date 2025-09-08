#!/usr/bin/env python3
"""
CSV Cleaner GUI
A simple but comprehensive graphical interface for the CSV cleaner tool
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os
import threading
import glob
from datetime import datetime
import configparser

# Import the cleaning functions from the original script
import csv
import re
import random
import string

class CSVCleanerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("CSV Cleaner Tool")
        self.root.geometry("800x700")
        self.root.minsize(600, 500)
        
        # Variables
        self.input_files = []
        self.output_dir = tk.StringVar(value="Cleaned/")
        self.processing = False
        
        # Load configuration
        self.load_config()
        
        # Create GUI
        self.create_widgets()
        
        # Center the window
        self.center_window()
    
    def load_config(self):
        """Load configuration from config.ini if it exists"""
        self.config = configparser.ConfigParser()
        config_file = 'config.ini'
        
        if os.path.exists(config_file):
            self.config.read(config_file)
        else:
            # Set default configuration
            self.set_default_config()
    
    def set_default_config(self):
        """Set default configuration values"""
        self.config['COLUMN_MAPPING'] = {
            'REALTOR_URL_COL': '0',
            'PROFILE_PIC_COL': '1', 
            'NAME_COL': '2',
            'AGENCY_COL': '3',
            'EXPERIENCE_VALUE_COL': '5',
            'PHONE_COL': '7',
            'FOR_SALE_COL': '9',
            'LISTED_DATE_COL': '11'
        }
        self.config['OUTPUT_SETTINGS'] = {
            'DEFAULT_STATUS': 'New',
            'DEFAULT_NOTES': '',
            'DEFAULT_SOLD': '',
            'DEFAULT_LANGUAGES': '',
            'DEFAULT_LAST_CONTACTED': '',
            'DEFAULT_FOLLOW_UP_AT': ''
        }
    
    def center_window(self):
        """Center the window on the screen"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')
    
    def create_widgets(self):
        """Create and layout all GUI widgets"""
        
        # Main container with padding
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="CSV Cleaner Tool", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Description
        desc_label = ttk.Label(main_frame, 
                              text="Convert realtor CSV files to standardized CRM format",
                              font=('Arial', 10))
        desc_label.grid(row=1, column=0, columnspan=3, pady=(0, 20))
        
        # Input files section
        input_frame = ttk.LabelFrame(main_frame, text="Input Files", padding="10")
        input_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        input_frame.columnconfigure(0, weight=1)
        
        # File list
        self.file_listbox = tk.Listbox(input_frame, height=6, selectmode=tk.EXTENDED)
        self.file_listbox.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Scrollbar for file list
        scrollbar = ttk.Scrollbar(input_frame, orient=tk.VERTICAL, command=self.file_listbox.yview)
        scrollbar.grid(row=0, column=2, sticky=(tk.N, tk.S))
        self.file_listbox.configure(yscrollcommand=scrollbar.set)
        
        # File buttons
        file_buttons_frame = ttk.Frame(input_frame)
        file_buttons_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E))
        
        ttk.Button(file_buttons_frame, text="Add Files", 
                  command=self.add_files).grid(row=0, column=0, padx=(0, 5))
        ttk.Button(file_buttons_frame, text="Add Folder", 
                  command=self.add_folder).grid(row=0, column=1, padx=5)
        ttk.Button(file_buttons_frame, text="Remove Selected", 
                  command=self.remove_files).grid(row=0, column=2, padx=5)
        ttk.Button(file_buttons_frame, text="Clear All", 
                  command=self.clear_files).grid(row=0, column=3, padx=(5, 0))
        
        # Output directory section
        output_frame = ttk.LabelFrame(main_frame, text="Output Directory", padding="10")
        output_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        output_frame.columnconfigure(0, weight=1)
        
        ttk.Entry(output_frame, textvariable=self.output_dir, 
                 width=50).grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 10))
        ttk.Button(output_frame, text="Browse", 
                  command=self.browse_output_dir).grid(row=0, column=1)
        
        # Options section
        options_frame = ttk.LabelFrame(main_frame, text="Options", padding="10")
        options_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Checkbox options
        self.create_subdir = tk.BooleanVar(value=True)
        self.overwrite_files = tk.BooleanVar(value=False)
        self.add_timestamp = tk.BooleanVar(value=True)
        
        ttk.Checkbutton(options_frame, text="Create subdirectory with timestamp", 
                       variable=self.create_subdir).grid(row=0, column=0, sticky=tk.W)
        ttk.Checkbutton(options_frame, text="Overwrite existing files", 
                       variable=self.overwrite_files).grid(row=1, column=0, sticky=tk.W)
        ttk.Checkbutton(options_frame, text="Add timestamp to output filenames", 
                       variable=self.add_timestamp).grid(row=2, column=0, sticky=tk.W)
        
        # Processing section
        process_frame = ttk.LabelFrame(main_frame, text="Processing", padding="10")
        process_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        process_frame.columnconfigure(0, weight=1)
        
        # Progress bar
        self.progress = ttk.Progressbar(process_frame, mode='determinate')
        self.progress.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Status label
        self.status_label = ttk.Label(process_frame, text="Ready to process files")
        self.status_label.grid(row=1, column=0, columnspan=2, sticky=tk.W)
        
        # Process button
        self.process_button = ttk.Button(process_frame, text="Process Files", 
                                        command=self.start_processing)
        self.process_button.grid(row=2, column=0, pady=(10, 0))
        
        # Stop button
        self.stop_button = ttk.Button(process_frame, text="Stop", 
                                     command=self.stop_processing, 
                                     state=tk.DISABLED)
        self.stop_button.grid(row=2, column=1, padx=(10, 0), pady=(10, 0))
        
        # Log section
        log_frame = ttk.LabelFrame(main_frame, text="Processing Log", padding="10")
        log_frame.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(6, weight=1)
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, width=80)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Clear log button
        ttk.Button(log_frame, text="Clear Log", 
                  command=self.clear_log).grid(row=1, column=0, pady=(5, 0))
        
        # Menu
        self.create_menu()
        
        # Initial log message
        self.log_message("CSV Cleaner Tool ready. Add input files and click 'Process Files' to begin.")
    
    def create_menu(self):
        """Create the application menu"""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)
        
        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(label="Add Files...", command=self.add_files)
        file_menu.add_command(label="Add Folder...", command=self.add_folder)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)
        
        # Tools menu
        tools_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Tools", menu=tools_menu)
        tools_menu.add_command(label="Configuration...", command=self.show_config)
        tools_menu.add_command(label="Column Mapping...", command=self.show_column_mapping)
        
        # Help menu
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="About", command=self.show_about)
    
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
        self.log_message(f"Added {len(files)} file(s)")
    
    def add_folder(self):
        """Add all CSV files from a folder"""
        folder = filedialog.askdirectory(title="Select folder containing CSV files")
        if folder:
            csv_files = glob.glob(os.path.join(folder, "*.csv"))
            added = 0
            for file in csv_files:
                if file not in self.input_files:
                    self.input_files.append(file)
                    self.file_listbox.insert(tk.END, os.path.basename(file))
                    added += 1
            self.log_message(f"Added {added} CSV file(s) from folder: {folder}")
    
    def remove_files(self):
        """Remove selected files from the list"""
        selected = self.file_listbox.curselection()
        for index in reversed(selected):  # Remove from end to start
            self.file_listbox.delete(index)
            del self.input_files[index]
        self.log_message(f"Removed {len(selected)} file(s)")
    
    def clear_files(self):
        """Clear all files from the list"""
        count = len(self.input_files)
        self.file_listbox.delete(0, tk.END)
        self.input_files.clear()
        self.log_message(f"Cleared {count} file(s)")
    
    def browse_output_dir(self):
        """Browse for output directory"""
        directory = filedialog.askdirectory(title="Select output directory")
        if directory:
            self.output_dir.set(directory)
    
    def log_message(self, message):
        """Add a message to the log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()
    
    def clear_log(self):
        """Clear the log"""
        self.log_text.delete(1.0, tk.END)
    
    def start_processing(self):
        """Start processing files in a separate thread"""
        if not self.input_files:
            messagebox.showwarning("No Files", "Please add at least one CSV file to process.")
            return
        
        if not self.output_dir.get():
            messagebox.showwarning("No Output Directory", "Please specify an output directory.")
            return
        
        self.processing = True
        self.process_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        
        # Start processing in a separate thread
        self.process_thread = threading.Thread(target=self.process_files)
        self.process_thread.daemon = True
        self.process_thread.start()
    
    def stop_processing(self):
        """Stop processing"""
        self.processing = False
        self.log_message("Stopping processing...")
    
    def process_files(self):
        """Process all files"""
        try:
            output_base = self.output_dir.get()
            
            # Create subdirectory with timestamp if option is selected
            if self.create_subdir.get():
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_base = os.path.join(output_base, f"cleaned_{timestamp}")
            
            # Create output directory if it doesn't exist
            os.makedirs(output_base, exist_ok=True)
            
            total_files = len(self.input_files)
            self.progress['maximum'] = total_files
            self.progress['value'] = 0
            
            successful = 0
            failed = 0
            
            for i, input_file in enumerate(self.input_files):
                if not self.processing:
                    break
                
                try:
                    # Generate output filename
                    base_name = os.path.splitext(os.path.basename(input_file))[0]
                    
                    if self.add_timestamp.get():
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        output_filename = f"cleaned_{base_name}_{timestamp}.csv"
                    else:
                        output_filename = f"cleaned_{base_name}.csv"
                    
                    output_file = os.path.join(output_base, output_filename)
                    
                    # Check if file exists and overwrite option
                    if os.path.exists(output_file) and not self.overwrite_files.get():
                        self.log_message(f"Skipping {base_name} - file exists and overwrite is disabled")
                        continue
                    
                    self.status_label.config(text=f"Processing: {os.path.basename(input_file)}")
                    self.log_message(f"Processing: {input_file}")
                    
                    # Process the file
                    if self.clean_csv(input_file, output_file):
                        successful += 1
                        self.log_message(f"Successfully converted: {output_filename}")
                    else:
                        failed += 1
                        self.log_message(f"Failed to convert: {os.path.basename(input_file)}")
                
                except Exception as e:
                    failed += 1
                    self.log_message(f"Error processing {os.path.basename(input_file)}: {str(e)}")
                
                # Update progress
                self.progress['value'] = i + 1
                self.root.update_idletasks()
            
            # Final status
            if self.processing:
                self.status_label.config(text=f"Complete: {successful} successful, {failed} failed")
                self.log_message(f"Processing complete: {successful} successful, {failed} failed")
                self.log_message(f"Output directory: {output_base}")
                
                if successful > 0:
                    messagebox.showinfo("Processing Complete", 
                                      f"Successfully processed {successful} file(s).\n"
                                      f"Output directory: {output_base}")
            else:
                self.status_label.config(text="Processing stopped by user")
                self.log_message("Processing stopped by user")
        
        except Exception as e:
            self.log_message(f"Error during processing: {str(e)}")
            messagebox.showerror("Processing Error", f"An error occurred: {str(e)}")
        
        finally:
            self.processing = False
            self.process_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
    
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
    
    def clean_csv(self, input_file, output_file):
        """Clean a single CSV file and convert to output format"""
        
        if not os.path.exists(input_file):
            self.log_message(f"Error: Input file '{input_file}' not found.")
            return False
        
        try:
            # Get column mappings from config
            mapping = self.config['COLUMN_MAPPING']
            output_settings = self.config['OUTPUT_SETTINGS']
            
            realtor_col = int(mapping.get('REALTOR_URL_COL', 0))
            pic_col = int(mapping.get('PROFILE_PIC_COL', 1))
            name_col = int(mapping.get('NAME_COL', 2))
            agency_col = int(mapping.get('AGENCY_COL', 3))
            exp_col = int(mapping.get('EXPERIENCE_VALUE_COL', 5))
            phone_col = int(mapping.get('PHONE_COL', 7))
            sale_col = int(mapping.get('FOR_SALE_COL', 9))
            listed_col = int(mapping.get('LISTED_DATE_COL', 11))
            
            with open(input_file, 'r', encoding='utf-8', newline='') as infile:
                reader = csv.reader(infile)
                
                # Skip header row
                header = next(reader, None)
                if not header:
                    self.log_message("Error: Input file is empty.")
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
                        if not self.processing:
                            break
                            
                        try:
                            # Ensure row has enough columns
                            max_col = max(realtor_col, pic_col, name_col, agency_col, 
                                         exp_col, phone_col, sale_col, listed_col)
                            while len(row) < max_col + 1:
                                row.append("")
                            
                            # Extract data from input columns
                            realtor_url = row[realtor_col] if len(row) > realtor_col else ""
                            profile_pic = row[pic_col] if len(row) > pic_col else ""
                            name = row[name_col] if len(row) > name_col else ""
                            agency = row[agency_col] if len(row) > agency_col else ""
                            experience = self.extract_experience(row[exp_col] if len(row) > exp_col else "")
                            phone = self.extract_phone(row[phone_col] if len(row) > phone_col else "")
                            for_sale = self.extract_for_sale(row[sale_col] if len(row) > sale_col else "")
                            sold = output_settings.get('DEFAULT_SOLD', '')
                            listed_date = row[listed_col] if len(row) > listed_col else ""
                            languages = output_settings.get('DEFAULT_LANGUAGES', '')
                            record_id = self.generate_id()
                            notes = output_settings.get('DEFAULT_NOTES', '')
                            status = output_settings.get('DEFAULT_STATUS', 'New')
                            last_contacted = output_settings.get('DEFAULT_LAST_CONTACTED', '')
                            follow_up_at = output_settings.get('DEFAULT_FOLLOW_UP_AT', '')
                            
                            # Write output row
                            output_row = [
                                realtor_url, profile_pic, name, agency, experience,
                                phone, for_sale, sold, listed_date, languages,
                                record_id, notes, status, last_contacted, follow_up_at
                            ]
                            writer.writerow(output_row)
                            processed_count += 1
                            
                        except Exception as e:
                            self.log_message(f"Warning: Error processing row {row_num}: {e}")
                            error_count += 1
                            continue
            
            self.log_message(f"Processed: {processed_count} rows, Errors: {error_count} rows")
            return True
            
        except Exception as e:
            self.log_message(f"Error processing file '{input_file}': {e}")
            return False
    
    def show_config(self):
        """Show configuration dialog"""
        messagebox.showinfo("Configuration", 
                           "Configuration can be edited in the config.ini file.\n"
                           "Restart the application after making changes.")
    
    def show_column_mapping(self):
        """Show column mapping information"""
        mapping_info = """Column Mapping (0-based indices):

Input Column → Output Field
0 → REALTOR.COM (Profile URL)
1 → PROFILE PIC (Profile picture URL)
2 → NAME (Realtor name)
3 → AGENCY (Agency name)
5 → Experience: (Years of experience)
7 → Phone (Phone number)
9 → For sale: (Number of listings)
11 → Listed a house: (Last listing date)

Other fields are auto-generated or set to defaults."""
        
        messagebox.showinfo("Column Mapping", mapping_info)
    
    def show_about(self):
        """Show about dialog"""
        about_text = """CSV Cleaner Tool v1.0

A comprehensive tool for converting realtor CSV files 
from web-scraped format to standardized CRM format.

Features:
• Single file and batch processing
• Configurable column mapping
• Progress tracking and logging
• Error handling and recovery

Created for ColdCalling CRM system."""
        
        messagebox.showinfo("About", about_text)

def main():
    """Main function to run the GUI"""
    root = tk.Tk()
    app = CSVCleanerGUI(root)
    
    # Set up proper cleanup
    def on_closing():
        if app.processing:
            if messagebox.askokcancel("Quit", "Processing is in progress. Do you want to quit?"):
                app.processing = False
                root.destroy()
        else:
            root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    
    # Start the GUI
    root.mainloop()

if __name__ == "__main__":
    main()
