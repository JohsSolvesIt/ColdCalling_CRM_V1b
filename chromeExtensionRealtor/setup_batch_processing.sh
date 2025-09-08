#!/bin/bash

# Setup script for Chrome Extension Batch Processing
# Based on Chrome Extension Complete Analysis

set -e

echo "🚀 Setting up Chrome Extension Batch Processing..."
echo

# Function to print colored output
print_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Check if we're in the right directory
if [[ ! -f "manifest.json" ]]; then
    print_error "This script must be run from the Chrome Extension directory"
    print_info "Navigate to the chromeExtensionRealtor directory and run again"
    exit 1
fi

print_info "Detected Chrome Extension directory ✓"

# Create necessary directories
print_info "Creating directories..."
mkdir -p logs
mkdir -p temp
print_success "Directories created"

# Make scripts executable
print_info "Making scripts executable..."
chmod +x batch_url_processor.sh 2>/dev/null || print_warning "batch_url_processor.sh not found"
chmod +x tab_opener.sh 2>/dev/null || print_warning "tab_opener.sh not found"
chmod +x setup-database.sh 2>/dev/null || print_warning "setup-database.sh not found"
print_success "Scripts made executable"

# Check for CSV file
if [[ -f "90028 realtors LINKS ONLY (copy).csv" ]]; then
    CSV_LINES=$(wc -l < "90028 realtors LINKS ONLY (copy).csv")
    print_success "CSV file found with $CSV_LINES URLs"
else
    print_warning "Default CSV file not found: 90028 realtors LINKS ONLY (copy).csv"
    print_info "You can specify a different CSV file when running the batch processors"
fi

# Check dependencies
print_info "Checking system dependencies..."

# Check for required commands
MISSING_DEPS=()

if ! command -v curl >/dev/null 2>&1; then
    MISSING_DEPS+=("curl")
fi

if ! command -v jq >/dev/null 2>&1; then
    MISSING_DEPS+=("jq")
fi

if ! command -v google-chrome >/dev/null 2>&1 && ! command -v google-chrome-stable >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
    MISSING_DEPS+=("chrome/chromium")
fi

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
    print_warning "Missing dependencies: ${MISSING_DEPS[*]}"
    print_info "Install with: sudo apt-get install curl jq google-chrome-stable"
else
    print_success "All system dependencies found"
fi

# Check Node.js for Node.js processor
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
    
    if [[ -f "package_batch.json" ]]; then
        print_info "Installing Node.js dependencies..."
        cp package_batch.json package.json
        if npm install; then
            print_success "Node.js dependencies installed"
        else
            print_warning "Failed to install Node.js dependencies"
        fi
    fi
else
    print_warning "Node.js not found - Node.js batch processor will not be available"
    print_info "Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
fi

# Check Python for Python processor
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python found: $PYTHON_VERSION"
    
    if [[ -f "requirements_batch.txt" ]]; then
        print_info "To install Python dependencies, run:"
        print_info "  pip3 install -r requirements_batch.txt"
    fi
else
    print_warning "Python3 not found - Python batch processor will not be available"
    print_info "Install with: sudo apt-get install python3 python3-pip"
fi

# Check backend service
print_info "Checking backend service..."
if curl -s -f http://localhost:5001/health >/dev/null 2>&1; then
    print_success "Backend service is running on port 5001"
else
    print_warning "Backend service is not running"
    print_info "Start with: cd backend && node server.js"
fi

# Create example configuration files
print_info "Creating example configuration files..."

cat > batch_config_example.json << 'EOF'
{
  "csv_file": "90028 realtors LINKS ONLY (copy).csv",
  "batch_size": 5,
  "extraction_timeout": 30,
  "max_retries": 3,
  "concurrent_workers": 3,
  "chrome_binary": "google-chrome",
  "backend_url": "http://localhost:5001",
  "progress_save_interval": 10,
  "log_level": "INFO"
}
EOF

print_success "Created batch_config_example.json"

# Create quick start script
cat > quick_start.sh << 'EOF'
#!/bin/bash

echo "🚀 Chrome Extension Batch Processor Quick Start"
echo

# Check which processors are available
echo "Available batch processors:"

if [[ -x "./batch_url_processor.sh" ]]; then
    echo "  1. Bash Script (batch_url_processor.sh)"
fi

if [[ -f "./batch_processor.js" ]] && command -v node >/dev/null 2>&1; then
    echo "  2. Node.js Script (batch_processor.js)"
fi

if [[ -f "./batch_processor.py" ]] && command -v python3 >/dev/null 2>&1; then
    echo "  3. Python Script (batch_processor.py)"
fi

echo
echo "Quick start commands:"
echo

if [[ -x "./batch_url_processor.sh" ]]; then
    echo "Bash (recommended for beginners):"
    echo "  ./batch_url_processor.sh"
    echo
fi

if [[ -f "./batch_processor.js" ]] && command -v node >/dev/null 2>&1; then
    echo "Node.js (recommended for developers):"
    echo "  node batch_processor.js"
    echo
fi

if [[ -f "./batch_processor.py" ]] && command -v python3 >/dev/null 2>&1; then
    echo "Python (recommended for data scientists):"
    echo "  python3 batch_processor.py"
    echo
fi

echo "For help and options:"
echo "  ./batch_url_processor.sh --help"
echo "  node batch_processor.js --help"
echo "  python3 batch_processor.py --help"
echo

echo "Before running, ensure:"
echo "  1. Backend service is running (http://localhost:5001/health)"
echo "  2. Chrome extension is loaded and working"
echo "  3. CSV file with URLs is available"
EOF

chmod +x quick_start.sh
print_success "Created quick_start.sh"

echo
print_success "Setup completed successfully! 🎉"
echo
print_info "Next steps:"
print_info "  1. Ensure backend service is running: cd backend && node server.js"
print_info "  2. Load Chrome extension in browser"
print_info "  3. Run ./quick_start.sh to see available options"
print_info "  4. Start batch processing with your preferred method"
echo
print_info "For detailed documentation, see BATCH_PROCESSING_GUIDE.md"
echo
