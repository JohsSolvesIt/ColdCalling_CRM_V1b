import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, X, Play, Square, Download, RotateCcw, 
  FileText, Clock, CheckCircle, XCircle, AlertCircle,
  Users, Activity, Tag, Settings
} from 'lucide-react';

const BatchProcessingModal = ({ isOpen, onClose, showToast }) => {
  // Form state
  const [csvFile, setCsvFile] = useState(null);
  const [batchSize, setBatchSize] = useState(5);
  const [tabDelay, setTabDelay] = useState(3);
  const [batchDelay, setBatchDelay] = useState(15);
  const [tags, setTags] = useState('');
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [progress, setProgress] = useState(null);
  const [logs, setLogs] = useState([]);
  const [batches, setBatches] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('start'); // start, progress, history
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  // Load batch history on open
  useEffect(() => {
    if (isOpen) {
      loadBatchHistory();
    }
  }, [isOpen]);
  
  // Poll progress when processing
  useEffect(() => {
    if (isProcessing && currentBatch) {
      progressIntervalRef.current = setInterval(() => {
        pollBatchProgress();
      }, 2000);
      
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [isProcessing, currentBatch]);
  
  // Load batch history
  const loadBatchHistory = async () => {
    try {
      const response = await fetch('/api/batch/list');
      const data = await response.json();
      
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (error) {
      console.error('Failed to load batch history:', error);
    }
  };
  
  // Poll batch progress
  const pollBatchProgress = async () => {
    if (!currentBatch) return;
    
    try {
      const response = await fetch(`/api/batch/status/${currentBatch.id}`);
      const data = await response.json();
      
      if (data.success && data.batch) {
        setProgress(data.batch.progress);
        
        // Check if batch completed
        if (data.batch.status === 'completed' || data.batch.status === 'failed') {
          setIsProcessing(false);
          
          if (data.batch.status === 'completed') {
            showToast('Batch processing completed successfully!', 'success');
          } else {
            showToast('Batch processing failed. Check logs for details.', 'error');
          }
          
          // Reload batch history
          loadBatchHistory();
        }
      }
    } catch (error) {
      console.error('Failed to poll batch progress:', error);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
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
      } else {
        showToast('Please select a valid CSV file', 'error');
      }
    }
  };
  
  // Start batch processing
  const startBatchProcessing = async () => {
    if (!csvFile) {
      showToast('Please select a CSV file first', 'error');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('batchSize', batchSize.toString());
      formData.append('tabDelay', tabDelay.toString());
      formData.append('batchDelay', batchDelay.toString());
      formData.append('tags', tags);
      
      const response = await fetch('/api/batch/start', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentBatch({ id: data.batchId });
        setIsProcessing(true);
        setActiveTab('progress');
        showToast('Batch processing started!', 'success');
      } else {
        showToast(data.error || 'Failed to start batch processing', 'error');
      }
    } catch (error) {
      console.error('Failed to start batch processing:', error);
      showToast('Failed to start batch processing', 'error');
    }
  };
  
  // Stop batch processing
  const stopBatchProcessing = async () => {
    if (!currentBatch) return;
    
    try {
      const response = await fetch(`/api/batch/stop/${currentBatch.id}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsProcessing(false);
        showToast('Batch processing stopped', 'info');
        loadBatchHistory();
      } else {
        showToast(data.error || 'Failed to stop batch processing', 'error');
      }
    } catch (error) {
      console.error('Failed to stop batch processing:', error);
      showToast('Failed to stop batch processing', 'error');
    }
  };
  
  // Format duration
  const formatDuration = (startTime, endTime = null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };
  
  // Render progress bar
  const renderProgressBar = (progress) => {
    if (!progress || progress.total === 0) return null;
    
    const percentage = Math.round((progress.processed / progress.total) * 100);
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress: {progress.processed}/{progress.total} URLs</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          <div className="text-green-600">
            <div className="font-medium">{progress.successful}</div>
            <div>Successful</div>
          </div>
          <div className="text-yellow-600">
            <div className="font-medium">{progress.skipped}</div>
            <div>Skipped</div>
          </div>
          <div className="text-red-600">
            <div className="font-medium">{progress.failed}</div>
            <div>Failed</div>
          </div>
          <div className="text-blue-600">
            <div className="font-medium">{progress.total - progress.processed}</div>
            <div>Remaining</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render status badge
  const renderStatusBadge = (status) => {
    const statusConfig = {
      starting: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Starting' },
      running: { icon: Activity, color: 'bg-blue-100 text-blue-800', label: 'Running' },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Failed' },
      stopped: { icon: Square, color: 'bg-gray-100 text-gray-800', label: 'Stopped' }
    };
    
    const config = statusConfig[status] || statusConfig.failed;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
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
              Batch URL Processing
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
              { id: 'start', label: 'Start Batch', icon: Play },
              { id: 'progress', label: 'Progress', icon: Activity },
              { id: 'history', label: 'History', icon: FileText }
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
          {/* Start Batch Tab */}
          {activeTab === 'start' && (
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CSV File with URLs
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {csvFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {csvFile.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(csvFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <button
                        onClick={() => setCsvFile(null)}
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
                          className="text-blue-600 hover:text-blue-800"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        CSV files with Realtor.com URLs only
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
              </div>
              
              {/* Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">URLs to open per batch</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tab Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={tabDelay}
                    onChange={(e) => setTabDelay(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Delay between opening tabs</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Batch Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={batchDelay}
                    onChange={(e) => setBatchDelay(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Wait time for processing</p>
                </div>
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
                <p className="text-xs text-gray-500 mt-1">Comma-separated tags for organizing batches</p>
              </div>
              
              {/* Start Button */}
              <div className="flex justify-end">
                <button
                  onClick={startBatchProcessing}
                  disabled={!csvFile || isProcessing}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Play className="w-5 h-5" />
                  Start Batch Processing
                </button>
              </div>
            </div>
          )}
          
          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {isProcessing && currentBatch ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Current Batch: {currentBatch.id}
                    </h3>
                    <button
                      onClick={stopBatchProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                  </div>
                  
                  {progress && renderProgressBar(progress)}
                  
                  <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Processing Status</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 animate-spin" />
                          Processing batch... Chrome Extension is extracting data from opened tabs.
                        </div>
                      ) : (
                        'No active batch processing'
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Active Batch
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Start a new batch from the "Start Batch" tab to see progress here.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Batch History
                </h3>
                <button
                  onClick={loadBatchHistory}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <RotateCcw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              
              {batches.length > 0 ? (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div 
                      key={batch.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {batch.id}
                          </span>
                          {renderStatusBadge(batch.status)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDuration(batch.startTime, batch.endTime)}
                        </span>
                      </div>
                      
                      {batch.progress && (
                        <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                          <div>
                            <span className="text-gray-500">Total:</span> {batch.progress.total}
                          </div>
                          <div>
                            <span className="text-green-600">Success:</span> {batch.progress.successful}
                          </div>
                          <div>
                            <span className="text-yellow-600">Skipped:</span> {batch.progress.skipped}
                          </div>
                          <div>
                            <span className="text-red-600">Failed:</span> {batch.progress.failed}
                          </div>
                        </div>
                      )}
                      
                      {batch.tags && batch.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {batch.tags.map((tag, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Batch History
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Completed batches will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              💡 The simple tab opener avoids automation detection and works reliably with Realtor.com
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

export default BatchProcessingModal;
