import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, X, Play, Square, FileText, Clock, CheckCircle, 
  XCircle, AlertCircle, Users, Activity, Tag, Settings, RotateCcw, FileSearch
} from 'lucide-react';

const SimpleBatchModal = ({ isOpen, onClose, showToast }) => {
  // Form state
  const [csvFile, setCsvFile] = useState(null);
  const [csvFilePath, setCsvFilePath] = useState('');
  // Remove batch size since we always process 1 URL at a time
  const [tabDelay, setTabDelay] = useState(2);  // Processing delay between URLs
  // Remove batchDelay since we use real-time polling
  const [tags, setTags] = useState('');
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState([]);
  const [processId, setProcessId] = useState(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('start'); // start, progress, instructions
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Progress tracking state
  const [progressStats, setProgressStats] = useState({
    currentUrl: '',
    currentRealtorName: '',
    totalUrls: 0,
    processedUrls: 0,
    successfulUrls: 0,
    failedUrls: 0,
    currentIndex: 0,
    startTime: null,
    estimatedTimeRemaining: null
  });
  
  // Last realtor scraped info
  const [lastRealtorInfo, setLastRealtorInfo] = useState({
    name: '',
    url: '',
    timestamp: '',
    success: false,
    profileData: null
  });
  
  // Track last line count to prevent duplicate output
  const [lastLineCount, setLastLineCount] = useState(0);
  
  // URL selection state
  const [urlCheckResults, setUrlCheckResults] = useState([]);
  const [showUrlSelection, setShowUrlSelection] = useState(false);
  const [isCheckingUrls, setIsCheckingUrls] = useState(false);
  
  // Range selection state
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  
  // Refs
  const fileInputRef = useRef(null);
  const outputRef = useRef(null);
  
  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);
  
  // Fetch recent log data when modal opens to populate "Last Realtor Scraped"
  useEffect(() => {
    if (isOpen) {
      const fetchRecentLogs = async () => {
        try {
          const response = await fetch('http://localhost:5000/api/batch/recent-logs');
          if (response.ok) {
            const data = await response.json();
            if (data.lastRealtor) {
              setLastRealtorInfo({
                name: data.lastRealtor.name || '',
                url: data.lastRealtor.url || '',
                timestamp: data.lastRealtor.timestamp || '',
                success: data.lastRealtor.success || false
              });
            }
          }
        } catch (error) {
          console.log('Could not fetch recent logs:', error);
          // Non-critical error, continue without recent log data
        }
      };
      
      fetchRecentLogs();
    }
  }, [isOpen]);

  // Listen for messages from Chrome extension (timeout and completion messages)
  useEffect(() => {
    if (!isOpen) return;

    const handleExtensionMessage = (event) => {
      // Security check - only accept messages from realtor.com or localhost
      const allowedOrigins = ['https://www.realtor.com', 'http://localhost', 'https://localhost'];
      const isAllowedOrigin = allowedOrigins.some(origin => event.origin.startsWith(origin));
      
      if (!isAllowedOrigin) {
        console.debug('Ignoring message from unallowed origin:', event.origin);
        return;
      }

      const { type, data } = event.data || {};
      
      console.log('📨 Received extension message:', { type, data, origin: event.origin });

      switch (type) {
        case 'EXTRACTION_TIMEOUT':
          handleExtractionTimeout(data);
          break;
          
        case 'FORCE_SCRAPE_COMPLETE':
          handleExtractionComplete(data);
          break;
          
        case 'EXTRACTION_PROGRESS':
          handleExtractionProgress(data);
          break;
          
        default:
          console.debug('Unknown message type:', type);
      }
    };

    // Add event listener
    window.addEventListener('message', handleExtensionMessage);
    
    // Cleanup on unmount or modal close
    return () => {
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, [isOpen]);

  // Handle extraction timeout messages from extension
  const handleExtractionTimeout = (timeoutData) => {
    const { timeoutType, section, details } = timeoutData;
    
    console.log('⏰ Extension timeout received:', timeoutData);
    
    let timeoutMessage = '';
    switch (timeoutType) {
      case 'idle':
        timeoutMessage = `⏰ Extension idle timeout: ${section} section (${Math.round(details.idleTime/1000)}s inactive)`;
        break;
      case 'total':
        timeoutMessage = `⏰ Extension total timeout: ${section} section (${Math.round(details.totalTime/1000)}s total)`;
        break;
      case 'limit':
        timeoutMessage = `🛑 Extension property limit: ${details.propertiesExtracted} properties extracted (limit: ${details.propertyLimit})`;
        break;
      default:
        timeoutMessage = `⏰ Extension timeout: ${section} section`;
    }
    
    // Add timeout message to output
    setOutput(prev => [...prev, timeoutMessage]);
    
    // Update progress stats if needed
    if (timeoutType === 'limit') {
      setProgressStats(prev => ({
        ...prev,
        successfulUrls: prev.successfulUrls + 1 // Count as success since we got some data
      }));
    }
    
    // Show toast notification
    showToast(timeoutMessage, timeoutType === 'limit' ? 'info' : 'warning');
  };

  // Handle extraction completion messages from extension
  const handleExtractionComplete = (completionData) => {
    const { success, data, error } = completionData;
    
    console.log('✅ Extension completion received:', completionData);
    
    if (success) {
      const message = `✅ Extension completed: Data extracted successfully`;
      setOutput(prev => [...prev, message]);
      
      // Update progress stats
      setProgressStats(prev => ({
        ...prev,
        successfulUrls: prev.successfulUrls + 1
      }));
      
      showToast('Extension extraction completed successfully', 'success');
    } else {
      const message = `❌ Extension failed: ${error || 'Unknown error'}`;
      setOutput(prev => [...prev, message]);
      
      // Update progress stats  
      setProgressStats(prev => ({
        ...prev,
        failedUrls: prev.failedUrls + 1
      }));
      
      showToast(`Extension extraction failed: ${error}`, 'error');
    }
  };

  // Handle extraction progress messages from extension
  const handleExtractionProgress = (progressData) => {
    const { section, status, details } = progressData;
    
    console.log('🔄 Extension progress received:', progressData);
    
    const message = `🔄 ${section}: ${status}${details ? ` (${details})` : ''}`;
    setOutput(prev => [...prev, message]);
  };
  
  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      setCsvFilePath(file.name);
      showToast(`CSV file selected: ${file.name}`, 'success');
    } else {
      showToast('Please select a valid CSV file', 'error');
    }
  };
  
  // Handle drag and drop
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        setCsvFile(file);
        setCsvFilePath(file.name);
        showToast(`CSV file selected: ${file.name}`, 'success');
      } else {
        showToast('Please select a valid CSV file', 'error');
      }
    }
  };
  
  // Check CSV URLs against database
  const checkCsvUrls = async () => {
    if (!csvFile && !csvFilePath) {
      showToast('Please select a CSV file first', 'error');
      return;
    }

    try {
      setIsCheckingUrls(true);
      
      let csvContent;
      
      // Get CSV content
      if (csvFile) {
        csvContent = await csvFile.text();
      } else {
        // For existing files, we need to read from the server or use the existing approach
        showToast('Please upload the CSV file to check URLs', 'error');
        return;
      }

      // Call backend to check URLs
      const response = await fetch('http://localhost:5001/api/check-csv-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvContent })
      });

      const data = await response.json();

      if (data.success) {
        setUrlCheckResults(data.urls);
        setShowUrlSelection(true);
        // Initialize range selection with full range
        setRangeStart(1);
        setRangeEnd(data.urls.length);
        showToast(`Found ${data.total} URLs (${data.existing} already scraped, ${data.new} new)`, 'info');
      } else {
        throw new Error(data.error || 'Failed to check URLs');
      }

    } catch (error) {
      console.error('Failed to check CSV URLs:', error);
      showToast(`Failed to check URLs: ${error.message}`, 'error');
    } finally {
      setIsCheckingUrls(false);
    }
  };

  // Toggle URL selection
  const toggleUrlSelection = (index) => {
    setUrlCheckResults(prev => prev.map((result, i) => 
      i === index ? { ...result, selected: !result.selected } : result
    ));
  };

  // Select/deselect all URLs
  const toggleAllUrls = (selected) => {
    setUrlCheckResults(prev => prev.map(result => ({ ...result, selected })));
  };

  // Select URLs within a range
  const selectRange = () => {
    if (rangeStart < 1 || rangeEnd < 1 || rangeStart > urlCheckResults.length || rangeEnd > urlCheckResults.length) {
      showToast(`Range must be between 1 and ${urlCheckResults.length}`, 'error');
      return;
    }
    
    if (rangeStart > rangeEnd) {
      showToast('Start range must be less than or equal to end range', 'error');
      return;
    }
    
    setUrlCheckResults(prev => prev.map((result, index) => ({
      ...result,
      selected: index >= (rangeStart - 1) && index <= (rangeEnd - 1)
    })));
    
    const selectedCount = rangeEnd - rangeStart + 1;
    showToast(`Selected ${selectedCount} URLs (${rangeStart} to ${rangeEnd})`, 'success');
  };

  // Proceed with selected URLs
  const proceedWithSelectedUrls = async () => {
    const selectedUrls = urlCheckResults.filter(result => result.selected).map(result => result.url);
    
    if (selectedUrls.length === 0) {
      showToast('Please select at least one URL to process', 'error');
      return;
    }

    try {
      // Create filtered CSV with selected URLs
      const response = await fetch('http://localhost:5001/api/create-filtered-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedUrls,
          filename: csvFile?.name || csvFilePath
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update the CSV file path to use the filtered file
        setCsvFilePath(data.filename);
        setCsvFile(null); // Clear the file object since we're now using server file
        setShowUrlSelection(false);
        showToast(`Processing ${selectedUrls.length} selected URLs`, 'success');
        
        // Now start the actual batch processing
        startActualBatchProcessing(data.filename);
      } else {
        throw new Error(data.error || 'Failed to create filtered CSV');
      }

    } catch (error) {
      console.error('Failed to create filtered CSV:', error);
      showToast(`Failed to create filtered CSV: ${error.message}`, 'error');
    }
  };
  
  // Start batch processing (main entry point)
  const startBatchProcessing = async () => {
    if (!csvFile && !csvFilePath) {
      showToast('Please select a CSV file or enter a filename', 'error');
      return;
    }

    // If we have URL check results, proceed with selected URLs
    if (urlCheckResults.length > 0) {
      proceedWithSelectedUrls();
      return;
    }

    // Otherwise proceed directly to actual processing
    startActualBatchProcessing();
  };

  // Start batch processing (renamed from original)
  const startActualBatchProcessing = async (filename = null) => {
    const fileToProcess = filename || csvFilePath;
    
    try {
      setOutput(['Preparing to start single-URL processing...']);
      setActiveTab('progress');
      
      let finalFilename = fileToProcess; // Use the passed filename or csvFilePath
      
      // Step 1: Save the CSV file if a file object is selected
      if (csvFile && !filename) { // Only save if we don't already have a filename (from filtered CSV)
        setOutput(prev => [...prev, `Reading CSV file: ${csvFile.name}...`]);
        
        // Read file content
        const csvContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(new Error('Failed to read file'));
          reader.readAsText(csvFile);
        });
        
        setOutput(prev => [...prev, `Saving ${csvFile.name} to chromeExtensionRealtor directory...`]);
        
        const saveResponse = await fetch('http://localhost:5001/api/save-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvContent,
            filename: csvFile.name,
            targetDirectory: 'chromeExtensionRealtor'
          })
        });
        
        const saveData = await saveResponse.json();
        
        if (!saveData.success) {
          throw new Error(saveData.error || 'Failed to save CSV file');
        }
        
        finalFilename = saveData.filename;
        setOutput(prev => [...prev, `✅ File saved successfully: ${finalFilename}`]);
      } else {
        setOutput(prev => [...prev, `Using ${filename ? 'filtered' : 'existing'} file: ${finalFilename}`]);
      }
      
      // Step 2: Start the single-URL processing script
      // Add force flag if we're processing a filtered file (user explicitly selected URLs)
  const forceFlag = filename ? '-f' : ''; // If filename provided, it's from URL selection
  // Use a repo-relative script path; backend will resolve this robustly
  const scriptPath = 'chromeExtensionRealtor/simple_tab_opener.sh';
      
      // Build command args array to avoid shell parsing issues with special characters
      const args = ['-d', tabDelay.toString()];
      if (forceFlag) args.push(forceFlag);
      args.push(finalFilename);
      
      // Send executable and args separately to avoid shell parsing issues
      const commandComponents = {
        executable: scriptPath,
        args: args
      };
      
      setOutput(prev => [...prev, `Starting single-URL processing: ${scriptPath} ${args.join(' ')}`]);
      
    const response = await fetch('http://localhost:5001/api/execute-command-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...commandComponents,
      // workingDir omitted; backend resolves to repo automatically for relative paths
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setProcessId(data.processId);
        setIsProcessing(true);
        
        // Initialize progress stats
        setProgressStats({
          currentUrl: '',
          currentRealtorName: '',
          totalUrls: 0,
          processedUrls: 0,
          successfulUrls: 0,
          failedUrls: 0,
          currentIndex: 0,
          startTime: Date.now(),
          estimatedTimeRemaining: null
        });
        
        // Reset line count to prevent duplicate output
        setLastLineCount(0);
        
        setOutput(prev => [...prev, `✅ Single-URL processing started successfully!`]);
        showToast('Single-URL processing started!', 'success');
        
        // Start polling for output
        pollProcessOutput(data.processId);
      } else {
        throw new Error(data.error || 'Failed to start batch processing');
      }
    } catch (error) {
      console.error('Failed to start batch processing:', error);
      setOutput(prev => [...prev, `❌ Error: ${error.message}`]);
      showToast(`Failed to start batch processing: ${error.message}`, 'error');
    }
  };
  
  // Poll process output
  const pollProcessOutput = async (procId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/process-output/${procId}?lastLines=${lastLineCount}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.output && data.output.length > 0) {
          // Ensure all output items are strings
          const stringOutput = data.output.map(item => 
            typeof item === 'string' ? item : 
            (item && typeof item === 'object' ? JSON.stringify(item) : String(item))
          );
          setOutput(prev => [...prev, ...stringOutput]);
          setLastLineCount(data.totalLines || 0);
          
          // Parse progress information from output
          data.output.forEach(line => {
            // Extract progress stats from output lines
            if (line.includes('Processing URL') || line.includes('Opening URL')) {
              const urlMatch = line.match(/Processing URL (\d+)\/(\d+):\s*(.+)/) || 
                              line.match(/Opening URL (\d+)\/(\d+):\s*(.+)/) ||
                              line.match(/(\d+)\/(\d+).*?(https?:\/\/[^\s]+)/);
              if (urlMatch) {
                const [, current, total, url] = urlMatch;
                setProgressStats(prev => ({
                  ...prev,
                  currentIndex: parseInt(current),
                  totalUrls: parseInt(total),
                  currentUrl: url.trim(),
                  processedUrls: parseInt(current) - 1
                }));
              }
            }
            
            // Extract total URLs from startup
            if (line.includes('Starting batch processing')) {
              const totalMatch = line.match(/(\d+) URLs/);
              if (totalMatch) {
                setProgressStats(prev => ({
                  ...prev,
                  totalUrls: parseInt(totalMatch[1])
                }));
              }
            }
            
            // Extract realtor name from extraction completion
            if (line.includes('SUCCESS! Data extracted') || 
                line.includes('SUCCESS! Data re-extracted') || 
                line.includes('Data extracted') || 
                line.includes('Data re-extracted')) {
              const nameMatch = line.match(/Data (?:re-)?extracted.*?-\s*(.+)/) || 
                              line.match(/SUCCESS.*?-\s*(.+)/) ||
                              line.match(/extracted.*?-\s*([^(]+)/);
              if (nameMatch) {
                const realtorName = nameMatch[1].trim().replace(/"/g, '');
                setLastRealtorInfo({
                  name: realtorName,
                  url: progressStats.currentUrl,
                  timestamp: new Date().toLocaleTimeString(),
                  success: true
                });
                setProgressStats(prev => ({
                  ...prev,
                  currentRealtorName: realtorName,
                  successfulUrls: prev.successfulUrls + 1,
                  processedUrls: prev.processedUrls + 1
                }));
              }
            }
            
            // Also capture from the summary "Last Realtor:" pattern
            if (line.includes('Last Realtor:')) {
              const nameMatch = line.match(/Last Realtor:\s*(.+)/);
              if (nameMatch) {
                const realtorName = nameMatch[1].trim().replace(/"/g, '');
                setLastRealtorInfo(prev => ({
                  ...prev,
                  name: realtorName,
                  timestamp: new Date().toLocaleTimeString(),
                  success: true
                }));
                setProgressStats(prev => ({
                  ...prev,
                  currentRealtorName: realtorName
                }));
              }
            }
            
            // Extract failure information
            if (line.includes('Failed') || line.includes('Error:') || line.includes('timeout') || line.includes('WARNING')) {
              setProgressStats(prev => ({
                ...prev,
                failedUrls: prev.failedUrls + 1,
                processedUrls: prev.processedUrls + 1
              }));
              setLastRealtorInfo(prev => ({
                ...prev,
                url: progressStats.currentUrl,
                timestamp: new Date().toLocaleTimeString(),
                success: false
              }));
            }
            
            // Calculate estimated time remaining
            if (progressStats.startTime && progressStats.processedUrls > 0) {
              const elapsed = Date.now() - progressStats.startTime;
              const avgTimePerUrl = elapsed / progressStats.processedUrls;
              const remaining = (progressStats.totalUrls - progressStats.processedUrls) * avgTimePerUrl;
              setProgressStats(prev => ({
                ...prev,
                estimatedTimeRemaining: Math.round(remaining / 1000) // in seconds
              }));
            }
          });
        }
        
        if (data.isRunning) {
          // Continue polling with reduced frequency to reduce noise
          setTimeout(() => pollProcessOutput(procId), 3000);
        } else {
          // Process finished
          setIsProcessing(false);
          if (data.exitCode === 0) {
            showToast('Batch processing completed successfully!', 'success');
          } else {
            showToast('Batch processing failed. Check output for details.', 'error');
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll process output:', error);
      setTimeout(() => pollProcessOutput(procId), 5000); // Retry after longer delay
    }
  };
  
  // Stop batch processing
  const stopBatchProcessing = async () => {
    if (!processId) return;
    
    // Immediately set UI to stopped state for instant feedback
    setIsProcessing(false);
    showToast('Stopping process...', 'info');
    
    try {
      const response = await fetch(`http://localhost:5001/api/stop-process/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Process stopped immediately!', 'success');
        // Reset progress stats
        setProgressStats({
          currentUrl: '',
          currentRealtorName: '',
          totalUrls: 0,
          processedUrls: 0,
          successfulUrls: 0,
          failedUrls: 0,
          currentIndex: 0,
          startTime: null,
          estimatedTimeRemaining: null
        });
        setOutput(prev => [...prev, '🛑 PROCESS STOPPED BY USER']);
      } else {
        showToast(data.error || 'Failed to stop process', 'error');
        // If stop failed, revert UI state
        setIsProcessing(true);
      }
    } catch (error) {
      console.error('Failed to stop batch processing:', error);
      showToast('Failed to stop process - may have already finished', 'warning');
      // Reset anyway since we can't be sure of the state
      setProgressStats({
        currentUrl: '',
        currentRealtorName: '',
        totalUrls: 0,
        processedUrls: 0,
        successfulUrls: 0,
        failedUrls: 0,
        currentIndex: 0,
        startTime: null,
        estimatedTimeRemaining: null
      });
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Single-URL Processing with Real-Time Detection
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'start', label: 'Start Processing', icon: Play },
              { id: 'progress', label: 'Progress Dashboard', icon: Activity },
              { id: 'instructions', label: 'Instructions', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* URL Selection Interface */}
          {showUrlSelection && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">Select URLs to Process</h3>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Found {urlCheckResults.length} URLs. Select which ones to process:
                </p>
                
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => toggleAllUrls(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => toggleAllUrls(false)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={() => {
                      setUrlCheckResults(prev => prev.map(result => ({ 
                        ...result, 
                        selected: !result.exists 
                      })));
                    }}
                    className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Select New Only
                  </button>
                  
                  {/* Range Selection */}
                  <div className="flex items-center gap-2 ml-4 border-l border-gray-300 dark:border-gray-600 pl-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Range:</span>
                    <input
                      type="number"
                      min="1"
                      max={urlCheckResults.length}
                      value={rangeStart}
                      placeholder="From"
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                      onChange={(e) => setRangeStart(parseInt(e.target.value) || 1)}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">to</span>
                    <input
                      type="number"
                      min="1"
                      max={urlCheckResults.length}
                      value={rangeEnd}
                      placeholder="To"
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                      onChange={(e) => setRangeEnd(parseInt(e.target.value) || urlCheckResults.length)}
                    />
                    <button
                      onClick={selectRange}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Select Range
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="p-2 text-left w-8 text-gray-900 dark:text-gray-100">#</th>
                      <th className="p-2 text-left w-12 text-gray-900 dark:text-gray-100">Select</th>
                      <th className="p-2 text-left text-gray-900 dark:text-gray-100">URL</th>
                      <th className="p-2 text-left w-24 text-gray-900 dark:text-gray-100">Status</th>
                      <th className="p-2 text-left text-gray-900 dark:text-gray-100">Existing Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urlCheckResults.map((result, index) => (
                      <tr key={index} className={`border-t border-gray-200 dark:border-gray-600 ${
                        result.exists 
                          ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                          : 'bg-white dark:bg-gray-800'
                      }`}>
                        <td className="p-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={result.selected}
                            onChange={() => toggleUrlSelection(index)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-2 text-xs break-all text-gray-900 dark:text-gray-100">{result.url}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            result.exists 
                              ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' 
                              : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                          }`}>
                            {result.exists ? 'Exists' : 'New'}
                          </span>
                        </td>
                        <td className="p-2 text-xs">
                          {result.exists ? (
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{result.existingAgent?.name || 'Unknown'}</div>
                              <div className="text-gray-500 dark:text-gray-400">{result.existingAgent?.title || ''}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setShowUrlSelection(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                    {urlCheckResults.filter(r => r.selected).length} of {urlCheckResults.length} selected
                  </span>
                  <button
                    onClick={proceedWithSelectedUrls}
                    disabled={urlCheckResults.filter(r => r.selected).length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Process Selected URLs
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Start Processing Tab */}
          {activeTab === 'start' && !showUrlSelection && (
            <div className="space-y-6">
              {/* File Upload/Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CSV File with URLs
                </label>
                
                {/* File Upload Drag & Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {csvFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {csvFile.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(csvFile.size / 1024 / 1024).toFixed(2)} MB - Ready to process
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCsvFile(null);
                          setCsvFilePath('');
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Drag and drop your CSV file here, or{' '}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        CSV files with Realtor.com URLs - will be automatically copied to the correct directory
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                
                {/* Alternative: File Name Input */}
                <div className="text-center text-sm text-gray-500 mb-2">or</div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={csvFilePath}
                    onChange={(e) => {
                      setCsvFilePath(e.target.value);
                      setCsvFile(null); // Clear file object if typing manually
                    }}
                    placeholder="Enter filename if already in chromeExtensionRealtor directory"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Alternative: Enter filename if your CSV is already in the chromeExtensionRealtor directory
                </p>
              </div>
              
              {/* Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Processing Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tabDelay}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setTabDelay(isNaN(value) ? 2 : value); // Default to 2 if NaN
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Delay between processing each URL</p>
                </div>
                
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (optional)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., florida-realtors, batch-2024, lead-gen"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated tags for organizing</p>
                </div>
              </div>
              
              {/* Single-URL Processing Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Single-URL Processing</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      URLs are processed one at a time with real-time completion detection. You'll hear a notification sound when each URL is successfully processed.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={checkCsvUrls}
                  disabled={(!csvFile && !csvFilePath) || isCheckingUrls}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isCheckingUrls ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Checking URLs...
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-4 h-4" />
                      Check URLs Against Database
                    </>
                  )}
                </button>
                
                <button
                  onClick={startBatchProcessing}
                  disabled={(!csvFile && !csvFilePath) || isProcessing}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Play className="w-5 h-5" />
                  Start Single-URL Processing
                </button>
              </div>
            </div>
          )}
          
          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Processing Dashboard
                </h3>
                {isProcessing && (
                  <button
                    onClick={stopBatchProcessing}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:bg-red-800 active:bg-red-800 transform hover:scale-105 transition-all duration-200 shadow-lg font-semibold"
                    title="Stop processing immediately"
                  >
                    <Square className="w-5 h-5" />
                    STOP NOW
                  </button>
                )}
              </div>
              
              {/* Progress Indicator */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Progress */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <Activity className={`w-5 h-5 ${isProcessing ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
                    Current Progress
                  </h4>
                  
                  {progressStats.totalUrls > 0 && (
                    <>
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300 mb-1">
                          <span>URLs Processed</span>
                          <span>{progressStats.processedUrls} / {progressStats.totalUrls}</span>
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressStats.totalUrls > 0 ? (progressStats.processedUrls / progressStats.totalUrls) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <div className="text-center text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          {progressStats.totalUrls > 0 ? Math.round((progressStats.processedUrls / progressStats.totalUrls) * 100) : 0}% Complete
                        </div>
                      </div>
                      
                      {/* Current URL */}
                      {progressStats.currentUrl && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Currently Processing:</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400 break-all bg-white dark:bg-blue-950/50 p-2 rounded border">
                            {progressStats.currentUrl}
                          </div>
                        </div>
                      )}

                      {/* Extraction Progress Status */}
                      {isProcessing && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-purple-800 dark:text-purple-200">Extension Status:</div>
                          <div className="text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 p-2 rounded border">
                            {output.length > 0 ? (
                              <div className="space-y-1">
                                {output.slice(-3).map((line, index) => {
                                  // Convert line to string if it's an object
                                  const lineText = typeof line === 'string' ? line : 
                                    (line && typeof line === 'object' ? JSON.stringify(line) : String(line));
                                  
                                  return (
                                    <div key={index} className="text-xs">
                                      {lineText.includes('🔄') ? (
                                        <span className="text-blue-600 dark:text-blue-400">{lineText}</span>
                                      ) : lineText.includes('✅') ? (
                                        <span className="text-green-600 dark:text-green-400">{lineText}</span>
                                      ) : lineText.includes('❌') ? (
                                        <span className="text-red-600 dark:text-red-400">{lineText}</span>
                                      ) : (
                                        <span>{lineText}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">Waiting for extension response...</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">{progressStats.successfulUrls}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Successful</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-600 dark:text-red-400">{progressStats.failedUrls}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {progressStats.estimatedTimeRemaining ? `${Math.floor(progressStats.estimatedTimeRemaining / 60)}:${(progressStats.estimatedTimeRemaining % 60).toString().padStart(2, '0')}` : '--:--'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">ETA</div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {!isProcessing && progressStats.totalUrls === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      Start processing to see progress metrics
                    </div>
                  )}
                </div>
                
                {/* Last Realtor Scraped */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Last Realtor Scraped
                  </h4>
                  
                  {lastRealtorInfo.name || lastRealtorInfo.url ? (
                    <div className="space-y-3">
                      {lastRealtorInfo.name && (
                        <div>
                          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Name:</div>
                          <div className="text-emerald-700 dark:text-emerald-300 font-medium">{lastRealtorInfo.name}</div>
                        </div>
                      )}
                      
                      {lastRealtorInfo.url && (
                        <div>
                          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">URL:</div>
                          <div className="text-sm text-emerald-600 dark:text-emerald-400 break-all bg-white dark:bg-emerald-950/50 p-2 rounded border">
                            {lastRealtorInfo.url}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Status:</div>
                          <div className={`text-sm font-medium ${lastRealtorInfo.success ? 'text-green-600' : 'text-red-600'}`}>
                            {lastRealtorInfo.success ? '✅ Success' : '❌ Failed'}
                          </div>
                        </div>
                        {lastRealtorInfo.timestamp && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Time:</div>
                            <div className="text-sm text-emerald-600 dark:text-emerald-400">{lastRealtorInfo.timestamp}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      No realtor data extracted yet
                    </div>
                  )}
                </div>
              </div>
              
              {/* Live Output */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Live Output</h4>
                <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-72 overflow-y-auto">
                  <div ref={outputRef}>
                    {output.length > 0 ? (
                      output.map((line, index) => {
                        // Convert line to string if it's an object
                        const lineText = typeof line === 'string' ? line : 
                          (line && typeof line === 'object' ? JSON.stringify(line) : String(line));
                        
                        return (
                          <div key={index} className="mb-1">
                            {lineText}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-500">
                        {isProcessing ? 'Starting process...' : 'No output yet. Start a batch to see progress here.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {isProcessing && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-blue-800 dark:text-blue-200">
                      Processing URL... Chrome Extension is extracting data from the opened page.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  How Single-URL Processing Works
                </h3>
                <div className="prose dark:prose-invert max-w-none">
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>
                      <strong>Upload your CSV file</strong> - Contains Realtor.com URLs. File is automatically copied to the correct directory.
                    </li>
                    <li>
                      <strong>Configure settings</strong> - Set processing delay (pause between URLs) and optional tags for organization.
                    </li>
                    <li>
                      <strong>Start processing</strong> - Opens one URL at a time in your browser and waits for completion.
                    </li>
                    <li>
                      <strong>Real-time polling</strong> - System checks every 2 seconds to detect when extraction is complete.
                    </li>
                    <li>
                      <strong>Audio notifications</strong> - Plays a sound when each URL is successfully processed.
                    </li>
                    <li>
                      <strong>Monitor progress</strong> - Watch live output with real-time timing and completion status.
                    </li>
                  </ol>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Important Prerequisites
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• Chrome Extension must be loaded and working</li>
                      <li>• Backend service must be running on port 5001</li>
                      <li>• CSV file must be in the chromeExtensionRealtor directory</li>
                      <li>• Chrome/Firefox must be set as your default browser</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                      Why This Approach Works Best
                    </h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• No browser automation detection by Realtor.com</li>
                      <li>• Works like natural user behavior (clicking links)</li>
                      <li>• Reliable and consistent processing</li>
                      <li>• Easy to monitor and control</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Recommended Processing Speeds
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    <div className="font-medium">Slow & Reliable</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Delay: 5s between URLs
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    <div className="font-medium">Balanced (Default)</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Delay: 2s between URLs
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    <div className="font-medium">Fast Processing</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Delay: 1s between URLs
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              � Single-URL processing with real-time completion detection and audio notifications
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleBatchModal;
