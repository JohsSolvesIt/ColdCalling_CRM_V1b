// Background script for Realtor Data Extractor

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  
  try {
    // Set default settings
    await chrome.storage.sync.set({
      autoExtract: true,
      showNotifications: true
    });

    // Initialize context menu
    await initializeContextMenu();
    
  } catch (error) {
    console.error('Error during installation:', error);
  }
});

// Initialize context menu
async function initializeContextMenu() {
  try {
    // Remove all existing context menus first
    await chrome.contextMenus.removeAll();
    
    // Create new context menu
    const menuId = await chrome.contextMenus.create({
      id: 'extractRealtorData',
      title: 'Extract Realtor Data',
      contexts: ['page'],
      documentUrlPatterns: ['*://*.realtor.com/*']
    });
    
    return menuId;
    
  } catch (error) {
    console.error('Error creating context menu:', error);
    throw error;
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'saveData') {
      // Save extracted data to storage
      chrome.storage.local.set({
        [`extraction_${Date.now()}`]: request.data
      }).then(() => {
      }).catch((error) => {
        console.error('Error saving data:', error);
      });
    }
    
    if (request.action === 'openDataInNewTab') {
      // Create a new tab with the extraction results
      try {
        const htmlContent = request.data.htmlContent;
        const title = request.data.title || 'Real Estate Agent Profile Extraction';
        
        // Always use direct data URL approach - simpler and more reliable
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
        
        chrome.tabs.create({
          url: dataUrl,
          active: true
        }).then((tab) => {
          sendResponse({ success: true, tabId: tab.id });
        }).catch((error) => {
          console.error('❌ Error creating data tab:', error);
          sendResponse({ success: false, error: error.message });
        });
      } catch (error) {
        console.error('❌ Error in openDataInNewTab:', error);
        sendResponse({ success: false, error: error.message });
      }
      
      // Return true to indicate we'll call sendResponse asynchronously
      return true;
    }
    
    if (request.action === 'showNotification') {
      // Show notification if enabled
      chrome.storage.sync.get('showNotifications').then((result) => {
        if (result.showNotifications) {
          chrome.notifications.create({
            type: 'basic',
            title: 'Realtor Data Extractor',
            message: request.message,
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjZTMxODM3Ii8+Cjx0ZXh0IHg9IjI0IiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+PoDwvdGV4dD4KPC9zdmc+'
          }).catch((error) => {
            console.error('Error creating notification:', error);
          });
        }
      });
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'extractRealtorData') {
    try {
      
      // Send message to content script to extract data
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      
    } catch (error) {
      console.error('Error in context menu click handler:', error);
      
      // Try to inject content script if it's not loaded
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Retry extraction
        await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
      } catch (injectionError) {
        console.error('Error injecting content script:', injectionError);
      }
    }
  }
});

// Auto-extract on page load if enabled
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('realtor.com')) {
    chrome.storage.sync.get('autoExtract', (result) => {
      if (result.autoExtract) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: 'autoExtract' }, (response) => {
            if (chrome.runtime.lastError) {
              // Content script may not be loaded yet, ignore error
            }
          });
        }, 2000);
      }
    });
  }
});

// Clean up old extraction data (keep only last 10)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    chrome.storage.local.get(null, (items) => {
      const extractionKeys = Object.keys(items).filter(key => key.startsWith('extraction_'));
      
      if (extractionKeys.length > 10) {
        // Sort by timestamp and remove oldest
        extractionKeys.sort();
        const keysToRemove = extractionKeys.slice(0, extractionKeys.length - 10);
        chrome.storage.local.remove(keysToRemove);
      }
    });
  }
});
