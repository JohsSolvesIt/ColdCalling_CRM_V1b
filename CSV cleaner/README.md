# CSV Cleaner Tool

A Python tool to convert realtor CSV files from web-scraped format to a standardized CRM format.

## Features

- **Single file processing**: Convert one CSV file at a time
- **Batch processing**: Convert multiple CSV files at once
- **Configurable column mapping**: Easily adjust which input columns map to which output columns
- **Error handling**: Continues processing even if some rows have errors
- **Automatic ID generation**: Creates unique IDs for each record

## Files

- `csv_cleaner.py` - Basic single-file processing script
- `csv_cleaner_batch.py` - Enhanced version with batch processing capabilities
- `config.ini` - Configuration file for column mappings and default values

## Usage

### Single File Processing

```bash
python3 csv_cleaner_batch.py input_file.csv output_file.csv
```

Example:
```bash
python3 csv_cleaner_batch.py csv/realtors-me-04401.csv Cleaned/output.csv
```

### Batch Processing

```bash
python3 csv_cleaner_batch.py --batch "input_pattern" output_directory
```

Examples:
```bash
# Process all realtor CSV files
python3 csv_cleaner_batch.py --batch "csv/realtors-*.csv" Cleaned/

# Process all CSV files in csv directory
python3 csv_cleaner_batch.py --batch "csv/*.csv" Cleaned/
```

### Help

```bash
python3 csv_cleaner_batch.py --help
```

## Input Format

The tool expects CSV files with the following structure (column positions are configurable):

- Column 0: Realtor profile URL
- Column 1: Profile picture URL  
- Column 2: Name
- Column 3: Agency
- Column 5: Experience (e.g., "5 years 8 months")
- Column 7: Phone number
- Column 9: For sale count
- Column 11: Listed date or activity range

## Output Format

The tool generates CSV files with these columns:

- REALTOR.COM
- PROFILE PIC  
- NAME
- AGENCY
- Experience:
- Phone
- For sale:
- Sold:
- Listed a house:
- Languages:
- id
- Notes
- Status
- LastContacted
- FollowUpAt

## Configuration

Edit `config.ini` to customize:

- **Column mappings**: Which input columns map to which output fields
- **Default values**: Default values for Status, Notes, etc.
- **Output headers**: Customize the output column names

## Requirements

- Python 3.x
- Standard library only (no external dependencies)

## Directory Structure

```
CSV cleaner/
├── csv/                    # Input CSV files
│   ├── realtors-me-04401.csv
│   └── Realtors-me-portland.csv
├── Cleaned/               # Output CSV files
│   ├── cleaned_realtors-me-04401.csv
│   └── cleaned_Realtors-me-portland.csv
├── csv_cleaner.py         # Basic script
├── csv_cleaner_batch.py   # Enhanced batch script
├── config.ini            # Configuration file
└── README.md             # This file
```

## Example Conversion

**Input row:**
```
"https://www.realtor.com/realestateagents/5e296c4838de33001359fb61","https://ap.rdcpix.com/82c14390c9a9be57e69fa521e13e4f1aa-e3418634570rd-w260_h260.webp","Douglas Burpee","Two Rivers Realty, LLC","Experience:","5 years 8 months","...","(207) 469-9930","For sale:","8","Listed a house:","2025-08-11",...
```

**Output row:**
```
https://www.realtor.com/realestateagents/5e296c4838de33001359fb61,https://ap.rdcpix.com/82c14390c9a9be57e69fa521e13e4f1aa-e3418634570rd-w260_h260.webp,Douglas Burpee,"Two Rivers Realty, LLC",5 years 8 months,(207) 469-9930,8,,2025-08-11,,e7ij8p8,,New,,
```
