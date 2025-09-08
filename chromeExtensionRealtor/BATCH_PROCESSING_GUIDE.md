# Chrome Extension Batch Processing Guide

## Overview

Based on the Chrome Extension Complete Analysis, I've created multiple batch processing solutions to automatically process URLs from CSV files using your Chrome Extension system.

⚠️ **Important Note**: Since Realtor.com actively blocks browser automation, the **Simple Tab Opener** approach is most effective as it avoids automation detection entirely.

## Available Solutions

### 1. Simple Tab Opener (`simple_tab_opener.sh`) ⭐ **RECOMMENDED**
**Best for:** All users - most reliable approach
- No browser automation - just opens tabs naturally
- Works with Realtor.com (no automation blocking)
- Lets Chrome Extension handle extraction automatically
- Progress tracking and duplicate checking
- Simple and reliable

### 2. Bash Script (`batch_url_processor.sh`)
**Best for:** Linux/Unix environments (may be blocked by Realtor.com)
- Full Chrome automation with extension loading
- Progress tracking with JSON output
- Robust error handling and recovery
- Signal handling for graceful shutdown

### 3. Node.js Script (`batch_processor.js`)
**Best for:** JavaScript developers (may be blocked by Realtor.com)
- Uses Playwright for browser automation
- Advanced tab management and concurrent processing
- Real-time progress monitoring
- Detailed logging and statistics

### 4. Python Script (`batch_processor.py`)
**Best for:** Python developers, data scientists (may be blocked by Realtor.com)
- Asyncio-based concurrent processing
- Integration with existing `tab_opener.sh`
- Chrome DevTools Protocol support
- Comprehensive error tracking

## Prerequisites

### System Requirements
- Chrome/Chromium browser installed
- Chrome Extension loaded and working
- Backend service running on port 5001
- CSV file with Realtor.com URLs

### Dependencies

#### For Simple Tab Opener (Recommended):
```bash
# No additional dependencies required!
# Uses system default browser and standard commands
```

#### For Bash Script:
```bash
sudo apt-get install curl jq
```

#### For Node.js Script:
```bash
npm install axios csv-parser playwright
```

#### For Python Script:
```bash
pip install requests aiohttp
```

## Usage Examples

### Simple Tab Opener (Recommended)
```bash
# Make executable
chmod +x simple_tab_opener.sh

# Basic usage with default CSV file
./simple_tab_opener.sh

# Custom CSV file
./simple_tab_opener.sh my_urls.csv

# Custom batch settings
./simple_tab_opener.sh -b 3 -d 5 -w 20 my_urls.csv

# See all options
./simple_tab_opener.sh --help
```

### Bash Script
```bash
# Make executable
chmod +x batch_url_processor.sh

# Basic usage with default CSV file
./batch_url_processor.sh

# Custom CSV file with options
./batch_url_processor.sh -s 100 -b 10 my_urls.csv

# Verbose mode with custom settings
./batch_url_processor.sh --start 1 --batch 3 --timeout 45 --verbose
```

### Node.js Script
```bash
# Basic usage
node batch_processor.js

# Custom settings
node batch_processor.js --batch-size 10 --timeout 45 my_urls.csv

# Concurrent processing
node batch_processor.js --concurrent 5 --retries 5
```

### Python Script
```bash
# Basic usage
python batch_processor.py

# Custom configuration
python batch_processor.py --batch-size 8 --max-workers 4 my_urls.csv

# High-performance mode
python batch_processor.py --timeout 60 --retries 5 --chrome-binary /usr/bin/chromium
```

## Configuration Options

### Common Options
- `--batch-size`: Number of URLs per batch (default: 5)
- `--timeout`: Extraction timeout per URL in seconds (default: 30)
- `--retries`: Maximum retry attempts per URL (default: 3)
- `--start`: Start from specific line in CSV (bash only)
- `--verbose`: Enable detailed logging

### Processing Flow
1. **Setup Phase**
   - Validate dependencies
   - Check backend connectivity
   - Initialize progress tracking
   - Create necessary directories

2. **Browser Launch**
   - Start Chrome with extension loaded
   - Verify extension is active
   - Setup debugging/automation ports

3. **URL Processing**
   - Load URLs from CSV file
   - Check for existing entries (duplicate detection)
   - Process URLs in configurable batches
   - Handle retries and error recovery

4. **Data Verification**
   - Confirm data was extracted successfully
   - Update progress tracking
   - Log results and statistics

5. **Cleanup**
   - Close browser sessions
   - Save final progress report
   - Generate summary statistics

## CSV File Format

### Supported Formats

#### Single Column (No Header)
```
https://www.realtor.com/realestateagents/56806d07bb954c010068e81e
https://www.realtor.com/realestateagents/56c85a2a89a68901006e8a3f
https://www.realtor.com/realestateagents/5a024c8e642a8d0010a0b67f
```

#### With Header
```
url,agent_name,office
https://www.realtor.com/realestateagents/56806d07bb954c010068e81e,John Doe,RE/MAX
https://www.realtor.com/realestateagents/56c85a2a89a68901006e8a3f,Jane Smith,Century 21
```

#### Multiple Columns (URL auto-detected)
```
realtor_id,profile_url,last_updated
56806d07,https://www.realtor.com/realestateagents/56806d07bb954c010068e81e,2024-01-01
56c85a2a,https://www.realtor.com/realestateagents/56c85a2a89a68901006e8a3f,2024-01-02
```

## Progress Tracking

### Progress File Format (`batch_progress.json`)
```json
{
  "start_time": "2024-01-15T10:30:00.000Z",
  "last_update": "2024-01-15T11:45:00.000Z",
  "stats": {
    "total": 1000,
    "processed": 250,
    "successful": 230,
    "failed": 15,
    "skipped": 5
  },
  "config": {
    "batch_size": 5,
    "extraction_timeout": 30,
    "max_retries": 3
  },
  "failed_urls": [
    {
      "url": "https://www.realtor.com/realestateagents/invalid",
      "error": "Page not found"
    }
  ]
}
```

### Log File Format
```
[2024-01-15 10:30:00] [INFO] Starting batch processing of 1000 URLs
[2024-01-15 10:30:05] [INFO] Processing batch 1: URLs 1 to 5
[2024-01-15 10:30:15] [SUCCESS] Successfully extracted data for agent 56806d07
[2024-01-15 10:30:20] [WARNING] URL already exists in database, skipping
[2024-01-15 10:30:25] [ERROR] Failed to extract data after 3 attempts
```

## Performance Tuning

### Optimal Settings by System

#### Low-end System (4GB RAM, 2 cores)
```bash
batch_size=3
max_workers=2
timeout=45
retries=2
```

#### Mid-range System (8GB RAM, 4 cores)
```bash
batch_size=5
max_workers=3
timeout=30
retries=3
```

#### High-end System (16GB+ RAM, 8+ cores)
```bash
batch_size=10
max_workers=5
timeout=25
retries=3
```

### Performance Considerations
- **Batch Size**: Larger batches = higher memory usage but better throughput
- **Concurrent Workers**: More workers = faster processing but higher resource usage
- **Timeout Values**: Longer timeouts = more reliable but slower processing
- **Retry Logic**: More retries = better success rate but longer processing time

## Monitoring and Troubleshooting

### Real-time Monitoring
```bash
# Watch progress file
watch -n 5 'cat batch_progress.json | jq .stats'

# Monitor log file
tail -f logs/batch_extraction_*.log

# Check backend health
curl http://localhost:5001/health
```

### Common Issues and Solutions

#### Backend Not Running
```bash
# Check if backend is running
curl http://localhost:5001/health

# Start backend manually
cd backend && node server.js
```

#### Chrome Extension Not Loading
```bash
# Verify extension files
ls -la manifest.json content.js background.js

# Check Chrome extension is enabled
chrome://extensions/
```

#### High Memory Usage
- Reduce batch size
- Decrease concurrent workers
- Add longer delays between batches
- Monitor with `htop` or Task Manager

#### Slow Processing
- Increase batch size (if memory allows)
- Reduce timeout values
- Check network connectivity
- Monitor backend logs for bottlenecks

## Integration with Existing System

### Backend Integration
The batch processors integrate seamlessly with your existing Chrome Extension backend:

- **Health Checks**: Verify backend is running before processing
- **Duplicate Detection**: Use existing `/api/check-duplicate` endpoint
- **Data Storage**: Leverage existing `/api/extract` endpoint
- **Statistics**: Access `/api/stats` for monitoring

### CRM Integration
Processed data automatically appears in your main CRM through the UnifiedDatabaseManager:

- **Automatic Sync**: No additional steps needed
- **Format Conversion**: Data is automatically transformed to CRM format
- **Search Integration**: New contacts become immediately searchable
- **Export Capabilities**: Bulk export available through CRM interface

## Best Practices

### Before Processing
1. **Backup Database**: Always backup before bulk operations
2. **Test Small Batch**: Run with 10-20 URLs first
3. **Check System Resources**: Ensure adequate RAM and CPU
4. **Verify Extension**: Test manual extraction on sample URLs

### During Processing
1. **Monitor Progress**: Check logs and progress files regularly
2. **Resource Usage**: Monitor CPU, memory, and network usage
3. **Error Patterns**: Watch for recurring errors
4. **Backend Health**: Ensure backend stays responsive

### After Processing
1. **Verify Data Quality**: Spot-check extracted data
2. **Review Logs**: Analyze any errors or warnings
3. **Update Statistics**: Check CRM for new contact counts
4. **Cleanup**: Remove temporary files and logs if needed

## Security Considerations

### Data Protection
- **Local Processing**: All data stays on your local system
- **Secure Storage**: Uses existing database security
- **No External APIs**: No data sent to third-party services
- **Access Controls**: Inherits Chrome Extension permissions

### Network Security
- **Localhost Only**: Backend only accessible locally
- **No Remote Access**: No external network exposure
- **HTTPS Support**: Can work with HTTPS realtor.com
- **Rate Limiting**: Built-in delays prevent abuse

## Support and Maintenance

### Regular Maintenance
- **Update Extension**: Keep Chrome Extension updated
- **Clean Logs**: Rotate log files regularly
- **Monitor Performance**: Track processing speeds
- **Database Optimization**: Regular database maintenance

### Troubleshooting Resources
- **Progress Files**: Detailed processing state
- **Log Files**: Complete processing history
- **Backend Logs**: Server-side processing details
- **Chrome DevTools**: Browser-level debugging

For advanced configuration and custom modifications, refer to the Chrome Extension Complete Analysis document for detailed system architecture information.
