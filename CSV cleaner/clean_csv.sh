#!/bin/bash

# CSV Cleaner Tool - Convenience Script
# Usage: ./clean_csv.sh [single|batch] [args...]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/csv_cleaner_batch.py"

# Check if Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "Error: $PYTHON_SCRIPT not found"
    exit 1
fi

# Function to show usage
show_usage() {
    echo "CSV Cleaner Tool - Convert realtor CSV files to standardized format"
    echo ""
    echo "Usage:"
    echo "  ./clean_csv.sh single <input_file> <output_file>"
    echo "  ./clean_csv.sh batch <input_pattern> <output_dir>"
    echo "  ./clean_csv.sh help"
    echo ""
    echo "Examples:"
    echo "  ./clean_csv.sh single csv/realtors-me-04401.csv Cleaned/output.csv"
    echo "  ./clean_csv.sh batch 'csv/realtors-*.csv' Cleaned/"
    echo "  ./clean_csv.sh batch 'csv/*.csv' Cleaned/"
}

# Check arguments
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

case "$1" in
    "single")
        if [ $# -ne 3 ]; then
            echo "Error: Single mode requires input file and output file"
            show_usage
            exit 1
        fi
        python3 "$PYTHON_SCRIPT" "$2" "$3"
        ;;
    "batch")
        if [ $# -ne 3 ]; then
            echo "Error: Batch mode requires input pattern and output directory"
            show_usage
            exit 1
        fi
        python3 "$PYTHON_SCRIPT" --batch "$2" "$3"
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        echo "Error: Unknown command '$1'"
        show_usage
        exit 1
        ;;
esac
