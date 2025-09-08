#!/usr/bin/env python3
"""
CSV Cleaner Tool
Converts realtor data from input format to standardized output format
"""

import csv
import sys
import os
import re
from datetime import datetime
import random
import string

def generate_id():
    """Generate a random ID similar to the format in the output file"""
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(7))

def extract_experience(experience_text):
    """Extract experience from text like '5 years 8 months' or empty string"""
    if not experience_text or experience_text.strip() == "":
        return ""
    return experience_text.strip()

def extract_phone(phone_text):
    """Extract phone number, handling tel: prefix"""
    if not phone_text:
        return ""
    # Remove tel: prefix if present
    phone = phone_text.replace("tel:", "").strip()
    # Basic phone number validation/formatting
    phone = re.sub(r'[^\d\-\(\)\s\+]', '', phone)
    return phone.strip()

def extract_for_sale(for_sale_text):
    """Extract for sale count from text"""
    if not for_sale_text or for_sale_text.strip() == "":
        return ""
    try:
        return str(int(for_sale_text))
    except (ValueError, TypeError):
        return ""

def clean_csv(input_file, output_file):
    """
    Clean the CSV file and convert to output format
    
    Column mapping from input to output:
    Input -> Output
    0 (URL) -> REALTOR.COM
    1 (Profile pic) -> PROFILE PIC  
    2 (Name) -> NAME
    3 (Agency) -> AGENCY
    5 (Experience value) -> Experience:
    7 (Phone) -> Phone
    9 (For sale count) -> For sale:
    - -> Sold: (empty)
    11 (Listed date) -> Listed a house:
    - -> Languages: (empty)
    generated -> id
    - -> Notes (empty)
    - -> Status (default: "New")
    - -> LastContacted (empty)
    - -> FollowUpAt (empty)
    """
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        return False
    
    try:
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
                output_header = [
                    'REALTOR.COM', 'PROFILE PIC', 'NAME', 'AGENCY', 'Experience:', 
                    'Phone', 'For sale:', 'Sold:', 'Listed a house:', 'Languages:', 
                    'id', 'Notes', 'Status', 'LastContacted', 'FollowUpAt'
                ]
                writer.writerow(output_header)
                
                # Process each row
                for row_num, row in enumerate(reader, start=2):  # Start at 2 since we skipped header
                    try:
                        # Ensure row has enough columns
                        while len(row) < 18:
                            row.append("")
                        
                        # Extract data from input columns
                        realtor_url = row[0] if len(row) > 0 else ""
                        profile_pic = row[1] if len(row) > 1 else ""
                        name = row[2] if len(row) > 2 else ""
                        agency = row[3] if len(row) > 3 else ""
                        experience = extract_experience(row[5] if len(row) > 5 else "")
                        phone = extract_phone(row[7] if len(row) > 7 else "")
                        for_sale = extract_for_sale(row[9] if len(row) > 9 else "")
                        sold = ""  # Not available in input
                        listed_date = row[11] if len(row) > 11 else ""
                        languages = ""  # Not available in input
                        record_id = generate_id()
                        notes = ""  # Empty by default
                        status = "New"  # Default status
                        last_contacted = ""  # Empty by default
                        follow_up_at = ""  # Empty by default
                        
                        # Write output row
                        output_row = [
                            realtor_url, profile_pic, name, agency, experience,
                            phone, for_sale, sold, listed_date, languages,
                            record_id, notes, status, last_contacted, follow_up_at
                        ]
                        writer.writerow(output_row)
                        
                    except Exception as e:
                        print(f"Warning: Error processing row {row_num}: {e}")
                        continue
        
        print(f"Successfully converted '{input_file}' to '{output_file}'")
        return True
        
    except Exception as e:
        print(f"Error processing file: {e}")
        return False

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) != 3:
        print("Usage: python csv_cleaner.py <input_file> <output_file>")
        print("Example: python csv_cleaner.py csv/realtors-me-04401.csv Cleaned/output.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    success = clean_csv(input_file, output_file)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
