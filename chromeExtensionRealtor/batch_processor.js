#!/usr/bin/env node

/**
 * Chrome Extension Batch URL Processor (Node.js)
 * Advanced batch processing system for Chrome Extension Realtor Data Extractor
 * Based on Chrome Extension Complete Analysis
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const { chromium } = require('playwright'); // Alternative to puppeteer
const EventEmitter = require('events');

// Configuration
const CONFIG = {
    CSV_FILE: '90028 realtors LINKS ONLY (copy).csv',
    BACKEND_URL: 'http://localhost:5001',
    PROGRESS_FILE: 'batch_progress.json',
    LOG_FILE: `logs/batch_extraction_${new Date().toISOString().replace(/[:.]/g, '-')}.log`,
    
    // Processing settings
    BATCH_SIZE: 5,
    CONCURRENT_TABS: 3,
    TAB_DELAY: 2000,
    EXTRACTION_TIMEOUT: 30000,
    PAGE_LOAD_TIMEOUT: 15000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    
    // Chrome settings
    CHROME_USER_DATA: './temp/chrome_batch_profile',
    EXTENSION_PATH: './', // Current directory contains the extension
    
    // Progress settings
    PROGRESS_SAVE_INTERVAL: 10, // Save progress every N processed URLs
    STATUS_UPDATE_INTERVAL: 5000, // Status update interval in ms
};

class BatchProcessor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.config = { ...CONFIG, ...options };
        this.stats = {
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            startTime: null,
            errors: []
        };
        this.browser = null;
        this.context = null;
        this.isRunning = false;
        this.shouldStop = false;
    }

    // =========================================================================
    // LOGGING AND OUTPUT
    // =========================================================================

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        
        // Write to log file (simplified - in production would use proper logging library)
        try {
            require('fs').appendFileSync(this.config.LOG_FILE, logEntry + '\n');
        } catch (error) {
            // Ignore file write errors for now
        }
        
        if (data) {
        }
    }

    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    debug(message, data) { this.log('debug', message, data); }

    // =========================================================================
    // SETUP AND INITIALIZATION
    // =========================================================================

    async setup() {
        this.info('Setting up batch processor...');
        
        // Create necessary directories
        await this.createDirectories();
        
        // Check dependencies
        await this.checkDependencies();
        
        // Initialize progress tracking
        await this.initializeProgress();
        
        this.info('Setup completed');
    }

    async createDirectories() {
        const dirs = ['logs', 'temp', this.config.CHROME_USER_DATA];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                // Directory might already exist
            }
        }
    }

    async checkDependencies() {
        this.info('Checking dependencies...');
        
        // Check if backend is running
        try {
            const response = await axios.get(`${this.config.BACKEND_URL}/health`, { timeout: 5000 });
            this.info('Backend service is running');
        } catch (error) {
            throw new Error(`Backend service not available at ${this.config.BACKEND_URL}. Please start the backend first.`);
        }
        
        // Check if CSV file exists
        try {
            await fs.access(this.config.CSV_FILE);
            this.info(`CSV file found: ${this.config.CSV_FILE}`);
        } catch (error) {
            throw new Error(`CSV file not found: ${this.config.CSV_FILE}`);
        }
        
        // Check if extension exists
        try {
            await fs.access('./manifest.json');
            this.info('Chrome extension found');
        } catch (error) {
            throw new Error('Chrome extension manifest.json not found in current directory');
        }
    }

    async initializeProgress() {
        const progress = {
            startTime: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            stats: { ...this.stats },
            config: { ...this.config },
            failedUrls: [],
            processedUrls: []
        };
        
        await fs.writeFile(this.config.PROGRESS_FILE, JSON.stringify(progress, null, 2));
        this.info(`Progress tracking initialized: ${this.config.PROGRESS_FILE}`);
    }

    // =========================================================================
    // BROWSER MANAGEMENT
    // =========================================================================

    async startBrowser() {
        this.info('Starting Chrome with extension...');
        
        try {
            // Launch browser with extension
            this.browser = await chromium.launchPersistentContext(this.config.CHROME_USER_DATA, {
                headless: false, // Need visible browser for extension
                args: [
                    `--load-extension=${this.config.EXTENSION_PATH}`,
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--no-first-run',
                    '--no-default-browser-check',
                ],
                viewport: { width: 1280, height: 720 },
                timeout: 30000
            });
            
            this.info('Browser started successfully');
            
            // Wait for extension to load
            await this.waitForExtension();
            
            return true;
        } catch (error) {
            this.error('Failed to start browser:', error.message);
            throw error;
        }
    }

    async waitForExtension() {
        this.info('Waiting for Chrome extension to load...');
        
        // Create a test page to verify extension is working
        const page = await this.browser.newPage();
        
        try {
            // Navigate to a realtor.com page to test extension
            await page.goto('https://www.realtor.com', { 
                waitUntil: 'networkidle',
                timeout: this.config.PAGE_LOAD_TIMEOUT 
            });
            
            // Wait for extension to inject content script
            await page.waitForTimeout(3000);
            
            // Check if extension is loaded by looking for injected elements or scripts
            const extensionLoaded = await page.evaluate(() => {
                // Check for extension's content script indicators
                return window.RealtorDataExtractor !== undefined || 
                       document.getElementById('realtor-extractor-btn') !== null;
            });
            
            if (extensionLoaded) {
                this.info('Chrome extension loaded successfully');
            } else {
                this.warn('Extension may not be loaded properly, continuing anyway...');
            }
            
            await page.close();
        } catch (error) {
            this.warn('Could not verify extension loading:', error.message);
            await page.close();
        }
    }

    async stopBrowser() {
        if (this.browser) {
            this.info('Stopping browser...');
            try {
                await this.browser.close();
                this.browser = null;
            } catch (error) {
                this.error('Error stopping browser:', error.message);
            }
        }
    }

    // =========================================================================
    // URL PROCESSING
    // =========================================================================

    async loadUrlsFromCSV() {
        this.info(`Loading URLs from ${this.config.CSV_FILE}...`);
        
        return new Promise((resolve, reject) => {
            const urls = [];
            
            createReadStream(this.config.CSV_FILE)
                .pipe(csv(['url'])) // Assuming single column CSV
                .on('data', (row) => {
                    if (row.url && row.url.trim()) {
                        urls.push(row.url.trim());
                    }
                })
                .on('end', () => {
                    this.info(`Loaded ${urls.length} URLs from CSV`);
                    resolve(urls);
                })
                .on('error', reject);
        });
    }

    async checkUrlExists(url) {
        try {
            const response = await axios.post(`${this.config.BACKEND_URL}/api/check-duplicate`, {
                url: url
            }, { timeout: 5000 });
            
            return response.data.isDuplicate === true;
        } catch (error) {
            this.debug(`Error checking URL existence: ${error.message}`);
            return false; // Assume doesn't exist if can't check
        }
    }

    async processUrl(url, index, total) {
        this.info(`Processing URL ${index}/${total}: ${this.extractAgentId(url)}`);
        
        // Check if URL already exists
        if (await this.checkUrlExists(url)) {
            this.info(`URL already exists in database, skipping: ${url}`);
            this.stats.skipped++;
            return { success: true, skipped: true };
        }
        
        let page = null;
        let attempts = 0;
        
        while (attempts < this.config.MAX_RETRIES) {
            attempts++;
            
            try {
                this.debug(`Attempt ${attempts}/${this.config.MAX_RETRIES} for ${url}`);
                
                // Create new page
                page = await this.browser.newPage();
                
                // Set up page timeout
                page.setDefaultTimeout(this.config.EXTRACTION_TIMEOUT);
                
                // Navigate to URL
                await page.goto(url, { 
                    waitUntil: 'networkidle',
                    timeout: this.config.PAGE_LOAD_TIMEOUT 
                });
                
                // Wait for extension to process the page
                await page.waitForTimeout(3000);
                
                // Try to trigger extraction by clicking extension button or using context menu
                await this.triggerExtraction(page);
                
                // Wait for extraction to complete
                await page.waitForTimeout(5000);
                
                // Verify data was extracted
                const extracted = await this.verifyExtraction(url);
                
                if (extracted) {
                    this.info(`Successfully extracted data for ${url}`);
                    this.stats.successful++;
                    await page.close();
                    return { success: true, extracted: true };
                } else {
                    this.warn(`Data extraction verification failed for ${url}`);
                }
                
            } catch (error) {
                this.error(`Error processing ${url} (attempt ${attempts}):`, error.message);
            } finally {
                if (page) {
                    try {
                        await page.close();
                    } catch (error) {
                        // Ignore close errors
                    }
                }
            }
            
            // Wait before retry
            if (attempts < this.config.MAX_RETRIES) {
                this.info(`Retrying in ${this.config.RETRY_DELAY / 1000} seconds...`);
                await this.delay(this.config.RETRY_DELAY);
            }
        }
        
        this.error(`Failed to extract data after ${this.config.MAX_RETRIES} attempts: ${url}`);
        this.stats.failed++;
        this.stats.errors.push({ url, error: 'Max retries exceeded' });
        
        return { success: false, error: 'Max retries exceeded' };
    }

    async triggerExtraction(page) {
        try {
            // Method 1: Try to click the extension button
            const extensionButton = await page.$('#realtor-extractor-btn');
            if (extensionButton) {
                this.debug('Clicking extension button...');
                await extensionButton.click();
                return;
            }
            
            // Method 2: Try to trigger via right-click context menu
            this.debug('Triggering extraction via context menu...');
            await page.click('body', { button: 'right' });
            await page.waitForTimeout(1000);
            
            // Method 3: Try to inject and execute extraction script
            this.debug('Injecting extraction script...');
            await page.evaluate(() => {
                if (window.RealtorDataExtractor) {
                    window.RealtorDataExtractor.extractAllData();
                }
            });
            
        } catch (error) {
            this.debug('Error triggering extraction:', error.message);
        }
    }

    async verifyExtraction(url) {
        // Wait a bit for backend to process
        await this.delay(2000);
        
        return await this.checkUrlExists(url);
    }

    // =========================================================================
    // BATCH PROCESSING
    // =========================================================================

    async processBatch(urls, batchIndex) {
        const batchSize = urls.length;
        this.info(`Processing batch ${batchIndex}: ${batchSize} URLs`);
        
        const results = [];
        
        for (let i = 0; i < batchSize; i++) {
            if (this.shouldStop) {
                this.info('Stopping batch processing due to stop signal');
                break;
            }
            
            const url = urls[i];
            const globalIndex = this.stats.processed + i + 1;
            
            try {
                const result = await this.processUrl(url, globalIndex, this.stats.total);
                results.push({ url, ...result });
                
                // Add delay between URLs in batch
                if (i < batchSize - 1) {
                    await this.delay(this.config.TAB_DELAY);
                }
                
            } catch (error) {
                this.error(`Unexpected error processing ${url}:`, error.message);
                results.push({ url, success: false, error: error.message });
                this.stats.failed++;
            }
        }
        
        return results;
    }

    async processAllUrls(urls) {
        this.stats.total = urls.length;
        this.stats.startTime = new Date();
        this.isRunning = true;
        
        this.info(`Starting batch processing of ${urls.length} URLs`);
        this.info(`Batch size: ${this.config.BATCH_SIZE}, Concurrent tabs: ${this.config.CONCURRENT_TABS}`);
        
        // Process URLs in batches
        for (let i = 0; i < urls.length; i += this.config.BATCH_SIZE) {
            if (this.shouldStop) {
                this.info('Stopping processing due to stop signal');
                break;
            }
            
            const batch = urls.slice(i, i + this.config.BATCH_SIZE);
            const batchIndex = Math.floor(i / this.config.BATCH_SIZE) + 1;
            
            const results = await this.processBatch(batch, batchIndex);
            
            // Update stats
            this.stats.processed += batch.length;
            
            // Save progress periodically
            if (this.stats.processed % this.config.PROGRESS_SAVE_INTERVAL === 0) {
                await this.saveProgress();
            }
            
            // Progress report
            this.printProgress();
            
            // Small delay between batches
            if (i + this.config.BATCH_SIZE < urls.length) {
                await this.delay(3000);
            }
        }
        
        this.isRunning = false;
        await this.saveProgress();
        this.printFinalSummary();
    }

    // =========================================================================
    // PROGRESS TRACKING AND REPORTING
    // =========================================================================

    async saveProgress() {
        const progress = {
            lastUpdate: new Date().toISOString(),
            stats: { ...this.stats },
            config: { ...this.config }
        };
        
        try {
            await fs.writeFile(this.config.PROGRESS_FILE, JSON.stringify(progress, null, 2));
        } catch (error) {
            this.error('Error saving progress:', error.message);
        }
    }

    printProgress() {
        const { processed, total, successful, failed, skipped } = this.stats;
        const percentage = ((processed / total) * 100).toFixed(1);
        const elapsed = Date.now() - this.stats.startTime.getTime();
        const avgTimePerUrl = elapsed / processed;
        const estimatedRemaining = (total - processed) * avgTimePerUrl;
        
        this.info(`Progress: ${processed}/${total} (${percentage}%) - ` +
                 `Success: ${successful}, Failed: ${failed}, Skipped: ${skipped}`);
        
        if (estimatedRemaining > 0) {
            const remainingMinutes = Math.round(estimatedRemaining / 60000);
            this.info(`Estimated time remaining: ${remainingMinutes} minutes`);
        }
    }

    printFinalSummary() {
        const duration = Date.now() - this.stats.startTime.getTime();
        const durationMinutes = Math.round(duration / 60000);
        
        this.info('='.repeat(60));
        this.info('BATCH PROCESSING COMPLETED');
        this.info('='.repeat(60));
        this.info(`Total URLs: ${this.stats.total}`);
        this.info(`Processed: ${this.stats.processed}`);
        this.info(`Successful: ${this.stats.successful}`);
        this.info(`Failed: ${this.stats.failed}`);
        this.info(`Skipped: ${this.stats.skipped}`);
        this.info(`Duration: ${durationMinutes} minutes`);
        this.info(`Success Rate: ${((this.stats.successful / this.stats.processed) * 100).toFixed(1)}%`);
        
        if (this.stats.errors.length > 0) {
            this.info(`\nErrors encountered:`);
            this.stats.errors.forEach(error => {
                this.error(`  ${error.url}: ${error.error}`);
            });
        }
        
        this.info(`\nDetailed logs: ${this.config.LOG_FILE}`);
        this.info(`Progress data: ${this.config.PROGRESS_FILE}`);
    }

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    extractAgentId(url) {
        const match = url.match(/\/([a-f0-9]{24})$/);
        return match ? match[1] : path.basename(url);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =========================================================================
    // MAIN EXECUTION
    // =========================================================================

    async run(csvFile = null) {
        try {
            // Override CSV file if provided
            if (csvFile) {
                this.config.CSV_FILE = csvFile;
            }
            
            // Setup
            await this.setup();
            
            // Start browser
            await this.startBrowser();
            
            // Load URLs
            const urls = await this.loadUrlsFromCSV();
            
            if (urls.length === 0) {
                throw new Error('No URLs found in CSV file');
            }
            
            // Process all URLs
            await this.processAllUrls(urls);
            
        } catch (error) {
            this.error('Fatal error in batch processor:', error.message);
            throw error;
        } finally {
            // Cleanup
            await this.stopBrowser();
        }
    }

    // =========================================================================
    // SIGNAL HANDLING
    // =========================================================================

    setupSignalHandlers() {
        process.on('SIGINT', async () => {
            this.info('Received SIGINT, gracefully shutting down...');
            this.shouldStop = true;
            
            if (this.isRunning) {
                this.info('Waiting for current batch to complete...');
                setTimeout(() => {
                    this.info('Force shutdown after timeout');
                    process.exit(0);
                }, 30000); // Force exit after 30 seconds
            } else {
                await this.stopBrowser();
                process.exit(0);
            }
        });
        
        process.on('SIGTERM', async () => {
            this.info('Received SIGTERM, shutting down...');
            await this.stopBrowser();
            process.exit(0);
        });
    }
}

// =========================================================================
// COMMAND LINE INTERFACE
// =========================================================================

function showUsage() {
Chrome Extension Batch URL Processor (Node.js)

Usage: node batch_processor.js [OPTIONS] [CSV_FILE]

OPTIONS:
    --help              Show this help message
    --batch-size SIZE   Number of URLs to process in each batch (default: 5)
    --timeout SEC       Extraction timeout per URL in seconds (default: 30)
    --retries NUM       Maximum retries per URL (default: 3)
    --concurrent NUM    Number of concurrent tabs (default: 3)

ARGUMENTS:
    CSV_FILE           Path to CSV file with URLs (default: 90028 realtors LINKS ONLY (copy).csv)

EXAMPLES:
    node batch_processor.js
    node batch_processor.js my_urls.csv
    node batch_processor.js --batch-size 10 --timeout 45 urls.csv
`);
}

async function main() {
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    const options = {};
    let csvFile = null;
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--help':
                showUsage();
                return;
            case '--batch-size':
                options.BATCH_SIZE = parseInt(args[++i]);
                break;
            case '--timeout':
                options.EXTRACTION_TIMEOUT = parseInt(args[++i]) * 1000;
                break;
            case '--retries':
                options.MAX_RETRIES = parseInt(args[++i]);
                break;
            case '--concurrent':
                options.CONCURRENT_TABS = parseInt(args[++i]);
                break;
            default:
                if (!arg.startsWith('--')) {
                    csvFile = arg;
                }
                break;
        }
    }
    
    // Create and run processor
    const processor = new BatchProcessor(options);
    processor.setupSignalHandlers();
    
    try {
        await processor.run(csvFile);
        process.exit(0);
    } catch (error) {
        console.error('Batch processing failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = BatchProcessor;
