#!/bin/bash

echo "🚀 Setting up Realtor Data Extraction Automation"
echo "================================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python 3 found"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

echo "✅ pip3 found"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
fi

# Install required Python packages in virtual environment
echo "📦 Installing required Python packages in virtual environment..."
source venv/bin/activate
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python packages installed successfully in virtual environment"
else
    echo "❌ Failed to install Python packages"
    exit 1
fi

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null && ! command -v google-chrome-stable &> /dev/null; then
    echo "⚠️ Google Chrome not found. Please install Google Chrome."
    echo "   You can download it from: https://www.google.com/chrome/"
else
    echo "✅ Google Chrome found"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 To run the automation:"
echo "   ./run_automation.sh"
echo ""
echo "   Or manually:"
echo "   source venv/bin/activate"
echo "   python3 simple_automation.py"
echo ""
echo "📁 The script will:"
echo "   1. Load your Chrome extension"
echo "   2. Visit each URL from the list"
echo "   3. Wait 10 seconds for page load"
echo "   4. Trigger the extension to extract data"
echo "   5. Wait 5 seconds before moving to next URL"
echo "   6. Downloaded CSV files will be in your Downloads folder"
echo ""
echo "⚠️ Important:"
echo "   - Make sure your Chrome extension is working manually first"
echo "   - The browser window will stay open so you can see the progress"
echo "   - Each extraction creates a separate CSV file (as per your extension design)"
echo ""
