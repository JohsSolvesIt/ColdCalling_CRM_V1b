#!/usr/bin/env python3
"""
CSV Cleaner Tool - Batch Processing Version
Converts realtor data from input format to standardized output format
Supports batch processing of multiple files
"""

import csv
import sys
import os
import re
import glob
from datetime import datetime
import random
import string
import configparser

class CSVCleaner:
    def __init__(self, config_file='config.ini'):
        """Initialize the CSV cleaner with configuration"""
        self.config = configparser.ConfigParser()
        self.load_config(config_file)
        
    def load_config(self, config_file):
        """Load configuration from file"""
        if os.path.exists(config_file):
            self.config.read(config_file)
        else:
            # Set default configuration if file doesn't exist
            self.set_default_config()
            
    def auto_detect_columns(self, sample_rows):
        """Auto-detect column positions based on data patterns"""
        if len(sample_rows) < 2:
            return None
            
        # Skip header row, analyze multiple data rows for better detection
        data_rows = sample_rows[1:] if len(sample_rows) > 1 else sample_rows
        
        detected = {}
        
        # Vote-based detection: collect votes from multiple rows
        votes = {}
        
        for row_idx, data_row in enumerate(data_rows):
            for i, cell in enumerate(data_row):
                cell_str = str(cell).strip()
                
                # Detect realtor URL column
                if 'realtor.com/realestateagents' in cell_str:
                    votes.setdefault('REALTOR_URL_COL', {}).setdefault(str(i), 0)
                    votes['REALTOR_URL_COL'][str(i)] += 1
                
                # Detect profile pic column (image URLs) - prioritize earlier columns
                if cell_str.startswith('http') and any(ext in cell_str for ext in ['.jpg', '.png', '.webp', '.jpeg']):
                    # Prioritize columns 1-3 for profile pics
                    weight = 3 if i <= 3 else 1
                    votes.setdefault('PROFILE_PIC_COL', {}).setdefault(str(i), 0)
                    votes['PROFILE_PIC_COL'][str(i)] += weight
                
                # Detect phone column - look for phone patterns, prioritize proper formats
                if (not cell_str.startswith('http') and 
                    not re.match(r'^\d{4}-\d{2}-\d{2}$', cell_str) and  # Exclude dates
                    re.search(r'(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|tel:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})', cell_str)):
                    # Weight proper phone formats more heavily
                    if re.search(r'\(\d{3}\)\s?\d{3}-\d{4}', cell_str):
                        weight = 5  # Highest priority for (xxx) xxx-xxxx format
                    elif cell_str.startswith('tel:'):
                        weight = 2  # Lower priority for tel: duplicates
                    else:
                        weight = 1  # Lowest for other patterns
                    
                    votes.setdefault('PHONE_COL', {}).setdefault(str(i), 0)
                    votes['PHONE_COL'][str(i)] += weight
                
                # Detect experience column (patterns like "X years Y months")
                if re.search(r'\d+\s+years?(\s+\d+\s+months?)?', cell_str, re.IGNORECASE):
                    votes.setdefault('EXPERIENCE_VALUE_COL', {}).setdefault(str(i), 0)
                    votes['EXPERIENCE_VALUE_COL'][str(i)] += 1
                
                # Detect date column (patterns like YYYY-MM-DD) - look for dates after "Listed a house:"
                if re.match(r'^\d{4}-\d{2}-\d{2}$', cell_str):
                    # Check if there's a "Listed a house:" in nearby columns
                    weight = 1
                    for j in range(max(0, i-5), i):  # Check 5 columns back
                        if j < len(data_row) and 'listed a house' in str(data_row[j]).lower():
                            weight = 5  # High priority if found after "Listed a house:"
                            break
                    
                    votes.setdefault('LISTED_DATE_COL', {}).setdefault(str(i), 0)
                    votes['LISTED_DATE_COL'][str(i)] += weight
                
                # Detect sold column - look for numbers after "Sold:" text
                if cell_str.isdigit() and int(cell_str) < 10000:  # Reasonable range
                    # Check if there's a "Sold:" in nearby columns
                    for j in range(max(0, i-3), i):  # Check 3 columns back
                        if j < len(data_row) and 'sold' in str(data_row[j]).lower() and str(data_row[j]).lower().strip().endswith(':'):
                            votes.setdefault('SOLD_COL', {}).setdefault(str(i), 0)
                            votes['SOLD_COL'][str(i)] += 2  # Higher weight for explicit "Sold:" match
                            break
                
                # Detect for sale column - look for numbers after "For sale:" text
                if cell_str.isdigit() and int(cell_str) < 1000:  # Reasonable range for listings
                    # Check if there's a "For sale:" in nearby columns
                    for j in range(max(0, i-3), i):  # Check 3 columns back
                        if j < len(data_row) and 'for sale' in str(data_row[j]).lower():
                            votes.setdefault('FOR_SALE_COL', {}).setdefault(str(i), 0)
                            votes['FOR_SALE_COL'][str(i)] += 2  # Higher weight for explicit "For sale:" match
                            break
        
        # Select the column with the most votes for each type
        for col_type, col_votes in votes.items():
            if col_votes:
                # Get the column with the highest vote count
                best_col = max(col_votes.items(), key=lambda x: x[1])
                detected[col_type] = best_col[0]
        
        return detected

    def set_default_config(self):
        """Set default configuration values"""
        self.config['COLUMN_MAPPING'] = {
            'REALTOR_URL_COL': '0',
            'PROFILE_PIC_COL': '1', 
            'NAME_COL': '2',
            'AGENCY_COL': '3',
            'EXPERIENCE_VALUE_COL': '5',
            'PHONE_COL': '8',  # Updated from 7 to 8 for Portland format
            'FOR_SALE_COL': '10',  # Updated from 9 to 10 for Portland format
            'SOLD_COL': '12',  # New: for sold properties count
            'LISTED_DATE_COL': '14'  # Updated for actual date column
        }
        self.config['OUTPUT_SETTINGS'] = {
            'DEFAULT_STATUS': 'New',
            'DEFAULT_NOTES': '',
            'DEFAULT_SOLD': '',
            'DEFAULT_LANGUAGES': '',
            'DEFAULT_LAST_CONTACTED': '',
            'DEFAULT_FOLLOW_UP_AT': ''
        }
        self.config['OUTPUT_COLUMNS'] = {
            'HEADERS': 'REALTOR.COM,PROFILE PIC,NAME,AGENCY,Experience:,Phone,For sale:,Sold:,Listed a house:,Languages:,id,Notes,Status,LastContacted,FollowUpAt'
        }
    
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
            print(f"Error: Input file '{input_file}' not found.")
            return False
        
        try:
            # First pass: read more rows to auto-detect columns
            sample_rows = []
            with open(input_file, 'r', encoding='utf-8', newline='') as infile:
                reader = csv.reader(infile)
                for i, row in enumerate(reader):
                    sample_rows.append(row)
                    if i >= 5:  # Read header + 5 data rows for better analysis
                        break
            
            # Auto-detect column positions
            detected_cols = self.auto_detect_columns(sample_rows)
            
            # Get column mappings from config, use detected values if available
            mapping = self.config['COLUMN_MAPPING']
            output_settings = self.config['OUTPUT_SETTINGS']
            
            # Use detected columns if available, otherwise fall back to config
            realtor_col = int(detected_cols.get('REALTOR_URL_COL', mapping.get('REALTOR_URL_COL', 0)))
            pic_col = int(detected_cols.get('PROFILE_PIC_COL', mapping.get('PROFILE_PIC_COL', 1)))
            name_col = int(mapping.get('NAME_COL', 2))
            agency_col = int(mapping.get('AGENCY_COL', 3))
            exp_col = int(detected_cols.get('EXPERIENCE_VALUE_COL', mapping.get('EXPERIENCE_VALUE_COL', 5)))
            phone_col = int(detected_cols.get('PHONE_COL', mapping.get('PHONE_COL', 8)))
            sale_col = int(detected_cols.get('FOR_SALE_COL', mapping.get('FOR_SALE_COL', 10)))
            sold_col = int(detected_cols.get('SOLD_COL', mapping.get('SOLD_COL', 12)))
            listed_col = int(detected_cols.get('LISTED_DATE_COL', mapping.get('LISTED_DATE_COL', 14)))
            
            print(f"Using columns: phone={phone_col}, realtor={realtor_col}, pic={pic_col}, exp={exp_col}, sale={sale_col}, sold={sold_col}, listed={listed_col}")
            
            with open(input_file, 'r', encoding='utf-8', newline='') as infile:
                reader = csv.reader(infile)
                
                # Skip header row
                header = next(reader, None)
                if not header:
                    print("Error: Input file is empty.")
                    return False
                
                with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
                    writer = csv.writer(outfile)
                    
                    # Write output header
                    output_header = self.config['OUTPUT_COLUMNS']['HEADERS'].split(',')
                    writer.writerow(output_header)
                    
                    processed_count = 0
                    error_count = 0
                    
                    # Process each row
                    for row_num, row in enumerate(reader, start=2):
                        try:
                            # Ensure row has enough columns
                            while len(row) < max(realtor_col, pic_col, name_col, agency_col, 
                                               exp_col, phone_col, sale_col, sold_col, listed_col) + 1:
                                row.append("")
                            
                            # Extract data from input columns
                            realtor_url = row[realtor_col] if len(row) > realtor_col else ""
                            profile_pic = row[pic_col] if len(row) > pic_col else ""
                            name = row[name_col] if len(row) > name_col else ""
                            agency = row[agency_col] if len(row) > agency_col else ""
                            experience = self.extract_experience(row[exp_col] if len(row) > exp_col else "")
                            phone = self.extract_phone(row[phone_col] if len(row) > phone_col else "")
                            for_sale = self.extract_for_sale(row[sale_col] if len(row) > sale_col else "")
                            sold = self.extract_for_sale(row[sold_col] if len(row) > sold_col else "")  # Use same extraction logic
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
                            print(f"Warning: Error processing row {row_num}: {e}")
                            error_count += 1
                            continue
            
            print(f"Successfully converted '{input_file}' to '{output_file}'")
            print(f"Processed: {processed_count} rows, Errors: {error_count} rows")
            return True
            
        except Exception as e:
            print(f"Error processing file '{input_file}': {e}")
            return False

    def batch_process(self, input_pattern, output_dir):
        """Process multiple files matching the input pattern"""
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Find all files matching the pattern
        input_files = glob.glob(input_pattern)
        
        if not input_files:
            print(f"No files found matching pattern: {input_pattern}")
            return False
        
        print(f"Found {len(input_files)} files to process:")
        for file in input_files:
            print(f"  - {file}")
        
        successful = 0
        failed = 0
        
        for input_file in input_files:
            # Generate output filename
            base_name = os.path.splitext(os.path.basename(input_file))[0]
            output_file = os.path.join(output_dir, f"cleaned_{base_name}.csv")
            
            print(f"\nProcessing: {input_file}")
            if self.clean_csv(input_file, output_file):
                successful += 1
            else:
                failed += 1
        
        print(f"\nBatch processing complete:")
        print(f"  Successful: {successful}")
        print(f"  Failed: {failed}")
        
        return failed == 0

def print_usage():
    """Print usage instructions"""
    print("CSV Cleaner Tool - Converts realtor CSV files to standardized format")
    print("\nUsage:")
    print("  Single file: python csv_cleaner_batch.py <input_file> <output_file>")
    print("  Batch mode:  python csv_cleaner_batch.py --batch <input_pattern> <output_dir>")
    print("\nExamples:")
    print("  python csv_cleaner_batch.py csv/realtors-me-04401.csv Cleaned/output.csv")
    print("  python csv_cleaner_batch.py --batch 'csv/realtors-*.csv' Cleaned/")
    print("  python csv_cleaner_batch.py --batch 'csv/*.csv' Cleaned/")

def main():
    """Main function to handle command line arguments"""
    
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    
    cleaner = CSVCleaner()
    
    if sys.argv[1] == "--batch":
        if len(sys.argv) != 4:
            print("Error: Batch mode requires input pattern and output directory")
            print_usage()
            sys.exit(1)
        
        input_pattern = sys.argv[2]
        output_dir = sys.argv[3]
        success = cleaner.batch_process(input_pattern, output_dir)
        
    elif sys.argv[1] in ["-h", "--help", "help"]:
        print_usage()
        sys.exit(0)
        
    else:
        if len(sys.argv) != 3:
            print("Error: Single file mode requires input file and output file")
            print_usage()
            sys.exit(1)
        
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        success = cleaner.clean_csv(input_file, output_file)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
