// Popup script for Realtor Data Extractor
class NotificationManager {
  static show(message, type = 'info', actions = []) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) return;

    // Clear existing notifications
    notificationArea.innerHTML = '';

    const notification = document.createElement('div');
    notification.className = `notification ${type} show`;
    
    let actionsHtml = '';
    if (actions.length > 0) {
      actionsHtml = `
        <div class="notification-actions">
          ${actions.map((action, index) => 
            `<button class="notification-btn ${action.type || 'secondary'}" data-action="${index}">
              ${action.text}
            </button>`
          ).join('')}
        </div>
      `;
    }

    notification.innerHTML = `
      <div class="notification-header">${message.title || 'Notification'}</div>
      <div>${message.body || message}</div>
      ${actionsHtml}
    `;

    // Add action handlers
    if (actions.length > 0) {
      notification.querySelectorAll('.notification-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
          if (actions[index].callback) {
            actions[index].callback();
          }
          NotificationManager.hide();
        });
      });
    }

    notificationArea.appendChild(notification);

    // Auto-hide after 5 seconds for info/success messages
    if (type === 'info' || type === 'success') {
      setTimeout(() => NotificationManager.hide(), 5000);
    }
  }

  static hide() {
    const notificationArea = document.getElementById('notification-area');
    if (notificationArea) {
      notificationArea.innerHTML = '';
    }
  }

  static showDuplicateAgent(agentName, onProceed, onCancel, existingAgent = null) {
    let bodyText = `Agent "${agentName}" already exists in the database.`;
    
    if (existingAgent) {
      bodyText += `\n\nDetails:\n` +
        `• Last scraped: ${new Date(existingAgent.lastScraped).toLocaleDateString()}\n` +
        `• Current properties: ${existingAgent.totalProperties || 'Unknown'}\n` +
        `• Company: ${existingAgent.company || 'N/A'}`;
    }
    
    bodyText += `\n\nWould you like to proceed and update the existing record?`;
    
    this.show(
      {
        title: '🚨 Duplicate Agent Detected',
        body: bodyText
      },
      'duplicate',
      [
        {
          text: 'Update Record',
          type: 'primary',
          callback: onProceed
        },
        {
          text: 'Skip Update',
          type: 'secondary',
          callback: onCancel
        }
      ]
    );
  }
}

class PopupController {
  constructor() {
    this.lastExtractedData = null;
    this.currentTab = null;
    this.init();
  }

  async init() {
    // Get current tab info
    await this.getCurrentTab();
    this.updateUI();
    this.setupEventListeners();
    this.loadSettings();
    
    // Initialize database connection check
    this.checkDatabaseConnection();
    
    // Set up message listener for duplicate notifications
    this.setupMessageListener();
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      // Update URL display
      const urlElement = document.getElementById('current-url');
      if (urlElement) {
        urlElement.textContent = `Current: ${tab.url}`;
      }
      
      return tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
      this.showStatus('Error getting current tab', 'error');
    }
  }

  updateUI() {
    const isRealtorPage = this.currentTab?.url?.includes('realtor.com');
    const extractBtn = document.getElementById('extract-btn');
    const statusMessage = document.getElementById('status-message');
    
    if (!isRealtorPage) {
      extractBtn.disabled = true;
      statusMessage.textContent = 'Please navigate to a Realtor.com page';
      statusMessage.className = 'status error';
    } else {
      extractBtn.disabled = false;
      statusMessage.textContent = 'Ready to extract data from Realtor.com';
      statusMessage.className = 'status success';
    }
  }

  setupEventListeners() {
    // Extract button
    document.getElementById('extract-btn').addEventListener('click', () => {
      this.extractData();
    });

    // Copy button
    document.getElementById('copy-btn').addEventListener('click', () => {
      this.copyToClipboard();
    });

    // Download JSON button
    document.getElementById('download-json-btn').addEventListener('click', () => {
      this.downloadData('json');
    });

    // Download CSV button
    document.getElementById('download-csv-btn').addEventListener('click', () => {
      this.downloadData('csv');
    });

    // Settings checkboxes
    document.getElementById('auto-extract').addEventListener('change', (e) => {
      this.saveSetting('autoExtract', e.target.checked);
    });

    document.getElementById('show-notifications').addEventListener('change', (e) => {
      this.saveSetting('showNotifications', e.target.checked);
    });

    // Profile picture button
    document.getElementById('profile-pic-btn').addEventListener('click', () => {
      console.log('🖱️ PROFILE PIC BUTTON CLICKED!');
      this.showProfilePictureModal();
    });

    // Modal event listeners
    this.setupModalEventListeners();
  }

  setupMessageListener() {
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'SHOW_DUPLICATE_NOTIFICATION') {
        const existingAgent = request.agent;
        
        NotificationManager.showDuplicateAgent(
          existingAgent.name,
          () => {
            // User chose to proceed
            sendResponse({ proceed: true });
          },
          () => {
            // User chose to cancel
            sendResponse({ proceed: false });
          },
          existingAgent
        );
        
        // Return true to indicate we'll send response asynchronously
        return true;
      }
    });
  }

  async extractData() {
    try {
      this.showStatus('Extracting data...', 'info');
      const extractBtn = document.getElementById('extract-btn');
      extractBtn.disabled = true;
      extractBtn.textContent = 'Extracting...';

      // First, let's check if we're on a Realtor.com page
      console.log('🔍 Current tab URL:', this.currentTab.url);
      
      if (!this.currentTab.url.includes('realtor.com')) {
        throw new Error('Not on a Realtor.com page');
      }

      // Try to inject content script manually if it's not already loaded
      console.log('💉 Attempting to inject content script...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          files: ['content.js']
        });
        console.log('✅ Content script injected successfully');
      } catch (injectionError) {
        console.warn('⚠️ Content script injection failed:', injectionError);
        // Continue anyway - it might already be loaded
      }

      // Poll for content script readiness instead of fixed delay
      console.log('⏳ Polling for content script readiness...');
      let attempts = 0;
      const maxAttempts = 20;
      let scriptReady = false;

      while (attempts < maxAttempts && !scriptReady) {
        try {
          // Try to ping the content script
          await chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' });
          scriptReady = true;
          console.log(`✅ Content script ready after ${attempts} attempts`);
        } catch (pingError) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      if (!scriptReady) {
        console.warn('⚠️ Content script ping timeout - proceeding anyway');
      }

      // Send message to content script
      console.log('📤 Sending message to content script on tab:', this.currentTab.id);
      console.log('📍 Tab URL:', this.currentTab.url);
      
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractData'
      });
      
      console.log('📥 Response from content script:', response);

      if (response && response.success) {
        this.lastExtractedData = response; // Store the full response including propertyRows
        this.showStatus('Data extracted successfully!', 'success');
        this.updateDataSummary(response);
        this.enableDownloadButtons();
        
        // Store in chrome storage for persistence
        await chrome.storage.local.set({
          lastExtraction: {
            data: response,
            timestamp: Date.now(),
            url: this.currentTab.url
          }
        });
      } else {
        const errorMsg = response?.error || 'Failed to extract data';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      let errorMessage = 'Error extracting data. ';
      
      // Provide more specific error messages
      if (error.message.includes('receiving end does not exist')) {
        errorMessage += 'Content script not loaded. Try refreshing the page.';
      } else if (error.message.includes('Not on a Realtor.com page')) {
        errorMessage += 'Make sure you\'re on a Realtor.com page.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Make sure you\'re on a Realtor.com page.';
      }
      
      this.showStatus(errorMessage, 'error');
    } finally {
      const extractBtn = document.getElementById('extract-btn');
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract Data';
    }
  }

  updateDataSummary(response) {
    const summarySection = document.getElementById('data-summary-section');
    const summaryElement = document.getElementById('data-summary');
    
    if (!summaryElement) return;

    const summary = this.generateDataSummary(response);
    summaryElement.innerHTML = summary;
    summarySection.style.display = 'block';
  }

  generateDataSummary(response) {
    console.log('🔍 Generating comprehensive data summary from:', response);
    
    // Handle different response formats
    const data = response.data || response;
    const summary = response.summary || {};
    const propertyRows = response.propertyRows || [];
    
    let html = '<div class="comprehensive-summary">';
    
    // AGENT INFORMATION SECTION
    html += '<div class="info-section">';
    html += '<h3>👤 Agent Information</h3>';
    
    const agent = data.agent || {};
    
    // Agent photo if available
    if (agent.photo || data.images?.agentPhoto) {
      const photoUrl = agent.photo || data.images.agentPhoto;
      html += `<img src="${photoUrl}" class="agent-photo" alt="Agent Photo" onerror="this.style.display='none'">`;
    }
    
    html += `<div class="info-row"><span class="info-label">Full Name:</span><span class="info-value">${agent.name || summary.agent || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Experience:</span><span class="info-value">${agent.experience || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Rating:</span><span class="info-value">${agent.rating || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Languages:</span><span class="info-value">${agent.languages || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">License #:</span><span class="info-value">${agent.license || '<span class="no-data">Not found</span>'}</span></div>`;
    
    if (agent.bio) {
      const bioText = agent.bio.length > 300 ? agent.bio.substring(0, 300) + '...' : agent.bio;
      html += `<div class="info-row"><span class="info-label">Biography:</span><span class="info-value">${bioText}</span></div>`;
    } else {
      html += `<div class="info-row"><span class="info-label">Biography:</span><span class="info-value"><span class="no-data">Not found</span></span></div>`;
    }
    
    html += '</div>';
    
    // CONTACT INFORMATION SECTION
    html += '<div class="info-section">';
    html += '<h3>📞 Contact Information</h3>';
    
    const contact = data.contact || {};
    html += `<div class="info-row"><span class="info-label">Primary Phone:</span><span class="info-value">${contact.phone || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Mobile Phone:</span><span class="info-value">${contact.mobilePhone || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Email Address:</span><span class="info-value">${contact.email ? `<a href="mailto:${contact.email}">${contact.email}</a>` : '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Website:</span><span class="info-value">${contact.website ? `<a href="${contact.website}" target="_blank">${contact.website}</a>` : '<span class="no-data">Not found</span>'}</span></div>`;
    
    html += '</div>';
    
    // OFFICE INFORMATION SECTION
    html += '<div class="info-section">';
    html += '<h3>🏢 Office Information</h3>';
    
    const office = data.office || {};
    html += `<div class="info-row"><span class="info-label">Office Name:</span><span class="info-value">${office.name || contact.officeName || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Office Address:</span><span class="info-value">${office.address || contact.officeAddress || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Office Phone:</span><span class="info-value">${office.phone || contact.officePhone || '<span class="no-data">Not found</span>'}</span></div>`;
    
    html += '</div>';
    
    // PROPERTY LISTINGS SECTION
    html += '<div class="info-section">';
    html += '<h3>🏘️ Property Listings</h3>';
    
    const activeListings = data.listings?.active || [];
    const soldListings = data.listings?.sold || [];
    const allProperties = [...activeListings, ...soldListings];
    
    html += `<div class="info-row"><span class="info-label">Active Listings:</span><span class="info-value">${summary.activeListings || activeListings.length || 0}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Sold Listings:</span><span class="info-value">${summary.soldListings || soldListings.length || 0}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Total Properties:</span><span class="info-value">${allProperties.length || 0}</span></div>`;
    
    if (propertyRows.length > 0) {
      html += `<div class="info-row"><span class="info-label">Property Rows:</span><span class="info-value">${propertyRows.length}</span></div>`;
    }
    
    // Display property images if available
    const images = data.images || {};
    if (images.propertyImages && images.propertyImages.length > 0) {
      html += `<div class="info-row"><span class="info-label">Property Images:</span><span class="info-value"><span class="image-count">${images.propertyImages.length}</span></span></div>`;
      html += '<div class="property-images">';
      images.propertyImages.slice(0, 12).forEach((imageUrl, index) => {
        html += `<img src="${imageUrl}" class="property-image" alt="Property ${index + 1}" title="Property Image ${index + 1}" onerror="this.style.display='none'">`;
      });
      html += '</div>';
    }
    
    if (images.allPropertyPhotos && images.allPropertyPhotos.allUrls && images.allPropertyPhotos.allUrls.length > 0) {
      html += `<div class="info-row"><span class="info-label">Additional Photos:</span><span class="info-value"><span class="image-count">${images.allPropertyPhotos.allUrls.length}</span></span></div>`;
      html += '<div class="property-images">';
      images.allPropertyPhotos.allUrls.slice(0, 8).forEach((imageUrl, index) => {
        html += `<img src="${imageUrl}" class="property-image" alt="Property Photo ${index + 1}" title="Property Photo ${index + 1}" onerror="this.style.display='none'">`;
      });
      html += '</div>';
    }
    
    html += '</div>';
    
    // REVIEWS & RECOMMENDATIONS SECTION
    html += '<div class="info-section">';
    html += '<h3>⭐ Reviews & Recommendations</h3>';
    
    const reviews = data.reviews || {};
    const recommendations = data.recommendations || reviews.recommendations || [];
    
    html += `<div class="info-row"><span class="info-label">Overall Rating:</span><span class="info-value">${reviews.overall?.rating || summary.rating || '<span class="no-data">Not found</span>'}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Review Count:</span><span class="info-value">${reviews.overall?.count || reviews.count || 0}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Recommendations:</span><span class="info-value">${recommendations.length || 0}</span></div>`;
    
    // Show actual recommendations if available
    if (recommendations && recommendations.length > 0) {
      html += '<div class="reviews-section">';
      html += `<strong>Recent Recommendations (${recommendations.length}):</strong>`;
      
      recommendations.slice(0, 5).forEach((rec, index) => {
        const reviewText = rec.text || rec.review || rec.content || 'No review text';
        const previewText = reviewText.length > 200 ? reviewText.substring(0, 200) + '...' : reviewText;
        html += `<div class="review-item">
          <div class="review-text">"${previewText}"</div>
          <div class="review-author">— ${rec.author || rec.name || 'Anonymous'}</div>
        </div>`;
      });
      
      if (recommendations.length > 5) {
        html += `<div style="text-align: center; color: #7f8c8d; font-size: 11px; margin-top: 8px;">... and ${recommendations.length - 5} more reviews</div>`;
      }
      
      html += '</div>';
    }
    
    html += '</div>';
    
    // EXTRACTION METADATA SECTION
    html += '<div class="info-section">';
    html += '<h3>📊 Extraction Details</h3>';
    
    html += `<div class="info-row"><span class="info-label">Extraction Time:</span><span class="info-value">${response.timestamp || new Date().toLocaleString()}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Source URL:</span><span class="info-value"><a href="${response.url || window.location?.href}" target="_blank">${response.url || window.location?.href || 'Unknown'}</a></span></div>`;
    html += `<div class="info-row"><span class="info-label">Success Status:</span><span class="info-value">${response.success ? '✅ Success' : '❌ Failed'}</span></div>`;
    
    if (data.metadata) {
      html += `<div class="info-row"><span class="info-label">Duration:</span><span class="info-value">${Math.round(data.metadata.totalDuration/1000)}s</span></div>`;
      
      if (data.metadata.errors && Object.keys(data.metadata.errors).length > 0) {
        html += `<div class="info-row"><span class="info-label">Errors:</span><span class="info-value" style="color: #e74c3c;">${Object.keys(data.metadata.errors).join(', ')}</span></div>`;
      }
    }
    
    // Show image summary if available
    if (images) {
      const totalImages = (images.propertyImages?.length || 0) + 
                         (images.galleryImages?.length || 0) + 
                         (images.allPropertyPhotos?.allUrls?.length || 0);
      if (totalImages > 0) {
        html += `<div class="info-row"><span class="info-label">Total Images:</span><span class="info-value">${totalImages}</span></div>`;
      }
    }
    
    html += '</div>';
    html += '</div>'; // Close comprehensive-summary
    
    return html;
  }

  enableDownloadButtons() {
    document.getElementById('copy-btn').disabled = false;
    document.getElementById('download-json-btn').disabled = false;
    document.getElementById('download-csv-btn').disabled = false;
  }

  async copyToClipboard() {
    if (!this.lastExtractedData) {
      this.showStatus('No data to copy', 'error');
      return;
    }

    try {
      const jsonString = JSON.stringify(this.lastExtractedData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      this.showStatus('Data copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy error:', error);
      this.showStatus('Failed to copy to clipboard', 'error');
    }
  }

  downloadData(format) {
    if (!this.lastExtractedData) {
      this.showStatus('No data to download', 'error');
      return;
    }

    try {
      let content, filename, mimeType;
      
      if (format === 'json') {
        content = JSON.stringify(this.lastExtractedData, null, 2);
        filename = `realtor-data-${Date.now()}.json`;
        mimeType = 'application/json';
      } else if (format === 'csv') {
        // Use property columns format (new) if available, otherwise fall back to rows
        if (this.lastExtractedData.propertyColumns && this.lastExtractedData.propertyColumns.length > 0) {
          content = this.convertPropertyColumnsToCSV(this.lastExtractedData.propertyColumns);
        } else if (this.lastExtractedData.propertyRows && this.lastExtractedData.propertyRows.length > 0) {
          content = this.convertPropertyRowsToCSV(this.lastExtractedData.propertyRows);
        } else {
          content = this.convertObjectToCSV(this.lastExtractedData);
        }
        filename = `realtor-data-${Date.now()}.csv`;
        mimeType = 'text/csv';
      }

      this.downloadFile(content, filename, mimeType);
      this.showStatus(`${format.toUpperCase()} file downloaded!`, 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showStatus('Failed to download file', 'error');
    }
  }

  convertPropertyColumnsToCSV(propertyColumns) {
    if (!propertyColumns || propertyColumns.length === 0) {
      return 'No data available';
    }

    const rows = [];
    
    // Get headers from the first row
    const headers = Object.keys(propertyColumns[0]);
    rows.push(headers.join(','));
    
    // Convert the single row with multiple property columns to CSV
    propertyColumns.forEach(rowData => {
      const values = headers.map(header => {
        let value = rowData[header] || '';
        
        // Handle special formatting
        if (typeof value === 'string') {
          // Clean up the value and escape quotes
          value = value.replace(/"/g, '""');
          
          // Wrap in quotes if it contains commas, quotes, or newlines
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }
        
        return value;
      });
      
      rows.push(values.join(','));
    });
    
    return rows.join('\n');
  }

  convertPropertyRowsToCSV(propertyRows) {
    if (!propertyRows || propertyRows.length === 0) {
      return 'No data available';
    }

    const rows = [];
    
    // Get headers from the first row
    const headers = Object.keys(propertyRows[0]);
    rows.push(headers.join(','));
    
    // Convert each property row to CSV
    propertyRows.forEach(propertyRow => {
      const values = headers.map(header => {
        let value = propertyRow[header];
        
        // Handle different data types
        if (value === null || value === undefined) {
          return '';
        }
        
        // Convert to string and clean
        value = String(value);
        
        // Clean text for better CSV output
        if (value.length > 500) {
          value = value.substring(0, 500) + '...';
        }
        
        // Remove problematic characters
        value = value.replace(/[\r\n]/g, ' ').replace(/"/g, '""');
        
        // Escape commas and quotes in CSV
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        
        return value;
      });
      rows.push(values.join(','));
    });
    
    return rows.join('\n');
  }

  convertObjectToCSV(data) {
    // Fallback method for old data format
    const flatData = this.flattenObject(data);
    const headers = Object.keys(flatData);
    const values = headers.map(header => {
      let value = flatData[header];
      
      if (value === null || value === undefined) {
        return '';
      }
      
      value = String(value);
      
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    return headers.join(',') + '\n' + values.join(',');
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (value === null || value === undefined) {
          flattened[newKey] = '';
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            flattened[newKey] = '';
          } else {
            const stringValues = value.map(item => {
              if (typeof item === 'object' && item !== null) {
                return JSON.stringify(item);
              }
              return String(item);
            });
            flattened[newKey] = stringValues.join('; ');
          }
        } else if (typeof value === 'object') {
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      }
    }
    
    return flattened;
  }

  downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      console.log('📁 Starting download from popup...', { filename, contentLength: content.length });
      
      // Try chrome downloads API first
      if (chrome && chrome.downloads) {
        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.log('Chrome downloads API failed, trying fallback:', chrome.runtime.lastError);
            this.downloadFallback(blob, filename, url);
          } else {
            console.log('✅ Download started with ID:', downloadId);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        });
      } else {
        // Fallback method
        this.downloadFallback(blob, filename, url);
      }
    } catch (error) {
      console.error('Download failed:', error);
      this.showStatus('❌ Download failed! Check console for details.', 'error');
    }
  }

  downloadFallback(blob, filename, url) {
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ Fallback download triggered');
      
    } catch (error) {
      console.error('Fallback download failed:', error);
      this.showStatus('❌ Download failed', 'error');
      URL.revokeObjectURL(url);
    }
  }

  convertToCSV(data) {
    const rows = [];
    const flatData = this.flattenObject(data);
    
    // Headers
    const headers = Object.keys(flatData);
    rows.push(headers.join(','));
    
    // Values
    const values = headers.map(header => {
      const value = flatData[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    rows.push(values.join(','));
    
    return rows.join('\n');
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else if (Array.isArray(obj[key])) {
          flattened[newKey] = obj[key].join('; ');
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        autoExtract: true,
        showNotifications: true
      });
      
      document.getElementById('auto-extract').checked = result.autoExtract;
      document.getElementById('show-notifications').checked = result.showNotifications;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSetting(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  }

  async checkDatabaseConnection() {
    try {
      const response = await fetch('http://localhost:5001/health');
      const isConnected = response.ok;
      
      this.updateDatabaseStatus(isConnected);
      
      if (isConnected) {
        // Get and display statistics
        this.loadDatabaseStats();
      }
    } catch (error) {
      console.log('Database service not available:', error.message);
      this.updateDatabaseStatus(false);
    }
  }

  updateDatabaseStatus(isConnected) {
    const statusElement = document.getElementById('database-status');
    const statsElement = document.getElementById('database-stats');
    
    if (isConnected) {
      statusElement.className = 'database-status connected';
      statusElement.innerHTML = `
        <div class="status-dot green"></div>
        <span>Connected to PostgreSQL</span>
      `;
      statsElement.style.display = 'grid';
    } else {
      statusElement.className = 'database-status disconnected';
      statusElement.innerHTML = `
        <div class="status-dot red"></div>
        <span>Database disconnected</span>
      `;
      statsElement.style.display = 'none';
    }
  }

  async loadDatabaseStats() {
    try {
      const response = await fetch('http://localhost:5001/api/stats');
      if (!response.ok) throw new Error('Failed to load stats');
      
      const data = await response.json();
      if (data.success) {
        const stats = data.stats;
        
        document.getElementById('total-agents').textContent = stats.totalAgents || 0;
        document.getElementById('total-properties').textContent = stats.totalProperties || 0;
        document.getElementById('recent-extractions').textContent = stats.recentExtractions || 0;
        document.getElementById('avg-properties').textContent = 
          stats.avgPropertiesPerAgent ? Math.round(stats.avgPropertiesPerAgent) : 0;
      }
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  }

  // Profile Picture Modal Methods
  setupModalEventListeners() {
    const modal = document.getElementById('profile-pic-modal');
    const cancelBtn = document.getElementById('modal-cancel');
    const resolutionBtns = document.querySelectorAll('.resolution-btn');

    // Resolution selection - directly copy to clipboard
    resolutionBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        console.log('🖱️ RESOLUTION BUTTON CLICKED!', btn.dataset.resolution);
        const resolution = btn.dataset.resolution;
        
        try {
          // Get the current profile picture URL from the page
          const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
          const results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
              // Find profile picture on the page
              const selectors = [
                'img[src*="rdcpix.com"]',
                'img[src*="realtor.com"]',
                '.ProfilePhoto img',
                '.agent-photo img'
              ];
              
              for (const selector of selectors) {
                const imgs = document.querySelectorAll(selector);
                for (const img of imgs) {
                  if (img.src && (img.src.includes('w260_h260') || img.src.includes('w512_h512'))) {
                    return img.src;
                  }
                }
              }
              return null;
            }
          });
          
          const originalUrl = results[0].result;
          console.log('Found URL:', originalUrl);
          
          if (!originalUrl) {
            alert('No profile picture found on this page!');
            return;
          }
          
          // Modify the URL to the desired resolution
          const newUrl = originalUrl.replace(/w\d+_h\d+/, `w${resolution}_h${resolution}`);
          console.log('New URL:', newUrl);
          
          // Copy to clipboard
          await navigator.clipboard.writeText(newUrl);
          alert(`COPIED ${resolution}x${resolution} URL!`);
          this.hideProfilePictureModal();
          
        } catch (error) {
          console.error('Error:', error);
          alert(`FAILED: ${error.message}`);
        }
      });
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
      this.hideProfilePictureModal();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideProfilePictureModal();
      }
    });
  }

  showProfilePictureModal() {
    console.log('📱 SHOWING PROFILE PICTURE MODAL');
    const modal = document.getElementById('profile-pic-modal');
    
    if (!modal) {
      console.error('❌ Modal element not found!');
      return;
    }
    
    // Show modal
    modal.classList.add('show');
    console.log('📱 Modal classes after show:', modal.classList.toString());
  }

  hideProfilePictureModal() {
    const modal = document.getElementById('profile-pic-modal');
    modal.classList.remove('show');
  }

  async copyProfilePictureUrl(resolution) {
    console.log('🚀 COPY PROFILE PICTURE URL CALLED!', resolution);
    try {
      // Show immediate feedback
      this.showStatus(`Generating ${resolution}x${resolution} URL...`, 'info');
      
      // Disable all resolution buttons temporarily
      const resolutionBtns = document.querySelectorAll('.resolution-btn');
      resolutionBtns.forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
      });

      // First, let's check if we're on a Realtor.com page
      if (!this.currentTab.url.includes('realtor.com')) {
        throw new Error('Not on a Realtor.com page');
      }

      // Send message to content script to get the high-res URL
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'updateProfilePicture',
        resolution: parseInt(resolution)
      });

      console.log('📸 Profile picture response received:', response);
      console.log('📸 New URL to copy:', response.newUrl);
      console.log('📸 Original URL:', response.originalUrl);

      if (response && response.success && response.newUrl) {
        console.log(`📋 ABOUT TO COPY TO CLIPBOARD: ${response.newUrl}`);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(response.newUrl);
        console.log('📋 Successfully copied to clipboard:', response.newUrl);
        
        // Test clipboard contents
        const clipboardContents = await navigator.clipboard.readText();
        console.log('📋 CLIPBOARD NOW CONTAINS:', clipboardContents);
        
        // Close modal immediately
        this.hideProfilePictureModal();
        
        // Show success notification
        NotificationManager.show({
          title: '✅ Profile Picture URL Copied!',
          body: `${resolution}x${resolution} high-resolution URL copied to clipboard!`
        }, 'success');
        
        // Show success status
        this.showStatus(`✅ ${resolution}x${resolution} URL copied to clipboard!`, 'success');
        
      } else {
        const errorMsg = response?.error || 'Failed to generate high-resolution URL';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Profile picture URL copy error:', error);
      let errorMessage = 'Failed to copy URL: ' + error.message;
      
      if (error.message.includes('Receiving end does not exist')) {
        errorMessage = 'Please refresh the page and try again.';
      } else if (!this.currentTab.url.includes('realtor.com')) {
        errorMessage = 'Please navigate to a Realtor.com agent profile page.';
      }
      
      this.showStatus(errorMessage, 'error');
      
      // Show error notification
      NotificationManager.show({
        title: '❌ Error',
        body: errorMessage
      }, 'error');
    } finally {
      // Re-enable resolution buttons
      const resolutionBtns = document.querySelectorAll('.resolution-btn');
      resolutionBtns.forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      });
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 NEW INFORMATIONAL POPUP LOADING - VERSION 2.0');
  new PopupController();
});
