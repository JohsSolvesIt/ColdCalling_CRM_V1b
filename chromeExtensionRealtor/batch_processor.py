#!/usr/bin/env python3
"""
Chrome Extension Batch URL Processor (Python)
Enhanced batch processing for Chrome Extension Realtor Data Extractor
Based on Chrome Extension Complete Analysis
"""

import asyncio
import csv
import json
import logging
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import requests
import argparse
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
@dataclass
class Config:
    csv_file: str = "90028 realtors LINKS ONLY (copy).csv"
    backend_url: str = "http://localhost:5001"
    progress_file: str = "batch_progress.json"
    log_file: str = f"logs/batch_extraction_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    # Processing settings
    batch_size: int = 5
    max_workers: int = 3
    tab_delay: float = 2.0
    extraction_timeout: int = 30
    page_load_timeout: int = 15
    max_retries: int = 3
    retry_delay: float = 5.0
    
    # Chrome settings
    chrome_binary: str = "google-chrome"
    extension_path: str = "./"
    user_data_dir: str = "./temp/chrome_batch_profile"
    
    # Progress settings
    progress_save_interval: int = 10
    status_update_interval: float = 5.0

@dataclass
class ProcessingStats:
    total: int = 0
    processed: int = 0
    successful: int = 0
    failed: int = 0
    skipped: int = 0
    start_time: Optional[datetime] = None
    errors: List[Dict[str, str]] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class BatchProcessor:
    """Advanced batch processor for Chrome Extension URL processing"""
    
    def __init__(self, config: Config):
        self.config = config
        self.stats = ProcessingStats()
        self.logger = self._setup_logging()
        self.chrome_process = None
        self.should_stop = False
        self.session = requests.Session()
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        # Create logs directory
        os.makedirs("logs", exist_ok=True)
        
        # Configure logger
        logger = logging.getLogger("BatchProcessor")
        logger.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # File handler
        file_handler = logging.FileHandler(self.config.log_file)
        file_formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(funcName)s:%(lineno)d - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        
        return logger
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        self.logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.should_stop = True
    
    # =========================================================================
    # SETUP AND INITIALIZATION
    # =========================================================================
    
    async def setup(self):
        """Initialize the batch processor"""
        self.logger.info("Setting up batch processor...")
        
        # Create necessary directories
        self._create_directories()
        
        # Check dependencies
        await self._check_dependencies()
        
        # Initialize progress tracking
        await self._initialize_progress()
        
        self.logger.info("Setup completed successfully")
    
    def _create_directories(self):
        """Create necessary directories"""
        directories = ["logs", "temp", self.config.user_data_dir]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    async def _check_dependencies(self):
        """Check if all dependencies are available"""
        self.logger.info("Checking dependencies...")
        
        # Check backend service
        try:
            response = self.session.get(f"{self.config.backend_url}/health", timeout=5)
            response.raise_for_status()
            self.logger.info("Backend service is running")
        except Exception as e:
            raise RuntimeError(f"Backend service not available at {self.config.backend_url}: {e}")
        
        # Check CSV file
        if not os.path.exists(self.config.csv_file):
            raise FileNotFoundError(f"CSV file not found: {self.config.csv_file}")
        
        # Check Chrome binary
        if not self._check_chrome_available():
            raise RuntimeError(f"Chrome binary not found: {self.config.chrome_binary}")
        
        # Check extension
        if not os.path.exists(os.path.join(self.config.extension_path, "manifest.json")):
            raise FileNotFoundError("Chrome extension manifest.json not found")
        
        self.logger.info("All dependencies satisfied")
    
    def _check_chrome_available(self) -> bool:
        """Check if Chrome is available"""
        try:
            subprocess.run([self.config.chrome_binary, "--version"], 
                         capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Try alternative names
            for binary in ["google-chrome-stable", "chromium", "chromium-browser"]:
                try:
                    subprocess.run([binary, "--version"], 
                                 capture_output=True, check=True)
                    self.config.chrome_binary = binary
                    return True
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
            return False
    
    async def _initialize_progress(self):
        """Initialize progress tracking"""
        progress = {
            "start_time": datetime.now().isoformat(),
            "last_update": datetime.now().isoformat(),
            "stats": asdict(self.stats),
            "config": asdict(self.config),
            "failed_urls": [],
            "processed_urls": []
        }
        
        with open(self.config.progress_file, 'w') as f:
            json.dump(progress, f, indent=2)
        
        self.logger.info(f"Progress tracking initialized: {self.config.progress_file}")
    
    # =========================================================================
    # CHROME MANAGEMENT
    # =========================================================================
    
    async def start_chrome(self):
        """Start Chrome with the extension loaded"""
        self.logger.info("Starting Chrome with extension...")
        
        chrome_args = [
            self.config.chrome_binary,
            f"--load-extension={os.path.abspath(self.config.extension_path)}",
            f"--user-data-dir={os.path.abspath(self.config.user_data_dir)}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--remote-debugging-port=9222",
            "--new-window"
        ]
        
        try:
            self.chrome_process = subprocess.Popen(
                chrome_args,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Wait for Chrome to start
            await asyncio.sleep(5)
            
            # Verify Chrome is running with debugging port
            if await self._verify_chrome_debugging():
                self.logger.info(f"Chrome started successfully (PID: {self.chrome_process.pid})")
                return True
            else:
                raise RuntimeError("Chrome debugging port not accessible")
                
        except Exception as e:
            self.logger.error(f"Failed to start Chrome: {e}")
            return False
    
    async def _verify_chrome_debugging(self) -> bool:
        """Verify Chrome debugging port is accessible"""
        try:
            response = self.session.get("http://localhost:9222/json", timeout=5)
            response.raise_for_status()
            return True
        except Exception:
            return False
    
    async def stop_chrome(self):
        """Stop Chrome process"""
        if self.chrome_process:
            self.logger.info("Stopping Chrome...")
            self.chrome_process.terminate()
            try:
                await asyncio.wait_for(
                    asyncio.create_task(self._wait_for_process_termination()), 
                    timeout=10
                )
                self.logger.info("Chrome stopped gracefully")
            except asyncio.TimeoutError:
                self.logger.warning("Chrome didn't stop gracefully, forcing...")
                self.chrome_process.kill()
            
            self.chrome_process = None
    
    async def _wait_for_process_termination(self):
        """Wait for Chrome process to terminate"""
        while self.chrome_process.poll() is None:
            await asyncio.sleep(0.1)
    
    # =========================================================================
    # URL PROCESSING
    # =========================================================================
    
    async def load_urls_from_csv(self) -> List[str]:
        """Load URLs from CSV file"""
        self.logger.info(f"Loading URLs from {self.config.csv_file}...")
        
        urls = []
        
        with open(self.config.csv_file, 'r', newline='', encoding='utf-8') as csvfile:
            # Try to detect if there's a header
            sample = csvfile.read(1024)
            csvfile.seek(0)
            
            # Simple detection: if first line contains "http", assume no header
            has_header = not sample.split('\n')[0].strip().startswith('http')
            
            if has_header:
                reader = csv.DictReader(csvfile)
                url_column = self._detect_url_column(reader.fieldnames)
                for row in reader:
                    url = row.get(url_column, '').strip()
                    if url:
                        urls.append(url)
            else:
                reader = csv.reader(csvfile)
                for row in reader:
                    if row and row[0].strip():
                        urls.append(row[0].strip())
        
        self.logger.info(f"Loaded {len(urls)} URLs from CSV")
        return urls
    
    def _detect_url_column(self, fieldnames: List[str]) -> str:
        """Detect which column contains URLs"""
        if not fieldnames:
            return "url"
        
        # Look for common URL column names
        url_indicators = ["url", "link", "address", "page", "realtor"]
        
        for field in fieldnames:
            if any(indicator in field.lower() for indicator in url_indicators):
                return field
        
        # Default to first column
        return fieldnames[0]
    
    async def check_url_exists(self, url: str) -> bool:
        """Check if URL already exists in database"""
        try:
            response = self.session.post(
                f"{self.config.backend_url}/api/check-duplicate",
                json={"url": url},
                timeout=5
            )
            response.raise_for_status()
            data = response.json()
            return data.get("isDuplicate", False)
        except Exception as e:
            self.logger.debug(f"Error checking URL existence: {e}")
            return False
    
    async def process_url_via_chrome_devtools(self, url: str) -> bool:
        """Process URL using Chrome DevTools Protocol"""
        try:
            # Get list of tabs
            response = self.session.get("http://localhost:9222/json", timeout=5)
            response.raise_for_status()
            tabs = response.json()
            
            # Create new tab or use existing
            if not tabs:
                new_tab_response = self.session.post(
                    "http://localhost:9222/json/new",
                    json={"url": url},
                    timeout=5
                )
                new_tab_response.raise_for_status()
                tab = new_tab_response.json()
            else:
                # Use first available tab and navigate
                tab = tabs[0]
                # Navigate to URL (simplified - would need WebSocket connection for full control)
                
            # Wait for processing
            await asyncio.sleep(self.config.extraction_timeout)
            
            # Close tab if we created it
            if 'id' in tab:
                self.session.post(f"http://localhost:9222/json/close/{tab['id']}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error processing URL via DevTools: {e}")
            return False
    
    async def process_url_via_tab_opener(self, url: str) -> bool:
        """Process URL using the existing tab_opener.sh script"""
        try:
            # Create temporary CSV with single URL
            temp_csv = f"temp/single_url_{int(time.time())}.csv"
            with open(temp_csv, 'w') as f:
                f.write(url + '\n')
            
            # Run tab_opener.sh with the temporary CSV
            cmd = ["./tab_opener.sh", temp_csv]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.config.extraction_timeout
            )
            
            # Clean up temp file
            try:
                os.remove(temp_csv)
            except:
                pass
            
            return process.returncode == 0
            
        except Exception as e:
            self.logger.error(f"Error processing URL via tab_opener: {e}")
            return False
    
    async def process_single_url(self, url: str, index: int, total: int) -> Dict[str, Any]:
        """Process a single URL with retries"""
        agent_id = self._extract_agent_id(url)
        self.logger.info(f"Processing URL {index}/{total}: {agent_id}")
        
        # Check if URL already exists
        if await self.check_url_exists(url):
            self.logger.info(f"URL already exists in database, skipping: {agent_id}")
            self.stats.skipped += 1
            return {"url": url, "success": True, "skipped": True}
        
        # Attempt processing with retries
        for attempt in range(1, self.config.max_retries + 1):
            if self.should_stop:
                return {"url": url, "success": False, "error": "Stopped by user"}
            
            self.logger.debug(f"Attempt {attempt}/{self.config.max_retries} for {agent_id}")
            
            try:
                # Try processing via Chrome DevTools first
                success = await self.process_url_via_chrome_devtools(url)
                
                if success:
                    # Verify extraction
                    await asyncio.sleep(2)
                    if await self.check_url_exists(url):
                        self.logger.info(f"Successfully extracted data for {agent_id}")
                        self.stats.successful += 1
                        return {"url": url, "success": True, "extracted": True}
                
                # Fallback to tab_opener if available
                if os.path.exists("tab_opener.sh"):
                    success = await self.process_url_via_tab_opener(url)
                    if success and await self.check_url_exists(url):
                        self.logger.info(f"Successfully extracted data via tab_opener for {agent_id}")
                        self.stats.successful += 1
                        return {"url": url, "success": True, "extracted": True}
                
            except Exception as e:
                self.logger.error(f"Error processing {agent_id} (attempt {attempt}): {e}")
            
            # Wait before retry
            if attempt < self.config.max_retries:
                self.logger.info(f"Retrying in {self.config.retry_delay} seconds...")
                await asyncio.sleep(self.config.retry_delay)
        
        # All attempts failed
        error_msg = f"Failed after {self.config.max_retries} attempts"
        self.logger.error(f"{error_msg}: {agent_id}")
        self.stats.failed += 1
        self.stats.errors.append({"url": url, "error": error_msg})
        
        return {"url": url, "success": False, "error": error_msg}
    
    def _extract_agent_id(self, url: str) -> str:
        """Extract agent ID from Realtor.com URL"""
        parts = url.rstrip('/').split('/')
        return parts[-1] if parts else url
    
    # =========================================================================
    # BATCH PROCESSING
    # =========================================================================
    
    async def process_batch(self, urls: List[str], batch_index: int) -> List[Dict[str, Any]]:
        """Process a batch of URLs"""
        batch_size = len(urls)
        self.logger.info(f"Processing batch {batch_index}: {batch_size} URLs")
        
        # Use ThreadPoolExecutor for concurrent processing
        loop = asyncio.get_event_loop()
        
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            tasks = []
            
            for i, url in enumerate(urls):
                if self.should_stop:
                    break
                
                global_index = self.stats.processed + i + 1
                
                # Create task for URL processing
                task = loop.run_in_executor(
                    executor,
                    lambda u=url, idx=global_index: asyncio.run(
                        self.process_single_url(u, idx, self.stats.total)
                    )
                )
                tasks.append(task)
                
                # Add delay between starting tasks
                if i < batch_size - 1:
                    await asyncio.sleep(self.config.tab_delay)
            
            # Wait for all tasks to complete
            results = []
            for task in as_completed(tasks):
                result = await task
                results.append(result)
        
        return results
    
    async def process_all_urls(self, urls: List[str]):
        """Process all URLs in batches"""
        self.stats.total = len(urls)
        self.stats.start_time = datetime.now()
        
        self.logger.info(f"Starting batch processing of {len(urls)} URLs")
        self.logger.info(f"Batch size: {self.config.batch_size}, Max workers: {self.config.max_workers}")
        
        # Process URLs in batches
        for i in range(0, len(urls), self.config.batch_size):
            if self.should_stop:
                self.logger.info("Stopping processing due to stop signal")
                break
            
            batch = urls[i:i + self.config.batch_size]
            batch_index = (i // self.config.batch_size) + 1
            
            results = await self.process_batch(batch, batch_index)
            
            # Update stats
            self.stats.processed += len(batch)
            
            # Save progress periodically
            if self.stats.processed % self.config.progress_save_interval == 0:
                await self._save_progress()
            
            # Progress report
            self._print_progress()
            
            # Delay between batches
            if i + self.config.batch_size < len(urls):
                await asyncio.sleep(3)
        
        await self._save_progress()
        self._print_final_summary()
    
    # =========================================================================
    # PROGRESS TRACKING AND REPORTING
    # =========================================================================
    
    async def _save_progress(self):
        """Save current progress to file"""
        progress = {
            "last_update": datetime.now().isoformat(),
            "stats": asdict(self.stats),
            "config": asdict(self.config)
        }
        
        try:
            with open(self.config.progress_file, 'w') as f:
                json.dump(progress, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Error saving progress: {e}")
    
    def _print_progress(self):
        """Print current progress"""
        processed = self.stats.processed
        total = self.stats.total
        successful = self.stats.successful
        failed = self.stats.failed
        skipped = self.stats.skipped
        
        percentage = (processed / total * 100) if total > 0 else 0
        
        if self.stats.start_time:
            elapsed = datetime.now() - self.stats.start_time
            avg_time_per_url = elapsed.total_seconds() / processed if processed > 0 else 0
            remaining_urls = total - processed
            estimated_remaining = timedelta(seconds=remaining_urls * avg_time_per_url)
            
            self.logger.info(
                f"Progress: {processed}/{total} ({percentage:.1f}%) - "
                f"Success: {successful}, Failed: {failed}, Skipped: {skipped}"
            )
            
            if remaining_urls > 0:
                self.logger.info(f"Estimated time remaining: {estimated_remaining}")
    
    def _print_final_summary(self):
        """Print final processing summary"""
        if self.stats.start_time:
            duration = datetime.now() - self.stats.start_time
            duration_minutes = duration.total_seconds() / 60
        else:
            duration_minutes = 0
        
        success_rate = (self.stats.successful / self.stats.processed * 100) if self.stats.processed > 0 else 0
        
        self.logger.info("=" * 60)
        self.logger.info("BATCH PROCESSING COMPLETED")
        self.logger.info("=" * 60)
        self.logger.info(f"Total URLs: {self.stats.total}")
        self.logger.info(f"Processed: {self.stats.processed}")
        self.logger.info(f"Successful: {self.stats.successful}")
        self.logger.info(f"Failed: {self.stats.failed}")
        self.logger.info(f"Skipped: {self.stats.skipped}")
        self.logger.info(f"Duration: {duration_minutes:.1f} minutes")
        self.logger.info(f"Success Rate: {success_rate:.1f}%")
        
        if self.stats.errors:
            self.logger.info(f"\nErrors encountered:")
            for error in self.stats.errors:
                self.logger.error(f"  {error['url']}: {error['error']}")
        
        self.logger.info(f"\nDetailed logs: {self.config.log_file}")
        self.logger.info(f"Progress data: {self.config.progress_file}")
    
    # =========================================================================
    # MAIN EXECUTION
    # =========================================================================
    
    async def run(self):
        """Main execution method"""
        try:
            # Setup
            await self.setup()
            
            # Start Chrome
            if not await self.start_chrome():
                raise RuntimeError("Failed to start Chrome")
            
            # Load URLs
            urls = await self.load_urls_from_csv()
            
            if not urls:
                raise ValueError("No URLs found in CSV file")
            
            # Process all URLs
            await self.process_all_urls(urls)
            
        except Exception as e:
            self.logger.error(f"Fatal error in batch processor: {e}")
            raise
        finally:
            # Cleanup
            await self.stop_chrome()

def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(
        description="Chrome Extension Batch URL Processor (Python)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument(
        "csv_file",
        nargs="?",
        default="90028 realtors LINKS ONLY (copy).csv",
        help="Path to CSV file with URLs"
    )
    
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5,
        help="Number of URLs to process in each batch"
    )
    
    parser.add_argument(
        "--max-workers",
        type=int,
        default=3,
        help="Maximum number of concurrent workers"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Extraction timeout per URL in seconds"
    )
    
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="Maximum retries per URL"
    )
    
    parser.add_argument(
        "--chrome-binary",
        default="google-chrome",
        help="Chrome binary path"
    )
    
    args = parser.parse_args()
    
    # Create configuration
    config = Config(
        csv_file=args.csv_file,
        batch_size=args.batch_size,
        max_workers=args.max_workers,
        extraction_timeout=args.timeout,
        max_retries=args.retries,
        chrome_binary=args.chrome_binary
    )
    
    # Create and run processor
    processor = BatchProcessor(config)
    
    try:
        asyncio.run(processor.run())
        print("Batch processing completed successfully!")
        sys.exit(0)
    except KeyboardInterrupt:
        print("\nBatch processing interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"Batch processing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
