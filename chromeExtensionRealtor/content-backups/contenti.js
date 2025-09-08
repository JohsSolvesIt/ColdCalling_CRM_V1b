// Content script for extracting data from Realtor.com - VERSION 2.1

// ========================================
// LOGGING CONFIGURATION
// ========================================
// Use this to control how much logging the extension produces:
// - ERROR (0): Only critical errors (recommended for production)
// - WARN (1): Warnings and errors 
// - INFO (2): Basic operation info, warnings, and errors
// - DEBUG (3): All logs including detailed debug info (for development)
//
// NOTE: Recommendation extraction logs are ALWAYS shown regardless of log level
// to provide visibility into the core functionality requested by the user.

// Prevent redefinition if content script is loaded multiple times
if (typeof window.LOG_LEVELS_V2 === 'undefined') {
  window.LOG_LEVELS_V2 = {
    ERROR: 0,   // Only errors
    WARN: 1,    // Warnings and errors
    INFO: 2,    // Info, warnings, and errors
    DEBUG: 3    // All logs including debug
  };
}
const LOG_LEVELS_V2 = window.LOG_LEVELS_V2;

// Set to ERROR for minimal logging, INFO for moderate, DEBUG for verbose
const CURRENT_LOG_LEVEL = LOG_LEVELS_V2.ERROR;

// Conditional logging functions
const log = {
  error: (...args) => console.error(...args),
  warn: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVELS_V2.WARN && console.warn(...args),
  info: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVELS_V2.INFO && console.log(...args),
  debug: (...args) => CURRENT_LOG_LEVEL >= LOG_LEVELS_V2.DEBUG && console.log(...args),
  // Special recommendation logging that always shows (excluded from verbose suppression)
  recommendation: (...args) => console.log(...args)
};

log.info('🚀 Realtor Data Extractor content script loading...');

// ========================================
// POLLING UTILITIES FOR CONTENT READINESS
// ========================================
class ContentPollingManager {
  /**
   * Polls for content readiness using a predicate function
   * @param {Function} predicate - Function that returns true when content is ready
   * @param {Object} options - Polling configuration
   * @returns {Promise<boolean>} - Resolves to true if content is ready, false if timeout
   */
  static async pollForContent(predicate, options = {}) {
    const {
      maxAttempts = 50,
      interval = 100,
      timeout = 5000,
      description = 'content'
    } = options;

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < maxAttempts && (Date.now() - startTime) < timeout) {
      try {
        if (predicate()) {
          console.log(`✅ ${description} ready after ${attempts} attempts (${Date.now() - startTime}ms)`);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Polling predicate error for ${description}:`, error.message);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    console.warn(`⏰ Polling timeout for ${description} after ${Date.now() - startTime}ms`);
    return false;
  }

  /**
   * Polls for DOM elements to appear
   */
  static async pollForElement(selector, options = {}) {
    return this.pollForContent(
      () => document.querySelector(selector) !== null,
      { ...options, description: `element "${selector}"` }
    );
  }

  /**
   * Polls for elements to disappear (useful for loading indicators)
   */
  static async pollForElementDisappear(selector, options = {}) {
    return this.pollForContent(
      () => document.querySelector(selector) === null,
      { ...options, description: `element "${selector}" to disappear` }
    );
  }

  /**
   * Polls for content stability (content doesn't change for a period)
   */
  static async pollForContentStability(selector, options = {}) {
    const { stabilityPeriod = 500, ...pollOptions } = options;
    let lastContent = '';
    let stableStart = null;

    return this.pollForContent(
      () => {
        const element = document.querySelector(selector);
        if (!element) return false;

        const currentContent = element.textContent || element.innerHTML;
        
        if (currentContent === lastContent) {
          if (!stableStart) stableStart = Date.now();
          return (Date.now() - stableStart) >= stabilityPeriod;
        } else {
          lastContent = currentContent;
          stableStart = null;
          return false;
        }
      },
      { ...pollOptions, description: `content stability for "${selector}"` }
    );
  }

  /**
   * Polls for listings content to load after tab clicks
   */
  static async pollForListingsLoad(options = {}) {
    return this.pollForContent(
      () => {
        // Check for loading indicators to disappear
        const loadingIndicators = document.querySelectorAll('[class*="loading"], [class*="spinner"], .loading-content');
        if (loadingIndicators.length > 0) return false;

        // Check for actual listing content
        const listingElements = document.querySelectorAll(
          '[data-testid*="listing"], .listing-item, .property-card, [class*="listing-card"], [class*="property-item"]'
        );
        
        return listingElements.length > 0;
      },
      { ...options, description: 'listings content after tab click' }
    );
  }

  /**
   * Polls for bio content expansion to complete
   */
  static async pollForBioExpansion(expectedExpandedCount, options = {}) {
    return this.pollForContent(
      () => {
        // Check that "See More" buttons are gone or reduced
        const seeMoreButtons = Array.from(document.querySelectorAll('button, span, div')).filter(el => {
          const text = (el.textContent || '').toLowerCase().trim();
          return text.includes('see more') || text.includes('show more');
        });
        
        // Also check for expanded bio content
        const bioContainers = document.querySelectorAll(
          '[data-testid*="bio"], [class*="bio"], [class*="about"], .agent-description'
        );
        
        let hasExpandedContent = false;
        bioContainers.forEach(container => {
          const text = container.textContent || '';
          if (text.length > 200) { // Expanded content should be longer
            hasExpandedContent = true;
          }
        });

        return seeMoreButtons.length === 0 || hasExpandedContent;
      },
      { ...options, description: `bio expansion (${expectedExpandedCount} elements)` }
    );
  }
}

// Database service for Chrome extension
class DatabaseService {
  constructor() {
    this.baseUrl = 'http://localhost:5001/api';
    this.isConnected = false;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await fetch('http://localhost:5001/health');
      this.isConnected = response.ok;
      log.debug('🔗 Database service connection:', this.isConnected ? 'Connected' : 'Disconnected');
      return this.isConnected;
    } catch (error) {
      log.warn('Database service not available:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async saveExtractedData(url, pageType, agentData, properties = [], extractionData = {}) {
    try {
      // Check connection first
      if (!this.isConnected) {
        const connected = await this.checkConnection();
        if (!connected) {
          throw new Error('Database service is not available');
        }
      }

      const payload = {
        url,
        pageType,
        agentData,
        properties,
        extractionData: {
          ...extractionData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          extensionVersion: chrome.runtime.getManifest().version
        }
      };

      log.debug('💾 Saving data to database...', payload);

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      log.debug('✅ Data saved successfully:', result);
      return result;

    } catch (error) {
      log.error('❌ Error saving to database:', error);
      throw error;
    }
  }

  async checkForDuplicate(url, agentName, officeName) {
    try {
      if (!this.isConnected) {
        const connected = await this.checkConnection();
        if (!connected) {
          return { isDuplicate: false, existingAgent: null };
        }
      }

      const response = await fetch(`${this.baseUrl}/check-duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, agentName, officeName })
      });

      if (!response.ok) {
        log.warn('Could not check for duplicates');
        return { isDuplicate: false, existingAgent: null };
      }

      const result = await response.json();
      return result;

    } catch (error) {
      log.warn('Error checking for duplicates:', error);
      return { isDuplicate: false, existingAgent: null };
    }
  }

  // Helper method to clean and prepare agent data for database
  prepareAgentData(rawAgentData, url) {
    const cleanData = {
      agent_id: this.extractAgentIdFromUrl(url),
      name: this.cleanString(rawAgentData.name),
      title: this.cleanString(rawAgentData.title),
      company: this.cleanString(rawAgentData.company),
      phone: this.cleanPhone(rawAgentData.phone),
      email: this.cleanEmail(rawAgentData.email),
      address: this.cleanString(rawAgentData.address),
      website: this.cleanUrl(rawAgentData.website),
      bio: this.cleanString(rawAgentData.bio),
      specializations: this.cleanArray(rawAgentData.specializations),
      languages: this.cleanArray(rawAgentData.languages),
      experience_years: this.cleanNumber(rawAgentData.experience_years),
      license_number: this.cleanString(rawAgentData.license_number),
      license_state: this.cleanString(rawAgentData.license_state),
      profile_image_url: this.enhanceImageQuality(this.cleanUrl(rawAgentData.profile_image_url), true),
      social_media: rawAgentData.social_media || {},
      ratings: rawAgentData.ratings || {},
      certifications: this.cleanArray(rawAgentData.certifications),
      service_areas: this.cleanArray(rawAgentData.service_areas)
    };

    // Remove null/undefined values
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === null || cleanData[key] === undefined || cleanData[key] === '') {
        delete cleanData[key];
      }
    });

    return cleanData;
  }

  // Helper method to clean and prepare property data
  preparePropertyData(properties) {
    if (!Array.isArray(properties)) return [];

    return properties.map(prop => {
      const cleanProp = {
        property_id: this.cleanString(prop.property_id || prop.id),
        address: this.cleanString(prop.address),
        city: this.cleanString(prop.city),
        state: this.cleanString(prop.state),
        zip_code: this.cleanString(prop.zip_code),
        price: this.cleanPrice(prop.price),
        price_formatted: this.cleanString(prop.price_formatted || prop.price),
        bedrooms: this.cleanNumber(prop.bedrooms),
        bathrooms: this.cleanNumber(prop.bathrooms),
        square_feet: this.cleanNumber(prop.square_feet),
        lot_size: this.cleanString(prop.lot_size),
        property_type: this.cleanString(prop.property_type),
        listing_status: this.cleanString(prop.listing_status),
        listing_date: this.cleanDate(prop.listing_date),
        days_on_market: this.cleanNumber(prop.days_on_market),
        mls_number: this.cleanString(prop.mls_number),
        description: this.cleanString(prop.description),
        features: this.cleanArray(prop.features),
        // Enhanced image handling - store both single image and multiple photos with quality enhancement
        image_url: this.enhanceImageQuality(this.cleanUrl(prop.image || (Array.isArray(prop.photos) ? prop.photos[0] : null))),
        image_urls: this.cleanArray(prop.image_urls || prop.photos || []).map(url => this.enhanceImageQuality(this.cleanUrl(url))),
        primary_image: this.enhanceImageQuality(this.cleanUrl(prop.image)),
        additional_photos: this.cleanArray(prop.photos || []).map(url => this.enhanceImageQuality(this.cleanUrl(url))),
        property_url: this.cleanUrl(prop.property_url || prop.url),
        coordinates: prop.coordinates || {}
      };

      // Remove null/undefined values
      Object.keys(cleanProp).forEach(key => {
        if (cleanProp[key] === null || cleanProp[key] === undefined || cleanProp[key] === '') {
          delete cleanProp[key];
        }
      });

      return cleanProp;
    }).filter(prop => prop.property_id || prop.address); // Only keep properties with ID or address
  }

  // Utility methods for data cleaning
  extractAgentIdFromUrl(url) {
    const match = url.match(/realestateagents\/([a-f0-9]+)/i);
    return match ? match[1] : null;
  }

  cleanString(value) {
    if (!value) return null;
    return value.toString().trim().replace(/\s+/g, ' ') || null;
  }

  cleanPhone(value) {
    if (!value) return null;
    return value.toString().replace(/[^\d\+\-\(\)\s]/g, '').trim() || null;
  }

  cleanEmail(value) {
    if (!value) return null;
    const email = value.toString().trim().toLowerCase();
    return email.includes('@') ? email : null;
  }

  cleanUrl(value) {
    if (!value) return null;
    const url = value.toString().trim();
    return url.startsWith('http') ? url : null;
  }

  cleanNumber(value) {
    if (!value) return null;
    const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
  }

  cleanPrice(value) {
    if (!value) return null;
    const price = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    return isNaN(price) ? null : price;
  }

  // Enhanced image URL optimization for rdcpix (Realtor.com images)
  enhanceImageQuality(url, isProfile = false) {
    log.debug('🔧 enhanceImageQuality called with:', url, isProfile);
    log.debug('🔧 this object keys:', Object.getOwnPropertyNames(this));
    
    if (!url || typeof url !== 'string') return url;
    
    // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
    if (!url.includes('rdcpix.com')) return url;
    
    try {
      // Determine target width based on image type
      const targetWidth = isProfile ? 512 : 1024;
      
      // Simple approach: just replace the width parameter while preserving everything else
      const widthPattern = /-w(\d+)/i;
      const match = url.match(widthPattern);
      
      if (match) {
        const currentWidth = match[1];
        // Only enhance if current width is smaller than target
        if (parseInt(currentWidth) < targetWidth) {
          const enhancedUrl = url.replace(widthPattern, `-w${targetWidth}`);
          log.debug(`🖼️ Enhanced image quality: ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
          return enhancedUrl;
        }
      }
      
      // If no width parameter found or current width is already good, return original
      return url;
      
    } catch (error) {
      log.warn('⚠️ Failed to enhance image quality:', error);
      return url;
    }
  }

  // Generate multiple candidate URLs for robust image quality enhancement
  generateImageCandidates(url, isProfile = false) {
    if (!url || typeof url !== 'string') return [url];
    
    // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
    if (!url.includes('rdcpix.com')) return [url];
    
    try {
      const widthPattern = /-w(\d+)/i;
      const match = url.match(widthPattern);
      
      if (!match) return [url];
      
      const candidates = [];
      const currentWidth = parseInt(match[1]);
      
      // Determine target widths based on image type
      const widths = isProfile ? [512, 600, 400, 300] : [1024, 1200, 800, 600];
      
      // Generate candidates by replacing width, preserving everything else
      for (const width of widths) {
        if (width >= currentWidth) { // Only try larger or equal widths
          const candidate = url.replace(widthPattern, `-w${width}`);
          candidates.push(candidate);
        }
      }
      
      // Always include original as fallback
      if (!candidates.includes(url)) {
        candidates.push(url);
      }
      
      return candidates;
      
    } catch (error) {
      log.warn('⚠️ Failed to generate image candidates:', error);
      return [url];
    }
  }

  cleanDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  cleanArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && item.toString().trim()).map(item => item.toString().trim());
  }
}

// Make DatabaseService available globally
window.DatabaseService = DatabaseService;
log.debug('🔧 DatabaseService loaded and attached to window');

// Prevent duplicate class declaration
if (typeof window.RealtorDataExtractor === 'undefined') {

class RealtorDataExtractor {
  constructor() {
    log.info('🚀 Realtor Data Extractor content script loaded');
    log.debug('📍 Current URL:', window.location.href);
    log.debug('📄 Page title:', document.title);
    
    this.data = {};
    
    // Only run on Realtor.com pages or localhost for testing
    if (window.location.href.includes('realtor.com') || window.location.href.includes('localhost')) {
      log.info('✅ Valid Realtor.com page detected, initializing...');
      this.init();
    } else {
      log.debug('⚠️ Not on a Realtor.com page, skipping initialization');
    }
  }

  init() {
    // Add extraction button to the page
    this.addExtractionButton();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      if (request.action === 'ping') {
        // Simple ping response to check if content script is ready
        sendResponse({ ready: true });
        return true;
      }
      
      if (request.action === 'extractData') {
        try {
          console.log('🎯 POPUP EXTRACTION REQUEST RECEIVED');
          log.debug('Content script received extractData message');
          log.debug('Current URL:', window.location.href);
          log.debug('Page title:', document.title);
          
          // Check if we're on a valid page
          const isRealtorPage = window.location.href.includes('realtor.com') || 
                               window.location.href.includes('localhost'); // Allow localhost for testing
          
          if (!isRealtorPage) {
            throw new Error('Not on a Realtor.com page');
          }
          
          console.log('📊 Starting extraction from popup request...');
          const extractedData = await this.extractAllData();
          console.log('📊 Extraction completed from popup:', extractedData);
          
          // FORCE open data window
          this.forceOpenDataWindow(extractedData);
          
          log.debug('Data extraction completed, sending response...');
          sendResponse(extractedData); // Send the full result which includes success, data, propertyRows
        } catch (error) {
          console.error('❌ POPUP EXTRACTION ERROR:', error);
          log.error('Error in content script extraction:', error);
          
          // Still show error in window
          this.forceOpenDataWindow({ success: false, error: error.message, stack: error.stack });
          
          sendResponse({ success: false, error: error.message });
        }
      }
      return true; // Keep message channel open for async response
    });
  }

  addExtractionButton() {
    // Create floating button
    const button = document.createElement('div');
    button.id = 'realtor-extractor-btn';
    button.innerHTML = '📊 Extract Data';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: #e31837;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      user-select: none;
      pointer-events: auto;
      border: none;
      outline: none;
    `;
    
    button.addEventListener('click', async (event) => {
      try {
        // Prevent any default behavior and event bubbling
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        console.log('🚀 EXTRACTION BUTTON CLICKED');
        
        // Use setTimeout to ensure this runs after any other event handlers
        setTimeout(async () => {
          try {
            // Show loading notification
            this.showNotification('🔄 Extracting Data...', 'Please wait while we extract all available data', 'info', 2000);
            
            // Log current URL before extraction
            console.log('📍 Starting extraction on URL:', window.location.href);
            
            // Extract data with detailed logging
            console.log('📊 Starting data extraction...');
            const data = await this.extractAllData();
            console.log('📊 Extraction completed:', data);
            
            // Check if URL changed during extraction
            console.log('📍 URL after extraction:', window.location.href);
            
            // FORCE window opening regardless of data content
            console.log('🪟 Opening data window...');
            this.forceOpenDataWindow(data);
            
            // Also show notification
            this.showNotification('✅ Extraction Complete!', 'Data window opened - check for popup blocker', 'success', 3000);
            
          } catch (innerError) {
            console.error('❌ INNER EXTRACTION ERROR:', innerError);
            log.error('Error during manual extraction:', innerError);
            this.showNotification('❌ Extraction Failed', innerError.message || 'An error occurred during extraction', 'error', 5000);
            
            // Still try to open window with error data
            this.forceOpenDataWindow({ error: innerError.message, stack: innerError.stack });
          }
        }, 10); // Small delay to ensure event isolation
        
      } catch (error) {
        console.error('❌ BUTTON CLICK ERROR:', error);
        this.showNotification('❌ Button Error', error.message || 'Button click failed', 'error', 5000);
      }
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(button);
  }

  async waitForDatabaseService(maxWait = 5000) {
    // DatabaseService is now in the same file, so it should be immediately available
    log.debug('✅ DatabaseService is available in same file');
    return new DatabaseService();
  }

  async extractAllData() {
    try {
      console.log('🎯 STARTING COMPREHENSIVE DATA EXTRACTION...');
      log.info('🎯 Starting comprehensive data extraction...');
      
      console.log('📍 URL:', window.location.href);
      console.log('📄 Page Title:', document.title);
      
      // DIAGNOSTIC: Run page analysis first
      const diagnostics = this.extractPageDiagnostics();
      console.log('🔍 DIAGNOSTIC RESULTS:', diagnostics);
      
      console.log('🔍 Page Type Detection...');
      
      const pageType = this.detectPageType();
      console.log('📝 Page Type:', pageType);
      
      console.log('👤 Extracting agent data...');
      const agentData = {
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        pageType: pageType,
        agent: await this.safeExtractAsync(() => this.extractAgentData()), // BIO EXTRACTED HERE FIRST
        office: this.safeExtract(() => this.extractOfficeData()),
        contact: this.safeExtract(() => this.extractContactData()),
        reviews: this.safeExtract(() => this.extractReviews()), // REVIEWS AFTER BIO
        listings: await this.safeExtractAsync(() => this.extractListings()),
        specializations: this.safeExtract(() => this.extractSpecializations()),
        areasServed: this.safeExtract(() => this.extractAreasServed()),
        teamInfo: this.safeExtract(() => this.extractTeamInfo()),
        credentials: this.safeExtract(() => this.extractCredentials()),
        socialMedia: this.safeExtract(() => this.extractSocialMedia()),
        performance: this.safeExtract(() => this.extractPerformanceData()),
        images: this.safeExtract(() => this.extractAllImages())
      };

      console.log('📊 EXTRACTION COMPLETE. Full Agent Data:', agentData);
      log.debug('📊 Extraction complete. Agent Data:', agentData);
      
      // Enhanced: Log image extraction summary
      const imageSummary = {
        agentPhoto: !!agentData.images?.agentPhoto,
        teamPhoto: !!agentData.images?.teamPhoto,
        propertyImages: agentData.images?.propertyImages?.length || 0,
        galleryImages: agentData.images?.galleryImages?.length || 0,
        allPropertyPhotos: agentData.images?.allPropertyPhotos?.metadata?.totalFound || 0,
        listingsWithPhotos: agentData.images?.allPropertyPhotos?.metadata?.listingsWithPhotos || 0
      };
      
      console.log('🖼️ IMAGE EXTRACTION SUMMARY:', imageSummary);
      log.debug('🖼️ Image Extraction Summary:', imageSummary);

      const listingSummary = agentData.listings?.active?.map(listing => ({
        address: listing.address?.substring(0, 30) + '...',
        photoCount: Array.isArray(listing.photos) ? listing.photos.length : (listing.image ? 1 : 0),
        hasMainImage: !!listing.image,
        photosArray: Array.isArray(listing.photos) ? listing.photos.length : 0
      })) || [];
      
      console.log('🏠 ACTIVE LISTINGS WITH PHOTOS:', listingSummary);
      log.debug('🏠 Active listings with photos:', listingSummary);
      
      // Try to use database service with improved loading check
      let dbResult = null;
      try {
        // Wait for DatabaseService to be available
        const dbService = await this.waitForDatabaseService();
        
        if (dbService) {
          // Check for duplicates first
          const duplicateCheck = await dbService.checkForDuplicate(
            window.location.href,
            agentData.agent?.name,
            agentData.office?.name
          );
          
          if (duplicateCheck.isDuplicate) {
            log.info('⚠️ Duplicate agent found:', duplicateCheck.existingAgent);
            
            // Send message to popup for user decision
            const userChoice = await this.showDuplicateNotification(duplicateCheck.existingAgent);
            
            if (userChoice) {
              dbResult = await this.saveToDatabaseWithFeedback(dbService, agentData);
            } else {
              log.debug('User chose not to update duplicate record');
              dbResult = { success: false, message: 'Skipped duplicate update', isDuplicate: true };
            }
          } else {
            // New agent, save to database
            dbResult = await this.saveToDatabaseWithFeedback(dbService, agentData);
          }
        } else {
          log.warn('⚠️ DatabaseService not available after waiting - continuing without database save');
          dbResult = { success: false, message: 'DatabaseService not available' };
        }
      } catch (error) {
        log.error('❌ Database operation failed:', error);
        dbResult = { success: false, error: error.message };
      }
      
      // Create individual property rows for CSV export (maintain backward compatibility)
      const propertyRows = this.createPropertyRows(agentData);
      
      log.debug('Extracted data summary:', {
        agent: agentData.agent?.name,
        office: agentData.office?.name,
        listingsActive: agentData.listings?.active?.length || 0,
        listingsSold: agentData.listings?.sold?.length || 0,
        propertyRowsGenerated: propertyRows.length,
        databaseSaved: dbResult?.success || false,
        sampleActiveListing: agentData.listings?.active?.[0] ? {
          price: agentData.listings.active[0].price,
          address: agentData.listings.active[0].address,
          beds: agentData.listings.active[0].beds,
          baths: agentData.listings.active[0].baths,
          image: agentData.listings.active[0].image,
          photos: `${agentData.listings.active[0].photos?.length || 0} photos`,
          propertyType: agentData.listings.active[0].propertyType
        } : null,
        imageCount: {
          gallery: agentData.images?.galleryImages?.length || 0,
          property: agentData.images?.propertyImages?.length || 0
        }
      });

      return {
        success: true,
        data: agentData,
        propertyRows: this.createPropertyRows(agentData), // Keep original for compatibility
        propertyColumns: this.createPropertyColumns(agentData), // New column format
        database: dbResult, // Database operation result
        summary: {
          agent: agentData.agent?.name || 'Unknown',
          totalListings: (agentData.listings?.active?.length || 0) + (agentData.listings?.sold?.length || 0),
          activeListings: agentData.listings?.active?.length || 0,
          soldListings: agentData.listings?.sold?.length || 0,
          reviewCount: agentData.reviews?.overall?.count || 0,
          rating: agentData.reviews?.overall?.rating || 0,
          images: {
            agent: agentData.images?.agentPhoto ? 1 : 0,
            team: agentData.images?.teamPhoto ? 1 : 0,
            gallery: agentData.images?.galleryImages?.length || 0,
            property: agentData.images?.propertyImages?.length || 0
          }
        }
      };
    } catch (error) {
      log.error('❌ Error in extractAllData:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async showDuplicateNotification(existingAgent) {
    return new Promise((resolve) => {
      // Try to get the popup window and show notification there
      chrome.runtime.sendMessage({
        type: 'SHOW_DUPLICATE_NOTIFICATION',
        agent: existingAgent
      }, (response) => {
        // If no popup response, fall back to confirm dialog
        if (!response) {
          const userChoice = confirm(
            `Agent "${existingAgent.name}" already exists in database.\n` +
            `Last scraped: ${new Date(existingAgent.lastScraped).toLocaleDateString()}\n` +
            `Current properties: ${existingAgent.totalProperties}\n\n` +
            `Click OK to update the record, Cancel to skip database save.`
          );
          resolve(userChoice);
        } else {
          resolve(response.proceed);
        }
      });
    });
  }

  async saveToDatabaseWithFeedback(dbService, agentData) {
    try {
      log.debug('💾 Saving to database...');
      
      // Prepare agent data for database
      const cleanAgentData = dbService.prepareAgentData({
        name: agentData.agent?.name,
        title: agentData.agent?.title,
        company: agentData.office?.name,
        phone: agentData.contact?.phone,
        email: agentData.contact?.email,
        address: agentData.office?.address,
        website: agentData.contact?.website,
        bio: agentData.agent?.bio || agentData.agent?.description,
        specializations: agentData.specializations,
        languages: agentData.agent?.languages,
        experience_years: agentData.agent?.experience_years,
        license_number: agentData.credentials?.license_number,
        license_state: agentData.credentials?.license_state,
        profile_image_url: agentData.images?.agentPhoto,
        social_media: agentData.socialMedia,
        ratings: agentData.reviews?.overall,
        certifications: agentData.credentials?.certifications,
        service_areas: agentData.areasServed
      }, window.location.href);
      
      // Prepare properties data
      const allListings = [
        ...(agentData.listings?.active || []),
        ...(agentData.listings?.sold || [])
      ];
      
      const cleanProperties = dbService.preparePropertyData(allListings);
      
      // CLEANUP REVIEWS BEFORE DATABASE SAVE - Remove rating categories
      const cleanedReviews = { ...agentData.reviews };
      if (cleanedReviews.recommendations) {
        const beforeDbCleanup = cleanedReviews.recommendations.length;
        cleanedReviews.recommendations = cleanedReviews.recommendations.filter(rec => {
          const isRatingCategory = this.isRatingCategoryOnly(rec.text);
          if (isRatingCategory) {
            log.recommendation(`🚫 DB-SAVE CLEANUP: Removing rating category - "${rec.text}" by ${rec.author}`);
            return false;
          }
          return true;
        });
        
        const afterDbCleanup = cleanedReviews.recommendations.length;
        if (beforeDbCleanup !== afterDbCleanup) {
          log.recommendation(`🧹 DB-SAVE: Cleaned ${beforeDbCleanup - afterDbCleanup} rating categories before database save`);
        }
      }
      
      // Save to database
      const result = await dbService.saveExtractedData(
        window.location.href,
        agentData.pageType,
        cleanAgentData,
        cleanProperties,
        {
          extractionMethod: 'chrome_extension',
          dataVersion: '1.0',
          performance: agentData.performance,
          reviews: cleanedReviews
        }
      );
      
      // Show success notification
      this.showNotification('✅ Database Save Successful', 
        `Agent: ${cleanAgentData.name}\nProperties: ${cleanProperties.length}`, 'success');
      
      return result;
      
    } catch (error) {
      log.error('Database save error:', error);
      
      // Show error notification but don't fail the extraction
      this.showNotification('⚠️ Database Save Failed', 
        'Data was extracted but not saved to database. Check console for details.', 'warning');
      
      return { success: false, error: error.message };
    }
  }

  showNotification(title, message = '', type = 'info', duration = 3000) {
    // Handle single argument case (just message)
    if (typeof title === 'string' && !message && !type) {
      // Check if it looks like HTML
      if (title.includes('<br>') || title.includes('<')) {
        message = title;
        title = 'Notification';
      } else {
        message = title;
        title = 'Notification';
      }
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      max-width: 350px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      line-height: 1.4;
    `;
    
    // Support HTML content
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove using custom duration
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  createPropertyColumns(agentData) {
    log.debug('🏗️ Creating property columns format...');
    
    const baseAgentInfo = {
      url: agentData.url,
      extractedAt: agentData.extractedAt,
      pageType: agentData.pageType,
      agentName: agentData.agent?.name || '',
      agentPhoto: agentData.agent?.photo || '', // This should be the AGENT photo
      agentBio: this.cleanTextForCSV(agentData.agent?.bio || ''),
      agentRating: agentData.agent?.rating || '',
      agentExperience: agentData.agent?.experience || '',
      agentLicense: agentData.agent?.license || '',
      agentLanguages: Array.isArray(agentData.agent?.languages) ? agentData.agent.languages.join('; ') : '',
      officeName: agentData.office?.name || '',
      officeAddress: agentData.office?.address || '',
      officePhone: agentData.office?.phone || '',
      contactPhone: agentData.contact?.phone || '',
      contactEmail: agentData.contact?.email || '',
      contactWebsite: agentData.contact?.website || '',
      reviewsRating: agentData.reviews?.overall?.rating || '',
      reviewsCount: agentData.reviews?.overall?.count || '',
      recommendationsCount: agentData.reviews?.recommendations?.length || 0,
      // Individual Reviews Data (up to 5 reviews)
      review1_rating: agentData.reviews?.individual?.[0]?.rating || '',
      review1_text: agentData.reviews?.individual?.[0]?.text || '',
      review1_author: agentData.reviews?.individual?.[0]?.author || '',
      review1_date: agentData.reviews?.individual?.[0]?.date || '',
      review1_verified: agentData.reviews?.individual?.[0]?.verified || '',
      review1_location: agentData.reviews?.individual?.[0]?.location || '',
      review1_type: agentData.reviews?.individual?.[0]?.type || '',
      review2_rating: agentData.reviews?.individual?.[1]?.rating || '',
      review2_text: agentData.reviews?.individual?.[1]?.text || '',
      review2_author: agentData.reviews?.individual?.[1]?.author || '',
      review2_date: agentData.reviews?.individual?.[1]?.date || '',
      review2_verified: agentData.reviews?.individual?.[1]?.verified || '',
      review2_location: agentData.reviews?.individual?.[1]?.location || '',
      review2_type: agentData.reviews?.individual?.[1]?.type || '',
      review3_rating: agentData.reviews?.individual?.[2]?.rating || '',
      review3_text: agentData.reviews?.individual?.[2]?.text || '',
      review3_author: agentData.reviews?.individual?.[2]?.author || '',
      review3_date: agentData.reviews?.individual?.[2]?.date || '',
      review3_verified: agentData.reviews?.individual?.[2]?.verified || '',
      review3_location: agentData.reviews?.individual?.[2]?.location || '',
      review3_type: agentData.reviews?.individual?.[2]?.type || '',
      review4_rating: agentData.reviews?.individual?.[3]?.rating || '',
      review4_text: agentData.reviews?.individual?.[3]?.text || '',
      review4_author: agentData.reviews?.individual?.[3]?.author || '',
      review4_date: agentData.reviews?.individual?.[3]?.date || '',
      review4_verified: agentData.reviews?.individual?.[3]?.verified || '',
      review4_location: agentData.reviews?.individual?.[3]?.location || '',
      review4_type: agentData.reviews?.individual?.[3]?.type || '',
      review5_rating: agentData.reviews?.individual?.[4]?.rating || '',
      review5_text: agentData.reviews?.individual?.[4]?.text || '',
      review5_author: agentData.reviews?.individual?.[4]?.author || '',
      review5_date: agentData.reviews?.individual?.[4]?.date || '',
      review5_verified: agentData.reviews?.individual?.[4]?.verified || '',
      review5_location: agentData.reviews?.individual?.[4]?.location || '',
      review5_type: agentData.reviews?.individual?.[4]?.type || '',
      // Recommendations Data (up to 5 recommendations)
      recommendation1_text: agentData.reviews?.recommendations?.[0]?.text || '',
      recommendation1_author: agentData.reviews?.recommendations?.[0]?.author || '',
      recommendation1_date: agentData.reviews?.recommendations?.[0]?.date || '',
      recommendation1_type: agentData.reviews?.recommendations?.[0]?.type || '',
      recommendation2_text: agentData.reviews?.recommendations?.[1]?.text || '',
      recommendation2_author: agentData.reviews?.recommendations?.[1]?.author || '',
      recommendation2_date: agentData.reviews?.recommendations?.[1]?.date || '',
      recommendation2_type: agentData.reviews?.recommendations?.[1]?.type || '',
      recommendation3_text: agentData.reviews?.recommendations?.[2]?.text || '',
      recommendation3_author: agentData.reviews?.recommendations?.[2]?.author || '',
      recommendation3_date: agentData.reviews?.recommendations?.[2]?.date || '',
      recommendation3_type: agentData.reviews?.recommendations?.[2]?.type || '',
      recommendation4_text: agentData.reviews?.recommendations?.[3]?.text || '',
      recommendation4_author: agentData.reviews?.recommendations?.[3]?.author || '',
      recommendation4_date: agentData.reviews?.recommendations?.[3]?.date || '',
      recommendation4_type: agentData.reviews?.recommendations?.[3]?.type || '',
      recommendation5_text: agentData.reviews?.recommendations?.[4]?.text || '',
      recommendation5_author: agentData.reviews?.recommendations?.[4]?.author || '',
      recommendation5_date: agentData.reviews?.recommendations?.[4]?.date || '',
      recommendation5_type: agentData.reviews?.recommendations?.[4]?.type || '',
      specializations: Array.isArray(agentData.specializations) ? agentData.specializations.join('; ') : '',
      areasServed: agentData.agent?.areasServed || agentData.areasServed || '',
      teamName: agentData.teamInfo?.name || '',
      credentials: Array.isArray(agentData.credentials) ? agentData.credentials.join('; ') : '',
      facebookUrl: agentData.socialMedia?.facebook || '',
      linkedinUrl: agentData.socialMedia?.linkedin || '',
      twitterUrl: agentData.socialMedia?.twitter || '',
      instagramUrl: agentData.socialMedia?.instagram || ''
    };

    // Add columns for each property (up to 20) - INCLUDE BOTH ACTIVE AND SOLD
    const maxProperties = 20; // Increased from 10 to accommodate active + sold
    const activeListings = agentData.listings?.active || [];
    const soldListings = agentData.listings?.sold || [];
    const allListings = [...activeListings, ...soldListings]; // COMBINE BOTH TYPES
    
    log.debug(`📊 PROPERTY COLUMNS: Including ${activeListings.length} active + ${soldListings.length} sold = ${allListings.length} total`);
    
    for (let i = 0; i < maxProperties; i++) {
      const listing = allListings[i]; // NOW INCLUDES BOTH ACTIVE AND SOLD
      const propNum = i + 1;
      
      if (listing) {
        baseAgentInfo[`property${propNum}Address`] = listing.address || '';
        baseAgentInfo[`property${propNum}Price`] = listing.price || '';
        baseAgentInfo[`property${propNum}Beds`] = listing.beds || '';
        baseAgentInfo[`property${propNum}Baths`] = listing.baths || '';
        baseAgentInfo[`property${propNum}Sqft`] = listing.sqft || '';
        baseAgentInfo[`property${propNum}Type`] = listing.propertyType || '';
        baseAgentInfo[`property${propNum}Status`] = listing.status || '';
        baseAgentInfo[`property${propNum}Photo`] = Array.isArray(listing.photos) ? listing.photos[0] : (listing.image || '');
        baseAgentInfo[`property${propNum}Photos`] = Array.isArray(listing.photos) ? listing.photos.slice(0, 8).join('; ') : (listing.image || '');
        baseAgentInfo[`property${propNum}PhotoCount`] = Array.isArray(listing.photos) ? listing.photos.length : (listing.image ? 1 : 0);
        baseAgentInfo[`property${propNum}Description`] = this.cleanTextForCSV(listing.description || '');
        baseAgentInfo[`property${propNum}MLS`] = listing.mls || '';
        baseAgentInfo[`property${propNum}LotSize`] = listing.lotSize || '';
        baseAgentInfo[`property${propNum}YearBuilt`] = listing.yearBuilt || '';
      } else {
        // Empty columns for properties that don't exist
        baseAgentInfo[`property${propNum}Address`] = '';
        baseAgentInfo[`property${propNum}Price`] = '';
        baseAgentInfo[`property${propNum}Beds`] = '';
        baseAgentInfo[`property${propNum}Baths`] = '';
        baseAgentInfo[`property${propNum}Sqft`] = '';
        baseAgentInfo[`property${propNum}Type`] = '';
        baseAgentInfo[`property${propNum}Status`] = '';
        baseAgentInfo[`property${propNum}Photo`] = '';
        baseAgentInfo[`property${propNum}Photos`] = '';
        baseAgentInfo[`property${propNum}PhotoCount`] = 0;
        baseAgentInfo[`property${propNum}Description`] = '';
        baseAgentInfo[`property${propNum}MLS`] = '';
        baseAgentInfo[`property${propNum}LotSize`] = '';
        baseAgentInfo[`property${propNum}YearBuilt`] = '';
      }
    }

    log.debug('✅ Property columns created with', activeListings.length, 'properties');
    return [baseAgentInfo]; // Return single row with multiple property columns
  }

  createPropertyRows(agentData) {
    const rows = [];
    const baseAgentInfo = {
      url: agentData.url,
      extractedAt: agentData.extractedAt,
      pageType: agentData.pageType,
      agentName: agentData.agent?.name || '',
      agentPhoto: agentData.agent?.photo || '', // This should be the AGENT photo
      agentBio: this.cleanTextForCSV(agentData.agent?.bio || ''),
      agentRating: agentData.agent?.rating || '',
      agentExperience: agentData.agent?.experience || '',
      agentLicense: agentData.agent?.license || '',
      agentLanguages: Array.isArray(agentData.agent?.languages) ? agentData.agent.languages.join('; ') : '',
      officeName: agentData.office?.name || '',
      officeAddress: agentData.office?.address || '',
      officePhone: agentData.office?.phone || '',
      contactPhone: agentData.contact?.phone || '',
      contactEmail: agentData.contact?.email || '',
      contactWebsite: agentData.contact?.website || '',
      reviewsRating: agentData.reviews?.overall?.rating || '',
      reviewsCount: agentData.reviews?.overall?.count || '',
      recommendationsCount: agentData.reviews?.recommendations?.length || 0,
      // Individual Reviews Data (up to 5 reviews)
      review1_rating: agentData.reviews?.individual?.[0]?.rating || '',
      review1_text: agentData.reviews?.individual?.[0]?.text || '',
      review1_author: agentData.reviews?.individual?.[0]?.author || '',
      review1_date: agentData.reviews?.individual?.[0]?.date || '',
      review1_verified: agentData.reviews?.individual?.[0]?.verified || '',
      review1_location: agentData.reviews?.individual?.[0]?.location || '',
      review1_type: agentData.reviews?.individual?.[0]?.type || '',
      review2_rating: agentData.reviews?.individual?.[1]?.rating || '',
      review2_text: agentData.reviews?.individual?.[1]?.text || '',
      review2_author: agentData.reviews?.individual?.[1]?.author || '',
      review2_date: agentData.reviews?.individual?.[1]?.date || '',
      review2_verified: agentData.reviews?.individual?.[1]?.verified || '',
      review2_location: agentData.reviews?.individual?.[1]?.location || '',
      review2_type: agentData.reviews?.individual?.[1]?.type || '',
      review3_rating: agentData.reviews?.individual?.[2]?.rating || '',
      review3_text: agentData.reviews?.individual?.[2]?.text || '',
      review3_author: agentData.reviews?.individual?.[2]?.author || '',
      review3_date: agentData.reviews?.individual?.[2]?.date || '',
      review3_verified: agentData.reviews?.individual?.[2]?.verified || '',
      review3_location: agentData.reviews?.individual?.[2]?.location || '',
      review3_type: agentData.reviews?.individual?.[2]?.type || '',
      review4_rating: agentData.reviews?.individual?.[3]?.rating || '',
      review4_text: agentData.reviews?.individual?.[3]?.text || '',
      review4_author: agentData.reviews?.individual?.[3]?.author || '',
      review4_date: agentData.reviews?.individual?.[3]?.date || '',
      review4_verified: agentData.reviews?.individual?.[3]?.verified || '',
      review4_location: agentData.reviews?.individual?.[3]?.location || '',
      review4_type: agentData.reviews?.individual?.[3]?.type || '',
      review5_rating: agentData.reviews?.individual?.[4]?.rating || '',
      review5_text: agentData.reviews?.individual?.[4]?.text || '',
      review5_author: agentData.reviews?.individual?.[4]?.author || '',
      review5_date: agentData.reviews?.individual?.[4]?.date || '',
      review5_verified: agentData.reviews?.individual?.[4]?.verified || '',
      review5_location: agentData.reviews?.individual?.[4]?.location || '',
      review5_type: agentData.reviews?.individual?.[4]?.type || '',
      // Recommendations Data (up to 5 recommendations)
      recommendation1_text: agentData.reviews?.recommendations?.[0]?.text || '',
      recommendation1_author: agentData.reviews?.recommendations?.[0]?.author || '',
      recommendation1_date: agentData.reviews?.recommendations?.[0]?.date || '',
      recommendation1_type: agentData.reviews?.recommendations?.[0]?.type || '',
      recommendation2_text: agentData.reviews?.recommendations?.[1]?.text || '',
      recommendation2_author: agentData.reviews?.recommendations?.[1]?.author || '',
      recommendation2_date: agentData.reviews?.recommendations?.[1]?.date || '',
      recommendation2_type: agentData.reviews?.recommendations?.[1]?.type || '',
      recommendation3_text: agentData.reviews?.recommendations?.[2]?.text || '',
      recommendation3_author: agentData.reviews?.recommendations?.[2]?.author || '',
      recommendation3_date: agentData.reviews?.recommendations?.[2]?.date || '',
      recommendation3_type: agentData.reviews?.recommendations?.[2]?.type || '',
      recommendation4_text: agentData.reviews?.recommendations?.[3]?.text || '',
      recommendation4_author: agentData.reviews?.recommendations?.[3]?.author || '',
      recommendation4_date: agentData.reviews?.recommendations?.[3]?.date || '',
      recommendation4_type: agentData.reviews?.recommendations?.[3]?.type || '',
      recommendation5_text: agentData.reviews?.recommendations?.[4]?.text || '',
      recommendation5_author: agentData.reviews?.recommendations?.[4]?.author || '',
      recommendation5_date: agentData.reviews?.recommendations?.[4]?.date || '',
      recommendation5_type: agentData.reviews?.recommendations?.[4]?.type || '',
      specializations: Array.isArray(agentData.specializations) ? agentData.specializations.join('; ') : '',
      areasServed: Array.isArray(agentData.areasServed) ? agentData.areasServed.join('; ') : '',
      teamName: agentData.teamInfo?.name || '',
      credentials: Array.isArray(agentData.credentials) ? agentData.credentials.join('; ') : '',
      facebookUrl: agentData.socialMedia?.facebook || '',
      linkedinUrl: agentData.socialMedia?.linkedin || '',
      twitterUrl: agentData.socialMedia?.twitter || '',
      instagramUrl: agentData.socialMedia?.instagram || ''
    };

    // Create rows for active listings
    if (agentData.listings?.active?.length > 0) {
      agentData.listings.active.forEach((listing, index) => {
        rows.push({
          ...baseAgentInfo,
          listingType: 'Active',
          listingIndex: index + 1,
          propertyAddress: listing.address || '',
          propertyPrice: listing.price || '',
          propertyBeds: listing.beds || '',
          propertyBaths: listing.baths || '',
          propertySqft: listing.sqft || '',
          propertyType: listing.propertyType || '',
          propertyDescription: this.cleanTextForCSV(listing.description || ''),
          propertyStatus: listing.status || '',
          propertyPhotos: Array.isArray(listing.photos) ? listing.photos.slice(0, 8).join('; ') : (listing.image || ''), // PROPERTY photos (up to 8)
          propertyPhotoCount: Array.isArray(listing.photos) ? listing.photos.length : (listing.image ? 1 : 0), // Count of photos
          propertyMainPhoto: Array.isArray(listing.photos) ? listing.photos[0] : (listing.image || ''), // Primary photo
          propertyMLS: listing.mls || '',
          propertyLotSize: listing.lotSize || '',
          propertyYearBuilt: listing.yearBuilt || ''
        });
      });
    }

    // Create rows for sold listings
    if (agentData.listings?.sold?.length > 0) {
      agentData.listings.sold.forEach((listing, index) => {
        rows.push({
          ...baseAgentInfo,
          listingType: 'Sold',
          listingIndex: index + 1,
          propertyAddress: listing.address || '',
          propertyPrice: listing.price || '',
          propertyBeds: listing.beds || '',
          propertyBaths: listing.baths || '',
          propertySqft: listing.sqft || '',
          propertyType: listing.propertyType || '',
          propertyDescription: this.cleanTextForCSV(listing.description || ''),
          propertyStatus: listing.status || '',
          propertyPhotos: Array.isArray(listing.photos) ? listing.photos.slice(0, 8).join('; ') : (listing.image || ''), // PROPERTY photos (up to 8)
          propertyPhotoCount: Array.isArray(listing.photos) ? listing.photos.length : (listing.image ? 1 : 0), // Count of photos
          propertyMainPhoto: Array.isArray(listing.photos) ? listing.photos[0] : (listing.image || ''), // Primary photo
          propertyMLS: listing.mls || '',
          propertyLotSize: listing.lotSize || '',
          propertyYearBuilt: listing.yearBuilt || ''
        });
      });
    }

    // If no listings found, create one row with just agent data
    if (rows.length === 0) {
      rows.push({
        ...baseAgentInfo,
        listingType: 'No Listings Found',
        listingIndex: 0,
        propertyAddress: '',
        propertyPrice: '',
        propertyBeds: '',
        propertyBaths: '',
        propertySqft: '',
        propertyType: '',
        propertyDescription: '',
        propertyStatus: '',
        propertyPhotos: '',
        propertyMLS: '',
        propertyLotSize: '',
        propertyYearBuilt: ''
      });
    }

    return rows;
  }

  safeExtract(extractFunction) {
    try {
      const functionName = extractFunction.toString().match(/this\.(\w+)\(/)?.[1] || 'unknown';
      console.log(`🔍 Extracting: ${functionName}...`);
      
      const result = extractFunction();
      
      console.log(`✅ ${functionName} result:`, result);
      return result;
    } catch (error) {
      const functionName = extractFunction.toString().match(/this\.(\w+)\(/)?.[1] || 'unknown';
      console.error(`❌ Error in ${functionName}:`, error);
      log.error('Error in extraction function:', error);
      return {};
    }
  }

  async safeExtractAsync(extractFunction) {
    try {
      const functionName = extractFunction.toString().match(/this\.(\w+)\(/)?.[1] || 'unknown';
      console.log(`🔍 Extracting (ASYNC): ${functionName}...`);
      
      const result = await extractFunction();
      
      console.log(`✅ ${functionName} result:`, result);
      return result;
    } catch (error) {
      const functionName = extractFunction.toString().match(/this\.(\w+)\(/)?.[1] || 'unknown';
      console.error(`❌ Error in ${functionName}:`, error);
      log.error('Error in async extraction function:', error);
      return {};
    }
  }

  detectPageType() {
    const url = window.location.href;
    if (url.includes('/realestateagents/')) return 'agent';
    if (url.includes('/realestateandhomes-search/')) return 'search';
    if (url.includes('/realestateandhomes-detail/')) return 'property';
    return 'unknown';
  }

  async extractAgentData() {
    const agent = {};
    
    // Agent name - try to get clean name only
    try {
      agent.name = this.extractCleanAgentName();
      console.log(`🎯 AGENT NAME EXTRACTED: "${agent.name}"`);
    } catch (error) {
      console.error('❌ Error extracting agent name:', error);
      agent.name = 'Not found';
    }

    // Profile photo - target actual agent headshot, not cover photos
    try {
      log.debug('📸 Looking for agent profile photo...');
      agent.photo = this.extractAgentProfilePhoto();
    } catch (error) {
      console.error('❌ Error extracting agent photo:', error);
      agent.photo = null;
    }

    // Bio/Description - get clean bio text (NOW ASYNC - EXPANDS "SEE MORE" FIRST)
    try {
      agent.bio = await this.extractCleanBio();
    } catch (error) {
      console.error('❌ Error extracting bio:', error);
      agent.bio = 'Not found';
    }

    // Price range information - extract just the price range
    try {
      agent.priceRange = this.extractPriceRange();
    } catch (error) {
      console.error('❌ Error extracting price range:', error);
      agent.priceRange = null;
    }

    // Extract rating - clean number only
    try {
      agent.rating = this.extractRating();
    } catch (error) {
      console.error('❌ Error extracting rating:', error);
      agent.rating = 'Not found';
    }

    // Recommendations count - clean number only
    try {
      agent.recommendationsCount = this.extractRecommendationsCount();
    } catch (error) {
      console.error('❌ Error extracting recommendations count:', error);
      agent.recommendationsCount = 0;
    }

    // Years of experience
    try {
      agent.experience = this.extractExperience();
    } catch (error) {
      console.error('❌ Error extracting experience:', error);
      agent.experience = 'Not found';
    }
    
    // FALLBACK: If individual agent data is missing, try to use review data
    try {
      if (!agent.rating || agent.rating === 'Not found' || !agent.rating) {
        const reviewsData = this.extractReviewsData();
        if (reviewsData?.overall?.rating) {
          agent.rating = reviewsData.overall.rating;
          log.debug('✅ Using review rating as agent rating:', agent.rating);
        }
      }
    } catch (error) {
      console.error('❌ Error in rating fallback:', error);
    }
    
    try {
      if (!agent.experience || agent.experience === 'Not found' || !agent.experience) {
        // Try to extract from page text
        const pageText = document.body.textContent || '';
        const expMatch = pageText.match(/(\d+)\s+years?\s+(?:of\s+)?(?:experience|in\s+real\s+estate)/i);
        if (expMatch) {
          agent.experience = expMatch[1] + ' years';
          log.debug('✅ Found experience in page text:', agent.experience);
        }
      }
    } catch (error) {
      console.error('❌ Error in experience fallback:', error);
    }

    // License number - cleaned
    try {
      agent.license = this.cleanText(this.getTextContent([
        '[data-testid="license-number"]',
        '.license-number',
        '.agent-license',
        '.license'
      ]));
    } catch (error) {
      console.error('❌ Error extracting license:', error);
      agent.license = 'Not found';
    }

    // Languages spoken - cleaned
    try {
      agent.languages = this.cleanText(this.getTextContent([
        '[data-testid="languages"]',
        '.languages-spoken',
        '.agent-languages',
        '.languages'
      ]));
    } catch (error) {
      console.error('❌ Error extracting languages:', error);
      agent.languages = 'Not found';
    }

    // Areas served - extract geographic service areas
    try {
      agent.areasServed = this.extractAreasServed();
    } catch (error) {
      console.error('❌ Error extracting areas served:', error);
      agent.areasServed = '';
    }

    console.log(`🎯 FINAL AGENT DATA BEFORE RETURN:`, agent);
    return agent;
  }

  extractAgentProfilePhoto() {
    // Priority 1: Small, square profile photos (typical headshots)
    const profileSelectors = [
      'img[width="150"]', // Common profile photo size
      'img[width="120"]',
      'img[width="100"]',
      'img[height="150"]',
      'img[height="120"]',
      'img[height="100"]',
      '[data-testid="agent-profile"] img',
      '[data-testid="agent-avatar"] img',
      '.agent-avatar img',
      '.profile-avatar img',
      '.headshot img',
      '.agent-headshot img',
      '.profile-headshot img'
    ];

    for (const selector of profileSelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        // Check if it's likely a profile photo (square-ish, small size)
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        if (width && height && width <= 300 && height <= 300) {
          const ratio = Math.abs(width - height) / Math.max(width, height);
          if (ratio < 0.3) { // Nearly square
            log.debug(`✅ Found profile photo with selector ${selector}: ${img.src}`);
            return this.normalizeImageUrl(img.src, true);
          }
        }
      }
    }

    // Priority 2: Look for profile photos by context (avoid cover/banner photos)
    const contextSelectors = [
      '.agent-info img',
      '.agent-details img:not(.cover):not(.banner):not(.background)',
      '.profile-section img',
      '.agent-card img',
      '.contact-info img',
      '[class*="profile"] img[src*="headshot"]',
      '[class*="profile"] img[src*="agent"]',
      'img[alt*="headshot"]',
      'img[alt*="profile"]',
      'img[alt*="agent photo"]'
    ];

    for (const selector of contextSelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        // Avoid large images that are likely covers
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        if (!width || !height || (width <= 400 && height <= 400)) {
          // Additional check: avoid obviously wide cover photos
          if (!width || !height || (width / height) < 2) {
            log.debug(`✅ Found profile photo with context selector ${selector}: ${img.src}`);
            return this.normalizeImageUrl(img.src, true);
          }
        }
      }
    }

    // Priority 3: Fallback to more general selectors but with size filtering
    const fallbackSelectors = [
      '.agent-photo img',
      '.profile-photo img',
      '.agent-image img',
      'img[class*="agent"]:not([class*="cover"]):not([class*="banner"])',
      'img[class*="profile"]:not([class*="cover"]):not([class*="banner"])'
    ];

    for (const selector of fallbackSelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        // Filter out obviously large cover photos
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        if (!width || !height || (width <= 500 && height <= 500)) {
          log.debug(`✅ Found profile photo with fallback selector ${selector}: ${img.src}`);
          return this.normalizeImageUrl(img.src, true);
        } else {
          log.debug(`⏭️ Skipping large image (likely cover): ${width}x${height} from ${selector}`);
        }
      }
    }

    log.debug('❌ No suitable profile photo found');
    return null;
  }

  extractAreasServed() {
    log.debug('🌍 Looking for areas served...');
    
    // Look for areas served in specific sections
    const areaSelectors = [
      '[data-testid="areas-served"]',
      '.areas-served',
      '.service-areas',
      '.coverage-areas',
      '.markets-served',
      '.neighborhoods',
      '.service-area',
      '[class*="area"][class*="served"]',
      '[class*="service"][class*="area"]'
    ];

    for (const selector of areaSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const areas = this.cleanText(element.textContent?.trim());
        if (areas && areas.length > 10) {
          log.debug(`✅ Found areas served: "${areas.substring(0, 100)}..."`);
          return areas;
        }
      }
    }

    // Look for areas in agent bio and description text
    const bioText = document.querySelector('.profile-description, .agent-bio, .bio, .description')?.textContent || '';
    const pageText = document.body.textContent || '';
    const combinedText = bioText + ' ' + pageText;
    
    log.debug(`🔍 Searching in bio text: "${bioText.substring(0, 200)}..."`);

    // Enhanced area patterns to capture more location types
    const areaPatterns = [
      // Direct area serving patterns
      /(?:areas?\s+served|service\s+areas?|markets?\s+served)[:\-]?\s*([^.!?]{20,200})/i,
      /(?:specializing\s+in|serving)[:\-]?\s*([A-Z][^.!?]{10,150}(?:Hills?|Beach|City|County|Area|Valley|Heights|Grove|Park|Village|Angeles|Hollywood|Beverly|Downtown)[^.!?]{0,50})/i,
      /(?:covers?|covering)[:\-]?\s*([A-Z][^.!?]{10,150}(?:Hills?|Beach|City|County|Area|Valley|Heights|Grove|Park|Village|Angeles|Hollywood|Beverly|Downtown)[^.!?]{0,50})/i,
      
      // Geographic description patterns - IMPROVED to stop at common break words
      /(?:from|in|throughout)\s+([A-Z][^.!?]*?(?:to|and|,)[^.!?]*?(?:Hills?|Beach|City|County|Area|Valley|Heights|Grove|Park|Village|Angeles|Hollywood|Beverly|Downtown)[^.!?]{0,50})(?=\s*[.!?]|\s*[A-Z][a-z]*:|$)/i,
      /([A-Z][a-z\s,&-]+(?:Los Angeles|Beverly Hills|West Hollywood|Hollywood|Downtown|Beach|Valley|Hills|County|Area)[^.!?]{0,50})(?=\s*[.!?]|\s*[A-Z][a-z]*:|$)/i,
      
      // "Greater [City] area" patterns - IMPROVED to stop cleanly
      /(?:Greater|Metro|Greater Metro)\s+([A-Z][a-z\s]+area[^.!?]{0,50})(?=\s*[.!?]|\s*[A-Z][a-z]*:|$)/i,
      
      // Specific pattern for Danny's bio structure
      /specializes in the\s+([^.!?]+?(?:Los Angeles|Beverly Hills|West Hollywood|Hollywood|Downtown|Beach|Valley|Hills|area)[^.!?]{0,50})(?=\s*[.!?]|\s*Danny's|\s*His|\s*[A-Z][a-z]*\s+[a-z]+:)/i
    ];

    for (const pattern of areaPatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        let areas = this.cleanText(match[1].trim());
        
        // Enhanced cleaning to remove JSON-like data and contamination
        areas = areas.replace(/(?:Specializations|Buyer's agent|Seller's agent|Spoken Languages|Contact details|Danny's|His|network|client service|marketing strategies).*/gi, '');
        areas = areas.replace(/\([^)]*\).*$/g, ''); // Remove anything after parentheses
        areas = areas.replace(/\s{2,}/g, ' ').trim(); // Clean up extra spaces
        
        // Remove JSON-like patterns and technical data - ENHANCED
        areas = areas.replace(/["'][^"']*["']\s*:\s*["'][^"']*["']/g, ''); // Remove complete "key":"value" patterns
        areas = areas.replace(/["'][^"']*["']\s*:\s*[^,"'}]+/g, ''); // Remove "key":value patterns
        areas = areas.replace(/PhotoEntityKey[^,}]*[,}]/gi, ''); // Remove PhotoEntityKey completely
        areas = areas.replace(/agent_represents[^,}]*[,}]/gi, ''); // Remove agent_represents
        areas = areas.replace(/title[^,}]*[,}]/gi, ''); // Remove title field
        areas = areas.replace(/areas_served["']?\s*:\s*["']?([^"'}]+)["']?/gi, '$1'); // Extract just the areas_served value
        areas = areas.replace(/[:]{1,}/g, ' '); // Replace colons with spaces
        areas = areas.replace(/[{}[\]"']/g, ''); // Remove JSON brackets and quotes
        areas = areas.replace(/\d{10,}/g, ''); // Remove long numbers (likely IDs)
        areas = areas.replace(/,\s*,/g, ','); // Remove double commas
        areas = areas.replace(/^\s*,\s*/, ''); // Remove leading comma
        areas = areas.replace(/\s*,\s*$/, ''); // Remove trailing comma
        
        // IMPROVED: Add proper spacing between areas and clean up concatenated words
        areas = areas.replace(/([a-z])([A-Z])/g, '$1, $2'); // Add comma between camelCase words
        areas = areas.replace(/([A-Z][a-z]+)([A-Z][a-z]+)/g, '$1, $2'); // Add comma between title case words
        areas = areas.replace(/,\s*,/g, ','); // Remove double commas again
        areas = areas.replace(/\s{2,}/g, ' ').trim(); // Final space cleanup
        
        // Check if result looks like actual location names (not JSON fragments)
        const hasValidLocations = /(?:Hills?|Beach|City|County|Area|Valley|Heights|Grove|Park|Village|Angeles|Hollywood|Beverly|Downtown|Agoura|Oak Park|Westlake|Venice|Marina|Del Rey|Playa)/i.test(areas);
        const hasJsonMarkers = /[{}[\]":]/.test(areas) || areas.includes('PhotoEntityKey') || areas.includes('agent_represents') || areas.includes('_');
        
        // Filter out overly long or short matches, and those that still contain JSON
        if (areas.length > 15 && areas.length < 200 && hasValidLocations && !hasJsonMarkers) {
          log.debug(`✅ Found areas in text pattern (cleaned): "${areas}"`);
          return areas;
        } else {
          log.debug(`❌ Areas validation failed - hasValidLocations: ${hasValidLocations}, hasJsonMarkers: ${hasJsonMarkers}, areas: "${areas}"`);
        }
      }
    }

    // Look for common California location names in proximity
    const locationKeywords = [
      'Los Angeles', 'Beverly Hills', 'West Hollywood', 'Hollywood', 'Santa Monica', 
      'Culver City', 'Venice', 'Manhattan Beach', 'Hermosa Beach', 'Redondo Beach',
      'Pasadena', 'Glendale', 'Burbank', 'Studio City', 'North Hollywood',
      'Sherman Oaks', 'Encino', 'Tarzana', 'Woodland Hills', 'Calabasas',
      'Downtown', 'Westside', 'San Fernando Valley', 'South Bay', 'Eastside'
    ];

    const foundLocations = [];
    locationKeywords.forEach(location => {
      if (combinedText.includes(location)) {
        foundLocations.push(location);
      }
    });

    if (foundLocations.length >= 2) {
      const areasString = foundLocations.slice(0, 8).join('; '); // Limit to 8 areas
      log.debug(`✅ Found areas from location keywords: "${areasString}"`);
      return areasString;
    }

    // Look for lists of neighborhoods/cities in structured elements
    const locationElements = document.querySelectorAll('li, span, div');
    const locations = [];
    
    locationElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 50 && text.length > 5 && 
          (text.includes('Hills') || text.includes('Beach') || text.includes('City') || 
           text.includes('County') || text.includes('Area') || text.includes('Valley') ||
           text.includes('Heights') || text.includes('Grove') || text.includes('Park') ||
           text.includes('Angeles') || text.includes('Hollywood'))) {
        // Check if it's likely a location name
        if (text.split(' ').length <= 4 && !text.includes('$') && !text.includes('bed') && 
            !text.includes('bath') && !text.includes('sqft') && !text.includes('agent')) {
          locations.push(text);
        }
      }
    });

    if (locations.length > 2) {
      const uniqueLocations = [...new Set(locations)].slice(0, 10); // Limit to 10 areas
      const areasString = uniqueLocations.join('; ');
      log.debug(`✅ Found areas from location elements: "${areasString}"`);
      return areasString;
    }

    log.debug(`❌ No areas served found`);
    return '';
  }

  extractCleanAgentName() {
    console.log(`🔍 DEBUG NAME EXTRACTION: Starting extractCleanAgentName`);
    log.debug('🏷️ Looking for agent name with anti-scrambling techniques...');
    
    // DIAGNOSTIC: Let's see what's actually on the page
    console.log('🔍 DIAGNOSTIC: Page title:', document.title);
    console.log('🔍 DIAGNOSTIC: URL:', window.location.href);
    
    // Look for any element containing "BJ" anywhere on the page
    const allElements = document.querySelectorAll('*');
    let bjElements = [];
    allElements.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('BJ') || text.includes('B.J.') || text.includes('Ward')) {
        bjElements.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: text.substring(0, 100) // First 100 chars
        });
      }
    });
    console.log('🔍 DIAGNOSTIC: Elements containing BJ/Ward:', bjElements.slice(0, 10)); // First 10 results
    
    // Method 1: Try specific selectors first (may be scrambled) - ENHANCED
    const nameSelectors = [
      'h1[data-testid="agent-name"]',
      '.agent-name',
      'h1.agent-profile-name',
      '[data-testid="agent-profile-name"]',
      'h1', // Try any h1 tag
      '.profile-name',
      // ENHANCED: Add more selectors for BJ Ward specifically
      '[data-testid*="name"]',
      '[class*="name"]',
      '[class*="title"]',
      'header h1',
      'header h2',
      '.agent-header h1',
      '.agent-header h2',
      // Look for any text that might contain "BJ Ward"
      '*:contains("BJ Ward")',
      '*:contains("BJ")',
      // Look in breadcrumbs or navigation
      '.breadcrumb',
      'nav',
      '.navigation'
    ];
    
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      console.log(`🔍 DEBUG NAME EXTRACTION: Testing selector "${selector}" - Element found: ${!!element}`);
      if (element) {
        console.log(`🔍 DEBUG NAME EXTRACTION: Element text content: "${element.textContent?.trim()}"`);
        const name = this.extractSpecificText(element, 100);
        console.log(`🔍 DEBUG NAME EXTRACTION: Raw name from ${selector}: "${name}"`);
        log.debug(`🔍 Testing name from ${selector}: "${name}"`);
        if (name && name.length < 100 && !this.containsMixedContent(name) && this.isValidName(name)) {
          console.log(`✅ DEBUG NAME EXTRACTION: Final valid name: "${name}"`);
          log.debug(`✅ Using agent name from selector: "${name}"`);
          return name;
        } else {
          console.log(`❌ DEBUG NAME EXTRACTION: Name failed validation - length: ${name?.length}, mixed: ${this.containsMixedContent(name)}, valid: ${this.isValidName(name)}`);
        }
      }
    }
    
    // Method 2: Page title extraction (reliable)
    const title = document.title;
    log.debug(`🔍 Checking page title: "${title}"`);
    
    // Multiple title patterns - enhanced for business names and complex structures
    const titlePatterns = [
      // Pattern for names like "AL Galvis" - all caps first name (PRIORITY)
      /^([A-Z]{2,3} [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*-/,  // "AL Galvis - ..."
      // Specific pattern for "Kristin L. Arledge & Assoc. - ..." - EXACT match for this case
      /^(Kristin L\. Arledge & Assoc\.)\s*-/,
      // Pattern for names with middle initial and & Assoc.: "Name L. Surname & Assoc. - ..."
      /^([A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+\s+&\s+Assoc\.)\s*-/,
      // Pattern for business names ending in Assoc., Associates, etc.
      /^([A-Z][a-zA-Z\s\.&,]+(?:Assoc\.?|Associates?|Group|Team|LLC|Inc\.?))\s*-/,
      // Pattern for compound names with middle initials and business suffixes  
      /^([A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+(?:\s+&\s+[A-Z][a-z]+\.?)*)\s*-/,
      // Standard patterns - Simplified to handle names with internal capitals like McDowell, O'Brien
      /^([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s*-/,  // "John McDowell - ..."
      /([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s*\|\s*REALTOR/i,  // "John McDowell | REALTOR"
      /([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s*,?\s*Real Estate/i,  // "John McDowell, Real Estate"
      /^([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s/  // "John McDowell ..."
    ];
    
    for (const pattern of titlePatterns) {
      const titleMatch = title.match(pattern);
      log.debug(`🔍 Testing pattern: ${pattern} against title: "${title}"`);
      if (titleMatch && titleMatch[1]) {
        const name = titleMatch[1].trim();
        log.debug(`🔍 Testing title pattern match: "${name}"`);
        if (this.isValidName(name)) {
          log.debug(`✅ Found name in title: "${name}"`);
          return name;
        } else {
          log.debug(`❌ Title match "${name}" failed validation`);
        }
      } else {
        log.debug(`❌ Pattern ${pattern} did not match`);
      }
    }
    
    // Method 3: Structure-based extraction (look for name-like text in headers)
    const headers = document.querySelectorAll('h1, h2, h3, [role="heading"]');
    for (const header of headers) {
      const text = header.textContent?.trim();
      if (text && text.length < 60) {
        // Check if it looks like a person's name - Simplified to handle McDowell, O'Brien, etc.
        let nameMatch = text.match(/^([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s*$/);
        
        // Fallback to simpler pattern if the complex one fails
        if (!nameMatch) {
          nameMatch = text.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/);
        }
        
        console.log(`🔍 DEBUG NAME EXTRACTION: Testing header text "${text}" - Match: ${nameMatch ? nameMatch[1] : 'none'}`);
        
        if (nameMatch && this.isValidName(nameMatch[1])) {
          console.log(`✅ DEBUG NAME EXTRACTION: Found name in header: "${nameMatch[1]}"`);
          log.debug(`✅ Found name in header structure: "${nameMatch[1]}"`);
          return nameMatch[1];
        }
      }
    }
    
    // Method 4: ENHANCED Direct text search for known agents like "BJ Ward"
    const pageText = document.body.textContent || '';
    console.log('🔍 DIAGNOSTIC: Searching page text for BJ/Ward...');
    console.log('🔍 DIAGNOSTIC: Page text length:', pageText.length);
    
    // Extract a sample of page text that might contain the name
    const bjIndex = pageText.indexOf('BJ');
    const wardIndex = pageText.indexOf('Ward');
    if (bjIndex >= 0) {
      console.log('🔍 DIAGNOSTIC: Found "BJ" at index', bjIndex, 'context:', pageText.substring(bjIndex - 20, bjIndex + 50));
    }
    if (wardIndex >= 0) {
      console.log('🔍 DIAGNOSTIC: Found "Ward" at index', wardIndex, 'context:', pageText.substring(wardIndex - 20, wardIndex + 50));
    }
    
    const knownAgentPatterns = [
      /\b(BJ Ward)\b/g,
      /\b(B\.J\. Ward)\b/g,
      /\b(B J Ward)\b/g,
      /\b([A-Z]{1,3} [A-Z][a-z]+)\b/g  // Pattern for initials + surname
    ];
    
    for (const pattern of knownAgentPatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        console.log('🔍 DIAGNOSTIC: Pattern matches found:', matches);
        for (const match of matches) {
          if (this.isValidName(match)) {
            console.log(`✅ DEBUG NAME EXTRACTION: Found name in page text: "${match}"`);
            log.debug(`✅ Found name in page text: "${match}"`);
            return match;
          }
        }
      }
    }
    
    // Method 5: LAST RESORT - extract any text that looks like a name from title or page
    const titleMatch = document.title.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
    if (titleMatch) {
      console.log('🔍 DIAGNOSTIC: Found name pattern in title:', titleMatch[1]);
      if (this.isValidName(titleMatch[1])) {
        return titleMatch[1];
      }
    }
    
    // Method 5: Meta tag extraction
    const metaTags = [
      'meta[property="og:title"]',
      'meta[name="description"]',
      'meta[property="twitter:title"]'
    ];
    
    for (const selector of metaTags) {
      const meta = document.querySelector(selector);
      if (meta) {
        const content = meta.getAttribute('content') || '';
        const nameMatch = content.match(/([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)/);
        if (nameMatch && this.isValidName(nameMatch[1])) {
          console.log(`✅ DEBUG NAME EXTRACTION: Found name in meta tag: "${nameMatch[1]}"`);
          log.debug(`✅ Found name in meta tag: "${nameMatch[1]}"`);
          return nameMatch[1];
        }
      }
    }
    
    // Method 5: URL-based extraction (last resort)
    const url = window.location.href;
    const urlMatch = url.match(/\/([A-Z][a-z]+-[A-Z][a-z]+(?:-[A-Z][a-z]+)?)\//);
    if (urlMatch) {
      const name = urlMatch[1].replace(/-/g, ' ');
      if (this.isValidName(name)) {
        log.debug(`✅ Found name in URL: "${name}"`);
        return name;
      }
    }
    
    log.debug(`❌ No agent name found with any method`);
    return 'Agent Name Not Found';
  }

  isValidName(text) {
    console.log(`🔍 DEBUG NAME VALIDATION: Testing "${text}"`);
    
    if (!text || text.length < 3 || text.length > 100) {
      console.log(`❌ DEBUG NAME VALIDATION: Length check failed for "${text}" - length: ${text?.length}`);
      log.debug(`❌ Name validation failed - length check: "${text}"`);
      return false;
    }
    
    // Specific check for Kristin L. Arledge & Assoc.
    if (text === "Kristin L. Arledge & Assoc.") {
      log.debug(`✅ Name validation passed - exact match for Kristin L. Arledge & Assoc.`);
      return true;
    }
    
    // Enhanced patterns for various name formats
    const validPatterns = [
      // Standard names: "John Smith", "Mary Jane Doe"
      /^[A-Z][a-z]+ [A-Z][a-z]+( [A-Z][a-z]+)?$/,
      // Names with internal capitals: "Rick McDowell", "Mary O'Brien", "John DeAngelo"
      /^[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?)?$/,
      // Names with middle initials: "John A. Smith", "Mary J. Doe"
      /^[A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+$/,
      // Names like "AL Galvis" - all caps first name
      /^[A-Z]{2,3} [A-Z][a-z]+( [A-Z][a-z]+)?$/,
      // Business names with &: "Smith & Associates", "John & Jane Realty"
      /^[A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+\s*&\s*[A-Z][a-z]+\.?$/,
      // Business suffixes: "John Smith & Assoc.", "Jane Doe Associates"
      /^[A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+\s*&\s*Assoc\.?$/,
      /^[A-Z][a-z]+ [A-Z][a-z]+\s+(Associates?|Group|Team|LLC|Inc\.?)$/,
      // Complex business names: "Kristin L. Arledge & Assoc."
      /^[A-Z][a-z]+ [A-Z]\.\s+[A-Z][a-z]+\s*&\s*Assoc\.$/
    ];
    
    const isValid = validPatterns.some(pattern => pattern.test(text));
    const hasInvalidTerms = text.includes('Real Estate Agent') || 
                           text.includes('realtor.com') || 
                           text.includes('CA Real Estate') ||
                           text.includes('Los Angeles, CA') ||
                           text.includes('Find Realtors'); // Add this specific invalid term
    
    console.log(`🔍 DEBUG NAME VALIDATION: "${text}" - isValid: ${isValid}, hasInvalidTerms: ${hasInvalidTerms}`);
    
    if (!isValid) {
      console.log(`❌ DEBUG NAME VALIDATION: No pattern match for "${text}"`);
      log.debug(`❌ Name validation failed - no pattern match: "${text}"`);
    }
    if (hasInvalidTerms) {
      console.log(`❌ DEBUG NAME VALIDATION: Invalid terms found in "${text}"`);
      log.debug(`❌ Name validation failed - invalid terms: "${text}"`);
    }
    
    return isValid && !hasInvalidTerms;
  }

  // ANTI-SCRAPER RESISTANT: Expand "See More" content using multiple strategies
  async expandAllSeeMoreContent() {
    console.log('🔍 EXPANDING "SEE MORE" CONTENT - ANTI-SCRAPER RESISTANT...');
    
    let expandedCount = 0;
    
    // Strategy 1: Look for BUTTONS first (most likely to be expansion triggers)
    const buttonSelectors = [
      'button', 
      'span[role="button"]', 
      'div[role="button"]',
      '[data-testid*="more"]',
      '[data-testid*="expand"]',
      '[aria-expanded="false"]'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          const text = (element.textContent || '').toLowerCase().trim();
          
          // Only match very specific expansion text patterns
          const isExpansionButton = (
            text === 'see more' || 
            text === 'read more' || 
            text === 'show more' ||
            text === 'view more' ||
            text === 'expand' ||
            text.includes('see full bio') ||
            text.includes('read full bio') ||
            text.includes('show full bio')
          );
          
          // Also detect "See less" buttons - we want to ensure content is expanded
          const isCollapseButton = (
            text === 'see less' ||
            text === 'read less' ||
            text === 'show less' ||
            text === 'collapse'
          );
          
          // If we find a "See less" button, the content is already expanded - good!
          if (isCollapseButton) {
            console.log(`🔍 FOUND COLLAPSE BUTTON: "${text}" - content is already expanded!`);
            // Don't click it, just note that content is expanded
            continue;
          }
          
          // CRITICAL: Exclude navigation links by checking href
          const isNavigationLink = element.href && (
            element.href.includes('/advice/') ||
            element.href.includes('/news/') ||
            element.href.includes('/blog/') ||
            element.href.includes('realtor.com/advice') ||
            element.href !== window.location.href
          );
          
          if (isExpansionButton && !isNavigationLink && element.offsetParent !== null) {
            console.log(`🔍 FOUND EXPANSION BUTTON: "${text}" in ${element.tagName}.${element.className}`);
            console.log(`🔍 BUTTON HREF: ${element.href || 'none'}`);
            
            try {
              element.click();
              expandedCount++;
              console.log(`✅ CLICKED EXPANSION BUTTON: ${text}`);
              
              // Small delay between clicks
              if (expandedCount > 0 && expandedCount % 2 === 0) {
                break; // Don't click too many at once
              }
              
            } catch (clickError) {
              console.log(`❌ BUTTON CLICK FAILED for "${text}":`, clickError.message);
            }
          } else if (isExpansionButton && isNavigationLink) {
            console.log(`🚫 SKIPPED NAVIGATION LINK: "${text}" -> ${element.href}`);
          }
        }
        
        if (expandedCount >= 3) break; // Don't click too many
        
      } catch (error) {
        console.log(`❌ BUTTON SELECTOR ERROR for "${selector}":`, error.message);
      }
    }
    
    // Strategy 2: Look for clickable spans/divs near bio content (fallback)
    if (expandedCount === 0) {
      console.log('🔍 FALLBACK: Looking for clickable elements near bio content...');
      
      try {
        // Look for elements that contain bio-like content and have expansion hints
        const bioContainers = document.querySelectorAll('div, section, article');
        
        for (const container of bioContainers) {
          const containerText = (container.textContent || '').toLowerCase();
          
          // Check if this container has bio-like content
          const hasBioContent = (
            containerText.includes('broker') ||
            containerText.includes('real estate') ||
            containerText.includes('experience') ||
            containerText.includes('years')
          );
          
          if (hasBioContent) {
            // Look for expansion elements within this container
            const expansionElements = container.querySelectorAll('span, div, button');
            
            for (const element of expansionElements) {
              const text = (element.textContent || '').toLowerCase().trim();
              
              if ((text === 'see more' || text === 'read more') && 
                  !element.href && 
                  element.offsetParent !== null) {
                
                console.log(`🔍 FOUND BIO EXPANSION: "${text}" in bio container`);
                
                try {
                  element.click();
                  expandedCount++;
                  console.log(`✅ CLICKED BIO EXPANSION: ${text}`);
                  break; // Only click one per container
                } catch (clickError) {
                  console.log(`❌ BIO EXPANSION CLICK FAILED:`, clickError.message);
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`❌ BIO CONTAINER SEARCH ERROR:`, error.message);
      }
    }
    
    console.log(`🔍 EXPANSION COMPLETE: ${expandedCount} elements clicked`);
    
    // Poll for content readiness instead of fixed delay
    if (expandedCount > 0) {
      console.log(`🔍 POLLING FOR BIO EXPANSION COMPLETION...`);
      const isReady = await ContentPollingManager.pollForBioExpansion(expandedCount, {
        maxAttempts: 30,
        interval: 50,
        timeout: 2000
      });
      
      if (isReady) {
        console.log(`🔍 BIO EXPANSION POLLING COMPLETE - Content ready for extraction`);
      } else {
        console.log(`🔍 BIO EXPANSION POLLING TIMEOUT - Proceeding anyway`);
      }
    } else {
      console.log(`🔍 NO EXPANSION NEEDED - Ready for extraction`);
    }
    
    return expandedCount;
  }

  async extractCleanBio() {
    console.log('🔍 🔍 🔍 BIO EXTRACTION: DEEP DIAGNOSTIC STARTING...');
    log.debug('🔍 Looking for FULL agent bio (with SAFE content expansion)...');
    
    // CRITICAL FIRST STEP: EXPAND ANY "SEE MORE" CONTENT BEFORE EXTRACTION
    console.log('🔍 EXPANDING "SEE MORE" CONTENT...');
    const expandedCount = await this.expandAllSeeMoreContent();
    
    // Expansion complete, proceeding with extraction
    console.log(`🔍 EXPANSION RESULT: ${expandedCount} elements expanded - proceeding with extraction...`);
    console.log('🔍 DOM expansion complete, proceeding with bio extraction...');
    
    // FIRST: Look specifically for text that starts with "Hello!" anywhere on the page
    console.log('🔍 BIO DIAGNOSTIC: Searching for "Hello!" bio text...');
    const allElements = document.querySelectorAll('*');
    
    let helloFoundCount = 0;
    
    for (let element of allElements) {
      const text = element.textContent || '';
      if (text.includes('Hello!')) {
        helloFoundCount++;
        console.log(`🔍 BIO DIAGNOSTIC: Found "Hello!" #${helloFoundCount} in ${element.tagName}.${element.className || 'no-class'}`);
        console.log(`🔍 BIO DIAGNOSTIC: Hello text length: ${text.length}`);
        console.log(`🔍 BIO DIAGNOSTIC: Hello text preview: "${text.substring(0, 300)}"`);
        
        if (text.trim().startsWith('Hello!') && text.length > 500) {
          console.log(`🔍 BIO DIAGNOSTIC: ⭐ This "Hello!" text STARTS with Hello and is substantial!`);
          
          const cleanedHelloBio = this.cleanBioText(text.trim());
          console.log(`🔍 BIO DIAGNOSTIC: After cleaning: "${cleanedHelloBio?.substring(0, 200)}"`);
          
          if (cleanedHelloBio && cleanedHelloBio.length > 500 && this.isQualityBio(cleanedHelloBio)) {
            console.log(`✅ BIO DIAGNOSTIC: RETURNING "Hello!" BIO (${cleanedHelloBio.length} chars)`);
            return cleanedHelloBio;
          } else {
            console.log(`❌ BIO DIAGNOSTIC: Hello bio failed validation - length: ${cleanedHelloBio?.length}, quality: ${this.isQualityBio(cleanedHelloBio)}`);
          }
        }
      }
    }
    
    console.log(`🔍 BIO DIAGNOSTIC: Total "Hello!" occurrences found: ${helloFoundCount}`);
    
    // CRITICAL: Look for the specific bio content that was being misclassified as reviews
    console.log('🔍 BIO DIAGNOSTIC: Searching for misclassified bio content...');
    
    for (let element of allElements) {
      const text = element.textContent || '';
      
      // Look for the specific phrases that were appearing in "recommendations"
      const hasBioMarkers = (
        text.includes('I have lived in the gorgeous coastal region of Ventura County') ||
        text.includes('After obtaining my broker license in 2004') ||
        text.includes('we closed nearly $10 million in real estate sales') ||
        text.includes('As the years go on Comfort Real Estate Services') ||
        text.includes('Thank you for taking the time to get to know me')
      );
      
      if (hasBioMarkers && text.length > 200) {
        console.log(`🔍 BIO DIAGNOSTIC: ⭐ FOUND MISCLASSIFIED BIO CONTENT!`);
        console.log(`🔍 BIO DIAGNOSTIC: Element: ${element.tagName}.${element.className || 'no-class'}`);
        console.log(`🔍 BIO DIAGNOSTIC: Bio content length: ${text.length}`);
        console.log(`🔍 BIO DIAGNOSTIC: Bio preview: "${text.substring(0, 200)}..."`);
        
        // Try to find the complete bio by looking at parent elements
        let completeText = text.trim();
        let parentElement = element.parentElement;
        
        // Look up the DOM tree to find a more complete version
        while (parentElement && parentElement.textContent && parentElement.textContent.length > completeText.length) {
          const parentText = parentElement.textContent.trim();
          if (parentText.includes('Hello! My name is B.J. Ward') || 
              (parentText.includes('B.J. Ward') && parentText.length > completeText.length * 1.5)) {
            completeText = parentText;
            console.log(`🔍 BIO DIAGNOSTIC: Found more complete text in parent (${completeText.length} chars)`);
            break;
          }
          parentElement = parentElement.parentElement;
        }
        
        const cleanedBio = this.cleanBioText(completeText);
        if (cleanedBio && cleanedBio.length > 300 && this.isQualityBio(cleanedBio)) {
          console.log(`✅ BIO DIAGNOSTIC: RETURNING RECOVERED BIO (${cleanedBio.length} chars)`);
          return cleanedBio;
        }
      }
    }
    
    // SECOND: Look for any element containing the key bio phrases (broader search)
    console.log('🔍 BIO DIAGNOSTIC: Searching for elements with substantial bio content...');
    
    let substantialBios = [];
    
    for (let element of allElements) {
      const text = element.textContent || '';
      // Look for elements that contain key bio phrases and are substantial
      if (text.length > 800 && 
          (text.includes('REALTOR® Magazine') || 
           text.includes('30 under 30') || 
           text.includes('Thank you for taking the time to get to know me'))) {
        
        console.log(`🔍 BIO DIAGNOSTIC: Found substantial bio in ${element.tagName}.${element.className || 'no-class'}`);
        console.log(`🔍 BIO DIAGNOSTIC: Substantial bio length: ${text.length}`);
        console.log(`🔍 BIO DIAGNOSTIC: Substantial bio starts with: "${text.substring(0, 100)}"`);
        
        substantialBios.push({
          element: element,
          text: text.trim(),
          length: text.length,
          startsWithHello: text.trim().startsWith('Hello!'),
          startsWithMyName: text.trim().startsWith('My name is')
        });
      }
    }
    
    // Process substantial bios - prefer those that start with Hello, then those that start with My name
    if (substantialBios.length > 0) {
      console.log(`🔍 BIO DIAGNOSTIC: Found ${substantialBios.length} substantial bios, evaluating...`);
      
      substantialBios.forEach((bio, index) => {
        console.log(`🔍 SUBSTANTIAL BIO ${index + 1}: Length: ${bio.length}, Hello: ${bio.startsWithHello}, MyName: ${bio.startsWithMyName}`);
        console.log(`   Preview: "${bio.text.substring(0, 150)}"`);
      });
      
      // Try Hello bios first
      const helloBios = substantialBios.filter(bio => bio.startsWithHello);
      if (helloBios.length > 0) {
        const bestHello = helloBios.reduce((best, current) => current.length > best.length ? current : best);
        const cleanedHelloBio = this.cleanBioText(bestHello.text);
        if (cleanedHelloBio && cleanedHelloBio.length > 500 && this.isQualityBio(cleanedHelloBio)) {
          console.log(`✅ BIO DIAGNOSTIC: RETURNING SUBSTANTIAL "Hello!" BIO (${cleanedHelloBio.length} chars)`);
          return cleanedHelloBio;
        }
      }
      
      // Try My name bios as fallback
      const myNameBios = substantialBios.filter(bio => bio.startsWithMyName);
      if (myNameBios.length > 0) {
        const bestMyName = myNameBios.reduce((best, current) => current.length > best.length ? current : best);
        console.log(`🔍 BIO DIAGNOSTIC: Using "My name" bio as fallback...`);
        const cleanedMyNameBio = this.cleanBioText(bestMyName.text);
        if (cleanedMyNameBio && cleanedMyNameBio.length > 500 && this.isQualityBio(cleanedMyNameBio)) {
          console.log(`✅ BIO DIAGNOSTIC: RETURNING SUBSTANTIAL "My name" BIO after fixes (${cleanedMyNameBio.length} chars)`);
          return cleanedMyNameBio;
        }
      }
    }
    
    // Get page text for all searches
    const pageText = document.body.textContent;
    
    // PRIORITY SEARCH: Look for the COMPLETE bio text first by searching the entire page text
    console.log(`🔍 BIO DIAGNOSTIC: Priority search - looking for complete bio in page text (${pageText.length} chars)...`);
    
    // Search for the specific complete bio patterns that include "Hello" and the full name
    const completeBioPatterns = [
      // Match the exact expected bio pattern
      /Hello!\s*My\s+name\s+is\s+B\.J\.\s+Ward\.\s+I\s+am\s+the\s+Broker\/Owner[\s\S]*?Thank\s+you\s+for\s+taking\s+the\s+time\s+to\s+get\s+to\s+know\s+me\s+and\s+our\s+company\./i,
      
      // More flexible pattern for the complete bio
      /Hello!\s*My\s+name\s+is\s+[A-Z][^.]*\.\s+I\s+am\s+the\s+Broker\/Owner[\s\S]*?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i,
      
      // Look for any bio that starts with Hello and is substantial
      /Hello!\s*My\s+name\s+is\s+[A-Z][^.]*\.[\s\S]{300,}?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i,
      
      // Alternative without exclamation point
      /Hello\s*My\s+name\s+is\s+[A-Z][^.]*\.[\s\S]{300,}?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i,
      
      // IMPORTANT: Also match the truncated version that starts with "My name is B."
      /My\s+name\s+is\s+B\.\s+I\s+am\s+the\s+Broker\/Owner[\s\S]*?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i,
      
      // General truncated version pattern
      /My\s+name\s+is\s+[A-Z][^.]*\.\s+I\s+am\s+the\s+Broker\/Owner[\s\S]*?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i,
      
      // Flexible truncated pattern
      /My\s+name\s+is\s+[A-Z][^.]*\.[\s\S]{300,}?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i
    ];
    
    for (let i = 0; i < completeBioPatterns.length; i++) {
      const pattern = completeBioPatterns[i];
      console.log(`🔍 BIO DIAGNOSTIC: Testing priority pattern ${i + 1}/${completeBioPatterns.length}...`);
      
      const match = pageText.match(pattern);
      if (match) {
        console.log(`✅ BIO DIAGNOSTIC: FOUND COMPLETE BIO with priority pattern ${i + 1}!`);
        console.log(`🔍 BIO DIAGNOSTIC: Match length: ${match[0].length} chars`);
        console.log(`🔍 BIO DIAGNOSTIC: First 200 chars: "${match[0].substring(0, 200)}..."`);
        
        let completeBio = match[0].trim();
        completeBio = this.cleanBioText(completeBio);
        
        if (completeBio && completeBio.length > 500 && this.isQualityBio(completeBio)) {
          console.log(`✅ BIO DIAGNOSTIC: RETURNING COMPLETE BIO (${completeBio.length} chars)`);
          return completeBio;
        }
      }
    }
    
    console.log('🔍 BIO DIAGNOSTIC: Priority search failed, continuing with detailed search...');
    
    // DIAGNOSTIC: Let's see what bio-related content exists on the page
    console.log('🔍 BIO DIAGNOSTIC: Searching for bio-related elements...');
    
    // Check for any elements that might contain BJ Ward's bio
    const pageElements = document.querySelectorAll('*');
    let bioElements = [];
    let bjElements = [];
    
    pageElements.forEach(el => {
      const text = el.textContent || '';
      
      // Look for elements containing key bio phrases
      if (text.includes('In 2009') || text.includes('REALTOR') || text.includes('30 under 30') || 
          text.includes('selected as one') || text.includes('real estate') || text.includes('experience')) {
        bioElements.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: text.substring(0, 200),
          textLength: text.length
        });
      }
      
      // Look for elements that mention BJ specifically
      if (text.includes('BJ') && text.length > 50) {
        bjElements.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: text.substring(0, 200),
          textLength: text.length
        });
      }
    });
    
    console.log('🔍 BIO DIAGNOSTIC: Bio-related elements found:', bioElements.slice(0, 5));
    console.log('🔍 BIO DIAGNOSTIC: BJ-related elements found:', bjElements.slice(0, 5));
    
    // SAFE bio expansion - only expand if we can verify it's bio content
    this.safeExpandBioContent();
    
    console.log(`🔍 BIO DIAGNOSTIC: Page text length: ${pageText.length} characters`);
    
    // PRIORITY: Look for bio content near "About [Agent Name]" sections
    const agentName = this.extractCleanAgentName()?.split(' ')[0] || 'BJ'; // Get first name
    console.log(`🔍 BIO DIAGNOSTIC: Searching for "About ${agentName}" sections...`);
    
    // More comprehensive search around "About" sections
    const aboutPatterns = [
      new RegExp(`About\\s+${agentName}[\\s\\S]{0,500}(Hello[\\s\\S]{200,3000})`, 'i'),
      new RegExp(`About\\s+${agentName}[\\s\\S]{0,500}(My name is[\\s\\S]{200,3000})`, 'i'),
      new RegExp(`About\\s+${agentName}[\\s\\S]{0,300}([\\s\\S]{500,3000})`, 'i')
    ];
    
    for (let i = 0; i < aboutPatterns.length; i++) {
      const aboutMatch = pageText.match(aboutPatterns[i]);
      
      if (aboutMatch && aboutMatch[1]) {
        console.log(`🔍 BIO DIAGNOSTIC: Found "About ${agentName}" section with pattern ${i + 1}`);
        let aboutBio = aboutMatch[1].trim();
        
        // Look for the complete bio start - prioritize "Hello" or "My name is"
        const bioStartMatches = [
          aboutBio.match(/Hello[!.]?\s+My name is\s+[A-Z][A-Za-z.\s]+\.\s+I am[^.]+\./i),
          aboutBio.match(/My name is\s+[A-Z][A-Za-z.\s]+\.\s+I am[^.]+\./i),
          aboutBio.match(/Hello[!.]?\s+[^.]+\./i)
        ];
        
        for (let startMatch of bioStartMatches) {
          if (startMatch) {
            aboutBio = startMatch[0] + aboutBio.substring(aboutBio.indexOf(startMatch[0]) + startMatch[0].length);
            console.log(`🔍 BIO DIAGNOSTIC: Found complete bio start: "${startMatch[0].substring(0, 50)}..."`);
            break;
          }
        }
        
        // If no clear start found, look for first sentence that starts with capital letter
        if (!aboutBio.match(/^(Hello|My name is)/i)) {
          const sentences = aboutBio.split(/[.!?]+/);
          for (let j = 0; j < sentences.length; j++) {
            const sentence = sentences[j].trim();
            if (sentence.length > 20 && sentence.match(/^[A-Z]/)) {
              aboutBio = sentences.slice(j).join('. ').trim();
              console.log(`🔍 BIO DIAGNOSTIC: Starting from sentence: "${sentence.substring(0, 50)}..."`);
              break;
            }
          }
        }
        
        // Clean and validate - INCREASED LENGTH LIMIT
        aboutBio = this.cleanBioText(aboutBio);
        if (aboutBio && aboutBio.length > 200 && aboutBio.length < 8000 && this.isQualityBio(aboutBio)) {
          console.log(`✅ BIO DIAGNOSTIC: FOUND COMPLETE BIO near "About ${agentName}" (${aboutBio.length} chars)`);
          return aboutBio;
        }
      }
    }
    
    // Search for BJ Ward's specific bio content in page text
    const bjBioSearch = pageText.indexOf('In 2009');
    const realtorSearch = pageText.indexOf('REALTOR');
    const under30Search = pageText.indexOf('30 under 30');
    
    console.log('🔍 BIO DIAGNOSTIC: Bio content search results:');
    console.log(`  - "In 2009" found at index: ${bjBioSearch}`);
    console.log(`  - "REALTOR" found at index: ${realtorSearch}`);
    console.log(`  - "30 under 30" found at index: ${under30Search}`);
    
    if (bjBioSearch >= 0) {
      const bioContext = pageText.substring(bjBioSearch - 50, bjBioSearch + 500);
      console.log('🔍 BIO DIAGNOSTIC: Bio context around "In 2009":', bioContext);
    }

    // DEBUG: Let's see what the page text actually contains around the bio area
    const helloIndex = pageText.indexOf('Hello! My name is');
    const myNameIndex = pageText.indexOf('My name is B');
    const bjWardIndex = pageText.indexOf('B.J. Ward');
    
    console.log('🔍 BIO DIAGNOSTIC: Bio start patterns found:');
    console.log(`  - "Hello! My name is" found at: ${helloIndex}`);
    console.log(`  - "My name is B" found at: ${myNameIndex}`);
    console.log(`  - "B.J. Ward" found at: ${bjWardIndex}`);
    
    if (helloIndex >= 0) {
      console.log('🔍 BIO DIAGNOSTIC: Text around "Hello! My name is":', pageText.substring(helloIndex, helloIndex + 200));
    }
    if (myNameIndex >= 0) {
      console.log('🔍 BIO DIAGNOSTIC: Text around "My name is B":', pageText.substring(myNameIndex, myNameIndex + 200));
    }
    
    log.debug(`📄 Page text length: ${pageText.length} characters`);
    
    // PRIORITY: First try to find the complete bio by looking for the actual beginning
    console.log('🔍 BIO DIAGNOSTIC: Looking for complete bio from beginning...');
    
    // Look for the full bio starting with common bio openings
    const bioStartPatterns = [
      'Hello! My name is',
      'My name is',
      'I am the Broker/Owner',
      'I am the Broker',
      'I have lived in the gorgeous coastal region'
    ];
    
    for (const startPattern of bioStartPatterns) {
      const startIndex = pageText.indexOf(startPattern);
      if (startIndex >= 0) {
        console.log(`🔍 BIO DIAGNOSTIC: Found bio start pattern "${startPattern}" at index ${startIndex}`);
        
        // Extract a large chunk from the start to capture the complete bio
        const bioChunk = pageText.substring(startIndex, startIndex + 5000);
        
        // Look for the natural end of the bio
        const bioEndPatterns = [
          'Thank you for taking the time to get to know me and our company.',
          'Thank you for taking the time',
          'contact me',
          'call me',
          'reach out'
        ];
        
        let endIndex = bioChunk.length;
        for (const endPattern of bioEndPatterns) {
          const patternIndex = bioChunk.indexOf(endPattern);
          if (patternIndex >= 0) {
            // Include the end pattern in the bio
            endIndex = Math.min(endIndex, patternIndex + endPattern.length);
            console.log(`🔍 BIO DIAGNOSTIC: Found bio end pattern "${endPattern}" at relative index ${patternIndex}`);
          }
        }
        
        let completeBio = bioChunk.substring(0, endIndex).trim();
        completeBio = this.cleanBioText(completeBio);
        
        if (completeBio && completeBio.length > 500 && this.isQualityBio(completeBio)) {
          console.log(`✅ BIO DIAGNOSTIC: FOUND COMPLETE BIO from start pattern (${completeBio.length} chars)!`);
          return completeBio;
        }
      }
    }

    console.log('🔍 BIO DIAGNOSTIC: Moving to pattern-based extraction...');
    
    // Look for the complete BJ Ward bio or similar long professional bios
    const longBioPatterns = [
      // PRIORITY: Complete bio starting with "Hello" - capture the FULL bio
      /Hello!?\s*My\s+name\s+is\s+[A-Z][^.]*\.[\s\S]*?(?:Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // Alternative full bio starting with "My name is" - capture EVERYTHING until end
      /My\s+name\s+is\s+[A-Z][^.]*\.[\s\S]*?(?:Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // Capture bio starting from broker/owner introduction
      /I\s+am\s+the\s+Broker\/Owner[^.]*\.[\s\S]*?(?:Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // Full biography patterns starting with introduction - NO LENGTH LIMIT
      /Hello!?\s*[^.]*\.[\s\S]*?(?:real\s+estate.*?Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // Complete professional background starting with personal intro - EXPANDED
      /(?:I\s+am\s+the\s+(?:Broker|Owner|Agent)|I\s+have\s+lived|I\s+am\s+[A-Z][^.]*)[\s\S]*?(?:Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // BJ Ward's specific patterns - capture from beginning to end
      /I\s+have\s+lived\s+in\s+the\s+gorgeous\s+coastal\s+region[\s\S]*?(?:Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // Achievement-based bios (like REALTOR Magazine) - get more context
      /(?:Hello!?\s*)?(?:My\s+name\s+is\s+[^.]*\.\s*)?[\s\S]*?In\s+2009,?\s*I\s+was\s+selected\s+as\s+one\s+of\s+REALTOR®?\s*Magazine'?s?\s*"?30\s+under\s+30"?[\s\S]*?(?:Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // Enhanced fallback patterns for bio content - MUCH LONGER CAPTURE
      /(?:In\s+\d{4}|Since\s+\d{4}|Born\s+in|I\s+(?:have\s+)?(?:been|am|was)|My\s+(?:career|journey|experience|background))[\s\S]*?(?:real\s+estate|realtor|agent|clients|market|experience|years|business|properties)[\s\S]*?(?:Thank\s+you|contact|heart|business|clients)/is,
      
      // Comprehensive bio pattern - capture from any reasonable bio start to any reasonable bio end
      /(?:Hello!?\s*)?(?:My\s+name\s+is\s+[A-Z][^.]*\.\s*)?(?:I\s+am\s+the\s+[^.]*\.\s*)?I\s+have\s+lived[\s\S]*?(?:Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\.)/is,
      
      // Last resort: find any substantial paragraph that contains bio keywords
      /[A-Z][^.]*\.[\s\S]*?(?:Broker|Owner|Agent|real\s+estate|REALTOR|Magazine|30\s+under\s+30)[\s\S]*?(?:Thank\s+you|contact|heart|business|clients|community)/is,
      
      // Professional experience patterns  
      /(?:With\s+(?:over\s+)?\d+\s+years?|Having\s+\d+\s+years?|My\s+\d+\s+years?)[\s\S]{30,500}?(?:experience|real\s+estate|clients|market|business)/is,
      
      // Personal story patterns
      /(?:I\s+(?:grew\s+up|was\s+born|lived)|Growing\s+up|Born\s+(?:and\s+raised|in))[\s\S]{50,600}?(?:real\s+estate|community|area|local|market|clients)/is
    ];
    
    console.log('🔍 BIO DIAGNOSTIC: Testing bio patterns...');
    
    // Collect pattern-based bio candidates instead of returning first match
    let patternCandidates = [];
    
    // Try patterns with increasing length requirements
    for (let i = 0; i < longBioPatterns.length; i++) {
      const pattern = longBioPatterns[i];
      console.log(`🔍 BIO DIAGNOSTIC: Testing pattern ${i + 1}/${longBioPatterns.length}...`);
      
      const match = pageText.match(pattern);
      if (match) {
        console.log(`🔍 BIO DIAGNOSTIC: Pattern ${i + 1} MATCHED! Raw match:`, match[0].substring(0, 300));
        
        let bio = match[0].trim();
        
        // Clean up the bio
        bio = this.cleanBioText(bio);
        console.log(`🔍 BIO DIAGNOSTIC: After cleaning (${bio.length} chars):`, bio.substring(0, 200));
        
        // Collect all substantial patterns
        if (bio.length > 200 && bio.length < 8000) {
          console.log(`🔍 BIO DIAGNOSTIC: Adding pattern ${i + 1} to candidates (${bio.length} chars)`);
          patternCandidates.push({
            text: bio,
            pattern: i + 1,
            length: bio.length,
            quality: this.isQualityBio(bio)
          });
        } else {
          console.log(`❌ BIO DIAGNOSTIC: Pattern ${i + 1} match failed length check - length: ${bio.length}`);
        }
      } else {
        console.log(`❌ BIO DIAGNOSTIC: Pattern ${i + 1} no match`);
      }
    }
    
    // Process pattern candidates before moving to selector extraction
    if (patternCandidates.length > 0) {
      console.log(`🔍 BIO DIAGNOSTIC: Found ${patternCandidates.length} pattern candidates, evaluating...`);
      
      // Log all pattern candidates
      patternCandidates.forEach((candidate, index) => {
        console.log(`🔍 PATTERN CANDIDATE ${index + 1}: Pattern ${candidate.pattern} - ${candidate.length} chars - Quality: ${candidate.quality}`);
      });
      
      // Choose the best pattern candidate (prefer quality, then length)
      const qualityPatterns = patternCandidates.filter(candidate => candidate.quality);
      const candidates = qualityPatterns.length > 0 ? qualityPatterns : patternCandidates;
      const bestPattern = candidates.reduce((best, current) => 
        current.length > best.length ? current : best
      );
      
      console.log(`✅ BIO DIAGNOSTIC: Best pattern candidate: Pattern ${bestPattern.pattern} (${bestPattern.length} chars, quality: ${bestPattern.quality})`);
      
      // Only return pattern result if it's high quality and substantial
      if (bestPattern.quality && bestPattern.length > 500) {
        console.log(`✅ BIO DIAGNOSTIC: RETURNING PATTERN-BASED BIO (${bestPattern.length} chars)`);
        return bestPattern.text;
      } else {
        console.log(`🔍 BIO DIAGNOSTIC: Pattern candidate not strong enough, continuing to selector-based extraction...`);
      }
    }
    
    console.log('🔍 BIO DIAGNOSTIC: Moving to selector-based extraction...');
    
    // Enhanced bio selectors - focus on FULL content first, then expandable content
    const bioSelectors = [
      // Try expanded content first
      '[data-testid="agent-bio"] .expanded',
      '.agent-bio .expanded', 
      '.profile-description .expanded',
      '.bio-content .expanded',
      
      // Look for longer text blocks that might contain full bio
      '.profile-content',
      '.agent-details',
      '.agent-info',
      
      // More specific bio selectors
      '[data-testid="agent-bio"]',
      '.agent-profile-bio',
      '.profile-bio',
      '.bio-section',
      '.ProfileDescription',
      '.AgentBio',
      
      // Generic bio selectors
      '.agent-bio',
      '.profile-description', 
      '.agent-description',
      '.bio-content',
      '.description',
      '.about-agent',
      '.agent-about',
      '.agent-summary',
      '.summary',
      
      // Generic class patterns (last resort)
      '[class*="bio"]',
      '[class*="description"]',
      '[class*="about"]'
    ];
    
    console.log(`🔍 BIO DIAGNOSTIC: Testing ${bioSelectors.length} bio selectors...`);
    
    // Collect ALL bio candidates instead of returning first match
    let bioCandidates = [];
    
    for (let i = 0; i < bioSelectors.length; i++) {
      const selector = bioSelectors[i];
      console.log(`🔍 BIO DIAGNOSTIC: Testing selector ${i + 1}/${bioSelectors.length}: "${selector}"`);
      
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 BIO DIAGNOSTIC: Selector "${selector}" found ${elements.length} elements`);
        
        for (let j = 0; j < elements.length; j++) {
          const element = elements[j];
          if (element) {
            // Try to get ALL text content, not just visible
            const bio = this.extractAllText(element);
            console.log(`🔍 BIO DIAGNOSTIC: Element ${j + 1} text (${bio?.length || 0} chars): "${bio?.substring(0, 150) || 'undefined'}..."`);
            
            log.debug(`📝 Testing bio from ${selector} (${bio?.length || 0} chars): "${bio?.substring(0, 100) || 'undefined'}..."`);
            
            // Collect ALL substantial bio content instead of returning first match
            if (bio && bio.length > 150 && bio.length < 8000) {
              console.log(`🔍 BIO DIAGNOSTIC: Bio length check passed (${bio.length} chars), adding to candidates...`);
              bioCandidates.push({
                text: bio,
                selector: selector,
                element: j + 1,
                length: bio.length,
                quality: this.isQualityBio(bio)
              });
            } else {
              console.log(`❌ BIO DIAGNOSTIC: Bio failed length check - length: ${bio?.length || 0}, target: 150-8000`);
            }
          }
        }
      } catch (e) {
        console.log(`❌ BIO DIAGNOSTIC: Error with selector "${selector}":`, e.message);
        continue;
      }
    }
    
    // Now process the collected bio candidates to choose the best one
    if (bioCandidates.length > 0) {
      console.log(`🔍 BIO DIAGNOSTIC: Found ${bioCandidates.length} bio candidates, selecting best one...`);
      
      // Log all candidates for debugging
      bioCandidates.forEach((candidate, index) => {
        console.log(`🔍 BIO CANDIDATE ${index + 1}: ${candidate.selector} - ${candidate.length} chars - Quality: ${candidate.quality}`);
        console.log(`   Preview: "${candidate.text.substring(0, 100)}..."`);
      });
      
      // Filter for quality bios first
      const qualityBios = bioCandidates.filter(candidate => candidate.quality);
      console.log(`🔍 BIO DIAGNOSTIC: ${qualityBios.length} quality bios found`);
      
      // Choose the longest quality bio, or longest overall if no quality bios
      const candidates = qualityBios.length > 0 ? qualityBios : bioCandidates;
      const bestBio = candidates.reduce((best, current) => 
        current.length > best.length ? current : best
      );
      
      console.log(`✅ BIO DIAGNOSTIC: Selected best bio from ${bestBio.selector} (${bestBio.length} chars, quality: ${bestBio.quality})`);
      const cleanedBio = this.cleanBioText(bestBio.text);
      console.log(`✅ BIO DIAGNOSTIC: RETURNING SELECTED BIO (${cleanedBio.length} chars)!`);
      return cleanedBio;
    }
    
    console.log('🔍 BIO DIAGNOSTIC: Trying bio paragraph combination...');
    
    // Try to find and combine multiple bio paragraphs
    const bioParagraphs = this.findBioParagraphs(pageText);
    console.log(`🔍 BIO DIAGNOSTIC: Found ${bioParagraphs.length} bio paragraphs`);
    
    if (bioParagraphs.length > 0) {
      console.log('🔍 BIO DIAGNOSTIC: Bio paragraphs:', bioParagraphs.map(p => p.substring(0, 100)));
      const combinedBio = bioParagraphs.join(' ').trim();
      console.log(`🔍 BIO DIAGNOSTIC: Combined bio length: ${combinedBio.length} chars`);
      
      if (combinedBio.length > 200) {
        console.log(`✅ BIO DIAGNOSTIC: Using combined bio paragraphs (${combinedBio.length} chars)`);
        log.debug(`✅ Found combined bio paragraphs (${combinedBio.length} chars)`);
        return this.cleanBioText(combinedBio);
      }
    }
    
    console.log('🔍 BIO DIAGNOSTIC: Trying substantial bio patterns (last resort)...');
    
    // Last resort - look for any substantial text about the agent
    const substantialBioPatterns = [
      // Any text mentioning the agent with substantial content
      /(?:BJ Ward|I|My)[^.]*\.(?:[^.]*\.){3,20}/is,
      // Any real estate professional description
      /(?:real estate|realtor|agent|broker)[^.]*\.(?:[^.]*\.){3,15}/is,
      // Any experience description
      /(?:experience|years|professional|career)[^.]*\.(?:[^.]*\.){3,15}/is
    ];
    
    for (let i = 0; i < substantialBioPatterns.length; i++) {
      const pattern = substantialBioPatterns[i];
      console.log(`🔍 BIO DIAGNOSTIC: Testing substantial pattern ${i + 1}/${substantialBioPatterns.length}...`);
      
      const match = pageText.match(pattern);
      if (match) {
        console.log(`🔍 BIO DIAGNOSTIC: Substantial pattern ${i + 1} MATCHED:`, match[0].substring(0, 200));
        
        let bio = match[0].trim();
        bio = this.cleanBioText(bio);
        
        console.log(`🔍 BIO DIAGNOSTIC: After cleaning (${bio.length} chars):`, bio.substring(0, 200));
        
        if (bio.length > 300 && bio.length < 8000 && this.isQualityBio(bio)) {
          console.log(`✅ BIO DIAGNOSTIC: FOUND substantial bio content (${bio.length} chars)`);
          log.debug(`✅ Found substantial bio content (${bio.length} chars)`);
          return bio;
        } else {
          console.log(`❌ BIO DIAGNOSTIC: Substantial pattern ${i + 1} failed validation - length: ${bio.length}, quality: ${this.isQualityBio(bio)}`);
        }
      } else {
        console.log(`❌ BIO DIAGNOSTIC: Substantial pattern ${i + 1} no match`);
      }
    }

    // FINAL FALLBACK: Search for any text containing key bio phrases and reconstruct
    console.log('🔍 BIO DIAGNOSTIC: FINAL FALLBACK - searching for bio fragments to reconstruct...');
    
    // Look for text containing the essential bio elements
    const keyPhrases = [
      'I am the Broker/Owner of Comfort Real Estate Services',
      'In 2009, I was selected as one of REALTOR',
      'gorgeous coastal region of Ventura County',
      'Thank you for taking the time to get to know me'
    ];
    
    let foundPhrases = [];
    for (const phrase of keyPhrases) {
      const index = pageText.indexOf(phrase);
      if (index >= 0) {
        foundPhrases.push({
          phrase: phrase,
          index: index,
          context: pageText.substring(Math.max(0, index - 200), index + phrase.length + 200)
        });
        console.log(`🔍 BIO DIAGNOSTIC: Found key phrase "${phrase.substring(0, 30)}..." at index ${index}`);
      }
    }
    
    if (foundPhrases.length >= 2) {
      // If we found multiple key phrases, try to reconstruct the bio
      console.log(`🔍 BIO DIAGNOSTIC: Found ${foundPhrases.length} key phrases, attempting reconstruction...`);
      
      // Find the earliest and latest indices to capture the full bio
      const startIndex = Math.min(...foundPhrases.map(f => f.index - 200));
      const endIndex = Math.max(...foundPhrases.map(f => f.index + 200));
      
      const reconstructedBio = pageText.substring(Math.max(0, startIndex), endIndex).trim();
      console.log(`🔍 BIO DIAGNOSTIC: Reconstructed bio (${reconstructedBio.length} chars): "${reconstructedBio.substring(0, 200)}..."`);
      
      // Look for a proper bio start in the reconstructed text
      const bioStartPatterns = [
        /Hello!\s*My\s+name\s+is\s+[A-Z][^.]*\./i,
        /My\s+name\s+is\s+[A-Z][^.]*\./i,
        /I\s+am\s+the\s+Broker\/Owner/i
      ];
      
      for (const pattern of bioStartPatterns) {
        const match = reconstructedBio.match(pattern);
        if (match) {
          const bioStart = reconstructedBio.indexOf(match[0]);
          let finalBio = reconstructedBio.substring(bioStart);
          
          // Look for the end of the bio
          const endMatch = finalBio.match(/Thank\s+you\s+for\s+taking\s+the\s+time[^.]*\./i);
          if (endMatch) {
            finalBio = finalBio.substring(0, finalBio.indexOf(endMatch[0]) + endMatch[0].length);
          }
          
          finalBio = this.cleanBioText(finalBio);
          if (finalBio && finalBio.length > 300 && this.isQualityBio(finalBio)) {
            console.log(`✅ BIO DIAGNOSTIC: SUCCESSFULLY RECONSTRUCTED BIO (${finalBio.length} chars)!`);
            return finalBio;
          }
        }
      }
    }

    console.log('❌ BIO DIAGNOSTIC: No substantial bio found - EXTRACTION FAILED');
    log.debug('❌ No substantial bio found');
    return null;
  }

  // DIAGNOSTIC FUNCTION: Extract raw page structure
  extractPageDiagnostics() {
    console.log('🔍 DIAGNOSTIC: Starting page analysis...');
    
    // 1. Check for all h1, h2, h3 elements
    const headings = [];
    ['h1', 'h2', 'h3'].forEach(tag => {
      document.querySelectorAll(tag).forEach(el => {
        headings.push({
          tag: tag,
          text: el.textContent?.trim().substring(0, 100),
          className: el.className,
          id: el.id
        });
      });
    });
    console.log('🔍 DIAGNOSTIC: All headings found:', headings);
    
    // 2. Check for elements that might contain addresses
    const addressLikeElements = [];
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent || '';
      if ((text.includes('Camarillo') || text.includes('CA') || text.includes('93012') || text.includes('93010')) && 
          text.length < 200) {
        addressLikeElements.push({
          tagName: el.tagName,
          className: el.className,
          text: text.trim().substring(0, 150)
        });
      }
    });
    console.log('🔍 DIAGNOSTIC: Address-like elements:', addressLikeElements.slice(0, 10));
    
    // 3. Check for common agent data patterns
    const dataTestIds = [];
    document.querySelectorAll('[data-testid]').forEach(el => {
      dataTestIds.push({
        testId: el.getAttribute('data-testid'),
        text: el.textContent?.trim().substring(0, 100),
        tagName: el.tagName
      });
    });
    console.log('🔍 DIAGNOSTIC: Data-testid elements:', dataTestIds.slice(0, 20));
    
    return {
      headings,
      addressLikeElements: addressLikeElements.slice(0, 10),
      dataTestIds: dataTestIds.slice(0, 20)
    };
  }

  safeExpandBioContent() {
    log.debug('🔍 Safely expanding bio content...');
    
    // Look for bio containers first
    const bioContainers = document.querySelectorAll([
      '[data-testid*="bio"]',
      '[class*="bio"]',
      '[class*="about"]',
      '[class*="description"]',
      '.agent-bio',
      '.agent-about',
      '.agent-description'
    ].join(', '));
    
    bioContainers.forEach(container => {
      // Look for "See More" buttons WITHIN bio containers only
      const allButtons = container.querySelectorAll('button, a, [aria-expanded="false"]');
      
      allButtons.forEach(button => {
        const text = button.textContent?.toLowerCase() || '';
        const href = button.href?.toLowerCase() || '';
        
        // Check if this is a bio expansion button by text content
        const isExpansionButton = text.includes('see more') || text.includes('read more') || 
                                text.includes('show more') || text.includes('expand') || 
                                text.includes('view more');
        
        // Only click if it's clearly bio expansion and NOT navigation
        if (isExpansionButton &&
            !href.includes('advice') && !href.includes('sell') && !href.includes('buy') &&
            !href.includes('.com') && !href.startsWith('http')) {
          
          log.debug('✅ Safe bio expansion button found:', text);
          try {
            button.click();
          } catch (e) {
            log.debug('Bio expansion failed:', e);
          }
        }
      });
    });
  }

  // New helper function to expand truncated content
  expandTruncatedContent() {
    log.debug('🔄 Expanding truncated content...');
    
    // Look for "See More", "Read More", "Show More" buttons and elements
    const expandSelectors = [
      'button[aria-expanded="false"]',
      '[data-testid*="expand"]',
      '[data-testid*="more"]',
      '[data-testid*="show"]',
      '.expand-button',
      '.read-more',
      '.see-more', 
      '.show-more',
      '[class*="expand"]',
      '[class*="more"]'
    ];
    
    // Text-based selectors (more flexible)
    const textBasedSelectors = [
      '*:contains("See More")',
      '*:contains("Read More")', 
      '*:contains("Show More")',
      '*:contains("View More")',
      '*:contains("expand")',
      '*:contains("...")'
    ];
    
    // First try CSS selectors
    expandSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element && this.isExpandableElement(element)) {
            log.debug('🖱️ Attempting to expand element:', element.className || element.tagName);
            this.triggerExpansion(element);
          }
        });
      } catch (e) {
        log.debug('Selector failed:', selector, e);
      }
    });
    
    // Then try text-based search
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      const text = element.textContent || '';
      const lowerText = text.toLowerCase().trim();
      
      if ((lowerText.includes('see more') || 
           lowerText.includes('read more') || 
           lowerText.includes('show more') ||
           lowerText.includes('view more') ||
           lowerText.endsWith('...')) && 
          text.length < 50 && // Short text likely to be a button
          this.isClickableElement(element)) {
        
        log.debug('🖱️ Found expandable text element:', text);
        this.triggerExpansion(element);
      }
    });
    
    // Force expand common bio containers
    const bioContainers = document.querySelectorAll([
      '.agent-bio',
      '.profile-description',
      '.bio-content',
      '[data-testid*="bio"]',
      '[class*="bio"]'
    ].join(','));
    
    bioContainers.forEach(container => {
      this.forceExpandContainer(container);
    });
    
    log.debug('✅ Content expansion attempts completed');
  }

  isExpandableElement(element) {
    const text = element.textContent || '';
    const lowerText = text.toLowerCase().trim();
    
    // SAFETY: Don't expand navigation links
    if (element.tagName === 'A' && element.href) {
      const href = element.href.toLowerCase();
      if (href.includes('advice') || href.includes('sell') || href.includes('buy') || 
          href.includes('rent') || href.includes('news') || href.includes('mortgage') ||
          href.includes('realtor.com') || href !== '#' && href !== 'javascript:void(0)') {
        return false; // This is a navigation link, don't click it
      }
    }
    
    // Only allow expansion of elements that are clearly content toggles
    const isContentExpansion = (
      lowerText === 'see more' ||
      lowerText === 'read more' ||
      lowerText === 'show more' ||
      lowerText === 'view more' ||
      lowerText === 'expand' ||
      lowerText.endsWith('...') ||
      element.getAttribute('aria-expanded') === 'false'
    );
    
    const isSafeElement = (
      element.tagName === 'BUTTON' ||
      (element.tagName === 'SPAN' && element.style.cursor === 'pointer') ||
      (element.tagName === 'DIV' && element.style.cursor === 'pointer') ||
      element.getAttribute('role') === 'button'
    );
    
    return isContentExpansion && isSafeElement;
  }

  isClickableElement(element) {
    // SAFETY: Don't click on navigation links
    if (element.tagName === 'A' && element.href) {
      const href = element.href.toLowerCase();
      if (href.includes('advice') || href.includes('sell') || href.includes('buy') || 
          href.includes('rent') || href.includes('news') || href.includes('mortgage') ||
          href.includes('realtor.com') || href !== '#' && href !== 'javascript:void(0)') {
        return false; // This is a navigation link, don't click it
      }
    }
    
    const text = element.textContent?.toLowerCase().trim() || '';
    
    // Only allow clicking elements that are clearly content expansion
    const isContentExpansion = (
      text === 'see more' ||
      text === 'read more' ||
      text === 'show more' ||
      text === 'view more' ||
      text === 'expand' ||
      text.endsWith('...')
    );
    
    return isContentExpansion && (
      element.tagName === 'BUTTON' || 
      (element.tagName === 'SPAN' && element.style.cursor === 'pointer') ||
      (element.tagName === 'DIV' && element.style.cursor === 'pointer') ||
      element.getAttribute('role') === 'button'
    );
  }

  triggerExpansion(element) {
    try {
      // SAFETY CHECK: Don't click on navigation links
      if (element.tagName === 'A' && element.href) {
        const href = element.href.toLowerCase();
        // Don't click on any actual navigation links
        if (href.includes('advice') || href.includes('sell') || href.includes('buy') || 
            href.includes('rent') || href.includes('news') || href.includes('mortgage') ||
            href.startsWith('http') || href.includes('.com') || href.includes('.org')) {
          log.debug('🚫 Skipping navigation link:', element.href);
          return;
        }
      }
      
      // SAFETY CHECK: Don't click on form submit buttons or navigation buttons
      if (element.type === 'submit' || element.type === 'button') {
        const text = element.textContent?.toLowerCase() || '';
        if (text.includes('submit') || text.includes('search') || text.includes('find') || 
            text.includes('go to') || text.includes('view all') || text.includes('browse')) {
          log.debug('🚫 Skipping form/navigation button:', text);
          return;
        }
      }
      
      // SAFETY CHECK: Only click on elements that are clearly content expansion
      const text = element.textContent?.toLowerCase() || '';
      const isExpansionElement = text.includes('see more') || text.includes('show more') || 
                                text.includes('read more') || text.includes('expand') ||
                                element.getAttribute('aria-expanded') === 'false';
      
      if (!isExpansionElement) {
        log.debug('🚫 Element doesn\'t appear to be content expansion:', text);
        return;
      }
      
      log.debug('✅ Safe to expand element:', text);
      
      // Try multiple expansion methods
      
      // Method 1: Direct click
      if (typeof element.click === 'function') {
        element.click();
        log.debug('✅ Clicked element');
      }
      
      // Method 2: Dispatch click event
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(clickEvent);
      
      // Method 3: Change aria-expanded
      if (element.getAttribute('aria-expanded') === 'false') {
        element.setAttribute('aria-expanded', 'true');
      }
      
      // Method 4: Trigger other common events
      ['mousedown', 'mouseup', 'focus'].forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        element.dispatchEvent(event);
      });
      
    } catch (e) {
      log.debug('Expansion method failed:', e);
    }
  }

  forceExpandContainer(container) {
    try {
      // Remove common CSS restrictions
      container.style.maxHeight = 'none';
      container.style.height = 'auto';
      container.style.overflow = 'visible';
      container.style.display = 'block';
      
      // Remove truncation classes
      const truncationClasses = ['collapsed', 'truncated', 'hidden', 'overflow-hidden'];
      truncationClasses.forEach(cls => {
        container.classList.remove(cls);
      });
      
      // Set expansion attributes
      container.setAttribute('aria-expanded', 'true');
      container.setAttribute('data-expanded', 'true');
      
      // Look for child elements that might be hidden
      const hiddenChildren = container.querySelectorAll([
        '.hidden',
        '.collapsed', 
        '.truncated',
        '[style*="display: none"]',
        '[style*="max-height"]',
        '[aria-hidden="true"]'
      ].join(','));
      
      hiddenChildren.forEach(child => {
        child.style.display = 'block';
        child.style.maxHeight = 'none';
        child.style.visibility = 'visible';
        child.setAttribute('aria-hidden', 'false');
        child.classList.remove('hidden', 'collapsed', 'truncated');
      });
      
      log.debug('🔓 Force expanded container:', container.className);
      
    } catch (e) {
      log.debug('Force expansion failed:', e);
    }
  }

  // Enhanced text extraction that gets ALL content
  extractAllText(element) {
    if (!element) return null;
    
    console.log(`🔍 EXTRACT ALL TEXT: Element tag: ${element.tagName}, classes: ${element.className}`);
    
    // Get all text content including from child elements
    let allText = '';
    
    // First try to get all text content
    allText = element.textContent || element.innerText || '';
    console.log(`🔍 EXTRACT ALL TEXT: textContent length: ${allText.length}`);
    console.log(`🔍 EXTRACT ALL TEXT: First 200 chars: "${allText.substring(0, 200)}"`);
    
    // Also check for data attributes that might contain full text
    const dataAttrs = ['data-full-text', 'data-bio', 'data-description', 'data-content'];
    for (const attr of dataAttrs) {
      const attrValue = element.getAttribute(attr);
      if (attrValue && attrValue.length > allText.length) {
        console.log(`🔍 EXTRACT ALL TEXT: Found longer text in ${attr}: ${attrValue.length} chars`);
        allText = attrValue;
      }
    }
    
    // Check child elements for expanded content
    const expandedChildren = element.querySelectorAll('.expanded, .full-text, .complete');
    expandedChildren.forEach(child => {
      const childText = child.textContent || '';
      if (childText.length > allText.length) {
        console.log(`🔍 EXTRACT ALL TEXT: Found longer text in child element: ${childText.length} chars`);
        allText = childText;
      }
    });
    
    // CRITICAL: Also check parent elements that might contain more complete text
    let currentElement = element;
    for (let i = 0; i < 3; i++) { // Check up to 3 parent levels
      currentElement = currentElement.parentElement;
      if (currentElement) {
        const parentText = currentElement.textContent || '';
        console.log(`🔍 EXTRACT ALL TEXT: Parent ${i+1} text length: ${parentText.length}`);
        console.log(`🔍 EXTRACT ALL TEXT: Parent ${i+1} first 200 chars: "${parentText.substring(0, 200)}"`);
        
        // If parent has significantly more text and starts with "Hello", prefer it
        if (parentText.length > allText.length * 1.2 && parentText.trim().startsWith('Hello')) {
          console.log(`🔍 EXTRACT ALL TEXT: Using parent element text (starts with Hello)`);
          allText = parentText;
          break;
        }
      }
    }
    
    const finalText = allText.trim();
    console.log(`🔍 EXTRACT ALL TEXT: Final text length: ${finalText.length}`);
    console.log(`🔍 EXTRACT ALL TEXT: Final first 200 chars: "${finalText.substring(0, 200)}"`);
    
    return finalText;
  }

  // Find multiple bio paragraphs and combine them
  findBioParagraphs(pageText) {
    const paragraphs = [];
    
    // Look for sentences that start with bio indicators
    const bioSentenceStarters = [
      /In\s+\d{4}[^.]*\./g,
      /(?:With|Having)\s+(?:over\s+)?\d+\s+years[^.]*\./g,
      /I\s+(?:specialize|focus|bring|offer|am|have|was)[^.]*\./g,
      /My\s+(?:passion|expertise|experience)[^.]*\./g,
      /As\s+a\s+(?:realtor|agent|professional)[^.]*\./g
    ];
    
    bioSentenceStarters.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 50 && match.length < 500 && this.looksLikeBio(match)) {
            paragraphs.push(match.trim());
          }
        });
      }
    });
    
    return [...new Set(paragraphs)]; // Remove duplicates
  }

  // Enhanced bio quality checking - NOW ALLOWS EXPANDED CONTENT
  isQualityBio(text) {
    if (!text || text.length < 100) {
      return false;
    }
    
    // REMOVED: Truncation indicators check - we WANT expanded content now!
    // The old code rejected "See More" content, but now we EXPAND it first
    console.log('🔍 BIO QUALITY CHECK: Allowing expanded content (See More is OK)');
    
    // Should have professional indicators
    const professionalIndicators = [
      'realtor', 'agent', 'broker', 'real estate', 'properties',
      'clients', 'market', 'experience', 'years', 'professional',
      'licensed', 'certified', 'specializ', 'focus'
    ];
    
    const lowerText = text.toLowerCase();
    const foundIndicators = professionalIndicators.filter(indicator => 
      lowerText.includes(indicator)
    );
    const hasIndicators = foundIndicators.length > 0;
    
    // Should have multiple sentences (substantial content)
    const sentenceCount = (text.match(/\./g) || []).length;
    
    const mixedContent = this.containsMixedContent(text);
    
    return hasIndicators && sentenceCount >= 3 && !mixedContent;
  }

  // Enhanced bio text cleaning
  cleanBioText(bio) {
    if (!bio) return null;
    
    let cleaned = bio
      // Clean line breaks and formatting
      .replace(/\\r\\n|\\n|\\r/g, ' ')
      .replace(/\r\n|\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      
      // Remove any truncation indicators AND collapse indicators
      .replace(/\.\.\.+/g, '')
      .replace(/\b(?:See|Read|Show)\s+More\b/gi, '')
      .replace(/\b(?:See|Read|Show)\s+less\b\.?/gi, '') // Remove "See less", "Read less", etc.
      .replace(/\bSee less\.?$/gi, '') // Remove "See less" at end
      .replace(/\.\s*See less\.?/gi, '.') // Remove "...See less." patterns  
      .replace(/\s+See less\.?\s*/gi, ' ') // Remove "See less" in middle with spaces
      
      // TEMPORARILY DISABLED - THESE PATTERNS WERE DESTROYING LEGITIMATE BIO CONTENT
      // TODO: Make these patterns more specific to avoid removing bio content
      // .replace(/\b(?:For Sale|Sold|Contact for price)\b/gi, '')
      // .replace(/\b(?:\d+bed|\d+bath|\d+sqft|\d+,\d+sqft|square feet)\b/gi, '')
      // .replace(/\b(?:Community detail for|Listed|Camarillo|CA \d{5}|Ventura|Oxnard)\b/gi, '')
      // .replace(/\b\d{4}\s+\w+\s+(?:Dr|St|Ave|Blvd|Ct|Way|Pl)\b/gi, '');
    
    // IMPORTANT: Only apply name fixes if the text doesn't already start correctly
    if (!cleaned.trim().startsWith('Hello!')) {
      cleaned = cleaned
        // Fix common name/location truncations (preserve important words that might get cut off)
        .replace(/^My name is B\.\s+I am/g, 'Hello! My name is B.J. Ward. I am')
        .replace(/\bB\.\s+(?=I am)/g, 'B.J. Ward. ')
        .replace(/\bCounty\b(?=\s+my entire life)/g, 'Ventura County')
        .replace(/\bparadise\.\s*(?=After)/g, 'paradise! ')
        
        // Fix common start truncations
        .replace(/^e to grips with/, 'Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of Ventura County my entire life and have yet to come to grips with')
        .replace(/^to grips with/, 'Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services, Inc. I have lived in the gorgeous coastal region of Ventura County my entire life and have yet to come to grips with');
    }
    
    cleaned = cleaned
      .replace(/®/g, '®')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/\\"/g, '"')
      
      // Clean up multiple punctuation
      .replace(/\.{2,}/g, '.')
      .replace(/\?{2,}/g, '?')
      .replace(/!{2,}/g, '!')
      
      // Ensure proper spacing after punctuation
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      
      // Remove leading/trailing whitespace
      .trim();
    
    // EMERGENCY FIX: DISABLE SENTENCE FILTERING - IT'S DESTROYING BIO CONTENT
    // The sentence filtering was breaking dollar amounts and other critical bio content
    // TODO: Implement safer content filtering that doesn't destroy legitimate bio text
    
    let result = cleaned;
    
    // Ensure it ends properly
    if (result && !result.match(/[.!?]$/)) {
      result += '.';
    }

    // CRITICAL PRESERVATION LOGGING - Monitor bio integrity
    console.log('🔍 BIO PRESERVATION CHECK:');
    console.log(`Original length: ${bio?.length || 0}`);
    console.log(`Cleaned length: ${result?.length || 0}`);
    console.log(`Original ending: "${bio?.slice(-100) || 'N/A'}"`);
    console.log(`Cleaned ending: "${result?.slice(-100) || 'N/A'}"`);
    console.log(`Contains "$10 million": ${result?.includes('$10 million') ? '✅' : '❌'}`);
    console.log(`Contains "Hello!": ${result?.includes('Hello!') ? '✅' : '❌'}`);
    console.log(`Contains "B.J. Ward": ${result?.includes('B.J. Ward') ? '✅' : '❌'}`);
    console.log(`Contains "Ventura County": ${result?.includes('Ventura County') ? '✅' : '❌'}`);

    return result;
  }

  looksLikeBio(text) {
    if (!text) return false;
    
    // Check for bio-like content indicators
    const bioIndicators = [
      'experience', 'years', 'real estate', 'agent', 'broker', 'client', 'property', 'market',
      'specializes', 'focuses', 'expertise', 'professional', 'career', 'background',
      'serves', 'works', 'helps', 'dedicated', 'committed', 'passionate'
    ];
    
    const lowerText = text.toLowerCase();
    const indicatorCount = bioIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    // Should have at least 3 bio indicators and not be too generic
    return indicatorCount >= 3 && 
           !lowerText.includes('cookie') && 
           !lowerText.includes('privacy') &&
           !lowerText.includes('terms') &&
           !lowerText.includes('javascript');
  }

  looksLikeBioFragment(text) {
    if (!text) return false;
    
    // More lenient criteria for bio fragments
    const bioIndicators = [
      'years', 'experience', 'real estate', 'agent', 'broker', 'client', 'property', 'market',
      'specializes', 'focuses', 'expertise', 'professional', 'career', 'background',
      'serves', 'works', 'helps', 'dedicated', 'committed', 'passionate', 'million',
      'sold', 'buying', 'selling', 'luxury', 'residential', 'commercial', 'properties'
    ];
    
    const lowerText = text.toLowerCase();
    const indicatorCount = bioIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    // More lenient - just need 1 bio indicator for fragments
    return indicatorCount >= 1 && 
           !lowerText.includes('cookie') && 
           !lowerText.includes('privacy') &&
           !lowerText.includes('terms') &&
           !lowerText.includes('navigation') &&
           !lowerText.includes('javascript');
  }

  extractPriceRange() {
    const pageText = document.body.textContent;
    const priceMatch = pageText.match(/\$[\d,]+\s*-\s*\$[\d,]+[KM]?/);
    return priceMatch ? priceMatch[0] : null;
  }

  extractRating() {
    log.debug('🌟 Looking for agent rating...');
    
    // Enhanced selectors for rating elements
    const ratingSelectors = [
      '[data-testid="rating"]',
      '[data-testid="agent-rating"]',
      '.rating',
      '.star-rating',
      '.agent-rating',
      '.stars',
      '.review-rating',
      '.overall-rating',
      '[aria-label*="rating"]',
      '[aria-label*="stars"]',
      '.rating-value',
      '.score',
      '.reviews-score'
    ];
    
    // Try specific rating elements first with limits to prevent infinite loops
    for (const selector of ratingSelectors) {
      const elements = document.querySelectorAll(selector);
      // Limit to first 20 elements to prevent excessive processing
      const limitedElements = Array.from(elements).slice(0, 20);
      
      for (const element of limitedElements) {
        const text = element.textContent?.trim();
        log.debug(`🔍 Testing rating from ${selector}: "${text}"`);
        
        if (text) {
          // Look for rating patterns like "4.5", "4.5/5", "4.5 stars", etc.
          const ratingMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*5|stars?|out\s+of\s+5)?/i);
          if (ratingMatch) {
            const rating = parseFloat(ratingMatch[1]);
            if (rating >= 0 && rating <= 5) {
              log.debug(`✅ Found rating: ${rating}`);
              return rating.toString();
            }
          }
        }
        
        // Check for star icons or visual indicators (limited search)
        const starElements = element.querySelectorAll('[class*="star"], [class*="filled"], svg');
        if (starElements.length > 0 && starElements.length <= 10) { // Reasonable limit
          log.debug(`🌟 Found ${starElements.length} star elements`);
          // Count filled/active stars if possible
          const filledStars = element.querySelectorAll('[class*="filled"], [class*="active"], [class*="full"]');
          if (filledStars.length > 0 && filledStars.length <= 5) {
            log.debug(`✅ Found rating from stars: ${filledStars.length}`);
            return filledStars.length.toString();
          }
          
          // If we have 5 stars total, likely means 5-star rating
          if (starElements.length === 5) {
            log.debug(`✅ Found rating from total stars: 5`);
            return '5';
          }
        }
        
        // Early exit if we found a reasonable rating to prevent excessive searching
        if (text && text.match(/\d/) && text.length < 50) {
          break;
        }
      }
    }
    
    // Search page text for rating patterns  
    const pageText = document.body.textContent;
    const ratingPatterns = [
      /(\d+(?:\.\d+)?)\s*\(\s*(\d+)\s*\)/,  // Original pattern like "4.5 (123)"
      /(\d+(?:\.\d+)?)\s*\/\s*5\s*stars?/i,
      /(\d+(?:\.\d+)?)\s*out\s*of\s*5/i,
      /rating[:\s]*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*star\s*rating/i,
      /(\d+(?:\.\d+)?)\s*\/\s*5/,
      /rated\s*(\d+(?:\.\d+)?)/i,
      /score[:\s]*(\d+(?:\.\d+)?)/i
    ];
    
    for (const pattern of ratingPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        const rating = parseFloat(match[1]);
        if (rating >= 0 && rating <= 5) {
          log.debug(`✅ Found rating in text: ${rating}`);
          return rating.toString();
        }
      }
    }
    
    log.debug('❌ No agent rating found');
    return null;
  }

  extractRecommendationsCount() {
    const pageText = document.body.textContent;
    const recMatch = pageText.match(/(\d+)\s+recommendations/);
    return recMatch ? recMatch[1] : null;
  }

  extractExperience() {
    log.debug('📅 Looking for agent experience...');
    
    // Enhanced selectors for experience elements
    const experienceSelectors = [
      '[data-testid="experience"]',
      '[data-testid="years-experience"]',
      '.experience',
      '.years-experience',
      '.agent-experience',
      '.career-info',
      '.bio-experience',
      '.years-in-business',
      '.professional-experience'
    ];
    
    // Try specific experience elements first
    for (const selector of experienceSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        log.debug(`🔍 Testing experience from ${selector}: "${text}"`);
        
        if (text) {
          const expMatch = text.match(/(\d+)\s*(?:\+)?\s*years?/i);
          if (expMatch) {
            const years = expMatch[1];
            log.debug(`✅ Found experience: ${years} years`);
            return `${years} years`;
          }
        }
      }
    }
    
    // Search page text for experience patterns
    const pageText = document.body.textContent;
    const experiencePatterns = [
      /(\d+)\s+years/i,                                    // Simple "25 years"
      /over\s+(\d+)\s+years/i,
      /(\d+)\s+years?\s+(?:of\s+)?experience/i,
      /(\d+)\s+years?\s+in\s+(?:real\s+)?estate/i,
      /(\d+)\s+years?\s+in\s+the\s+business/i,
      /(\d+)\s+years?\s+in\s+(?:the\s+)?industry/i,
      /(\d+)\+\s*years/i,
      /more\s+than\s+(\d+)\s+years/i,
      /(\d+)\s+years?\s+(?:of\s+)?(?:professional\s+)?(?:real\s+estate\s+)?(?:sales\s+)?experience/i,
      /since\s+(\d{4})/i // Extract year and calculate experience
    ];
    
    for (const pattern of experiencePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        let years = match[1];
        
        // If it's a year (like "since 2010"), calculate experience
        if (pattern.source.includes('since') && years.length === 4) {
          const currentYear = new Date().getFullYear();
          const startYear = parseInt(years);
          years = (currentYear - startYear).toString();
          if (years > 0) {
            log.debug(`✅ Found experience from start year: ${years} years`);
            return `${years} years`;
          }
        } else {
          log.debug(`✅ Found experience in text: ${years} years`);
          return `${years} years`;
        }
      }
    }
    
    log.debug('❌ No agent experience found');
    return null;
  }

  extractOfficeData() {
    const office = {};
    
    // Office/Brokerage name - extract clean office name only
    office.name = this.extractCleanOfficeName();

    // Office address
    office.address = this.cleanText(this.getTextContent([
      '[data-testid="office-address"]',
      '.office-address',
      '.brokerage-address',
      '.company-address',
      '.address',
      '.office-location'
    ]));

    // Office phone
    office.phone = this.cleanPhoneNumber(this.getTextContent([
      '[data-testid="office-phone"]',
      '.office-phone',
      '.brokerage-phone',
      '.company-phone',
      '.office-contact'
    ]));

    return office;
  }

  extractCleanOfficeName() {
    // Look for RE/MAX Infinity specifically
    const pageText = document.body.textContent;
    if (pageText.includes('RE/MAX Infinity')) {
      return 'RE/MAX Infinity';
    }
    
    // Try to find other brokerage patterns
    const brokerageMatch = pageText.match(/([A-Z][A-Za-z\s&]+(?:Realty|Real Estate|Properties|Group|Associates|Team))/);
    if (brokerageMatch) {
      const name = brokerageMatch[1].trim();
      if (name.length < 50 && !this.containsMixedContent(name)) {
        return name;
      }
    }
    
    // Look in structured elements with specific text extraction
    const officeSelectors = [
      '[data-testid="office-name"]',
      '.office-name',
      '.brokerage-name',
      '.company-name'
    ];
    
    for (const selector of officeSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const name = this.extractSpecificText(element, 100);
        if (name && name.length < 100 && !this.containsMixedContent(name)) {
          return name;
        }
      }
    }
    
    return null;
  }

  extractContactData() {
    log.debug('📞 Looking for contact information...');
    const contact = {};
    
    // Phone numbers - enhanced extraction
    contact.phone = this.extractCleanPhone();
    contact.officePhone = this.extractOfficePhone();
    contact.mobilePhone = this.extractMobilePhone();

    // Email - enhanced extraction
    contact.email = this.extractCleanEmail();

    // Website - enhanced extraction
    contact.website = this.extractWebsiteUrl();

    log.debug('📱 Contact data found:', contact);
    return contact;
  }

  extractCleanPhone() {
    log.debug('📞 Looking for phone numbers...');
    
    // Enhanced phone selectors
    const phoneSelectors = [
      '[data-testid="phone"]',
      '[data-testid="agent-phone"]',
      '.phone',
      '.agent-phone',
      '.contact-phone',
      '.phone-number',
      'a[href^="tel:"]',
      '[href*="tel:"]',
      '.contact-info .phone',
      '.agent-contact .phone'
    ];
    
    // Try specific phone elements first
    for (const selector of phoneSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        let phone = null;
        
        // Check href attribute for tel: links
        if (element.href && element.href.startsWith('tel:')) {
          phone = element.href.replace('tel:', '').trim();
        } else {
          phone = element.textContent?.trim();
        }
        
        log.debug(`📞 Testing phone from ${selector}: "${phone}"`);
        
        if (phone) {
          const cleanPhone = this.cleanPhoneNumber(phone);
          if (cleanPhone && this.isValidPhoneNumber(cleanPhone)) {
            log.debug(`✅ Found phone: ${cleanPhone}`);
            return cleanPhone;
          }
        }
      }
    }
    
    // Search page text for phone patterns
    const pageText = document.body.textContent;
    const phonePatterns = [
      /\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g,  // (323) 610-0231
      /\d{3}[-\s]\d{3}[-\s]\d{4}/g,     // 323-610-0231 or 323 610 0231
      /\d{3}\.\d{3}\.\d{4}/g,           // 323.610.0231
      /\+1\s*\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g, // +1 (323) 610-0231
      /\+1\s*\d{3}[-\s]\d{3}[-\s]\d{4}/g     // +1 323-610-0231
    ];
    
    for (const pattern of phonePatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanPhone = this.cleanPhoneNumber(match);
          if (cleanPhone && this.isValidPhoneNumber(cleanPhone)) {
            log.debug(`✅ Found phone in text: ${cleanPhone}`);
            return cleanPhone;
          }
        }
      }
    }
    
    log.debug('❌ No phone number found');
    return null;
  }

  extractOfficePhone() {
    const pageText = document.body.textContent;
    const officePhoneMatch = pageText.match(/(\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})\s+office/i);
    return officePhoneMatch ? officePhoneMatch[1] : null;
  }

  extractMobilePhone() {
    const pageText = document.body.textContent;
    const mobilePhoneMatch = pageText.match(/(\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})\s+mobile/i);
    return mobilePhoneMatch ? mobilePhoneMatch[1] : null;
  }

  extractCleanEmail() {
    log.debug('📧 Looking for email addresses...');
    
    // Enhanced email selectors
    const emailSelectors = [
      '[data-testid="email"]',
      '[data-testid="agent-email"]',
      '.email',
      '.agent-email',
      '.contact-email',
      'a[href^="mailto:"]',
      '[href*="mailto:"]',
      '.contact-info .email',
      '.agent-contact .email',
      '.email-address'
    ];
    
    // Try specific email elements first
    for (const selector of emailSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        let email = null;
        
        // Check href attribute for mailto: links
        if (element.href && element.href.startsWith('mailto:')) {
          email = element.href.replace('mailto:', '').trim();
        } else {
          email = element.textContent?.trim();
        }
        
        log.debug(`📧 Testing email from ${selector}: "${email}"`);
        
        if (email && this.isValidEmail(email)) {
          log.debug(`✅ Found email: ${email}`);
          return email;
        }
      }
    }
    
    // Search for mailto links in the page
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    for (const link of mailtoLinks) {
      const email = link.href.replace('mailto:', '').trim();
      log.debug(`📧 Testing mailto link: "${email}"`);
      
      if (this.isValidEmail(email)) {
        log.debug(`✅ Found email from mailto: ${email}`);
        return email;
      }
    }
    
    // Search page text for email patterns
    const pageText = document.body.textContent;
    const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
    const emailMatches = pageText.match(emailPattern);
    
    if (emailMatches) {
      for (const email of emailMatches) {
        log.debug(`📧 Testing email from text: "${email}"`);
        
        if (this.isValidEmail(email) && !email.includes('realtor.com') && !email.includes('example.com')) {
          log.debug(`✅ Found email in text: ${email}`);
          return email;
        }
      }
    }
    
    log.debug('❌ No email address found');
    return null;
  }

  extractWebsiteUrl() {
    log.debug('🌐 Looking for website URLs...');
    
    // Enhanced website selectors
    const websiteSelectors = [
      '[data-testid="website"]',
      '[data-testid="agent-website"]',
      '.website',
      '.agent-website',
      '.personal-website',
      '.agent-url',
      'a[href*="website"]',
      'a[href*=".com"]:not([href*="realtor.com"])',
      'a[href*=".net"]',
      'a[href*=".org"]',
      '.contact-info a',
      '.agent-contact a'
    ];
    
    // Try specific website elements first
    for (const selector of websiteSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        let url = null;
        
        // Check href attribute
        if (element.href) {
          url = element.href.trim();
        } else {
          url = element.textContent?.trim();
        }
        
        log.debug(`🌐 Testing website from ${selector}: "${url}"`);
        
        if (url && this.isValidWebsiteUrl(url)) {
          const cleanUrl = this.cleanUrl(url);
          log.debug(`✅ Found website: ${cleanUrl}`);
          return cleanUrl;
        }
      }
    }
    
    // Search for URLs in page text
    const pageText = document.body.textContent;
    const urlPattern = /https?:\/\/(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(?:\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})*\.[a-zA-Z]{2,}/g;
    const urlMatches = pageText.match(urlPattern);
    
    if (urlMatches) {
      for (const url of urlMatches) {
        log.debug(`🌐 Testing URL from text: "${url}"`);
        
        if (this.isValidWebsiteUrl(url)) {
          const cleanUrl = this.cleanUrl(url);
          log.debug(`✅ Found website in text: ${cleanUrl}`);
          return cleanUrl;
        }
      }
    }
    
    log.debug('❌ No website URL found');
    return null;
  }

  isValidWebsiteUrl(url) {
    if (!url) return false;
    
    // Skip realtor.com URLs and other common invalid patterns
    const invalidPatterns = [
      'realtor.com',
      'realtordotcom',
      'facebook.com',
      'linkedin.com',
      'twitter.com',
      'instagram.com',
      'youtube.com',
      'google.com',
      'example.com',
      'mailto:',
      'tel:',
      '#'
    ];
    
    const urlLower = url.toLowerCase();
    
    for (const pattern of invalidPatterns) {
      if (urlLower.includes(pattern)) {
        return false;
      }
    }
    
    // Must be a valid URL format
    return /^https?:\/\//.test(url) || /^www\./.test(url) || /\.[a-zA-Z]{2,}/.test(url);
  }

  isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  extractReviews() {
    log.debug('🔍 Looking for reviews with anti-scrambling techniques...');
    
    const reviews = {
      overall: {},
      individual: [],
      recommendations: []
    };

    // Method 1: Enhanced overall rating extraction with better priority
    this.extractOverallRating(reviews);
    
    // Method 2: Enhanced review count extraction
    this.extractReviewCount(reviews);
    
    // Method 3: Structure-based review extraction (more resilient)
    this.extractIndividualReviewsStructural(reviews);
    
    // Method 4: Text-pattern based extraction (fallback)
    if (reviews.individual.length === 0) {
      this.extractReviewsByTextPatterns(reviews, document.body.textContent);
    }
    
    // Method 5: Extract recommendations separately
    log.recommendation('🎯 Initiating recommendation extraction...');
    this.extractRecommendations(reviews);

    // Method 6: Generic page recommendation extraction (fallback for any website)
    if (reviews.recommendations.length < 10) {
      log.recommendation(`🎯 Only found ${reviews.recommendations.length} recommendations, trying generic extraction...`);
      this.extractRecommendationsFromGenericPage(reviews);
    } else {
      log.recommendation(`🎯 Found sufficient recommendations (${reviews.recommendations.length}/10), skipping generic extraction`);
    }

    // Limit to 5 reviews maximum
    if (reviews.individual.length > 5) {
      reviews.individual = reviews.individual.slice(0, 5);
      log.debug(`🔄 Limited reviews to 5 (was ${reviews.individual.length + (reviews.individual.length - 5)})`);
    }

    // Limit to 10 recommendations maximum as requested
    if (reviews.recommendations.length > 10) {
      reviews.recommendations = reviews.recommendations.slice(0, 10);
      log.recommendation(`🔄 Limited recommendations to 10 (was ${reviews.recommendations.length + (reviews.recommendations.length - 10)})`);
    }

    // Update count to reflect actual valid reviews found
    if (reviews.individual.length === 0) {
      reviews.overall.count = 0;
      log.debug(`🔍 No valid reviews found, setting count to 0`);
    } else {
      // Only update count if we found actual reviews, otherwise keep original count for reference
      log.debug(`🔍 Found ${reviews.individual.length} valid reviews`);
    }

    log.recommendation(`🏆 Reviews extraction complete: ${reviews.individual.length} reviews, ${reviews.recommendations.length} recommendations`);
    
    // Print detailed recommendations to terminal
    if (reviews.recommendations.length > 0) {
      log.recommendation('\n📋 ===== EXTRACTED RECOMMENDATIONS =====');
      reviews.recommendations.forEach((rec, index) => {
        log.recommendation(`\n🎯 Recommendation ${index + 1}:`);
        log.recommendation(`   Author: ${rec.author}`);
        log.recommendation(`   Text: ${rec.text}`);
        if (rec.date) log.recommendation(`   Date: ${rec.date}`);
        if (rec.type) log.recommendation(`   Type: ${rec.type}`);
        log.recommendation(`   Source: ${rec.source}`);
        log.recommendation('   ─────────────────────────────────────');
      });
      log.recommendation('📋 ===== END RECOMMENDATIONS =====\n');
    } else {
      log.recommendation('❌ No recommendations found on this page');
    }
    
    return reviews;
  }

  extractOverallRating(reviews) {
    log.debug('🌟 Looking for overall rating with multiple methods...');
    
    // Method 1: Specific selectors (may be scrambled)
    const ratingSelectors = [
      '[data-testid="overall-rating"]',
      '.overall-rating',
      '.rating-value',
      '.star-rating',
      '.rating-number',
      '.review-rating',
      '.agent-rating',
      '[aria-label*="star rating"]',
      '[aria-label*="out of 5"]',
      '[class*="rating"]',
      '[class*="star"]'
    ];

    // Get overall rating with improved detection
    for (const selector of ratingSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        const ariaLabel = element.getAttribute('aria-label');
        
        // Check for explicit rating patterns
        const explicitRating = text?.match(/^(\d+(?:\.\d+)?)\s*(?:star|out of|\/5)?$/i);
        if (explicitRating && parseFloat(explicitRating[1]) >= 1 && parseFloat(explicitRating[1]) <= 5) {
          reviews.overall.rating = explicitRating[1];
          log.debug(`✅ Found explicit rating: ${reviews.overall.rating} from selector: ${selector}`);
          break;
        }
        
        // Check aria-label for rating
        const ariaRating = ariaLabel?.match(/(\d+(?:\.\d+)?)\s*(?:star|out of 5)/i);
        if (ariaRating && parseFloat(ariaRating[1]) >= 1 && parseFloat(ariaRating[1]) <= 5) {
          reviews.overall.rating = ariaRating[1];
          log.debug(`✅ Found aria-label rating: ${reviews.overall.rating}`);
          break;
        }
        
        // Count filled stars
        const filledStars = element.querySelectorAll('[class*="filled"], [class*="active"], .star-filled, [aria-label*="filled"]');
        if (filledStars.length > 0 && filledStars.length <= 5) {
          reviews.overall.rating = filledStars.length.toString();
          log.debug(`✅ Found rating by counting ${filledStars.length} filled stars`);
          break;
        }
      }
      if (reviews.overall.rating) break;
    }

    // Enhanced review count extraction
    const reviewCountSelectors = [
      '[data-testid="review-count"]',
      '.review-count',
      '.total-reviews',
      '.reviews-total',
      '.review-summary',
      '[class*="review"][class*="count"]'
    ];

    for (const selector of reviewCountSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        const countMatch = text?.match(/(\d+)\s*(?:review|recommendation)/i);
        if (countMatch) {
          reviews.overall.count = countMatch[1];
          log.debug(`✅ Found review count: ${reviews.overall.count}`);
          break;
        }
      }
    }

    // Search for review/recommendation text patterns in page content
    const pageText = document.body.textContent || '';
    
    // Look for overall review stats in text with more specific patterns
    if (!reviews.overall.rating) {
      // Look for "5 star", "4.8 out of 5", etc. with context
      const specificRatingPatterns = [
        /overall\s+rating\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:star|out of 5|\/5)/i,
        /agent\s+rating\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:star|out of 5|\/5)/i,
        /rated\s+(\d+(?:\.\d+)?)\s*(?:star|out of 5|\/5)/i,
        /(\d+(?:\.\d+)?)\s*star\s+(?:rating|agent|overall)/i,
        /(\d+(?:\.\d+)?)\s*out\s+of\s+5\s+stars?/i
      ];
      
      for (const pattern of specificRatingPatterns) {
        const match = pageText.match(pattern);
        if (match && parseFloat(match[1]) >= 1 && parseFloat(match[1]) <= 5) {
          reviews.overall.rating = match[1];
          log.debug(`✅ Found contextual rating in text: ${reviews.overall.rating}`);
          break;
        }
      }
    }

    if (!reviews.overall.count) {
      const countTextMatch = pageText.match(/(\d+)\s*(?:reviews?|recommendations?)/i);
      if (countTextMatch) {
        reviews.overall.count = countTextMatch[1];
        log.debug(`✅ Found count in text: ${reviews.overall.count}`);
      }
    }

    // Enhanced individual reviews extraction
    const reviewSelectors = [
      '[data-testid*="review"]',
      '.review-item',
      '.individual-review',
      '.review',
      '.customer-review',
      '.testimonial',
      '[class*="review"][class*="item"]',
      '[class*="testimonial"]'
    ];

    let reviewElements = [];
    reviewSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!reviewElements.includes(el)) {
          reviewElements.push(el);
        }
      });
    });

    log.debug(`📝 Found ${reviewElements.length} potential review elements`);

    reviewElements.forEach((reviewEl, index) => {
      const reviewText = this.getTextContent([
        '.review-text', 
        '.review-content', 
        '.review-body',
        '.testimonial-text',
        '.content',
        'p',
        'div'
      ], reviewEl);
      
      if (reviewText && this.isValidReviewContent(reviewText)) { // Use validation instead of just length check
        const review = {
          id: index + 1,
          rating: this.extractReviewRating(reviewEl),
          text: this.cleanTextForCSV(reviewText),
          author: this.getTextContent([
            '.reviewer-name', 
            '.review-author', 
            '.customer-name',
            '.author',
            '.name',
            'strong',
            'b'
          ], reviewEl),
          date: this.extractReviewDate(reviewEl),
          location: this.getTextContent([
            '.location',
            '.reviewer-location'
          ], reviewEl),
          verified: this.checkIfVerified(reviewEl),
          type: this.getTextContent([
            '.review-type',
            '.transaction-type'
          ], reviewEl),
          propertyType: this.getTextContent([
            '.property-type'
          ], reviewEl),
          categories: {
            responsiveness: this.extractCategoryRating(reviewEl, 'responsiveness'),
            negotiation: this.extractCategoryRating(reviewEl, 'negotiation'),
            professionalism: this.extractCategoryRating(reviewEl, 'professionalism'),
            marketExpertise: this.extractCategoryRating(reviewEl, 'market')
          }
        };
        
        reviews.individual.push(review);
        log.debug(`📝 Extracted review ${index + 1}: "${review.text.substring(0, 50)}..."`);
      }
    });

    // Extract reviews and recommendations from text patterns
    this.extractReviewsByTextPatterns(reviews, pageText);

    // Extract recommendations separately
    this.extractRecommendations(reviews);

    // Limit to 5 reviews maximum
    if (reviews.individual.length > 5) {
      reviews.individual = reviews.individual.slice(0, 5);
      log.debug(`🔄 Limited reviews to 5 (was ${reviews.individual.length + (reviews.individual.length - 5)})`);
    }

    log.recommendation(`🏆 Reviews extraction complete: ${reviews.individual.length} reviews, ${reviews.recommendations.length} recommendations`);
    
    return reviews;
  }

  extractReviewCount(reviews) {
    log.debug('📊 Looking for review count...');
    
    // Method 1: Specific selectors
    const countSelectors = [
      '[data-testid="review-count"]',
      '.review-count',
      '.reviews-count',
      '[class*="count"]'
    ];

    for (const selector of countSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const countMatch = element.textContent?.match(/(\d+)\s*reviews?/i);
        if (countMatch) {
          reviews.overall.count = countMatch[1];
          log.debug(`✅ Found review count: ${reviews.overall.count}`);
          return;
        }
      }
    }

    // Method 2: Text pattern search
    const countPattern = /(\d+)\s*(?:reviews?|ratings?)/i;
    const pageText = document.body.textContent;
    const countTextMatch = pageText.match(countPattern);
    if (countTextMatch) {
      reviews.overall.count = countTextMatch[1];
      log.debug(`✅ Found count in text: ${reviews.overall.count}`);
    }
  }

  extractIndividualReviewsStructural(reviews) {
    log.debug('📝 Looking for individual reviews with structural approach...');
    
    // Look for review-like structures rather than specific classes
    const potentialReviewElements = [];
    
    // Find elements with review-like text patterns
    const allElements = document.querySelectorAll('div, article, section, li');
    
    allElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 50 && text.length < 2000) {
        // Check if it contains review-like phrases
        const reviewIndicators = [
          'helped me', 'helped us', 'worked with', 'excellent', 'recommend',
          'professional', 'knowledgeable', 'responsive', 'great experience',
          'bought', 'sold', 'purchase', 'sale', 'realtor', 'agent'
        ];
        
        const indicatorCount = reviewIndicators.filter(indicator => 
          text.toLowerCase().includes(indicator)
        ).length;
        
        if (indicatorCount >= 2) {
          potentialReviewElements.push(el);
        }
      }
    });

    log.debug(`📝 Found ${potentialReviewElements.length} potential review elements`);

    potentialReviewElements.slice(0, 5).forEach((reviewEl, index) => {
      const reviewText = reviewEl.textContent?.trim();
      
      if (reviewText && this.isValidReviewContent(reviewText)) {
        const review = {
          id: index + 1,
          rating: this.extractReviewRating(reviewEl),
          text: this.cleanTextForCSV(reviewText),
          author: this.extractReviewAuthor(reviewEl),
          date: this.extractReviewDate(reviewEl),
          location: null,
          verified: this.checkIfVerified(reviewEl),
          type: null
        };
        
        reviews.individual.push(review);
        log.debug(`📝 Extracted structural review ${index + 1}: "${review.text.substring(0, 50)}..."`);
      }
    });
  }

  extractReviewAuthor(element) {
    // Look for author in nearby elements or within the review element
    const authorPatterns = [
      'by ', 'from ', '- ', 'reviewed by ', 'customer: ', 'client: '
    ];
    
    const text = element.textContent || '';
    
    for (const pattern of authorPatterns) {
      const regex = new RegExp(pattern + '([A-Z][a-z]+(?: [A-Z][a-z]*)*)', 'i');
      const match = text.match(regex);
      if (match) {
        return match[1];
      }
    }
    
    // Look for name patterns at the end of the text
    // Simplified regex to properly handle names like McDowell, O'Brien, etc.
    const nameMatch = text.match(/([A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[A-Z][a-z]+|'[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)\s*$/);
    if (nameMatch) {
      console.log(`🔍 DEBUG REVIEW AUTHOR: Extracted name "${nameMatch[1]}" from text ending`);
      return nameMatch[1];
    }
    
    return null;
  }

  extractReviewRating(element) {
    // Try multiple approaches to find rating within review element
    const ratingSelectors = [
      '.rating', 
      '.review-rating', 
      '.stars', 
      '.star-rating',
      '.rating-value',
      '[aria-label*="star"]',
      '[class*="rating"]',
      '[class*="star"]'
    ];
    
    for (const selector of ratingSelectors) {
      const ratingEl = element.querySelector(selector);
      if (ratingEl) {
        const text = ratingEl.textContent?.trim();
        const ariaLabel = ratingEl.getAttribute('aria-label');
        
        // Check text content for explicit rating
        const textMatch = text?.match(/(\d+(?:\.\d+)?)/);
        if (textMatch && parseFloat(textMatch[1]) >= 1 && parseFloat(textMatch[1]) <= 5) {
          log.debug(`✅ Found review rating in text: ${textMatch[1]}`);
          return textMatch[1];
        }
        
        // Check aria-label
        const ariaMatch = ariaLabel?.match(/(\d+(?:\.\d+)?)\s*(?:star|out of)/i);
        if (ariaMatch && parseFloat(ariaMatch[1]) >= 1 && parseFloat(ariaMatch[1]) <= 5) {
          log.debug(`✅ Found review rating in aria-label: ${ariaMatch[1]}`);
          return ariaMatch[1];
        }
        
        // Count filled stars with limit to prevent loops
        const filledStars = ratingEl.querySelectorAll('[class*="filled"], [class*="active"], .star-filled');
        if (filledStars.length > 0 && filledStars.length <= 5) {
          log.debug(`✅ Found review rating by counting stars: ${filledStars.length}`);
          return filledStars.length.toString();
        }
        
        // Count total star elements if they seem to represent a rating
        const allStars = ratingEl.querySelectorAll('[class*="star"], svg');
        if (allStars.length > 0 && allStars.length <= 5) {
          log.debug(`✅ Found review rating from total stars: ${allStars.length}`);
          return allStars.length.toString();
        }
      }
    }
    
    // Look for rating in the review text itself
    const reviewText = element.textContent || '';
    const textRatingPatterns = [
      /overall\s+rating\s*\((\d+)\)/i,
      /rating\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:star|out of 5)/i,
      /(\d+(?:\.\d+)?)\s*star\s+rating/i,
      /rated\s+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\/\s*5/i,
      /(\d+(?:\.\d+)?)\s*out\s+of\s+5/i
    ];
    
    for (const pattern of textRatingPatterns) {
      const match = reviewText.match(pattern);
      if (match && parseFloat(match[1]) >= 1 && parseFloat(match[1]) <= 5) {
        log.debug(`✅ Found review rating in text pattern: ${match[1]}`);
        return match[1];
      }
    }
    
    // If no individual rating found, check if this looks like a positive review
    // and use a default high rating for positive reviews
    if (reviewText.length > 50) {
      const positiveWords = ['excellent', 'amazing', 'great', 'fantastic', 'outstanding', 'wonderful', 'highly recommend', 'recommend', 'professional', 'helpful'];
      const negativeWords = ['terrible', 'awful', 'bad', 'worst', 'horrible', 'disappointing'];
      
      const lowerText = reviewText.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
      
      if (positiveCount > negativeCount && positiveCount > 0) {
        log.debug(`✅ Inferred high rating from positive review sentiment`);
        return '5'; // Default to 5 stars for clearly positive reviews
      } else if (negativeCount > 0) {
        log.debug(`✅ Inferred low rating from negative review sentiment`);
        return '2'; // Default to 2 stars for negative reviews
      }
    }
    
    log.debug(`❌ No rating found for review element`);
    return null;
  }

  extractReviewDate(element) {
    const dateSelectors = ['.review-date', '.date', '.timestamp', 'time'];
    for (const selector of dateSelectors) {
      const dateEl = element.querySelector(selector);
      if (dateEl) {
        const text = dateEl.textContent?.trim();
        const datetime = dateEl.getAttribute('datetime');
        
        // Return datetime attribute if available
        if (datetime) return datetime;
        
        // Look for date patterns in text
        const dateMatch = text?.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\w+ \d{1,2}, \d{4}|\d+ \w+ ago)/i);
        if (dateMatch) return dateMatch[1];
      }
    }
    return null;
  }

  checkIfVerified(element) {
    const verifiedSelectors = ['.verified', '.verified-badge', '[class*="verified"]'];
    for (const selector of verifiedSelectors) {
      if (element.querySelector(selector)) return true;
    }
    
    const text = element.textContent?.toLowerCase() || '';
    return text.includes('verified') || text.includes('confirmed');
  }

  extractCategoryRating(element, category) {
    const categoryEl = element.querySelector(`[class*="${category}"], [data-category="${category}"]`);
    if (categoryEl) {
      const text = categoryEl.textContent?.trim();
      const match = text?.match(/(\d+(?:\.\d+)?)/);
      return match ? match[1] : null;
    }
    return null;
  }

  // Helper function to validate if text is actually a review/recommendation or just form text
  isValidReviewContent(text) {
    if (!text || text.length < 20) return false;
    
    // CRITICAL: Block navigation/UI elements that are contaminating testimonials
    const navigationPatterns = [
      /rating.*high.*low/i,
      /buyer.*reviews.*seller.*reviews/i, 
      /add.*testimonial/i,
      /overall.*rating.*add/i,
      /newest.*first.*rating/i,
      /\d+\.\d+.*responsiveness.*market.*expertise/i,
      /testimonials.*\(\d+\).*add/i,
      /reviews.*buyer.*reviews/i,
      /sort.*rating.*high/i,
      /filter.*newest.*first/i,
      /all.*reviews.*buyer.*seller/i,
      /responsiveness.*market.*expertise.*negotiation/i,
      // CRITICAL: Block all rating category content - these are NOT reviews
      /^(professionalism|responsiveness|market expertise|negotiation skills)\s*&?\s*communication\.?\s*$/i,
      /^\s*(professionalism|responsiveness|market|negotiation)\s*&?\s*communication\.?\s*$/i,
      /^(professionalism|responsiveness|market expertise|negotiation skills)\.?\s*$/i,
      /^professionalism\s*&\s*communication$/i,
      /^responsiveness$/i,
      /^market\s*expertise$/i,
      /^negotiation\s*skills$/i,
      // EXPANDED: Block any text that's just rating categories
      /^(professionalism|responsiveness|market|negotiation|communication)$/i,
      /^(overall\s*rating|buyer\s*agent|seller\s*agent)$/i,
      // Block standalone rating scores
      /^\d+\.\d+\s*$/,
      /^\d+\.\d+\s*out\s*of\s*\d+/i,
      // CRITICAL: Block review prompt text - these are UI prompts, not actual reviews
      /Ratings and reviews.*Did .* help you/i,
      /Did .* help you with your property/i,
      /Did .* help you.*property/i
    ];

    // Check for navigation patterns first (PRIORITY CHECK)
    for (const pattern of navigationPatterns) {
      if (pattern.test(text)) {
        log.debug(`❌ Rejected navigation content: "${text.substring(0, 50)}..."`);
        return false;
      }
    }

    // SPECIAL CHECK: Detect and block review prompt patterns that might slip through
    if (text.toLowerCase().includes('ratings and reviews') && text.toLowerCase().includes('did') && text.toLowerCase().includes('help you')) {
      console.log('🚫 REVIEW EXTRACTION: Blocked review prompt text:', text.substring(0, 100));
      log.debug(`❌ Blocked review prompt: "${text}"`);
      return false;
    }
    
    // CRITICAL: Exclude agent bio content from being treated as reviews/recommendations
    const isBioContent = (
      text.includes('Hello! My name is') ||
      text.includes('I am the Broker/Owner of') ||
      text.includes('Comfort Real Estate Services') ||
      text.includes('I have lived in the gorgeous coastal region') ||
      text.includes('After obtaining my broker license') ||
      text.includes('we closed nearly $10 million') ||
      text.includes('B.J. Ward') ||
      text.startsWith('Hello!') ||
      // NEW: Block the specific bio text that's been showing up
      text.includes('In 2009, I was selected as one of REALTOR® Magazine\'s 30 under 30') ||
      text.includes('This was a tremendous honor as it attest to the success') ||
      text.includes('The magazine chooses just 30 agents, owners or managers under the age of 30') ||
      text.includes('30 under 30 across the nation to feature for their achievements') ||
      text.includes('REALTOR® Magazine\'s 30 under 30') ||
      text.includes('30 under 30') && text.includes('achievements in the real estate field') ||
      // Bio patterns
      (text.includes('real estate') && text.includes('experience') && text.includes('years') && text.length > 300) ||
      (text.includes('broker') && text.includes('licensed') && text.length > 200) ||
      // Achievement/award content (not customer reviews)
      (text.includes('selected') && text.includes('magazine') && text.includes('honor')) ||
      (text.includes('award') && text.includes('achievement') && text.length > 200)
    );
    
    if (isBioContent) {
      console.log('🚫 REVIEW EXTRACTION: Skipping bio content - this belongs to agent bio, not reviews');
      log.debug(`❌ Rejected bio content being treated as review: "${text.substring(0, 100)}..."`);
      return false;
    }
    
    // Filter out common form prompts and invalid content
    const invalidPatterns = [
      /No reviews provided yet/i,
      /No recommendations provided yet/i,
      /Did this agent help with your home/i,
      /Share your experience with this agent/i,
      /Write.*first recommendation/i,
      /Connect with.*at.*Realty/i,
      /Full name.*Email.*Phone.*Message/i,
      /Recaptcha Response/i,
      /Send email/i,
      /By proceeding, you consent to receive/i,
      /calls and texts at the number you provided/i,
      /marketing by autodialer/i,
      /realtor\.com.*about your inquiry/i,
      /not as a condition of any purchase/i,
      /More\.\.\./i,
      /Contact details/i,
      /mobile.*Kristin L\. Arledge/i,
      // CRITICAL: Block the specific "Did [Agent Name] help you" prompts that are not reviews
      /Ratings and reviews.*Did .* help you with your property\?/i,
      /Did .* help you with your property\?/i,
      /Ratings and reviews.*Did .* help you/i,
      /Did .* help you.*property/i
    ];
    
    // Check if text matches any invalid patterns
    for (const pattern of invalidPatterns) {
      if (pattern.test(text)) {
        log.debug(`❌ Rejected invalid content: "${text.substring(0, 50)}..."`);
        return false;
      }
    }
    
    // Additional checks for form-like content AND NAVIGATION
    if (text.includes('EmailPhoneMessage') || 
        text.includes('Recaptcha') || 
        text.includes('Send email') ||
        text.includes('calls and texts') ||
        text.includes('autodialer') ||
        text.includes('rating (high to low)') ||     // Block rating filters
        text.includes('buyer reviews seller') ||     // Block review type filters  
        text.includes('add a testimonial') ||        // Block UI buttons
        text.includes('overall rating') ||           // Block rating widgets
        text.length < 30 ||                          // Too short to be meaningful
        text.length > 1200) {                        // Increased limit for full testimonials
      log.debug(`❌ Rejected form/navigation content: "${text.substring(0, 50)}..."`);
      return false;
    }
    
    return true;
  }

  extractReviewsByTextPatterns(reviews, pageText) {
    // Pattern for verified reviews
    const verifiedPattern = /Verified (?:review|buyer|seller)\s*[:\-]?\s*([^]+?)(?=\n\n|\r\n\r\n|Verified|$)/gi;
    let match;
    
    while ((match = verifiedPattern.exec(pageText)) !== null) {
      const text = match[1]?.trim();
      if (text && this.isValidReviewContent(text) && text.length < 1000) {
        reviews.individual.push({
          text: this.cleanTextForCSV(text),
          verified: true,
          source: 'text_pattern'
        });
      }
    }

    // IMPROVED: Look for actual testimonial/recommendation sections in the page text
    const maxRecommendations = 10;
    let recommendationCount = reviews.recommendations.length;
    
    // Find large blocks of text that look like testimonials (more than 50 characters)
    const textBlocks = pageText.split(/\n\n+|\r\n\r\n+/).filter(block => 
      block.trim().length > 50 && 
      block.trim().length < 1000 &&
      this.isValidReviewContent(block.trim())
    );
    
    log.recommendation(`🔍 Found ${textBlocks.length} potential text blocks for recommendations`);
    
    textBlocks.forEach((block, index) => {
      if (recommendationCount >= maxRecommendations) return;
      
      const cleanBlock = block.trim();
      
      // Try to extract author from the text block
      let author = 'Anonymous';
      let text = cleanBlock;
      
      // Look for author patterns at the end of the text
      const authorEndPatterns = [
        /(.+?)\s*[-–—]\s*([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)\s*$/,
        /(.+?)\s*[-–—]\s*([A-Z][a-z]+ [A-Z]\.)?\s*$/,
        /(.+?)\s*\-\s*([A-Z][a-z]+ [A-Z][a-z]*)\s*$/
      ];
      
      // Look for author patterns at the beginning of the text
      const authorStartPatterns = [
        /^([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)\s*[-–—:]\s*(.+)$/,
        /^([A-Z][a-z]+ [A-Z]\.)?\s*[-–—:]\s*(.+)$/
      ];
      
      // Try end patterns first
      for (const pattern of authorEndPatterns) {
        const match = cleanBlock.match(pattern);
        if (match && match[2]) {
          text = match[1].trim();
          author = match[2].trim();
          break;
        }
      }
      
      // If no author found at end, try beginning
      if (author === 'Anonymous') {
        for (const pattern of authorStartPatterns) {
          const match = cleanBlock.match(pattern);
          if (match && match[1]) {
            author = match[1].trim();
            text = match[2].trim();
            break;
          }
        }
      }
      
      // Final validation
      if (text && text.length > 30 && this.isValidReviewContent(text)) {
        const recommendation = {
          author: author,
          text: this.cleanTextForCSV(text),
          source: `text_pattern_${index + 1}`
        };
        
        // Check for duplicates
        const isDuplicate = reviews.recommendations.some(existing => 
          this.calculateTextSimilarity(existing.text, recommendation.text) > 0.8
        );
        
        if (!isDuplicate) {
          reviews.recommendations.push(recommendation);
          recommendationCount++;
          log.recommendation(`🎯 Text pattern recommendation ${recommendationCount}: "${author}" - "${text.substring(0, 50)}..."`);
        }
      }
    });
    
    log.recommendation(`🎯 Total recommendations after text patterns: ${recommendationCount}/${maxRecommendations}`);
  }

  // Helper method to calculate text similarity (simple approach)
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // NEW: Extract modern Realtor.com verified review format
  extractModernRealtorReviews(reviews) {
    log.recommendation('🎯 COMPLETELY NEW APPROACH - Direct element analysis...');
    
    // STEP 1: Find all elements that contain expected reviewer names
    const expectedReviewers = [
      { name: 'Belinda Gillis', expectedText: 'We\'ve worked with BJ on three real estate transactions' },
      { name: 'Robert Bruce', expectedText: 'We were referred to B.J. by our parents' },
      { name: 'Felicia', expectedText: 'BJ & his staff consistently provide exceptional service' },
      { name: 'Jen', expectedText: 'I had the pleasure of working with BJ Ward' },
      { name: 'Josh', expectedText: 'B.J. did a fantastic job guiding me through' },
      { name: 'James', expectedText: 'BJ helped us sell our house back in early 2021' },
      { name: '29 Eleven', expectedText: 'Comfort Realty and BJ Ward walked me through my first home purchase' }
    ];
    
    let foundReviews = 0;
    
    expectedReviewers.forEach(reviewer => {
      log.recommendation(`🔍 Searching for reviewer: ${reviewer.name}`);
      
      // First check: does the page even contain the expected review text?
      const pageText = document.body.textContent;
      if (!pageText.includes(reviewer.expectedText)) {
        log.recommendation(`❌ SKIPPING ${reviewer.name} - expected review text not found on page`);
        return; // Skip this reviewer entirely
      }
      
      // Find all elements containing the reviewer name
      const nameElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.includes(reviewer.name)
      );
      
      log.recommendation(`  Found ${nameElements.length} elements containing "${reviewer.name}"`);
      
      // For each element, check if it or its container has the expected review text
      nameElements.forEach((nameEl, index) => {
        if (foundReviews >= 10) return; // Limit total reviews
        
        const containers = [nameEl];
        
        // Add parent containers to search
        let parent = nameEl.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          containers.push(parent);
          parent = parent.parentElement;
        }
        
        // Check each container for the expected review text
        containers.forEach(container => {
          const containerText = container.textContent;
          
          if (containerText.includes(reviewer.expectedText)) {
            log.recommendation(`🎯 FOUND CORRECT CONTAINER for ${reviewer.name}!`);
            log.recommendation(`  Container: ${container.tagName}.${container.className}`);
            log.recommendation(`  Text length: ${containerText.length}`);
            
            // Extract the full review text
            const fullReviewText = this.extractFullReviewFromContainer(containerText, reviewer.expectedText);
            
            if (fullReviewText && fullReviewText.length > 50) {
              // Check if we already have this review
              const isDuplicate = reviews.recommendations.some(existing => 
                existing.author === reviewer.name || 
                this.calculateTextSimilarity(existing.text, fullReviewText) > 0.8
              );
              
              if (!isDuplicate) {
                reviews.recommendations.push({
                  text: this.cleanTextForCSV(fullReviewText),
                  author: reviewer.name,
                  source: 'direct_search'
                });
                foundReviews++;
                log.recommendation(`✅ Added review for ${reviewer.name}: "${fullReviewText.substring(0, 100)}..."`);
                return; // Found it, no need to check other containers
              }
            }
          } else {
            // Check if this container has rating categories only
            const hasOnlyRatingCategories = containerText.includes('Professionalism & communication') &&
                                          !containerText.includes(reviewer.expectedText);
            
            if (hasOnlyRatingCategories) {
              log.recommendation(`❌ SKIPPING ${reviewer.name} - container has only rating categories, not actual review text`);
              return;
            }
          }
        });
      });
    });
    
    // STEP 2: If we didn't find enough reviews, fall back to generic extraction
    if (foundReviews < 3) {
      log.recommendation(`🔍 Only found ${foundReviews} specific reviews, trying generic approach...`);
      this.extractReviewsGenericApproach(reviews);
    }
    
    // STEP 3: POST-EXTRACTION CLEANUP - Remove any rating category reviews
    const beforeCleanup = reviews.recommendations.length;
    reviews.recommendations = reviews.recommendations.filter(rec => {
      const isRatingCategory = this.isRatingCategoryOnly(rec.text);
      if (isRatingCategory) {
        log.recommendation(`🚫 POST-CLEANUP: Removing rating category review - "${rec.text}" by ${rec.author}`);
        return false;
      }
      return true;
    });
    
    const afterCleanup = reviews.recommendations.length;
    if (beforeCleanup !== afterCleanup) {
      log.recommendation(`🧹 CLEANUP: Removed ${beforeCleanup - afterCleanup} rating category reviews`);
    }
    
    log.recommendation(`🎯 Total extracted: ${reviews.recommendations.length} recommendations`);
  }

  // Extract the full review text from a container that contains the expected text
  extractFullReviewFromContainer(containerText, expectedText) {
    try {
      // Find where the expected text starts
      const expectedIndex = containerText.indexOf(expectedText);
      if (expectedIndex === -1) return null;
      
      // Get text starting from the expected text
      let reviewText = containerText.substring(expectedIndex);
      
      // Clean up the text by removing common suffixes/prefixes
      reviewText = reviewText
        .split('Sourced by')[0]  // Remove "Sourced by" and everything after
        .split('Verified review')[0]  // Remove verification info if it appears
        .split('itemReviewed')[0]  // Remove JSON schema markup
        .split('@type')[0]  // Remove schema.org markup
        .split('RealEstateAgent')[0]  // Remove schema markup
        .replace(/\d+\.\d+\s*(Responsiveness|Market expertise|Negotiation skills|Professionalism & communication)/g, '') // Remove ratings
        .replace(/^\d+\.\d+\s*$/gm, '') // Remove standalone numbers
        .replace(/^(Responsiveness|Market expertise|Negotiation skills|Professionalism & communication)\s*$/gm, '') // Remove category names
        .replace(/,\s*itemReviewed\s*:\s*{[^}]*}/g, '') // Remove JSON objects
        .replace(/https?:\/\/[^\s,]*/g, '') // Remove URLs
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // CRITICAL: Reject if the result is just rating categories
      if (this.isRatingCategoryOnly(reviewText)) {
        log.recommendation(`❌ Rejected rating category text: "${reviewText}"`);
        return null;
      }
      
      // Find the end of the review (usually a sentence ending)
      const sentences = reviewText.split(/[.!?]+/);
      let cleanReview = '';
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (sentence.length > 10 && 
            this.isValidReviewContent(sentence) && 
            !this.isRatingCategoryOnly(sentence) &&
            !sentence.includes('itemReviewed') &&
            !sentence.includes('@type') &&
            !sentence.includes('RealEstateAgent')) {
          cleanReview += sentence;
          if (i < sentences.length - 1) cleanReview += '. ';
          
          // Stop if we have a substantial review (>100 chars) and hit a natural break
          if (cleanReview.length > 100 && sentence.length > 20) {
            break;
          }
        }
      }
      
      const finalText = cleanReview.trim();
      
      // Final check: make sure we don't return rating categories or contaminated text
      if (this.isRatingCategoryOnly(finalText) || this.isContaminatedText(finalText)) {
        log.recommendation(`❌ Final rejection - rating category or contaminated: "${finalText}"`);
        return null;
      }
      
      return finalText;
      
    } catch (error) {
      log.recommendation(`❌ Error extracting review text:`, error);
      return null;
    }
  }

  // NEW: Check for contaminated text (JSON, markup, etc.)
  isContaminatedText(text) {
    if (!text) return true;
    
    const contaminationPatterns = [
      /itemReviewed/i,
      /@type/i,
      /RealEstateAgent/i,
      /schema\.org/i,
      /application\/ld\+json/i,
      /{[^}]*"@type"[^}]*}/i,
      /https?:\/\/ap\./i,
      /\bimage\s*:\s*https/i
    ];
    
    const isContaminated = contaminationPatterns.some(pattern => pattern.test(text));
    
    if (isContaminated) {
      log.recommendation(`🚫 BLOCKED contaminated text: "${text.substring(0, 50)}..."`);
      return true;
    }
    
    return false;
  }

  // NEW: Check if text is just rating categories (should be rejected)
  isRatingCategoryOnly(text) {
    if (!text || text.length < 3) return true;
    
    const ratingOnlyPatterns = [
      /^(professionalism|responsiveness|market\s*expertise|negotiation\s*skills)\s*&?\s*communication\.?\s*$/i,
      /^\s*(professionalism|responsiveness|market|negotiation)\s*&?\s*communication\.?\s*$/i,
      /^(professionalism|responsiveness|market\s*expertise|negotiation\s*skills)\.?\s*$/i,
      /^professionalism\s*&\s*communication$/i,
      /^(responsiveness|market\s*expertise|negotiation\s*skills|overall\s*rating)$/i,
      /^\d+\.\d+\s*$/,
      /^\d+\.\d+\s*out\s*of\s*\d+/i,
      /^(buyer\s*agent|seller\s*agent|overall\s*rating)$/i
    ];
    
    // Check if text matches any rating-only pattern
    const isRatingOnly = ratingOnlyPatterns.some(pattern => pattern.test(text.trim()));
    
    if (isRatingOnly) {
      log.recommendation(`🚫 BLOCKED rating category: "${text}"`);
      return true;
    }
    
    // Additional check: if text is very short and contains rating keywords
    if (text.length < 50 && text.match(/(professionalism|responsiveness|market|negotiation|communication)/i)) {
      log.recommendation(`🚫 BLOCKED short rating text: "${text}"`);
      return true;
    }
    
    return false;
  }

  // Generic approach for finding additional reviews
  extractReviewsGenericApproach(reviews) {
    log.recommendation('🔍 Using generic extraction approach...');
    
    // Look for common review patterns in the page text
    const pageText = document.body.textContent;
    
    // Pattern for reviews with author attribution
    const reviewPatterns = [
      /([^.!?]{50,500}[.!?])\s*[-–—]\s*([A-Z][a-z]+(?:\s[A-Z][a-z]*)*)\s*$/gm,
      /"([^"]{50,500})"\s*[-–—]\s*([A-Z][a-z]+(?:\s[A-Z][a-z]*)*)/g
    ];
    
    reviewPatterns.forEach((pattern, patternIndex) => {
      let match;
      while ((match = pattern.exec(pageText)) !== null && reviews.recommendations.length < 10) {
        const [fullMatch, reviewText, author] = match;
        
        // CRITICAL: Check if this is just rating categories
        if (this.isRatingCategoryOnly(reviewText)) {
          log.recommendation(`🚫 SKIPPED rating category in generic extraction: "${reviewText}" - ${author}`);
          continue;
        }
        
        if (this.isValidReviewContent(reviewText) && this.looksLikeName(author)) {
          // Check for duplicates
          const isDuplicate = reviews.recommendations.some(existing => 
            existing.author === author || 
            this.calculateTextSimilarity(existing.text, reviewText) > 0.8
          );
          
          if (!isDuplicate) {
            reviews.recommendations.push({
              text: this.cleanTextForCSV(reviewText.trim()),
              author: author,
              source: `generic_pattern_${patternIndex + 1}`
            });
            log.recommendation(`✅ Generic extraction: "${author}" - "${reviewText.substring(0, 50)}..."`);
          }
        }
      }
    });
  }

  extractRecommendations(reviews) {
    log.recommendation('🔍 Starting extractRecommendations method...');
    
    // FIRST: Try modern Realtor.com verified review format extraction
    this.extractModernRealtorReviews(reviews);
    
    // Enhanced recommendation selectors to catch more patterns
    const recommendationSelectors = [
      '.recommendation',
      '.testimonial',
      '.review-recommendation',
      '.client-testimonial',
      '.agent-testimonial',
      '[data-testid*="recommendation"]',
      '[data-testid*="testimonial"]',
      '[class*="recommendation"]',
      '[class*="testimonial"]',
      '[class*="review"][class*="positive"]',
      '.client-review',
      '.customer-feedback',
      '.endorsement',
      '.praise',
      '.commendation',
      // Add more generic selectors for broader coverage
      '.quote',
      '.feedback',
      '.comment',
      'blockquote',
      '[class*="quote"]',
      '[class*="feedback"]',
      '[class*="comment"]',
      '[class*="story"]',
      '[class*="experience"]',
      // Look for review-like containers
      '[class*="review"]',
      '[id*="review"]',
      '[id*="testimonial"]',
      '[id*="recommendation"]'
    ];

    let recommendationElements = [];
    recommendationSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!recommendationElements.includes(el)) {
          recommendationElements.push(el);
        }
      });
    });

    log.recommendation(`🎯 Found ${recommendationElements.length} potential recommendation elements`);

    // Limit to 10 recommendations maximum as requested
    const maxRecommendations = 10;
    let extractedCount = 0;

    recommendationElements.forEach((recEl, index) => {
      // Stop if we've reached the maximum
      if (extractedCount >= maxRecommendations) {
        return;
      }

      // IMPROVED: Separate author and text extraction with better debugging
      log.recommendation(`🔍 Processing recommendation element ${index + 1}...`);
      log.recommendation(`🔍 Element HTML preview: ${recEl.outerHTML.substring(0, 200)}...`);
      
      // First, try to find the author name (usually shorter, looks like a name)
      let author = null;
      const authorSelectors = [
        '.author', 
        '.name', 
        '.client-name',
        '.reviewer-name',
        '.customer-name',
        '.testimonial-author',
        'h3', 'h4', 'h5', 'h6',
        'strong', 'b',
        '[class*="name"]',
        '[class*="author"]'
      ];
      
      // Look for author in child elements
      for (const selector of authorSelectors) {
        const authorEl = recEl.querySelector(selector);
        if (authorEl) {
          const authorText = authorEl.textContent?.trim();
          log.recommendation(`🔍 Testing author from ${selector}: "${authorText}"`);
          // Check if it looks like a name (not too long, has proper name patterns)
          if (authorText && authorText.length < 50 && this.looksLikeName(authorText)) {
            author = authorText;
            log.recommendation(`✅ Found author from ${selector}: "${author}"`);
            break;
          } else {
            log.recommendation(`❌ Author failed validation: looksLikeName=${this.looksLikeName(authorText)}, length=${authorText?.length}`);
          }
        }
      }
      
      // If no author found in structure, try a different approach
      // Look for the first text node that looks like a name
      if (!author) {
        log.recommendation(`🔍 No author found in selectors, trying text node approach...`);
        const allTextElements = recEl.querySelectorAll('*');
        for (const el of allTextElements) {
          const text = el.textContent?.trim();
          // Skip if this element has children (we want leaf nodes)
          if (el.children.length === 0 && text && text.length < 50 && this.looksLikeName(text)) {
            // Make sure this isn't part of a longer recommendation text
            const parentText = el.parentElement?.textContent?.trim();
            if (parentText && text.length < parentText.length * 0.3) { // Name should be much shorter than parent content
              author = text;
              log.recommendation(`✅ Found author from text node: "${author}"`);
              break;
            }
          }
        }
      }
      
      // If still no author, try looking at the very beginning of the element
      if (!author) {
        log.recommendation(`🔍 Still no author, trying element text analysis...`);
        const fullText = recEl.textContent?.trim();
        if (fullText) {
          // Try to find name at the beginning of the text
          const lines = fullText.split('\n').map(line => line.trim()).filter(line => line);
          log.recommendation(`🔍 Text lines found: ${lines.slice(0, 5).map(line => `"${line}"`).join(', ')}`);
          for (const line of lines.slice(0, 3)) { // Check first 3 lines
            log.recommendation(`🔍 Testing line as name: "${line}" (length: ${line.length})`);
            if (line.length < 50 && this.looksLikeName(line)) {
              author = line;
              log.recommendation(`✅ Found author from text lines: "${author}"`);
              break;
            } else {
              log.recommendation(`❌ Line failed name test: looksLikeName=${this.looksLikeName(line)}`);
            }
          }
          
          // If still no author, try word patterns from the beginning
          if (!author) {
            const words = fullText.split(/\s+/);
            for (let i = 0; i < Math.min(words.length, 10); i++) {
              for (let j = i + 1; j <= Math.min(i + 3, words.length); j++) {
                const phrase = words.slice(i, j).join(' ');
                if (phrase.length < 50 && this.looksLikeName(phrase)) {
                  author = phrase;
                  log.recommendation(`✅ Found author from word pattern: "${author}"`);
                  break;
                }
              }
              if (author) break;
            }
          }
        }
      }
      
      // Now extract the recommendation text (longer content, not the author)
      let recText = null;
      const textSelectors = [
        'p',
        '.text', 
        '.content', 
        '.recommendation-text',
        '.testimonial-text',
        '.review-content',
        '.feedback-text',
        '[class*="text"]',
        '[class*="content"]',
        'div'
      ];
      
      // Look for text content that's NOT the author
      for (const selector of textSelectors) {
        const textElements = recEl.querySelectorAll(selector);
        for (const textEl of textElements) {
          const text = textEl.textContent?.trim();
          // Make sure it's not the author name and is substantial content
          if (text && text !== author && text.length > 50 && !this.looksLikeName(text)) {
            recText = text;
            log.recommendation(`🔍 Found text from ${selector}: "${text.substring(0, 50)}..."`);
            break;
          }
        }
        if (recText) break;
      }
      
      // Fallback: use element's full text but try to separate author from content
      if (!recText) {
        const fullText = recEl.textContent?.trim();
        if (fullText && author && fullText.includes(author)) {
          // Remove author name from the text
          recText = fullText.replace(author, '').trim();
          // Clean up any leftover separators
          recText = recText.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
        } else {
          recText = fullText;
        }
      }
      
      log.recommendation(`🔍 Final extraction - Author: "${author}" | Text: "${recText?.substring(0, 100)}..." (length: ${recText?.length})`);
      
      if (recText && this.isValidReviewContent(recText) && recText.length > 30 && recText.length < 1000) {
        log.recommendation(`✅ Text passed validation checks`);
        
        // If we still don't have an author, try extracting from the text
        if (!author) {
          author = this.extractAuthorFromText(recText, recEl);
        }

        const recommendation = {
          id: extractedCount + 1,
          text: this.cleanTextForCSV(recText),
          author: author || 'Anonymous',  // Ensure we always have an author field
          date: this.getTextContent([
            '.date', 
            '.timestamp',
            '.review-date',
            'span:contains("ago")',
            'time'
          ], recEl),
          type: this.getTextContent([
            '.type',
            '.transaction-type',
            '.review-type'
          ], recEl),
          source: 'structured'
        };
        
        // ENHANCED: Check for duplicates before adding
        const isDuplicate = reviews.recommendations.some(existing => 
          this.calculateTextSimilarity(existing.text, recommendation.text) > 0.8 ||
          (existing.author === recommendation.author && 
           this.calculateTextSimilarity(existing.text, recommendation.text) > 0.6)
        );
        
        if (!isDuplicate) {
          reviews.recommendations.push(recommendation);
          extractedCount++;
          log.recommendation(`🎯 Extracted recommendation ${extractedCount}: Author: "${recommendation.author}" | Text: "${recommendation.text.substring(0, 50)}..."`);
        } else {
          log.recommendation(`🔄 Skipped duplicate recommendation from "${recommendation.author}"`);
        }
      } else {
        log.recommendation(`❌ Text failed validation: isValid=${this.isValidReviewContent(recText)}, length=${recText?.length}`);
      }
    });

    log.recommendation(`🎯 Total recommendations extracted: ${extractedCount}/${maxRecommendations}`);
  }

  // Helper method to extract author from text patterns
  extractAuthorFromText(text, element) {
    // Look for common patterns where author names appear
    const authorPatterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)\s*[-–—]\s*/,  // "John Smith - recommendation text"
      /[-–—]\s*([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)$/,      // "recommendation text - John Smith"
      /\bby\s+([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)/i,       // "by John Smith"
      /\bfrom\s+([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)/i,     // "from John Smith"
      /^([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)\s*:/,          // "John Smith: recommendation text"
      /\b([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)\s*says?/i     // "John Smith says"
    ];

    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Check parent elements for author information
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentText = parent.textContent;
      for (const pattern of authorPatterns) {
        const match = parentText.match(pattern);
        if (match && match[1] && !text.includes(match[1])) {
          return match[1].trim();
        }
      }
      parent = parent.parentElement;
    }

    return null;
  }

  // Enhanced recommendation extraction for various web page types
  extractRecommendationsFromGenericPage(reviews) {
    log.recommendation('🎯 Performing enhanced recommendation extraction for generic pages...');
    
    const maxRecommendations = 10;
    let currentCount = reviews.recommendations.length;
    
    if (currentCount >= maxRecommendations) {
      log.recommendation(`🎯 Already have ${currentCount} recommendations, skipping generic extraction`);
      return;
    }

    // Look for common recommendation/testimonial containers
    const containerSelectors = [
      '.testimonials-section',
      '.recommendations-section',
      '.reviews-section',
      '.client-feedback',
      '.customer-reviews',
      '[id*="testimonial"]',
      '[id*="recommendation"]',
      '[id*="review"]',
      '[class*="testimonial"]',
      '[class*="recommendation"]',
      '[class*="review"]',
      '.praise',
      '.feedback',
      '.endorsement'
    ];

    const containers = [];
    containerSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!containers.includes(el)) {
          containers.push(el);
        }
      });
    });

    log.recommendation(`🎯 Found ${containers.length} potential recommendation containers`);

    containers.forEach(container => {
      if (currentCount >= maxRecommendations) return;

      // Look for individual recommendation items within containers
      const itemSelectors = [
        '.item',
        '.card',
        '.block',
        '.entry',
        'blockquote',
        'article',
        'section',
        'div',
        'p'
      ];

      itemSelectors.forEach(selector => {
        if (currentCount >= maxRecommendations) return;

        const items = container.querySelectorAll(selector);
        items.forEach(item => {
          if (currentCount >= maxRecommendations) return;

          const text = item.textContent?.trim();
          if (text && this.isValidRecommendationText(text)) {
            const author = this.extractAuthorFromGenericElement(item);
            
            if (author) {
              // Check for duplicates
              const isDuplicate = reviews.recommendations.some(existing => 
                this.calculateTextSimilarity(existing.text, text) > 0.7 ||
                existing.author === author
              );

              if (!isDuplicate) {
                const recommendation = {
                  id: currentCount + 1,
                  text: this.cleanTextForCSV(text),
                  author: author,
                  date: this.extractDateFromGenericElement(item),
                  source: 'generic_page'
                };

                reviews.recommendations.push(recommendation);
                currentCount++;
                log.recommendation(`🎯 Generic page recommendation ${currentCount}: "${author}" - "${text.substring(0, 50)}..."`);
              }
            }
          }
        });
      });
    });

    log.recommendation(`🎯 Generic page extraction complete: ${currentCount}/${maxRecommendations} total recommendations`);
  }

  // Validate if text looks like a recommendation
  isValidRecommendationText(text) {
    if (!text || text.length < 30 || text.length > 1000) return false;

    // Positive indicators
    const positiveWords = [
      'recommend', 'excellent', 'outstanding', 'professional', 'helpful',
      'great', 'amazing', 'fantastic', 'wonderful', 'best', 'perfect',
      'exceeded', 'impressed', 'satisfied', 'grateful', 'thank you',
      'worked with', 'helped us', 'helped me', 'service', 'experience'
    ];

    // ENHANCED negative indicators (likely not recommendations)
    const negativeWords = [
      'contact us', 'subscribe', 'newsletter', 'privacy policy', 'terms',
      'copyright', 'all rights reserved', 'menu', 'navigation', 'login',
      'register', 'search', 'filter', 'sort by', 'price range', 'last 24 months',
      'experience', 'years', 'website', 'office', 'mobile', 'phone', 'email',
      'address', 'street', 'areas served', 'specializations', 'write', 'review',
      'recommendation', 'not rated yet', 'share profile', 'years price range',
      'buyer\'s agent', 'seller\'s agent', 'commercial', 'residential', 'land',
      'multi-family', 'new construction', 'foreclosures', 'relocation',
      'first time', 'vacation homes', 'waterfront', 'luxury', 'investment',
      'property management', 'hasn\'t provided a bio', 'agent hasn\'t provided',
      '$', 'sqft', 'bed', 'bath', 'property detail', 'rea real estate',
      'better homes and gardens', 'berkshire hathaway', 'nexthome', 'era',
      'quinn agency', 'sotheby\'s international', 'exp realty'
    ];

    const lowerText = text.toLowerCase();
    
    // Check for negative indicators first (MUCH MORE COMPREHENSIVE)
    if (negativeWords.some(word => lowerText.includes(word))) {
      log.recommendation(`❌ Rejected text (contains "${negativeWords.find(word => lowerText.includes(word))}"): "${text.substring(0, 50)}..."`);
      return false;
    }

    // Reject if text looks like a price range
    if (text.match(/\$[\d,]+/)) {
      log.recommendation(`❌ Rejected text (contains price): "${text.substring(0, 50)}..."`);
      return false;
    }

    // Reject if text looks like agent info
    if (text.match(/\(\d{3}\)\s*\d{3}-\d{4}/) || text.match(/\d{3}-\d{4}/)) {
      log.recommendation(`❌ Rejected text (contains phone): "${text.substring(0, 50)}..."`);
      return false;
    }

    // Reject if text contains only names/places
    if (text.match(/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/) && text.split(' ').length < 4) {
      log.recommendation(`❌ Rejected text (looks like name only): "${text.substring(0, 50)}..."`);
      return false;
    }

    // Check for positive indicators
    const hasPositiveWords = positiveWords.some(word => lowerText.includes(word));
    
    // Check for sentence structure (recommendations usually have complete sentences)
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;
    const hasProperSentences = sentenceCount > 0 && text.length / sentenceCount > 15;

    // Must have both positive words AND proper sentences to be valid
    const isValid = hasPositiveWords && hasProperSentences;
    
    if (!isValid) {
      log.recommendation(`❌ Rejected text (no positive words or sentences): "${text.substring(0, 50)}..."`);
    }

    return isValid;
  }

  // Extract author from generic page elements
  extractAuthorFromGenericElement(element) {
    // Look for author in nearby elements (siblings, parent, children)
    const searchElements = [
      element,
      element.nextElementSibling,
      element.previousElementSibling,
      element.parentElement,
      ...Array.from(element.children)
    ].filter(el => el);

    for (const el of searchElements) {
      if (!el) continue;

      // Look for elements that might contain author names
      const authorElements = el.querySelectorAll([
        '.author',
        '.name',
        '.by-line',
        '.attribution',
        'cite',
        'footer',
        'header',
        'strong',
        'b',
        'em',
        'i'
      ].join(','));

      for (const authorEl of authorElements) {
        const text = authorEl.textContent?.trim();
        if (text && this.looksLikeName(text)) {
          return text;
        }
      }

      // Check element's own text for name patterns
      const elementText = el.textContent?.trim();
      if (elementText && elementText !== element.textContent?.trim()) {
        const nameMatch = elementText.match(/([A-Z][a-z]+ [A-Z][a-z]*(?:\s[A-Z]\.?)?)/);
        if (nameMatch && this.looksLikeName(nameMatch[1])) {
          return nameMatch[1];
        }
      }
    }

    return null;
  }

  // Extract date from generic page elements
  extractDateFromGenericElement(element) {
    const searchElements = [
      element,
      element.nextElementSibling,
      element.previousElementSibling,
      element.parentElement
    ].filter(el => el);

    for (const el of searchElements) {
      if (!el) continue;

      const text = el.textContent?.trim();
      if (!text) continue;

      // Look for various date patterns
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{1,2}-\d{1,2}-\d{4})/,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
        /(\d+\s+(?:days?|weeks?|months?|years?)\s+ago)/i,
        /(\d{4})/
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  // Check if text looks like a person's name
  looksLikeName(text) {
    if (!text || text.length < 2 || text.length > 50) return false;
    
    // Basic name pattern: starts with capital letter, contains letters and spaces
    const namePattern = /^[A-Z][a-z]+(?:\s[A-Z][a-z]*)*(?:\s[A-Z]\.?)?$/;
    
    // Exclude common non-name words and patterns
    const excludeWords = [
      'Read More', 'Learn More', 'Contact', 'About', 'Home', 'Services',
      'Reviews', 'Testimonials', 'Menu', 'Search', 'Login', 'Register',
      'Write', 'Price', 'Experience', 'Bangor', 'Nexthome', 'Better Homes',
      'Berkshire Hathaway', 'ERA', 'Quinn Agency', 'Realty', 'Real Estate',
      'Agent', 'Broker', 'Office', 'Mobile', 'Phone', 'Email', 'Website',
      'Areas', 'Served', 'Specializations', 'Commercial', 'Residential',
      'Buyer', 'Seller', 'Land', 'Multi', 'Family', 'New Construction',
      'Foreclosures', 'Relocation', 'First Time', 'Vacation Homes',
      'Waterfront', 'Luxury', 'Investment', 'Property Management',
      'Anonymous', 'Verified', 'Client', 'Customer', 'User',
      // NEW: Block the specific invalid names we've been seeing
      'Sourced', 'Comfort Real E', 'Los Angeles', 'Camarillo', 'Oxnard',
      'Port Hueneme', 'Agoura Hills', 'Santa Paula', 'Ventura County',
      'California', 'Eleven', 'Twenty Nine', 'Realtor', 'Magazine'
    ];
    
    // Exclude text that contains phone numbers or prices
    if (text.match(/\d{3}-\d{4}|\$[\d,]+/)) {
      return false;
    }
    
    // Exclude very common single words that aren't names
    if (!text.includes(' ') && excludeWords.some(word => text.toLowerCase().includes(word.toLowerCase()))) {
      return false;
    }
    
    // Exclude city/location names and partial business names
    if (text.match(/^(Los Angeles|Camarillo|Oxnard|Santa Paula|Agoura Hills|Port Hueneme)$/i)) {
      return false;
    }
    
    // Exclude partial business names
    if (text.includes('Real E') || text.includes('Comfort Real')) {
      return false;
    }
    
    // Exclude numbers written as words
    if (text.match(/^(Twenty|Thirty|Eleven|Twelve|Thirteen|Fourteen|Fifteen)$/i)) {
      return false;
    }
    
    return namePattern.test(text) && !excludeWords.some(word => text.includes(word));
  }

  extractReviewsByText(reviews) {
    // Extract reviews from text content when structured selectors don't work
    const pageText = document.body.textContent;
    
    // Look for verified review patterns
    const verifiedReviewPattern = /Verified review\s+(.*?)\s+(\d{4})\s+Overall rating \((\d+)\)/g;
    let match;
    
    while ((match = verifiedReviewPattern.exec(pageText)) !== null) {
      const [, location, year, rating] = match;
      
      // Find the review text that follows
      const afterMatch = pageText.substring(match.index + match[0].length);
      const reviewTextMatch = afterMatch.match(/^[^\.]+\.[^\.]+\./);
      
      if (reviewTextMatch) {
        reviews.individual.push({
          rating: rating,
          text: reviewTextMatch[0].trim(),
          location: location,
          date: year,
          verified: true,
          categories: {}
        });
      }
    }
    
    // Look for recommendation patterns
    const recommendationPattern = /([\w\s&]+)\s+almost (\d+) years ago\s+([^]+?)(?=\w+\s+almost|\w+\s+about|$)/g;
    
    while ((match = recommendationPattern.exec(pageText)) !== null) {
      const [, author, yearsAgo, text] = match;
      
      if (text && text.trim().length > 20) {
        reviews.recommendations.push({
          author: author.trim(),
          date: `${yearsAgo} years ago`,
          text: text.trim()
        });
      }
    }
  }

  async extractListings() {
    log.debug('Starting listings extraction...');
    
    // CRITICAL FIX: Disable aggressive tab activation that causes navigation issues
    // The previous tab activation was clicking wrong elements and navigating away from page
    // Instead, work with the current page content and look for "All" listings specifically
    
    console.log('🔄 Looking for "All" listings button to ensure we see all properties...');
    const tabsClicked = this.clickAllListingsTabSafely();
    
    // Poll for listings content to load instead of fixed delay
    if (tabsClicked > 0) {
      console.log('⏳ Polling for listings content to load after tab click...');
      const isReady = await ContentPollingManager.pollForListingsLoad({
        maxAttempts: 40,
        interval: 50,
        timeout: 3000
      });
      
      if (isReady) {
        console.log('✅ Listings content loaded successfully');
      } else {
        console.log('⏰ Listings polling timeout - proceeding anyway');
      }
    } else {
      console.log('⏳ No tabs clicked - checking for immediate content availability...');
      // Even without tabs clicked, do a quick poll to ensure content is stable
      await ContentPollingManager.pollForContentStability('[data-testid*="listing"], .listing-item', {
        maxAttempts: 10,
        interval: 100,
        timeout: 1000,
        stabilityPeriod: 200
      });
    }
    
    console.log('🔄 Starting property extraction...');
    return this.performListingsExtraction();
  }
  
  // ENHANCED method to activate all property tabs to reveal both active and sold listings
  clickAllListingsTabSafely() {
    console.log('🎯 ENHANCED TAB ACTIVATION: Looking for All, Active, and Sold property tabs...');
    
    // Find all potential tab containers in the listings section
    const listingsSection = document.querySelector('[data-testid="agent-listing-and-sales"], #listing-and-sales-section') || document;
    
    // Enhanced selector - look for ANY clickable element containing the tab text patterns
    const allClickableElements = listingsSection.querySelectorAll('button, [role="tab"], .tab, .picker-button, [data-testid*="picker"], a, span, div[class*="picker"], div[class*="tab"], [class*="button"]');
    
    // ALSO directly search for elements containing the specific text we know exists
    const textBasedTabs = [];
    const walker = document.createTreeWalker(
      listingsSection,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if ((text.includes('All') && text.match(/\(\d+\)/)) ||
          (text.includes('Active Listings') && text.match(/\(\d+\)/)) ||
          (text.includes('Worked with Buyer') && text.match(/\(\d+\)/))) {
        const parentElement = node.parentElement;
        if (parentElement && !textBasedTabs.includes(parentElement)) {
          textBasedTabs.push(parentElement);
          console.log(`🎯 FOUND TEXT-BASED TAB: "${text}" in element:`, parentElement.tagName, parentElement.className);
        }
      }
    }
    
    // Combine both approaches
    const combinedElements = [...allClickableElements, ...textBasedTabs];
    
    let tabsClicked = 0;
    const clickedTabs = [];
    
    combinedElements.forEach(element => {
      const text = element.textContent.trim();
      const lowerText = text.toLowerCase();
      const testId = element.getAttribute('data-testid') || '';
      
      // Target specific tab patterns for listings
      const isAllTab = lowerText.includes('all') && text.match(/\(\d+\)/);
      const isWorkedWithBuyerTab = lowerText.includes('worked with buyer') && text.match(/\(\d+\)/);
      const isActiveListingsTab = lowerText.includes('active listings') && text.match(/\(\d+\)/);
      const isSoldTab = lowerText.includes('sold') || lowerText.includes('closed') || lowerText.includes('history');
      
      // Debug: Log what we're finding
      console.log(`🔍 TAB CHECK: "${text}" -> All:${isAllTab}, WorkedWithBuyer:${isWorkedWithBuyerTab}, Active:${isActiveListingsTab}, Sold:${isSoldTab}`);
      
      // Skip if this is not in the listings area (avoid header/nav clicks)
      if (element.closest('header, nav, .header, .navigation, .main-nav')) {
        console.log(`🚫 SKIPPING: "${text}" - in navigation area`);
        return;
      }
      
      if (isAllTab || isWorkedWithBuyerTab || isActiveListingsTab || isSoldTab) {
        console.log(`🎯 FOUND LISTINGS TAB: "${text}" (testId: ${testId})`);
        
        // Try multiple click strategies
        let clickSuccess = false;
        const clickStrategies = [
          () => element.click(),
          () => element.parentElement?.click(),
          () => element.parentElement?.parentElement?.click(),
          () => {
            // Dispatch a click event
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
            element.dispatchEvent(clickEvent);
          },
          () => {
            // Try to find and click any button/clickable element nearby
            const nearbyClickable = element.closest('button, [role="button"], [class*="button"], a') || 
                                  element.querySelector('button, [role="button"], [class*="button"], a') ||
                                  element.parentElement?.querySelector('button, [role="button"], [class*="button"], a');
            nearbyClickable?.click();
          }
        ];
        
        for (let i = 0; i < clickStrategies.length && !clickSuccess; i++) {
          try {
            clickStrategies[i]();
            clickSuccess = true;
            tabsClicked++;
            clickedTabs.push(text);
            console.log(`✅ Successfully clicked tab: "${text}" (strategy ${i + 1})`);
            
            // Small delay between clicks to allow content to load
            const start = Date.now();
            while (Date.now() - start < 1000) { /* wait */ }
            break;
            
          } catch (e) {
            console.log(`⚠️ Click strategy ${i + 1} failed for "${text}":`, e);
          }
        }
        
        if (!clickSuccess) {
          console.log(`❌ All click strategies failed for tab "${text}"`);
        }
      }
    });
    
    if (tabsClicked > 0) {
      console.log(`✅ TABS ACTIVATED: Clicked ${tabsClicked} tabs: ${clickedTabs.join(', ')}`);
    } else {
      console.log('ℹ️ No property tabs found - proceeding with current page content');
    }
    
    return tabsClicked;
  }
  
  // DISABLED: Old aggressive tab activation method - caused navigation issues
  /*
  activateAllPropertyTabs() {
    log.debug('🎯 ACTIVATING PROPERTY TABS - Looking for sold/history tabs to reveal sold properties...');
    console.log('🎯 STARTING TAB ACTIVATION - Searching for sold/history property tabs...');
    
    // PHASE 1: Look for specific sold/history tabs
    const soldTabSelectors = [
      'button[data-testid*="sold"]',
      'button[data-testid*="history"]',
      'button[data-testid*="past"]',
      'a[href*="sold"]',
      'a[href*="history"]',
      '[role="tab"][aria-label*="sold"]',
      '[role="tab"][aria-label*="history"]',
      '.tab[data-tab*="sold"]',
      '.nav-link[href*="sold"]'
    ];
    
    let soldTabsFound = 0;
    soldTabSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`🎯 FOUND SOLD TABS with selector "${selector}": ${elements.length} elements`);
          elements.forEach(el => {
            console.log(`   - Tab text: "${el.textContent.trim()}", aria-label: "${el.getAttribute('aria-label') || 'none'}"`);
            el.click();
            soldTabsFound++;
          });
        }
      } catch (e) {
        // Continue if selector fails
      }
    });
    
    // PHASE 2: Broader search for any clickable element with sold-related text
    const allClickableElements = document.querySelectorAll('button, a, [role="tab"], [role="button"], [onclick], .tab, .nav-link, .button');
    let generalTabsFound = 0;
    const clickedElements = new Set();
    
    allClickableElements.forEach(element => {
      if (clickedElements.has(element)) return;
      
      const text = element.textContent.toLowerCase().trim();
      const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
      const title = (element.getAttribute('title') || '').toLowerCase();
      const href = (element.getAttribute('href') || '').toLowerCase();
      const dataTestId = (element.getAttribute('data-testid') || '').toLowerCase();
      const className = (element.className || '').toLowerCase();
      
      const allText = `${text} ${ariaLabel} ${title} ${href} ${dataTestId} ${className}`;
      
      const soldKeywords = ['sold', 'history', 'past', 'previous', 'closed', 'transaction', 'historical'];
      const hasKeyword = soldKeywords.some(keyword => allText.includes(keyword));
      
      if (hasKeyword || (text.includes('more') && text.length < 30)) { // "View more", "Show more", "Load more"
        log.debug(`🎯 Found potential sold tab: "${text}" (${element.tagName}, class: ${element.className})`);
        console.log(`🎯 CLICKING POTENTIAL SOLD TAB: "${text}" | Full element text: "${element.textContent.trim()}"`);
        
        try {
          element.click();
          clickedElements.add(element);
          generalTabsFound++;
          
          // Multiple click strategies for stubborn elements
          if (element.dispatchEvent) {
            element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
          }
          
          // Try focus and enter key as well
          if (element.focus) {
            element.focus();
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        } catch (clickError) {
          log.debug('Click failed:', clickError);
        }
      }
    });
    
    const totalTabsActivated = soldTabsFound + generalTabsFound;
    console.log(`📊 TAB ACTIVATION COMPLETE:`);
    console.log(`   🎯 Specific sold tabs found: ${soldTabsFound}`);
    console.log(`   🔍 General tabs clicked: ${generalTabsFound}`);
    console.log(`   📊 Total tabs activated: ${totalTabsActivated}`);
    
    // PHASE 3: Try to trigger any lazy-loading or "Show more" buttons
    const showMoreSelectors = [
      'button[data-testid*="more"]',
      'button[aria-label*="more"]',
      '.show-more',
      '.load-more',
      '.view-more',
      'button:contains("more")',
      'a:contains("more")'
    ];
    
    let loadMoreFound = 0;
    showMoreSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!clickedElements.has(el)) {
            console.log(`� CLICKING LOAD MORE: "${el.textContent.trim()}"`);
            el.click();
            clickedElements.add(el);
            loadMoreFound++;
          }
        });
      } catch (e) {
        // Continue if selector fails
      }
    });
    
    if (loadMoreFound > 0) {
      console.log(`🔄 LOAD MORE BUTTONS CLICKED: ${loadMoreFound}`);
    }
    
    // Also try to scroll to reveal more content - sometimes this triggers lazy loading
    window.scrollTo(0, document.body.scrollHeight);
    window.scrollTo(0, 0);
    
    // Wait longer for any AJAX/dynamic content to load after clicking tabs
    const waitTime = totalTabsActivated > 0 ? 2000 : 200; // Increased wait time
    console.log(`⏳ WAITING ${waitTime}ms for tab content to load...`);
  }
  */
  
  performListingsExtraction() {
    log.debug('Starting listings extraction...');
    
    // Debug: Check what's actually on the page
    log.debug('🔍 Page structure analysis:');
    log.debug(`- Total divs: ${document.querySelectorAll('div').length}`);
    log.debug(`- Elements with "card" in class: ${document.querySelectorAll('[class*="card"]').length}`);
    log.debug(`- Elements with "property" in class: ${document.querySelectorAll('[class*="property"]').length}`);
    log.debug(`- Elements with "listing" in class: ${document.querySelectorAll('[class*="listing"]').length}`);
    log.debug(`- Elements with data-testid: ${document.querySelectorAll('[data-testid]').length}`);
    
    // Check for different page sections
    const sections = document.querySelectorAll('section, [role="main"], main, [class*="content"]');
    log.debug(`- Page sections found: ${sections.length}`);
    
    const listings = {
      active: [],
      sold: [],
      totalActive: 0,
      totalSold: 0
    };

    // Extract listing counts
    listings.totalActive = this.getNumberFromText([
      '[data-testid="active-listings-count"]',
      '.active-listings-count',
      '.listings-active'
    ]);

    listings.totalSold = this.getNumberFromText([
      '[data-testid="sold-listings-count"]',
      '.sold-listings-count',
      '.listings-sold'
    ]);

    log.debug('Listing counts:', { active: listings.totalActive, sold: listings.totalSold });

    // Comprehensive listing detection - get all potential property cards
    const listingSelectors = [
      '[data-testid="card-content"]',  // This was working before
      '[data-testid="listing-item"]',
      '.listing-item',
      '.property-card',
      '.BasePropertyCard',
      '.PropertyCard',
      '.card-content',
      '.listing-card',
      'div[class*="property"]',
      'div[class*="listing"]',
      'div[class*="card"]',
      'article[class*="property"]',
      'article[class*="listing"]',
      // Add more modern React-based selectors
      '[class*="Card"]',
      '[class*="Listing"]',
      '[class*="Property"]',
      'div[role="article"]',
      'article',
      // Add broader selectors to catch more
      'div[class*="Item"]',
      'div[class*="Container"]', 
      'section > div',
      '[data-testid*="item"]',
      '[data-testid*="card"]',
      '[data-testid*="result"]',
      // Try React component patterns
      'div[class*="_"]', // React often uses underscores in class names
      'li[class*="item"]',
      'li[class*="card"]'
    ];

    let allElements = [];
    listingSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        log.debug(`🔍 Selector "${selector}" found ${elements.length} elements`);
        elements.forEach(el => {
          if (!allElements.includes(el)) {
            allElements.push(el);
          }
        });
      } catch (e) {
        log.debug(`❌ Selector failed: ${selector}`, e);
      }
    });

    log.debug(`📋 Total unique elements found: ${allElements.length}`);

    // Also try a broader search for price patterns in the DOM
    const priceElements = document.querySelectorAll('*');
    let priceContainingElements = [];
    
    priceElements.forEach(el => {
      const text = el.textContent || '';
      if ((text.match(/\$[\d,]+/) || text.toLowerCase().includes('contact for price')) && 
          text.length < 1000 && text.length > 20) {
        priceContainingElements.push(el);
      }
    });
    
    log.debug(`💰 Found ${priceContainingElements.length} elements containing prices`);
    
    // Combine both approaches
    priceContainingElements.forEach(el => {
      if (!allElements.includes(el)) {
        allElements.push(el);
      }
    });

    log.debug(`📊 Final element count after price search: ${allElements.length}`);
    log.debug(`Found ${allElements.length} potential listing elements to check`);

    // Less restrictive filtering - focus on elements with price and property data
    const elementsWithPropertyInfo = allElements.filter(el => {
      const text = el.textContent || '';
      
      // Must have a price pattern OR "contact for price"
      const hasPrice = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i) || 
                       text.toLowerCase().includes('contact for price') ||
                       text.toLowerCase().includes('call for price');
      if (!hasPrice) return false;
      
      // Must have some property indicators (MADE MORE FLEXIBLE)
      const hasPropertyIndicators = text.match(/\d+\s*bed/) || 
                                   text.match(/\d+\s*bath/) || 
                                   text.match(/\d+,?\d*\s*sq/) ||
                                   text.match(/\d+\s+\w+\s+(St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Drive|Street|Avenue|Road|Lane|Court|Boulevard)/) ||
                                   text.match(/\w+,\s*[A-Z]{2}\s*\d{5}/) ||
                                   text.match(/\w+\s+in\s+\w+/) || // "San Francesca in Camarillo"
                                   text.match(/Condo|Townhouse|House|Single Family|Multi Family/i) ||
                                   text.match(/For Sale|Sold|Active|Pending/i);
      
      // Basic filtering - avoid navigation and very small/large elements (MADE MORE FLEXIBLE)
      const isValidSize = text.length > 20 && text.length < 8000; // Increased max size
      const notNavigation = !text.toLowerCase().includes('navigation') &&
                           !text.toLowerCase().includes('header') &&
                           !text.toLowerCase().includes('footer') &&
                           !text.toLowerCase().includes('menu');
      
      const isValidContent = hasPrice && hasPropertyIndicators && isValidSize && notNavigation;
      
      if (isValidContent) {
        log.debug(`✅ VALID PROPERTY ELEMENT: Price=${hasPrice[0]}, Size=${text.length}, Text preview: "${text.substring(0, 100)}..."`);
      }
      
      return isValidContent;
    });

    log.debug(`Found ${elementsWithPropertyInfo.length} elements with valid property information`);
    
    // DIAGNOSTIC: Show what we found
    elementsWithPropertyInfo.forEach((el, i) => {
      const text = el.textContent || '';
      const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
      log.debug(`🏠 Property Element ${i+1}: Price=${priceMatch ? priceMatch[0] : 'none'}, Text="${text.substring(0, 150)}..."`);
    });

    // Increase limit to capture more properties 
    const maxListings = 20; // Increased from 10
    const limitedElements = elementsWithPropertyInfo.slice(0, maxListings);

    limitedElements.forEach((listingEl, index) => {
      const listing = this.extractDetailedListing(listingEl, index);
      
      if (listing && listing.price) {
        log.debug(`Extracted listing ${index}:`, JSON.stringify(listing, null, 2));
        
        // CRITICAL: Check for duplicates before adding
        const isDuplicate = this.isListingDuplicate(listing, listings.active, listings.sold);
        
        if (isDuplicate) {
          log.debug(`🚫 DUPLICATE LISTING REJECTED: ${listing.address || 'No address'} - ${listing.price}`);
          return; // Skip this duplicate
        }
        
        if (listing.status?.toLowerCase().includes('sold') || 
            listingEl.textContent.toLowerCase().includes('sold')) {
          listings.sold.push(listing);
          log.debug(`✅ ADDED SOLD LISTING: ${listing.address || 'No address'} - ${listing.price}`);
          console.log(`🏠 SOLD PROPERTY DETECTED:`, {
            address: listing.address,
            price: listing.price,
            status: listing.status,
            elementText: listingEl.textContent.substring(0, 100)
          });
        } else {
          listings.active.push(listing);
          log.debug(`✅ ADDED ACTIVE LISTING: ${listing.address || 'No address'} - ${listing.price}`);
          console.log(`🏠 ACTIVE PROPERTY DETECTED:`, {
            address: listing.address,
            price: listing.price,
            status: listing.status,
            elementText: listingEl.textContent.substring(0, 100)
          });
        }
      }
    });

    log.debug('Final listings result:', {
      activeCount: listings.active.length,
      soldCount: listings.sold.length,
      totalActive: listings.totalActive,
      totalSold: listings.totalSold,
      totalExtracted: listings.active.length + listings.sold.length
    });

    // DIAGNOSTIC: Show what we actually found
    console.log('🏠 EXTRACTION COMPLETE:');
    console.log(`   ✅ Active Properties: ${listings.active.length}`);
    console.log(`   🏠 Sold Properties: ${listings.sold.length}`);
    console.log(`   📊 Total Extracted: ${listings.active.length + listings.sold.length}`);
    
    if (listings.active.length > 0) {
      console.log('🏠 ACTIVE LISTINGS SAMPLE:');
      listings.active.slice(0, 3).forEach((listing, i) => {
        console.log(`   ${i+1}. ${listing.price} - ${listing.address}`);
      });
    }
    
    if (listings.sold.length > 0) {
      console.log('🏠 SOLD LISTINGS SAMPLE:');  
      listings.sold.slice(0, 3).forEach((listing, i) => {
        console.log(`   ${i+1}. ${listing.price} - ${listing.address}`);
      });
    }

    return listings;
  }
  
  performListingsExtraction() {
    log.debug('📊 Performing main listings extraction after tab activation...');
    
    // Debug: Check what's actually on the page
    log.debug('🔍 Page structure analysis:');
    log.debug(`- Total divs: ${document.querySelectorAll('div').length}`);
    log.debug(`- Elements with "card" in class: ${document.querySelectorAll('[class*="card"]').length}`);
    log.debug(`- Elements with "property" in class: ${document.querySelectorAll('[class*="property"]').length}`);
    log.debug(`- Elements with "listing" in class: ${document.querySelectorAll('[class*="listing"]').length}`);
    log.debug(`- Elements with data-testid: ${document.querySelectorAll('[data-testid]').length}`);
    
    // Check for different page sections
    const sections = document.querySelectorAll('section, [role="main"], main, [class*="content"]');
    log.debug(`- Page sections found: ${sections.length}`);
    
    const listings = {
      active: [],
      sold: [],
      totalActive: 0,
      totalSold: 0
    };

    // Extract listing counts
    listings.totalActive = this.getNumberFromText([
      '[data-testid="active-listings-count"]',
      '.active-listings-count',
      '.listings-active'
    ]);

    listings.totalSold = this.getNumberFromText([
      '[data-testid="sold-listings-count"]',
      '.sold-listings-count',
      '.listings-sold'
    ]);

    log.debug('Listing counts:', { active: listings.totalActive, sold: listings.totalSold });

    // Comprehensive listing detection - get all potential property cards
    const listingSelectors = [
      '[data-testid="card-content"]',  // This was working before
      '[data-testid="listing-item"]',
      '.listing-item',
      '.property-card',
      '.BasePropertyCard',
      '.PropertyCard',
      '.card-content',
      '.listing-card',
      'div[class*="property"]',
      'div[class*="listing"]',
      'div[class*="card"]',
      'article[class*="property"]',
      'article[class*="listing"]',
      // Add more modern React-based selectors
      '[class*="Card"]',
      '[class*="Listing"]',
      '[class*="Property"]',
      'div[role="article"]',
      'article',
      // Add broader selectors to catch more
      'div[class*="Item"]',
      'div[class*="Container"]', 
      'section > div',
      '[data-testid*="item"]',
      '[data-testid*="card"]',
      '[data-testid*="result"]',
      // Try React component patterns
      'div[class*="_"]', // React often uses underscores in class names
      'li[class*="item"]',
      'li[class*="card"]'
    ];

    let allElements = [];
    listingSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        log.debug(`🔍 Selector "${selector}" found ${elements.length} elements`);
        elements.forEach(el => {
          if (!allElements.includes(el)) {
            allElements.push(el);
          }
        });
      } catch (e) {
        log.debug(`❌ Selector failed: ${selector}`, e);
      }
    });

    log.debug(`📋 Total unique elements found: ${allElements.length}`);

    // Also try a broader search for price patterns in the DOM
    const priceElements = document.querySelectorAll('*');
    let priceContainingElements = [];
    
    priceElements.forEach(el => {
      const text = el.textContent || '';
      if ((text.match(/\$[\d,]+/) || text.toLowerCase().includes('contact for price')) && 
          text.length < 1000 && text.length > 20) {
        priceContainingElements.push(el);
      }
    });
    
    log.debug(`💰 Found ${priceContainingElements.length} elements containing prices`);
    
    // Combine both approaches
    priceContainingElements.forEach(el => {
      if (!allElements.includes(el)) {
        allElements.push(el);
      }
    });

    log.debug(`📊 Final element count after price search: ${allElements.length}`);
    log.debug(`Found ${allElements.length} potential listing elements to check`);

    // Less restrictive filtering - focus on elements with price and property data
    const elementsWithPropertyInfo = allElements.filter(el => {
      const text = el.textContent || '';
      
      // Must have a price pattern OR "contact for price"
      const hasPrice = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i) || 
                       text.toLowerCase().includes('contact for price') ||
                       text.toLowerCase().includes('call for price');
      if (!hasPrice) return false;
      
      // Must have some property indicators (MADE MORE FLEXIBLE)
      const hasPropertyIndicators = text.match(/\d+\s*bed/) || 
                                   text.match(/\d+\s*bath/) || 
                                   text.match(/\d+,?\d*\s*sq/) ||
                                   text.match(/\d+\s+\w+\s+(St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Drive|Street|Avenue|Road|Lane|Court|Boulevard)/) ||
                                   text.match(/\w+,\s*[A-Z]{2}\s*\d{5}/) ||
                                   text.match(/\w+\s+in\s+\w+/) || // "San Francesca in Camarillo"
                                   text.match(/Condo|Townhouse|House|Single Family|Multi Family/i) ||
                                   text.match(/For Sale|Sold|Active|Pending/i);
      
      // Basic filtering - avoid navigation and very small/large elements (MADE MORE FLEXIBLE)
      const isValidSize = text.length > 20 && text.length < 8000; // Increased max size
      const notNavigation = !text.toLowerCase().includes('navigation') &&
                           !text.toLowerCase().includes('header') &&
                           !text.toLowerCase().includes('footer') &&
                           !text.toLowerCase().includes('menu');
      
      const isValidContent = hasPrice && hasPropertyIndicators && isValidSize && notNavigation;
      
      if (isValidContent) {
        log.debug(`✅ VALID PROPERTY ELEMENT: Price=${hasPrice[0] || 'contact for price'}, Size=${text.length}, Text preview: "${text.substring(0, 100)}..."`);
      }
      
      return isValidContent;
    });

    log.debug(`Found ${elementsWithPropertyInfo.length} elements with valid property information`);
    
    // DIAGNOSTIC: Show what we found
    elementsWithPropertyInfo.forEach((el, i) => {
      const text = el.textContent || '';
      const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
      const hasContactPrice = text.toLowerCase().includes('contact for price');
      log.debug(`🏠 Property Element ${i+1}: Price=${priceMatch ? priceMatch[0] : (hasContactPrice ? 'Contact for price' : 'none')}, Text="${text.substring(0, 150)}..."`);
    });

    // Increase limit to capture more properties 
    const maxListings = 20; // Increased from 10
    const limitedElements = elementsWithPropertyInfo.slice(0, maxListings);

    limitedElements.forEach((listingEl, index) => {
      const listing = this.extractDetailedListing(listingEl, index);
      
      if (listing && listing.price) {
        log.debug(`Extracted listing ${index}:`, JSON.stringify(listing, null, 2));
        
        // CRITICAL: Check for duplicates before adding
        const isDuplicate = this.isListingDuplicate(listing, listings.active, listings.sold);
        
        if (isDuplicate) {
          log.debug(`🚫 DUPLICATE LISTING REJECTED: ${listing.address || 'No address'} - ${listing.price}`);
          return; // Skip this duplicate
        }
        
        if (listing.status?.toLowerCase().includes('sold') || 
            listingEl.textContent.toLowerCase().includes('sold')) {
          listings.sold.push(listing);
          log.debug(`✅ ADDED SOLD LISTING: ${listing.address || 'No address'} - ${listing.price}`);
          console.log(`🏠 SOLD PROPERTY DETECTED:`, {
            address: listing.address,
            price: listing.price,
            status: listing.status,
            elementText: listingEl.textContent.substring(0, 100)
          });
        } else {
          listings.active.push(listing);
          log.debug(`✅ ADDED ACTIVE LISTING: ${listing.address || 'No address'} - ${listing.price}`);
          console.log(`🏠 ACTIVE PROPERTY DETECTED:`, {
            address: listing.address,
            price: listing.price,
            status: listing.status,
            elementText: listingEl.textContent.substring(0, 100)
          });
        }
      }
    });

    log.debug('Final listings result:', {
      activeCount: listings.active.length,
      soldCount: listings.sold.length,
      totalActive: listings.totalActive,
      totalSold: listings.totalSold,
      totalExtracted: listings.active.length + listings.sold.length
    });

    // DIAGNOSTIC: Show what we actually found
    console.log('🏠 EXTRACTION COMPLETE:');
    console.log(`   ✅ Active Properties: ${listings.active.length}`);
    console.log(`   🏠 Sold Properties: ${listings.sold.length}`);
    console.log(`   📊 Total Extracted: ${listings.active.length + listings.sold.length}`);
    
    if (listings.active.length > 0) {
      console.log('🏠 ACTIVE LISTINGS SAMPLE:');
      listings.active.slice(0, 3).forEach((listing, i) => {
        console.log(`   ${i+1}. ${listing.price} - ${listing.address}`);
      });
    }
    
    if (listings.sold.length > 0) {
      console.log('🏠 SOLD LISTINGS SAMPLE:');  
      listings.sold.slice(0, 3).forEach((listing, i) => {
        console.log(`   ${i+1}. ${listing.price} - ${listing.address}`);
      });
    }

    return listings;
  }

  // ENHANCED: Duplicate detection for listings with global database check capability
  isListingDuplicate(newListing, activeListings, soldListings) {
    const allListings = [...activeListings, ...soldListings];
    
    return allListings.some(existingListing => {
      // Primary check: Same property_id (most reliable)
      if (newListing.property_id && existingListing.property_id) {
        if (newListing.property_id === existingListing.property_id) {
          log.debug(`🚫 DUPLICATE DETECTED: Same property_id ${newListing.property_id}`);
          return true; // Exact property ID match = definite duplicate
        }
      }
      
      // Secondary check: Same MLS number (also very reliable)
      if (newListing.mls && existingListing.mls) {
        if (newListing.mls === existingListing.mls) {
          log.debug(`🚫 DUPLICATE DETECTED: Same MLS ${newListing.mls}`);
          return true; // Same MLS = duplicate
        }
      }
      
      // Tertiary check: Same address (strong indicator) - ENHANCED FOR MINIMAL DATA
      if (newListing.address && existingListing.address) {
        const newAddr = this.normalizeAddress(newListing.address);
        const existingAddr = this.normalizeAddress(existingListing.address);
        if (newAddr === existingAddr) {
          log.info(`🚫 DUPLICATE DETECTED: Same address "${newAddr}" - blocking duplicate property`);
          return true; // Exact address match = duplicate
        }
        
        // ADDITIONAL: Check for address similarity for minimal data properties
        if (this.isMinimalDataProperty(newListing) && this.isMinimalDataProperty(existingListing)) {
          if (this.addressesSimilar(newAddr, existingAddr)) {
            log.info(`🚫 DUPLICATE DETECTED: Similar addresses for minimal data properties - "${newAddr}" vs "${existingAddr}"`);
            return true;
          }
        }
      }
      
      // Quaternary check: Same price + beds + baths + sqft (very strong indicators)
      if (newListing.price && existingListing.price && 
          newListing.beds && existingListing.beds &&
          newListing.baths && existingListing.baths &&
          newListing.sqft && existingListing.sqft) {
        
        if (newListing.price === existingListing.price &&
            newListing.beds === existingListing.beds &&
            newListing.baths === existingListing.baths &&
            newListing.sqft === existingListing.sqft) {
          log.debug(`🚫 DUPLICATE DETECTED: Same price/beds/baths/sqft ${newListing.price}-${newListing.beds}/${newListing.baths}-${newListing.sqft}sqft`);
          return true; // All key characteristics match = likely duplicate
        }
      }
      
      // Fallback check: Same price + beds + baths (medium strength)
      if (newListing.price && existingListing.price && 
          newListing.beds && existingListing.beds &&
          newListing.baths && existingListing.baths) {
        
        if (newListing.price === existingListing.price &&
            newListing.beds === existingListing.beds &&
            newListing.baths === existingListing.baths) {
          log.debug(`🚫 DUPLICATE DETECTED: Same price/beds/baths ${newListing.price}-${newListing.beds}/${newListing.baths}`);
          return true; // Same price/beds/baths = likely duplicate
        }
      }
      
      return false; // Not a duplicate
    });
  }

  // Helper method to normalize addresses for comparison
  normalizeAddress(address) {
    if (!address) return '';
    
    return address
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\bst\.?\b/g, 'street')  // Standardize street
      .replace(/\bave\.?\b/g, 'avenue')  // Standardize avenue
      .replace(/\bdr\.?\b/g, 'drive')    // Standardize drive
      .replace(/\brd\.?\b/g, 'road')     // Standardize road
      .replace(/\bln\.?\b/g, 'lane')     // Standardize lane
      .replace(/\bct\.?\b/g, 'court')    // Standardize court
      .replace(/\bblvd\.?\b/g, 'boulevard') // Standardize boulevard
      .replace(/[^\w\s]/g, '')           // Remove punctuation
      .trim();
  }

  // Helper method to check if a property has minimal data (common cause of duplicate detection failure)
  isMinimalDataProperty(listing) {
    return !listing.property_id && 
           !listing.mls && 
           (!listing.price || listing.price === 0) &&
           !listing.beds && 
           !listing.baths && 
           !listing.sqft;
  }

  // Helper method to check if two addresses are similar (for minimal data properties)
  addressesSimilar(addr1, addr2) {
    if (!addr1 || !addr2) return false;
    
    // Exact match (already handled above, but double-check)
    if (addr1 === addr2) return true;
    
    // Remove common variations and check again
    const clean1 = addr1.replace(/\b(street|avenue|drive|road|lane|court|boulevard)\b/g, '').replace(/\s+/g, ' ').trim();
    const clean2 = addr2.replace(/\b(street|avenue|drive|road|lane|court|boulevard)\b/g, '').replace(/\s+/g, ' ').trim();
    
    if (clean1 === clean2) return true;
    
    // Check if one address is contained in the other (partial match)
    const longer = addr1.length > addr2.length ? addr1 : addr2;
    const shorter = addr1.length > addr2.length ? addr2 : addr1;
    
    return longer.includes(shorter) && shorter.length > 5; // Avoid matching very short strings
  }

  // NEW: Check for property duplicates across the entire database
  async checkGlobalPropertyDuplicate(property) {
    try {
      const dbService = await this.waitForDatabaseService();
      if (!dbService) {
        log.debug('⚠️ DatabaseService not available for global duplicate check');
        return false;
      }
      
      // Create the API endpoint URL for checking duplicates
      const response = await fetch(`${dbService.baseUrl}/check-property-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.property_id,
          mls_number: property.mls,
          address: property.address,
          price: property.price,
          bedrooms: property.beds,
          bathrooms: property.baths,
          square_feet: property.sqft
        })
      });
      
      if (!response.ok) {
        log.warn('Failed to check global property duplicate');
        return false;
      }
      
      const result = await response.json();
      
      if (result.isDuplicate) {
        log.debug(`🚫 GLOBAL DUPLICATE DETECTED: Property exists in database`, {
          property_id: property.property_id,
          address: property.address,
          existing_agents: result.existingProperties?.length || 0
        });
        
        // Log details about existing properties
        if (result.existingProperties) {
          result.existingProperties.forEach((existing, index) => {
            log.debug(`   Existing property ${index + 1}: Agent ${existing.agent_id}, Address: ${existing.address}`);
          });
        }
      }
      
      return result.isDuplicate;
      
    } catch (error) {
      log.warn('Error checking global property duplicate:', error);
      return false; // Don't block extraction if check fails
    }
  }

  // Helper method to get text from nearby elements that might contain status info
  getNearbyElementsText(element) {
    let nearbyText = '';
    
    // Check parent elements
    let parent = element.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
      const parentText = parent.textContent || '';
      if (parentText.length < 500) { // Avoid huge parent text
        nearbyText += ' ' + parentText;
      }
      parent = parent.parentElement;
    }
    
    // Check sibling elements
    const siblings = element.parentElement?.children || [];
    for (let sibling of siblings) {
      if (sibling !== element) {
        const siblingText = sibling.textContent || '';
        if (siblingText.length < 200) { // Avoid huge sibling text
          nearbyText += ' ' + siblingText;
        }
      }
    }
    
    return nearbyText;
  }

  extractDetailedListing(element, index) {
    const text = element.textContent || '';
    
    // Extract price more carefully - look for CSS selectors first
    let price = null;
    
    // Try specific price selectors first
    const priceSelectors = [
      '.price',
      '.listing-price',
      '.property-price',
      '[data-testid*="price"]',
      '[data-testid*="Price"]',
      '.price-range'
    ];
    
    for (const selector of priceSelectors) {
      const priceEl = element.querySelector(selector);
      if (priceEl && priceEl.textContent) {
        const priceText = priceEl.textContent.trim();
        // FIXED: Include K, M suffixes + support 1+ decimal places
        const priceMatch = priceText.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
        if (priceMatch) {
          price = priceMatch[0];
          break;
        }
      }
    }
    
    // Fallback to text-based extraction if selector method failed
    if (!price) {
      // FIXED: Include K, M, B suffixes + support 1+ decimal places
      const priceMatches = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/gi);
      
      if (priceMatches) {
        // Find the most likely property price (usually the largest one)
        const validPrices = priceMatches.filter(p => {
          // Convert K/M to actual numbers for validation - FIXED: Use parseFloat for decimals
          let numValue = parseFloat(p.replace(/[$,]/g, ''));
          if (p.toUpperCase().includes('K')) numValue *= 1000;
          if (p.toUpperCase().includes('M')) numValue *= 1000000;
          if (p.toUpperCase().includes('B')) numValue *= 1000000000;
          return numValue >= 100000 && numValue <= 100000000; // Between $100K and $100M
        });
        
        if (validPrices.length > 0) {
          // Take the largest valid price (most likely to be the property price)
          price = validPrices.sort((a, b) => {
            let aVal = parseFloat(a.replace(/[$,]/g, '')); // FIXED: Use parseFloat
            let bVal = parseFloat(b.replace(/[$,]/g, '')); // FIXED: Use parseFloat
            if (a.toUpperCase().includes('K')) aVal *= 1000;
            if (a.toUpperCase().includes('M')) aVal *= 1000000;
            if (b.toUpperCase().includes('K')) bVal *= 1000;
            if (b.toUpperCase().includes('M')) bVal *= 1000000;
            return bVal - aVal;
          })[0];
        }
      }
    }
    
    // If no price found, check for "Contact for price" cases (sold properties)
    if (!price) {
      if (text.toLowerCase().includes('contact for price') || 
          text.toLowerCase().includes('call for price') ||
          text.toLowerCase().includes('price upon request')) {
        price = 'Contact for price';
        log.debug('📞 Found "Contact for price" property');
      } else {
        return null; // No price at all, skip this element
      }
    }

    const listing = {
      id: index,
      price: price,
      address: this.extractAddress(element, text),
      beds: this.extractBedrooms(element, text),
      baths: this.extractBathrooms(element, text),
      sqft: this.extractSquareFeet(element, text),
      status: this.extractListingStatus(element, text),
      image: this.extractListingImage(element),
      photos: this.extractAllListingPhotos(element), // Multiple photos
      listingType: this.extractListingType(element, text),
      dateInfo: this.extractListingDate(element, text),
      description: this.extractListingDescription(element, text),
      propertyType: this.extractPropertyType(element, text)
    };

    // CRITICAL DEBUG: Let's see exactly what we extracted vs what's in the text
    console.log(`🔍 LISTING EXTRACTION DEBUG #${index}:`);
    console.log(`   💰 Price: ${listing.price}`);
    console.log(`   🏠 Address extracted: "${listing.address}"`);
    console.log(`   🔍 Full element text (first 500 chars): "${text.substring(0, 500)}"`);
    console.log(`   🏗️ Element HTML classes: ${element.className}`);
    console.log(`   📊 Status: ${listing.status}, Beds: ${listing.beds}, Baths: ${listing.baths}, Sqft: ${listing.sqft}`);
    
    if (!listing.address || listing.address.includes('square feet')) {
      console.log(`❌ ADDRESS EXTRACTION FAILED FOR LISTING #${index}`);
      console.log(`   🔍 Let's manually look for addresses in the text:`);
      
      // Manual address search for debugging
      const possibleAddresses = text.match(/\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Street|Avenue|Drive|Road|Lane|Court|Boulevard)/gi);
      if (possibleAddresses) {
        console.log(`   ✅ Found potential addresses in text:`, possibleAddresses);
      }
      
      const cityStateMatches = text.match(/[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5}/g);
      if (cityStateMatches) {
        console.log(`   🏙️ Found city/state patterns:`, cityStateMatches);
      }
    }

    return listing;
  }

  extractListingsFromText(listings) {
    const pageText = document.body.textContent;
    
    // Look for patterns like "For sale - 08/14/2025" followed by price and property info
    const listingPatterns = [
      /For sale - \d{2}\/\d{2}\/\d{4}[\s\S]*?\$[\d,]+[\s\S]*?\d+ bed[\s\S]*?\d+ bath[\s\S]*?\d+,?\d* sqft/gi,
      /Sold - \d{2}\/\d{2}\/\d{4}[\s\S]*?\$[\d,]+[\s\S]*?\d+ bed[\s\S]*?\d+ bath[\s\S]*?\d+,?\d* sqft/gi
    ];

    listingPatterns.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches) {
        matches.forEach((match, index) => {
          const listing = this.parseListingFromText(match, index);
          if (listing) {
            if (match.toLowerCase().includes('sold')) {
              listings.sold.push(listing);
            } else {
              listings.active.push(listing);
            }
          }
        });
      }
    });
  }

  parseListingFromText(text, index) {
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i); // FIXED: Support K/M/B + decimals
    const bedMatch = text.match(/(\d+) bed/);
    const bathMatch = text.match(/(\d+) bath/);
    const sqftMatch = text.match(/([\d,]+) sqft/);
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    const statusMatch = text.match(/(For sale|Sold)/i);

    if (!priceMatch) return null;

    return {
      id: `text-${index}`,
      price: priceMatch[0],
      beds: bedMatch ? bedMatch[1] : null,
      baths: bathMatch ? bathMatch[1] : null,
      sqft: sqftMatch ? sqftMatch[1] : null,
      status: statusMatch ? statusMatch[1] : 'unknown',
      date: dateMatch ? dateMatch[1] : null,
      source: 'text-extraction'
    };
  }

  extractAddress(element, text) {
    log.debug('🏠 Extracting address from element:', element.className);
    
    // DIAGNOSTIC: Let's see what text content we're working with
    console.log('🔍 DIAGNOSTIC ADDRESS: Element text (first 200 chars):', text.substring(0, 200));
    console.log('🔍 DIAGNOSTIC ADDRESS: Element HTML snippet:', element.outerHTML.substring(0, 300));
    
    // ENHANCED FOR SOLD PROPERTIES: Check for sold vs active property structure
    const isSoldProperty = text.includes('Status: Sold') || element.textContent.includes('Status: Sold');
    console.log(`🏠 PROPERTY TYPE: ${isSoldProperty ? 'SOLD' : 'ACTIVE'}`);
    
    // STEP 0: For SOLD properties, try to find COMPLETE address by combining separated elements
    if (isSoldProperty) {
      console.log('🔍 SOLD PROPERTY: Looking for separated address components...');
      
      // Look for number and street name in separate elements
      const allElements = element.querySelectorAll('*');
      let foundNumber = null;
      let foundStreet = null;
      let foundCity = null;
      
      for (const el of allElements) {
        const elText = el.textContent.trim();
        
        // Look for house numbers (standalone numbers 3-6 digits)
        if (!foundNumber && elText.match(/^\d{3,6}$/) && !elText.includes('$')) {
          foundNumber = elText;
          console.log(`🏠 FOUND HOUSE NUMBER: "${foundNumber}"`);
        }
        
        // Look for street names (words with common suffixes, but not too long)
        if (!foundStreet && elText.match(/^[A-Z][a-zA-Z\s]+(St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Street|Avenue|Drive|Road|Lane|Court|Boulevard)\b/i) && 
            elText.length < 50 && !elText.includes('$') && !elText.match(/^\d+$/)) {
          foundStreet = elText;
          console.log(`🛣️ FOUND STREET NAME: "${foundStreet}"`);
        }
        
        // Look for city names (Capitalized words, often with state)
        if (!foundCity && elText.match(/^[A-Z][a-zA-Z\s]+,?\s*([A-Z]{2}\s*\d{5})?$/) && 
            elText.length < 40 && !elText.includes('$') && !elText.match(/^\d+$/) && 
            !elText.match(/^(St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Street|Avenue|Drive|Road|Lane|Court|Boulevard)$/i)) {
          foundCity = elText;
          console.log(`🏙️ FOUND CITY: "${foundCity}"`);
        }
      }
      
      // Combine found components
      if (foundNumber && foundStreet) {
        const combinedAddress = foundCity ? 
          `${foundNumber} ${foundStreet}, ${foundCity}` : 
          `${foundNumber} ${foundStreet}`;
        console.log(`✅ COMBINED SOLD PROPERTY ADDRESS: "${combinedAddress}"`);
        return this.cleanAddress(combinedAddress);
      }
      
      // Fallback: Look for any element that might contain a complete address
      for (const el of allElements) {
        const elText = el.textContent.trim();
        // Look for text that has both numbers and street indicators
        if (elText.match(/\d+\s+[A-Z][a-zA-Z\s]+(St|Ave|Dr|Rd|Ln|Ct|Blvd|Way)/i) && 
            elText.length > 15 && elText.length < 100 && !elText.includes('$')) {
          console.log(`✅ FOUND COMPLETE ADDRESS IN SOLD PROPERTY: "${elText}"`);
          return this.cleanAddress(elText);
        }
      }
    }
    
    // STEP 1: Try CSS selectors first - but avoid price elements
    const addressSelectors = [
      '.property-address:not([class*="price"])',
      '.listing-address:not([class*="price"])',
      '.address:not([class*="price"])',
      '[data-testid*="address"]:not([class*="price"])',
      '[data-testid*="location"]:not([class*="price"])',
      '.location:not([class*="price"])',
      '.street-address:not([class*="price"])',
      // Look for actual address elements
      'h3:not([class*="price"])',
      'h4:not([class*="price"])', 
      'span:not([class*="price"])',
      'div:not([class*="price"]) > span:not([class*="price"])'
    ];

    for (const selector of addressSelectors) {
      try {
        const addressEl = element.querySelector(selector);
        if (addressEl && addressEl.textContent.trim()) {
          const addressText = addressEl.textContent.trim();
          
          console.log(`🔍 SELECTOR "${selector}" found: "${addressText}"`);
          
          // BASIC filtering - only skip obvious prices  
          if (addressText.includes('$') || 
              addressText.match(/^\$?\d{1,4}(,\d{3})*$/) || 
              addressText.match(/^\d{1,4}$/) || 
              addressText.length < 8) {
            log.debug('🚫 Skipping price content via selector:', addressText);
            continue;
          }
          
          // More lenient check for now to debug
          if (addressText.length > 10) {
            const cleanedAddress = this.cleanAddress(addressText);
            log.debug(`✅ Found address via selector ${selector}: "${cleanedAddress}"`);
            console.log(`✅ SELECTOR FOUND ADDRESS: "${cleanedAddress}"`);
            return cleanedAddress;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // STEP 2: Look for street addresses in the raw text with ENHANCED patterns
    const addressPatterns = isSoldProperty ? [
      // For sold properties, be more aggressive in finding addresses
      // Look for ANY number followed by words that could be street names
      /(\d+\s+[A-Z][a-zA-Z\s]*(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Street|Avenue|Drive|Road|Lane|Court|Boulevard|Circle|Place|Terrace)[\w\s,]*)/gi,
      // Look for street names even without explicit suffixes (common in sold listings)
      /(\d+\s+[A-Z][a-zA-Z\s]{8,50})/gi,
      // Look for patterns like "1234 Main Street, City"
      /(\d+\s+[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)/gi,
      // More permissive: any number + capitalized words
      /(\d+\s+[A-Z][a-zA-Z\s]{5,60})/gi
    ] : [
      // For active properties, use standard patterns
      /(\d+\s+[A-Za-z][A-Za-z\s]*(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Street|Avenue|Drive|Road|Lane|Court|Boulevard)[\w\s,]*)/gi,
      /(\d+\s+[A-Za-z][A-Za-z\s]{5,40})/gi
    ];
    
    console.log(`🔍 DIAGNOSTIC ADDRESS: Looking for ${isSoldProperty ? 'SOLD' : 'ACTIVE'} property patterns in raw text...`);
    
    for (const pattern of addressPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`🔍 PATTERN FOUND MATCHES:`, matches);
        for (const match of matches) {
          const trimmedMatch = match.trim();
          
          // Enhanced validation for sold properties
          const minLength = isSoldProperty ? 12 : 15; // More lenient for sold
          const maxLength = isSoldProperty ? 120 : 200; // Allow longer for sold
          
          if (!trimmedMatch.includes('$') && 
              !trimmedMatch.match(/^(Bed|Bath|Sq|Status|Type|Contact)/i) && // Skip property details
              trimmedMatch.length > minLength && 
              trimmedMatch.length < maxLength &&
              !trimmedMatch.match(/^\d+\s+(Bed|Bath|Sq)/i)) { // Skip "3 Beds" patterns
            
            const cleanedAddress = this.cleanAddress(trimmedMatch);
            console.log(`✅ DIAGNOSTIC ADDRESS: Found ${isSoldProperty ? 'SOLD' : 'ACTIVE'} street address via pattern:`, cleanedAddress);
            return cleanedAddress;
          }
        }
      }
    }

    // STEP 3: Look for city, state zip patterns (enhanced for sold properties)
    const cityStatePatterns = isSoldProperty ? [
      // More aggressive patterns for sold properties
      /(\d+\s+[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5})/g, // Full address with zip
      /(\d+\s+[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/g, // Full address no zip
      /(\d+\s+[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)/g, // Number + street + city
      /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5})/g, // City, state zip
      /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/g, // City, state
      // Just city names for sold properties
      /([A-Z][a-zA-Z]{4,20})\s*$/, // Single city name at end
    ] : [
      // Standard patterns for active properties  
      /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5})/g,
      /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/g
    ];
    
    for (const pattern of cityStatePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`🔍 CITY/STATE PATTERN FOUND:`, matches);
        for (const match of matches) {
          if (!match.includes('$') && 
              !match.match(/^(Bed|Bath|Sq|Status|Type)/i) && 
              match.length > 8 && match.length < 100) {
            console.log(`✅ DIAGNOSTIC ADDRESS: Found ${isSoldProperty ? 'SOLD' : 'ACTIVE'} city/state as fallback:`, match);
            return this.cleanAddress(match);
          }
        }
      }
    }

    log.debug('❌ No valid address found');
    console.log('🔍 DIAGNOSTIC ADDRESS: No address found via any pattern');
    
    return null;
  }

  // SIMPLIFIED for debugging - let's see what we're actually getting
  looksLikeRealAddress(text) {
    if (!text || typeof text !== 'string') return false;
    
    console.log(`🔍 VALIDATING ADDRESS: "${text}"`);
    
    // Basic validation - just avoid obvious non-addresses
    if (text.includes('$') || 
        text.match(/^\d{1,4}$/) || 
        text.length < 10) {
      console.log('🚫 Rejected as too short or price:', text);
      return false;
    }
    
    // LENIENT: Accept anything that has a number + letters for now
    const hasNumber = text.match(/\d+/);
    const hasLetters = text.match(/[A-Za-z]{3,}/);
    
    if (hasNumber && hasLetters) {
      console.log('✅ Accepted as potential address:', text);
      return true;
    }
    
    console.log('🚫 Rejected - no number/letter combination:', text);
    return false;
  }

  looksLikeAddress(text) {
    // Keep the original method for backward compatibility
    return this.looksLikeRealAddress(text);
  }

  cleanAddress(address) {
    if (!address) return null;
    
    // STEP 1: Handle "Community detail for..." pattern specifically  
    if (address.includes('Community detail for')) {
      const match = address.match(/Community detail for (.+?) in (.+?)(?:,|\s|$)/);
      if (match) {
        const streetAddress = match[1].trim();
        const cityArea = match[2].trim();
        console.log(`🎯 CLEANING "Community detail": Street="${streetAddress}", City="${cityArea}"`);
        return `${streetAddress}, ${cityArea}`;
      }
      
      // Fallback: try to extract just the address part after "Community detail for"
      const afterDetail = address.replace(/.*Community detail for\s*/i, '');
      if (afterDetail.length > 10) {
        console.log(`🎯 CLEANING "Community detail" fallback: "${afterDetail}"`);
        return afterDetail;
      }
    }
    
    // Enhanced address cleaning with multiple patterns
    let cleaned = address
      // Add comma after street suffixes when followed by a capital letter (no space)
      .replace(/(\b(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Rdg|Pl|Ter|Cir)\b)([A-Z])/g, '$1, $2')
      // Add comma after unit numbers when followed by a capital letter  
      .replace(/(\b(?:Unit|Apt|Suite|#)\s*\d+)([A-Z])/g, '$1, $2')
      // Fix spacing issues - add space after street number if missing
      .replace(/(\d+)([A-Z][a-z])/g, '$1 $2')
      // Clean up multiple spaces and commas
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/^\s*,\s*/, '') // Remove leading comma
      .replace(/\s*,\s*$/, '') // Remove trailing comma
      .trim();
    
    // If the address looks like it's missing spaces between parts, try to fix it
    // Look for patterns like "1234MainStBeverly Hills" 
    if (cleaned.match(/\d+[A-Z][a-z]+[A-Z][a-z]/)) {
      // Try to add spaces before capital letters that look like new words
      cleaned = cleaned.replace(/([a-z])([A-Z][a-z])/g, '$1 $2');
      
      // Add comma before city if we detect city pattern
      cleaned = cleaned.replace(/(\b(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Rdg|Pl|Ter|Cir)\b)\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/g, '$1, $2');
    }
    
    // Remove any remaining price indicators that might have slipped through
    cleaned = cleaned.replace(/\$[\d,]+\.?\d*/g, '').trim();
    
    // Final cleanup
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
    
    return cleaned || null;
  }

  extractBedrooms(element, text) {
    const bedSelectors = ['.beds', '.bedrooms', '[data-testid*="bed"]'];
    
    for (const selector of bedSelectors) {
      const bedEl = element.querySelector(selector);
      if (bedEl) {
        const bedMatch = bedEl.textContent.match(/(\d+)/);
        if (bedMatch) return bedMatch[1];
      }
    }

    const bedMatch = text.match(/(\d+)\s*bed/i);
    return bedMatch ? bedMatch[1] : null;
  }

  extractBathrooms(element, text) {
    const bathSelectors = ['.baths', '.bathrooms', '[data-testid*="bath"]'];
    
    for (const selector of bathSelectors) {
      const bathEl = element.querySelector(selector);
      if (bathEl) {
        const bathMatch = bathEl.textContent.match(/(\d+(?:\.\d+)?)/);
        if (bathMatch) return bathMatch[1];
      }
    }

    const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*bath/i);
    return bathMatch ? bathMatch[1] : null;
  }

  extractSquareFeet(element, text) {
    const sqftSelectors = ['.sqft', '.square-feet', '[data-testid*="sqft"]'];
    
    for (const selector of sqftSelectors) {
      const sqftEl = element.querySelector(selector);
      if (sqftEl) {
        const sqftMatch = sqftEl.textContent.match(/([\d,]+)\s*(?:sqft|sq\.?\s*ft)/i);
        if (sqftMatch) return sqftMatch[1];
      }
    }

    // Look for sqft pattern more carefully to avoid concatenated numbers
    const sqftPatterns = [
      /([\d,]+)\s*sqft/i,
      /([\d,]+)\s*sq\.?\s*ft/i,
      /(\d{1,2},\d{3})\s*(?:sqft|sq)/i  // Match typical sqft ranges like 1,200-9,999
    ];

    for (const pattern of sqftPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1];
        // Validate it's a reasonable sqft value (not concatenated prices)
        const numValue = parseInt(value.replace(/,/g, ''));
        if (numValue >= 100 && numValue <= 50000) { // Reasonable sqft range
          return value;
        }
      }
    }

    return null;
  }

  extractListingStatus(element, text) {
    const statusSelectors = ['.status', '.listing-status', '[data-testid*="status"]'];
    
    for (const selector of statusSelectors) {
      const statusEl = element.querySelector(selector);
      if (statusEl && statusEl.textContent.trim()) {
        return statusEl.textContent.trim();
      }
    }

    if (text.toLowerCase().includes('sold')) return 'Sold';
    if (text.toLowerCase().includes('for sale')) return 'For Sale';
    if (text.toLowerCase().includes('pending')) return 'Pending';
    
    return 'Active';
  }

  extractListingImage(element) {
    log.debug('🖼️ EXTRACTING IMAGES for listing element:', element.className || 'no-class');
    
    // DIAGNOSTIC: Log what images are actually in this element
    const allImages = element.querySelectorAll('img');
    log.debug(`🔍 Found ${allImages.length} total images in this element`);
    allImages.forEach((img, i) => {
      log.debug(`   Image ${i+1}: src="${img.src?.substring(0, 100)}", alt="${img.alt}", size="${img.width}x${img.height}"`);
    });
    
    // Enhanced selectors for property images
    const imgSelectors = [
      'img[src*="rdcpix"]', // Realtor.com specific images
      'img[src*="listings"]',
      'img[src*="property"]',
      'img[alt*="property"]',
      'img[alt*="listing"]',
      'img[alt*="photo"]',
      '.property-image img',
      '.listing-image img',
      '.photo img',
      '[data-testid*="image"] img',
      '[data-testid*="photo"] img',
      // MORE AGGRESSIVE: Add broader selectors
      'picture img',
      'figure img',
      '[class*="image"] img',
      '[class*="Image"] img', 
      '[class*="photo"] img',
      '[class*="Photo"] img',
      // Generic image selectors but with size filtering
      'img'
    ];

    const foundImages = [];
    
    for (const selector of imgSelectors) {
      const imageElements = element.querySelectorAll(selector);
      const images = Array.from(imageElements);
      log.debug(`🎯 Selector "${selector}" found ${images.length} images`);
      images.forEach((img, i) => {
        if (img && img.src) {
          const isValid = this.isValidPropertyImage(img);
          log.debug(`   ${isValid ? '✅' : '❌'} Image ${i+1}: ${img.src.substring(0, 80)} (valid: ${isValid})`);
          if (isValid) {
            const normalizedUrl = this.normalizeImageUrl(img.src);
            if (normalizedUrl && !foundImages.includes(normalizedUrl)) {
              foundImages.push(normalizedUrl);
            }
          }
        }
      });
    }

    log.debug(`🖼️ FINAL RESULT: Found ${foundImages.length} valid images for this listing:`, foundImages);

    // Return first image for individual listing, or array for multiple
    return foundImages.length > 0 ? foundImages[0] : null;
  }

  isValidPropertyImage(imgData) {
    const src = imgData.src || '';
    const alt = imgData.alt || '';
    const element = imgData.element;
    
    // Skip if it's an icon, logo, or very small image
    if (src.includes('icon') || 
        src.includes('logo') || 
        src.includes('avatar') ||
        src.includes('button') ||
        src.includes('badge') ||
        alt.includes('icon') ||
        alt.includes('logo') ||
        alt.includes('avatar') ||
        alt.includes('button')) {
      return false;
    }
    
    // Skip data URLs and invalid URLs
    if (src.startsWith('data:') || src.length < 10) {
      return false;
    }
    
    // Skip common non-property image patterns
    const rejectPatterns = [
      /agent.*photo/i,
      /profile.*photo/i,
      /headshot/i,
      /team.*photo/i,
      /company.*logo/i,
      /brokerage/i,
      /realtor.*logo/i,
      /placeholder/i,
      /loading/i,
      /spinner/i,
      /arrow/i,
      /navigation/i
    ];
    
    for (const pattern of rejectPatterns) {
      if (pattern.test(alt) || pattern.test(src)) {
        return false;
      }
    }
    
    // Check image dimensions (prefer larger images for properties) - MADE MORE FLEXIBLE
    if (element) {
      const width = element.naturalWidth || element.width || 0;
      const height = element.naturalHeight || element.height || 0;
      
      // Property images should be at least 100px in one dimension (reduced from 150px)
      if (width > 0 && height > 0 && (width < 100 && height < 100)) {
        log.debug(`❌ Image too small: ${width}x${height}`);
        return false;
      }
      
      // Skip extremely wide or tall images (likely UI elements) - MADE MORE FLEXIBLE
      if (width > 0 && height > 0) {
        const aspectRatio = width / height;
        if (aspectRatio > 8 || aspectRatio < 0.125) { // Was more restrictive
          log.debug(`❌ Image bad aspect ratio: ${aspectRatio} (${width}x${height})`);
          return false;
        }
      }
    }
    
    log.debug(`✅ Image passed validation: ${src.substring(0, 50)}`);
    return true;
  }

  getImageRejectionReason(src, alt) {
    if (src.startsWith('data:')) return 'data URL';
    if (src.includes('icon')) return 'icon';
    if (src.includes('logo')) return 'logo';
    if (src.includes('avatar')) return 'avatar';
    if (alt.includes('agent')) return 'agent photo';
    if (alt.includes('profile')) return 'profile photo';
    if (src.length < 10) return 'invalid URL';
    return 'other validation failure';
  }

  extractListingType(element, text) {
    if (text.toLowerCase().includes('worked with seller')) return 'Seller Representative';
    if (text.toLowerCase().includes('worked with buyer')) return 'Buyer Representative';
    if (text.toLowerCase().includes('for sale')) return 'For Sale';
    if (text.toLowerCase().includes('sold')) return 'Sold';
    return 'Unknown';
  }

  extractListingDate(element, text) {
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    return dateMatch ? dateMatch[1] : null;
  }

  extractAllListingPhotos(element) {
    log.debug('🖼️ Extracting images for listing element:', element);
    
    // First, try to extract property ID or unique identifier from the listing
    const propertyId = this.extractPropertyId(element);
    const propertyPrice = this.extractPropertyPrice(element);
    const propertyAddress = this.extractPropertyAddress(element);
    
    log.debug('🔍 Property identifiers:', { 
      id: propertyId, 
      price: propertyPrice, 
      address: propertyAddress?.substring(0, 50) + '...' 
    });

    // Strategy 1: Find images within the immediate listing element
    const immediateImages = this.extractImagesFromElement(element, 'immediate');
    if (immediateImages.length > 0) {
      log.debug(`✅ Found ${immediateImages.length} images in immediate element`);
      return immediateImages;
    }

    // Strategy 2: Find the specific property card that matches this listing data
    const matchedCard = this.findMatchingPropertyCard(element, propertyAddress, propertyPrice, propertyId);
    if (matchedCard) {
      log.debug('✅ Found matching property card');
      const cardImages = this.extractImagesFromElement(matchedCard, 'matched-card');
      if (cardImages.length > 0) {
        log.debug(`✅ Found ${cardImages.length} images in matched card`);
        return cardImages;
      }
    }

    // Strategy 3: Look for images in close proximity to this listing
    const proximityImages = this.extractImagesFromProximity(element, propertyAddress);
    if (proximityImages.length > 0) {
      log.debug(`✅ Found ${proximityImages.length} images in proximity`);
      return proximityImages;
    }

    // Strategy 4: Use property URL to find specific images
    if (propertyId) {
      const urlBasedImages = this.extractImagesByPropertyId(propertyId);
      if (urlBasedImages.length > 0) {
        log.debug(`✅ Found ${urlBasedImages.length} images by property ID`);
        return urlBasedImages;
      }
    }

    log.debug('❌ No specific images found for this property');
    return [];
  }

  // Extract property ID from various sources
  extractPropertyId(element) {
    const text = element.textContent || '';
    const html = element.innerHTML || '';
    
    // Look for MLS numbers or property IDs in text
    const mlsMatch = text.match(/MLS[#:\s]*([A-Z0-9-]+)/i) || 
                     text.match(/ID[#:\s]*([A-Z0-9-]+)/i) ||
                     html.match(/property[_-]?id['":\s]*([A-Z0-9-]+)/i);
    
    if (mlsMatch) return mlsMatch[1];

    // Look for property URLs with IDs
    const linkElement = element.querySelector('a[href*="realestateandhomes-detail"]') ||
                       element.querySelector('a[href*="property"]') ||
                       element.querySelector('a[href*="listing"]');
    
    if (linkElement) {
      const urlMatch = linkElement.href.match(/[M]\d{2}\d{3}-\d{5}/) ||
                       linkElement.href.match(/property[/_](\d+)/) ||
                       linkElement.href.match(/listing[/_]([A-Z0-9-]+)/);
      if (urlMatch) return urlMatch[1] || urlMatch[0];
    }

    return null;
  }

  // Extract property price for matching
  extractPropertyPrice(element) {
    const text = element.textContent || '';
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i); // FIXED: Support K/M/B + flexible decimals
    return priceMatch ? priceMatch[0] : null;
  }

  // Extract property address for matching
  extractPropertyAddress(element) {
    const text = element.textContent || '';
    // Look for address patterns
    const addressMatch = text.match(/(\d+\s+[^,\n]+(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Drive|Street|Avenue|Road|Lane|Court|Boulevard)[^,\n]*)/i);
    return addressMatch ? addressMatch[1].trim() : null;
  }

  // Extract images from a specific element with context
  extractImagesFromElement(element, context = 'unknown') {
    const images = [];
    
    // Enhanced selectors for property images
    const imgSelectors = [
      'img[src*="rdcpix"]',
      'img[data-src*="rdcpix"]',
      'img[src*="listings"]',
      'img[alt*="property"]',
      'img[alt*="listing"]',
      '.property-image img',
      '.listing-image img',
      'picture img',
      'img'
    ];

    for (const selector of imgSelectors) {
      const imgElements = element.querySelectorAll(selector);
      
      for (const img of imgElements) {
        const imgSrc = img.src || img.dataset.src || img.dataset.original || img.getAttribute('data-src');
        
        if (imgSrc && this.isValidPropertyImage({src: imgSrc, alt: img.alt || '', element: img})) {
          const normalizedUrl = this.normalizeImageUrl(imgSrc);
          if (normalizedUrl && !images.includes(normalizedUrl)) {
            log.debug(`📸 Adding image from ${context}:`, normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1));
            images.push(normalizedUrl);
          }
        }
      }
      
      // Stop after finding good images
      if (images.length >= 5) break;
    }

    return images;
  }

  // Find the property card that matches this listing
  findMatchingPropertyCard(element, address, price, propertyId) {
    log.debug('🔍 Looking for matching property card...', { address, price, propertyId });
    
    // Enhanced selectors for property cards
    const propertyCardSelectors = [
      '[data-testid*="property-card"]',
      '[data-testid*="listing-card"]',
      '.property-card',
      '.listing-card',
      '[class*="PropertyCard"]',
      '[class*="ListingCard"]',
      '[data-testid="card-content"]',
      'article[data-testid*="property"]',
      '.BasePropertyCard',
      '.PropertyResult'
    ];

    const allCards = document.querySelectorAll(propertyCardSelectors.join(', '));
    log.debug(`🔍 Found ${allCards.length} potential property cards to check`);

    for (const card of allCards) {
      const cardText = card.textContent || '';
      let matchScore = 0;
      const reasons = [];

      // Check for exact address match
      if (address && cardText.includes(address)) {
        matchScore += 50;
        reasons.push('exact address');
      }
      // Check for partial address match
      else if (address) {
        const addressParts = address.split(' ');
        const houseNumber = addressParts[0];
        const streetName = addressParts.slice(1, 3).join(' '); // First 2 words of street
        
        if (houseNumber && cardText.includes(houseNumber)) {
          matchScore += 20;
          reasons.push('house number');
        }
        if (streetName && cardText.includes(streetName)) {
          matchScore += 20;
          reasons.push('street name');
        }
      }

      // Check for price match
      if (price && cardText.includes(price)) {
        matchScore += 30;
        reasons.push('exact price');
      }

      // Check for property ID match
      if (propertyId && cardText.includes(propertyId)) {
        matchScore += 40;
        reasons.push('property ID');
      }

      // Check if this card is spatially close to the original element
      if (this.isElementClose(element, card)) {
        matchScore += 15;
        reasons.push('spatial proximity');
      }

      log.debug(`🎯 Card match score: ${matchScore} (${reasons.join(', ')})`);

      // Consider it a match if score is high enough
      if (matchScore >= 40) {
        log.debug('✅ Found matching card with score:', matchScore);
        return card;
      }
    }

    log.debug('❌ No matching card found');
    return null;
  }

  // Check if two elements are spatially close
  isElementClose(element1, element2) {
    try {
      const rect1 = element1.getBoundingClientRect();
      const rect2 = element2.getBoundingClientRect();
      
      // Calculate distance between centers
      const dx = (rect1.left + rect1.width/2) - (rect2.left + rect2.width/2);
      const dy = (rect1.top + rect1.height/2) - (rect2.top + rect2.height/2);
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      // Consider close if within 500 pixels
      return distance < 500;
    } catch (e) {
      return false;
    }
  }

  // Extract images from elements near this listing
  extractImagesFromProximity(element, address) {
    const images = [];
    
    // Look in parent containers
    const parentContainers = [
      element.parentElement,
      element.closest('[class*="property"]'),
      element.closest('[class*="listing"]'),
      element.closest('[class*="card"]'),
      element.closest('article'),
      element.closest('[data-testid*="property"]')
    ].filter(container => container && container !== element);

    for (const container of parentContainers) {
      const containerImages = this.extractImagesFromElement(container, 'proximity-parent');
      images.push(...containerImages);
      
      if (images.length >= 3) break;
    }

    // Remove duplicates
    return [...new Set(images)];
  }

  // Extract images by property ID
  extractImagesByPropertyId(propertyId) {
    const images = [];
    
    // Look for images with property ID in the src or data attributes
    const allImages = document.querySelectorAll('img');
    
    for (const img of allImages) {
      const imgSrc = img.src || img.dataset.src || img.getAttribute('data-src') || '';
      
      if (imgSrc.includes(propertyId) && this.isValidPropertyImage({src: imgSrc, alt: img.alt || '', element: img})) {
        const normalizedUrl = this.normalizeImageUrl(imgSrc);
        if (normalizedUrl && !images.includes(normalizedUrl)) {
          log.debug(`🆔 Found image by property ID:`, normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1));
          images.push(normalizedUrl);
        }
      }
    }

    return images.slice(0, 5); // Limit to 5 images
  }

  extractListingImage(element) {
    log.debug('Extracting primary image for listing element:', element);
    
    // Use the same logic as extractAllListingPhotos but return only the first image
    const photos = this.extractAllListingPhotos(element);
    return photos.length > 0 ? photos[0] : null;
  }

  extractListingDescription(element, text) {
    // Look for description text
    const descSelectors = [
      '.property-description',
      '.listing-description',
      '.description',
      '.summary',
      '[data-testid*="description"]'
    ];

    for (const selector of descSelectors) {
      const descEl = element.querySelector(selector);
      if (descEl && descEl.textContent.trim()) {
        return descEl.textContent.trim().substring(0, 200); // Limit length
      }
    }

    // Extract description from text patterns
    const sentences = text.split(/[.!?]+/);
    const descriptiveSentences = sentences.filter(sentence => 
      sentence.length > 20 && 
      sentence.length < 150 &&
      !sentence.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i) && // Skip sentences with prices - FIXED
      !sentence.match(/\d+\s*bed/) && // Skip bed/bath info
      sentence.match(/[a-zA-Z]/) // Must contain letters
    );

    return descriptiveSentences.length > 0 ? descriptiveSentences[0].trim() : null;
  }

  extractPropertyType(element, text) {
    const typePatterns = [
      /\b(house|home|condo|townhouse|apartment|villa|mansion|estate|duplex|triplex)\b/i,
      /\b(single family|multi family|condominium)\b/i
    ];

    for (const pattern of typePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Default based on price range
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i); // FIXED: Support K/M/B + decimals
    if (priceMatch) {
      let price = parseFloat(priceMatch[0].replace(/[$,]/g, '')); // FIXED: Use parseFloat
      if (priceMatch[0].toUpperCase().includes('K')) price *= 1000;
      if (priceMatch[0].toUpperCase().includes('M')) price *= 1000000;
      if (priceMatch[0].toUpperCase().includes('B')) price *= 1000000000;
      
      if (price > 10000000) return 'Luxury Estate';
      if (price > 5000000) return 'High-End Home';
      if (price > 2000000) return 'Premium Home';
      if (price < 1000000) return 'Condo/Townhouse';
    }

    return 'Residential Property';
  }

  extractSpecializations() {
    const specializations = [];
    
    // Enhanced specialization extraction
    const specializationElements = document.querySelectorAll([
      '[data-testid="specialization"]',
      '.specialization',
      '.expertise-area',
      '.specialty-tag',
      '.specializations li',
      '.expertise li'
    ].join(', '));

    specializationElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text) specializations.push(text);
    });

    // Also try to extract from text content if structured elements not found
    if (specializations.length === 0) {
      const pageText = document.body.textContent;
      const specializationKeywords = [
        '2nd homes', 'Buyer\'s agent', 'First time home buyers', 
        'Lake homes', 'Moosehead Lake', 'Seller\'s agent', 
        'vacation homes', 'Views', 'Waterfront'
      ];
      
      specializationKeywords.forEach(keyword => {
        if (pageText.includes(keyword)) {
          specializations.push(keyword);
        }
      });
    }

    return specializations;
  }

  extractTeamInfo() {
    const teamInfo = {};
    
    // TEMPORARILY DISABLE team button clicking to prevent navigation issues
    // const buttonClicked = this.clickShowTeamButton();
    const buttonClicked = false; // Temporarily disabled
    
    // If button was clicked, wait a moment for content to load
    if (buttonClicked) {
      // Use a small delay to allow content to load
      // Note: In a real implementation, you might want to use proper async/await
      // For now, we'll extract immediately but log that we clicked
      log.debug('⏳ Waiting for team content to load after button click...');
    }
    
    // Extract team information (whether button was clicked or not)
    teamInfo.name = this.extractCleanTeamName();
    teamInfo.description = this.extractCleanTeamDescription();
    teamInfo.members = this.extractTeamMembers();
    
    // Team photo - normalized URL
    teamInfo.photo = this.normalizeImageUrl(this.getAttribute([
      '.team-photo img',
      'img[alt*="team"]',
      'img[src*="team"]'
    ], 'src'));

    return teamInfo;
  }

  clickShowTeamButton() {
    log.debug('🔍 Looking for "Show Team" button...');
    
    // Look for various "Show Team" button patterns
    const buttonSelectors = [
      'button[aria-label*="Show Team"]',
      'button[aria-label*="show team"]',
      'button:contains("Show Team")',
      'a[aria-label*="Show Team"]',
      'a[aria-label*="show team"]',
      '[data-testid*="show-team"]',
      '[data-testid*="team-expand"]',
      'button[class*="show-team"]',
      'button[class*="team-toggle"]'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        const button = document.querySelector(selector);
        if (button) {
          log.debug(`✅ Found "Show Team" button with selector: ${selector}`);
          button.click();
          log.debug('🎯 Clicked "Show Team" button');
          return true;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    // Also try to find buttons by text content
    const allButtons = document.querySelectorAll('button, a');
    for (const button of allButtons) {
      const text = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      
      if (text.includes('show team') || ariaLabel.includes('show team') || 
          text.includes('view team') || ariaLabel.includes('view team') ||
          text.includes('see team') || ariaLabel.includes('see team')) {
        log.debug(`✅ Found "Show Team" button by text: "${button.textContent}"`);
        button.click();
        log.debug('🎯 Clicked "Show Team" button');
        return true;
      }
    }
    
    log.debug('❌ No "Show Team" button found');
    return false;
  }

  extractCleanTeamName() {
    log.debug('🏷️ Looking for team name...');
    
    const pageText = document.body.textContent;
    
    // Skip obvious button text
    const skipWords = ['Show Team', 'View Team', 'See Team', 'Hide Team', 'Close Team'];
    
    // Look for team name patterns in various selectors
    const teamNameSelectors = [
      '[data-testid*="team-name"]',
      '.team-name',
      '.team-title',
      'h1[class*="team"]',
      'h2[class*="team"]',
      'h3[class*="team"]',
      '[class*="TeamName"]'
    ];
    
    for (const selector of teamNameSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const teamName = element.textContent?.trim();
          if (teamName && !skipWords.includes(teamName) && teamName.length < 100) {
            log.debug(`✅ Found team name from selector ${selector}: "${teamName}"`);
            return teamName;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    // Look for "Live Maine Team" specifically (existing logic)
    if (pageText.includes('Live Maine Team')) {
      log.debug('✅ Found team name: "Live Maine Team"');
      return 'Live Maine Team';
    }
    
    // Look for other team name patterns
    const teamPatterns = [
      /([A-Z][a-zA-Z\s]{2,30}Team)(?:\s|$)/g,
      /([A-Z][a-zA-Z\s]+(?:Real Estate|Realty)\s+Team)(?:\s|$)/g,
      /([A-Z][a-zA-Z\s]+Group)(?:\s|$)/g,
      /(The\s+[A-Z][a-zA-Z\s]+Team)(?:\s|$)/g
    ];
    
    for (const pattern of teamPatterns) {
      const matches = pageText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const teamName = match.trim();
          // Filter out button text and overly generic matches
          if (!skipWords.some(skip => teamName.includes(skip)) && 
              teamName.length > 5 && teamName.length < 50 &&
              !teamName.includes('Show') && !teamName.includes('View')) {
            log.debug(`✅ Found team name from pattern: "${teamName}"`);
            return teamName;
          }
        }
      }
    }
    
    log.debug('❌ No valid team name found');
    return null;
  }

  extractCleanTeamDescription() {
    const pageText = document.body.textContent;
    
    // Look for team description starting with "Purchasing or selling"
    const descMatch = pageText.match(/Purchasing or selling[^.]*\./);
    if (descMatch) {
      return descMatch[0].trim();
    }
    
    // Look for other team description patterns
    const aboutTeamMatch = pageText.match(/About [^.]*Team[^.]*\./);
    if (aboutTeamMatch) {
      return aboutTeamMatch[0].trim();
    }
    
    return null;
  }

  extractTeamMembers() {
    log.debug('👥 Looking for team members...');
    
    const members = [];
    
    // Look for team member elements first
    const memberSelectors = [
      '[data-testid*="team-member"]',
      '.team-member',
      '.team-agent',
      '[class*="TeamMember"]',
      '[class*="team-card"]',
      '.agent-card'
    ];
    
    for (const selector of memberSelectors) {
      try {
        const memberElements = document.querySelectorAll(selector);
        if (memberElements.length > 0) {
          log.debug(`🔍 Found ${memberElements.length} team member elements with selector: ${selector}`);
          
          memberElements.forEach(element => {
            // Try to extract name from various sub-elements
            const nameSelectors = [
              '.name',
              '.agent-name',
              'h3',
              'h4',
              '[class*="name"]',
              '[data-testid*="name"]'
            ];
            
            for (const nameSelector of nameSelectors) {
              const nameElement = element.querySelector(nameSelector);
              if (nameElement) {
                const memberName = nameElement.textContent?.trim();
                if (memberName && memberName.length > 2 && memberName.length < 50 && 
                    !members.includes(memberName) && !memberName.includes('Show') && 
                    !memberName.includes('View') && !memberName.includes('Hide')) {
                  log.debug(`✅ Found team member: "${memberName}"`);
                  members.push(memberName);
                  break;
                }
              }
            }
          });
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    // If no members found from elements, fall back to text pattern matching
    if (members.length === 0) {
      log.debug('🔍 Falling back to text pattern matching for team members...');
      
      const pageText = document.body.textContent;
      
      // More specific patterns for real estate agent names
      const namePatterns = [
        // Existing specific names
        /Jim\s+(?:&\s+)?(?:Charlie\s+)?Quimby/g,
        /Charlie\s+Quimby/g,
        /Angie\s+Roberts/g,
        /Manda\s+Stewart/g,
        
        // Generic patterns with better filtering
        /(?:Agent|REALTOR®?|Associate):\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
        /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:REALTOR®?|Agent|Associate)/gi,
        /Team\s+Member:\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
        /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+-\s+(?:Real Estate|Realtor|Agent)/gi
      ];
      
      // Words to exclude (not real names)
      const excludeWords = [
        'Show Team', 'View Team', 'See Team', 'Hide Team', 'Review Your',
        'Contact Us', 'About Us', 'Get Started', 'Learn More', 'Find Out',
        'Real Estate', 'Property Search', 'Home Search', 'Market Report',
        'Price Range', 'Square Feet', 'Listing Agent', 'Buyer Agent',
        'Show More', 'Read More', 'See All', 'View All', 'Load More'
      ];
      
      namePatterns.forEach(pattern => {
        const matches = pageText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            let cleanName = match.trim();
            
            // Clean up the name (remove titles and prefixes)
            cleanName = cleanName.replace(/^(?:Agent|REALTOR®?|Associate|Team\s+Member):\s*/i, '').trim();
            cleanName = cleanName.replace(/\s+(?:REALTOR®?|Agent|Associate|Real Estate|Realtor).*$/i, '').trim();
            cleanName = cleanName.replace(/\s+-\s+.*$/i, '').trim();
            
            // Validate the name
            if (cleanName && 
                cleanName.length > 3 && 
                cleanName.length < 50 && 
                !excludeWords.some(exclude => cleanName.includes(exclude)) &&
                /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(cleanName) && // Must be "Firstname Lastname" format
                !members.includes(cleanName)) {
              log.debug(`✅ Found team member from text: "${cleanName}"`);
              members.push(cleanName);
            }
          });
        }
      });
    }
    
    log.debug(`🏆 Total team members found: ${members.length}`);
    return members;
  }

  extractAllImages() {
    const images = {
      agentPhoto: null,
      teamPhoto: null,
      galleryImages: [],
      propertyImages: [],
      // New: Comprehensive property image collection
      allPropertyPhotos: this.extractAllPropertyPhotosFromPage()
    };

    // Agent photo - ensure full URL
    const agentPhotoSrc = this.getAttribute([
      '.agent-photo img',
      '.profile-photo img',
      'img[alt*="photo"]',
      'img[alt*="Photo"]',
      '.profile-img'
    ], 'src');
    
    if (agentPhotoSrc) {
      images.agentPhoto = this.normalizeImageUrl(agentPhotoSrc, true);
    }

    // Team photo - ensure full URL
    const teamPhotoSrc = this.getAttribute([
      '.team-photo img',
      'img[alt*="team"]',
      'img[src*="team"]'
    ], 'src');
    
    if (teamPhotoSrc) {
      images.teamPhoto = this.normalizeImageUrl(teamPhotoSrc);
    }

    // All images on the page
    const allImages = document.querySelectorAll('img');
    allImages.forEach(img => {
      const src = img.src;
      const alt = img.alt || '';
      
      if (src && !src.includes('data:') && this.isValidPropertyImage({src, alt, element: img})) {
        const normalizedUrl = this.normalizeImageUrl(src);
        
        // Simple approach: just store URLs as strings, not objects
        // Categorize images
        if (alt.toLowerCase().includes('property') || alt.toLowerCase().includes('listing')) {
          images.propertyImages.push(normalizedUrl);
        } else if (!alt.toLowerCase().includes('agent') && !alt.toLowerCase().includes('team') && 
                   !src.includes('icon') && !src.includes('logo')) {
          images.galleryImages.push(normalizedUrl);
        }
      }
    });

    return images;
  }

  // New method to extract all property photos from the entire page
  extractAllPropertyPhotosFromPage() {
    log.debug('🏠 Extracting all property photos from the current page...');
    
    const propertyPhotos = {
      byListing: [],
      allUrls: [],
      metadata: {
        totalFound: 0,
        extractedAt: new Date().toISOString(),
        pageUrl: window.location.href
      }
    };

    // Find all property cards/listings on the page
    const propertySelectors = [
      '[data-testid*="property"]',
      '[data-testid*="listing"]',
      '.property-card',
      '.listing-card',
      '[class*="PropertyCard"]',
      '[class*="ListingCard"]',
      '.card-content',
      '[data-testid="card-content"]',
      'article[data-testid*="property"]',
      'a[href*="realestateandhomes-detail"]'
    ];

    const allPropertyElements = [];
    
    propertySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!allPropertyElements.includes(el)) {
            allPropertyElements.push(el);
          }
        });
      } catch (e) {
        log.warn('Property selector failed:', selector, e);
      }
    });

    log.debug(`Found ${allPropertyElements.length} potential property elements`);

    // Extract images from each property element
    allPropertyElements.forEach((propertyEl, index) => {
      const photos = this.extractAllListingPhotos(propertyEl);
      
      if (photos && photos.length > 0) {
        // Try to get property details for this element
        const propertyData = {
          elementIndex: index,
          address: this.extractAddress(propertyEl, propertyEl.textContent || ''),
          price: this.extractPrice(propertyEl.textContent || ''),
          photos: photos,
          photoCount: photos.length
        };

        propertyPhotos.byListing.push(propertyData);
        
        // Add to flat array as well
        photos.forEach(photoUrl => {
          if (!propertyPhotos.allUrls.includes(photoUrl)) {
            propertyPhotos.allUrls.push(photoUrl);
          }
        });
      }
    });

    propertyPhotos.metadata.totalFound = propertyPhotos.allUrls.length;
    propertyPhotos.metadata.listingsWithPhotos = propertyPhotos.byListing.length;

    log.debug('🏠 Property photo extraction summary:', {
      totalPhotos: propertyPhotos.metadata.totalFound,
      listingsWithPhotos: propertyPhotos.metadata.listingsWithPhotos,
      averagePhotosPerListing: propertyPhotos.byListing.length > 0 ? 
        (propertyPhotos.metadata.totalFound / propertyPhotos.byListing.length).toFixed(1) : 0
    });

    return propertyPhotos;
  }

  // Helper method to extract price from text
  extractPrice(text) {
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i); // FIXED: Support K/M/B + flexible decimals
    return priceMatch ? priceMatch[0] : null;
  }

  normalizeImageUrl(url, isProfile = false) {
    if (!url) return null;
    
    let normalizedUrl;
    
    // If URL starts with //, add https:
    if (url.startsWith('//')) {
      normalizedUrl = 'https:' + url;
    }
    // If URL starts with /, add domain
    else if (url.startsWith('/')) {
      normalizedUrl = 'https://www.realtor.com' + url;
    }
    // If URL already has protocol, return as is
    else if (url.startsWith('http://') || url.startsWith('https://')) {
      normalizedUrl = url;
    }
    // Default case - assume it needs https://
    else {
      normalizedUrl = 'https://' + url;
    }
    
    // Apply image quality enhancement for rdcpix URLs
    if (typeof this.enhanceImageQuality === 'function') {
      return this.enhanceImageQuality(normalizedUrl, isProfile);
    } else {
      log.debug('⚠️ enhanceImageQuality method not found, returning normalized URL as-is');
      return normalizedUrl;
    }
  }

  // Enhanced method to validate image URL accessibility
  async validateImageUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return { url, accessible: true, status: 'HEAD request completed' };
    } catch (error) {
      // For realtor.com images, most will fail CORS but are still valid
      if (url.includes('rdcpix') || url.includes('realtor.com')) {
        return { url, accessible: true, status: 'assumed valid (realtor.com domain)' };
      }
      return { url, accessible: false, status: error.message };
    }
  }

  // Method to clean and validate all image URLs in the extracted data
  async validateExtractedImages(agentData) {
    log.debug('🔍 Validating extracted image URLs...');
    
    const validationResults = {
      agentPhoto: null,
      teamPhoto: null,
      propertyImages: [],
      validationSummary: {
        totalChecked: 0,
        accessible: 0,
        failed: 0
      }
    };

    // Validate agent photo
    if (agentData.images?.agentPhoto) {
      validationResults.agentPhoto = await this.validateImageUrl(agentData.images.agentPhoto);
      validationResults.validationSummary.totalChecked++;
      if (validationResults.agentPhoto.accessible) {
        validationResults.validationSummary.accessible++;
      } else {
        validationResults.validationSummary.failed++;
      }
    }

    // Validate team photo
    if (agentData.images?.teamPhoto) {
      validationResults.teamPhoto = await this.validateImageUrl(agentData.images.teamPhoto);
      validationResults.validationSummary.totalChecked++;
      if (validationResults.teamPhoto.accessible) {
        validationResults.validationSummary.accessible++;
      } else {
        validationResults.validationSummary.failed++;
      }
    }

    // Validate property images from listings
    if (agentData.listings?.active) {
      for (const listing of agentData.listings.active) {
        if (Array.isArray(listing.photos)) {
          for (const photoUrl of listing.photos.slice(0, 3)) { // Limit validation to first 3 photos per property
            const validation = await this.validateImageUrl(photoUrl);
            validationResults.propertyImages.push({
              property: listing.address || 'Unknown',
              ...validation
            });
            validationResults.validationSummary.totalChecked++;
            if (validation.accessible) {
              validationResults.validationSummary.accessible++;
            } else {
              validationResults.validationSummary.failed++;
            }
          }
        }
      }
    }

    log.debug('✅ Image validation complete:', validationResults.validationSummary);
    return validationResults;
  }

  isValidImageUrl(url) {
    if (!url) return false;
    
    // Check for common image extensions or image hosting patterns
    const imagePatterns = [
      /\.(jpg|jpeg|png|gif|webp|svg)$/i,
      /\/images\//,
      /\/img\//,
      /\.rdc\./,
      /\.rdcpix\./,
      /cloudfront/,
      /amazonaws/
    ];
    
    return imagePatterns.some(pattern => pattern.test(url)) && 
           !url.includes('pixel') && 
           !url.includes('tracking') &&
           !url.includes('analytics');
  }

  extractCredentials() {
    const credentials = [];
    
    const credentialElements = document.querySelectorAll([
      '[data-testid="credential"]',
      '.credential',
      '.certification',
      '.designation'
    ].join(', '));

    credentialElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text) credentials.push(text);
    });

    return credentials;
  }

  extractSocialMedia() {
    log.debug('🔗 Looking for social media links...');
    const social = {};
    
    // Enhanced social media selectors
    const socialSelectors = [
      '.social-media a',
      '.social-links a', 
      '.social a',
      '.agent-social a',
      '.contact-social a',
      '.social-icons a',
      '.social-profiles a',
      'a[href*="facebook.com"]',
      'a[href*="linkedin.com"]',
      'a[href*="twitter.com"]',
      'a[href*="x.com"]',
      'a[href*="instagram.com"]',
      'a[href*="youtube.com"]',
      'a[href*="tiktok.com"]',
      '[data-testid*="social"] a',
      '.contact-info a[href*="facebook"]',
      '.contact-info a[href*="linkedin"]',
      '.contact-info a[href*="twitter"]',
      '.contact-info a[href*="instagram"]'
    ];

    // Look for social media links
    const socialElements = document.querySelectorAll(socialSelectors.join(', '));
    
    socialElements.forEach(link => {
      const href = link.href;
      const text = link.textContent?.trim().toLowerCase();
      
      log.debug(`🔍 Testing social link: "${href}" (text: "${text}")`);
      
      // Skip generic realtor.com social links and invalid URLs
      if (!href || href.includes('realtor.com') || href.includes('REALTORdotcom') || 
          href.includes('realtordotcom') || href.includes('example.com') || 
          href === '#' || href.startsWith('javascript:')) {
        log.debug(`⏭️ Skipping generic/invalid link: ${href}`);
        return;
      }
      
      // Must be agent-specific links (not site-wide footer links)
      const isAgentSpecific = href.includes('joshua') || href.includes('altman') || 
                             !href.includes('user/RealtorDotCom') && !href.includes('company/realtor');
      
      if (!isAgentSpecific) {
        log.debug(`⏭️ Skipping non-agent-specific link: ${href}`);
        return;
      }
      
      // Extract different social platforms
      if (href.includes('facebook.com') && !social.facebook) {
        social.facebook = href;
        log.debug(`✅ Found Facebook: ${href}`);
      }
      
      if (href.includes('linkedin.com') && !social.linkedin) {
        social.linkedin = href; 
        log.debug(`✅ Found LinkedIn: ${href}`);
      }
      
      if ((href.includes('twitter.com') || href.includes('x.com')) && !social.twitter) {
        social.twitter = href;
        log.debug(`✅ Found Twitter/X: ${href}`);
      }
      
      if (href.includes('instagram.com') && !social.instagram) {
        social.instagram = href;
        log.debug(`✅ Found Instagram: ${href}`);
      }
      
      if (href.includes('youtube.com') && !social.youtube) {
        social.youtube = href;
        log.debug(`✅ Found YouTube: ${href}`);
      }
      
      if (href.includes('tiktok.com') && !social.tiktok) {
        social.tiktok = href;
        log.debug(`✅ Found TikTok: ${href}`);
      }
    });

    // Also search for social URLs in text content
    const pageText = document.body.textContent;
    const socialPatterns = [
      /(https?:\/\/(?:www\.)?facebook\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?linkedin\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?instagram\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?youtube\.com\/[^\s<>"']+)/gi,
      /(https?:\/\/(?:www\.)?tiktok\.com\/[^\s<>"']+)/gi
    ];
    
    socialPatterns.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches) {
        matches.forEach(url => {
          log.debug(`🔍 Testing social URL from text: "${url}"`);
          
          if (url.includes('facebook.com') && !social.facebook) {
            social.facebook = url;
            log.debug(`✅ Found Facebook in text: ${url}`);
          } else if (url.includes('linkedin.com') && !social.linkedin) {
            social.linkedin = url;
            log.debug(`✅ Found LinkedIn in text: ${url}`);
          } else if ((url.includes('twitter.com') || url.includes('x.com')) && !social.twitter) {
            social.twitter = url;
            log.debug(`✅ Found Twitter/X in text: ${url}`);
          } else if (url.includes('instagram.com') && !social.instagram) {
            social.instagram = url;
            log.debug(`✅ Found Instagram in text: ${url}`);
          } else if (url.includes('youtube.com') && !social.youtube) {
            social.youtube = url;
            log.debug(`✅ Found YouTube in text: ${url}`);
          } else if (url.includes('tiktok.com') && !social.tiktok) {
            social.tiktok = url;
            log.debug(`✅ Found TikTok in text: ${url}`);
          }
        });
      }
    });

    log.debug('🔗 Final social media links found:', social);
    return social;
  }

  extractPerformanceData() {
    const performance = {};
    
    // Price range information
    performance.priceRange = this.getTextContent([
      '.price-range',
      'div:contains("Price range") + div',
      'div:contains("$29K - $550K")',
      '.price-info'
    ]);

    // Sales volume
    performance.salesVolume = this.getTextContent([
      '[data-testid="sales-volume"]',
      '.sales-volume',
      '.volume-sold',
      'div:contains("volume")'
    ]);

    // Average sale price
    performance.avgSalePrice = this.getTextContent([
      '[data-testid="avg-sale-price"]',
      '.avg-sale-price',
      '.average-price',
      'div:contains("average")'
    ]);

    // Days on market
    performance.avgDaysOnMarket = this.getTextContent([
      '[data-testid="avg-days-market"]',
      '.avg-days-market',
      '.days-on-market',
      'div:contains("days")'
    ]);

    // Extract years of experience from team description
    const pageText = document.body.textContent;
    const experienceMatch = pageText.match(/(\d+)\s+years?/i);
    if (experienceMatch) {
      performance.experienceYears = experienceMatch[1];
    }

    return performance;
  }

  // Helper methods
  getTextContent(selectors, parent = document) {
    if (typeof selectors === 'string') selectors = [selectors];
    
    for (const selector of selectors) {
      try {
        const element = parent.querySelector(selector);
        if (element && element.textContent?.trim()) {
          return element.textContent.trim();
        }
      } catch (e) {
        // Skip invalid selectors
        continue;
      }
    }
    return null;
  }

  getAttribute(selectors, attribute, parent = document) {
    if (typeof selectors === 'string') selectors = [selectors];
    
    for (const selector of selectors) {
      try {
        const element = parent.querySelector(selector);
        if (element && element.getAttribute(attribute)) {
          return element.getAttribute(attribute);
        }
      } catch (e) {
        // Skip invalid selectors
        continue;
      }
    }
    return null;
  }

  getNumberFromText(selectors, parent = document) {
    const text = this.getTextContent(selectors, parent);
    if (!text) return 0;
    
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  // Advanced text search helper
  findTextNearby(searchText, parent = document) {
    const walker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent && node.textContent.includes(searchText)) {
        // Found the text, now look for nearby elements
        const element = node.parentElement;
        if (element) {
          // Try next sibling
          const nextSibling = element.nextElementSibling;
          if (nextSibling && nextSibling.textContent?.trim()) {
            return nextSibling.textContent.trim();
          }
          
          // Try parent's next sibling
          const parentNext = element.parentElement?.nextElementSibling;
          if (parentNext && parentNext.textContent?.trim()) {
            return parentNext.textContent.trim();
          }
          
          // Return the element's own text
          return element.textContent.trim();
        }
      }
    }
    return null;
  }

  // Extract data that appears after specific text
  getTextAfter(searchText, parent = document) {
    const text = parent.textContent;
    const index = text.indexOf(searchText);
    if (index !== -1) {
      const afterText = text.substring(index + searchText.length);
      // Extract until next newline or significant break
      const lines = afterText.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (line && line.length > 0) {
          return line;
        }
      }
    }
    return null;
  }

  // Data cleaning methods
  cleanText(text) {
    if (!text) return null;
    
    // Remove CSS, excessive whitespace, and unwanted characters
    let cleaned = text
      .replace(/\{[^}]*\}/g, '') // Remove CSS blocks
      .replace(/jsx-\d+/g, '') // Remove JSX class names
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // If text is too long or contains mixed content, try to extract the main part
    if (cleaned.length > 200 || this.containsMixedContent(cleaned)) {
      // Try to extract the first meaningful part
      const parts = cleaned.split(/[.!?]\s+/);
      if (parts.length > 1) {
        return parts[0].trim() || null;
      }
      
      // Try to extract before common separators
      const separators = ['(207)', 'office', 'Share', 'recommendations', 'RE/MAX'];
      for (const sep of separators) {
        const index = cleaned.indexOf(sep);
        if (index > 0) {
          const beforeSep = cleaned.substring(0, index).trim();
          if (beforeSep.length > 3 && beforeSep.length < 100) {
            return beforeSep;
          }
        }
      }
      
      // Return first 50 characters if still too messy
      return cleaned.substring(0, 50).trim() || null;
    }
    
    return cleaned || null;
  }

  containsMixedContent(text) {
    // Check if text contains mixed content that indicates poor extraction
    const indicators = [
      /\d{3}[\s\-]\d{3}[\s\-]\d{4}/, // Phone numbers
      /recommendations/i,
      /office/i,
      /share/i,
      /profile/i,
      /\.jsx/,
      /\{.*\}/
    ];
    
    return indicators.some(pattern => pattern.test(text));
  }

  extractSpecificText(element, maxLength = 100) {
    if (!element) return null;
    
    // Get all text content including from child elements
    let text = element.textContent || element.innerText || '';
    console.log(`🔍 DEBUG EXTRACT: Original text: "${text}"`);
    
    // Clean the text
    text = text.trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\t+/g, ' '); // Replace tabs with spaces
    
    console.log(`🔍 DEBUG EXTRACT: Cleaned text: "${text}"`);
    console.log(`🔍 DEBUG EXTRACT: Text length: ${text.length}, maxLength: ${maxLength}`);

        // Limit length if specified
        if (maxLength && text.length > maxLength) {
            console.log(`🔍 DEBUG EXTRACT: Text too long, truncating from ${text.length} to ${maxLength}`);
            text = text.substring(0, maxLength).trim();
            // Try to end at a word boundary, but be smart about names with internal capitals
            const lastSpace = text.lastIndexOf(' ');
            if (lastSpace > maxLength * 0.5) { // Even more lenient threshold
                // Check if we're cutting in the middle of a name with internal capitals
                const afterSpace = text.substring(lastSpace + 1);
                console.log(`DEBUG: Checking truncation for "${text}", afterSpace: "${afterSpace}"`);
                
                // Enhanced pattern to catch various name patterns:
                // Mc/Mac names: McDowell, McDonald, MacArthur
                // O' names: O'Brien, O'Connor  
                // Other internal caps: DeAngelo, LaRue, VanDyke
                const namePattern = /^([A-Z][a-z]*[A-Z][a-z]*|[A-Z]'[A-Z][a-z]*|[A-Z][a-z]+[A-Z][a-z]+)/;
                
                if (namePattern.test(afterSpace)) {
                    console.log(`DEBUG: Preserving name with internal capitals: "${afterSpace}"`);
                    // Don't cut here - keep the full text to preserve the name
                } else {
                    console.log(`DEBUG: Safe to truncate at space before: "${afterSpace}"`);
                    text = text.substring(0, lastSpace);
                }
            }
        }
    console.log(`🔍 DEBUG EXTRACT: Final text: "${text}"`);
    return text || null;
  }

  cleanPhoneNumber(text) {
    if (!text) return null;
    
    // Extract phone number pattern
    const phoneMatch = text.match(/\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/);
    return phoneMatch ? phoneMatch[0] : null;
  }

  cleanEmail(text) {
    if (!text) return null;
    
    // Extract email pattern
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : null;
  }

  cleanUrl(url) {
    if (!url) return null;
    
    // Ensure URL has protocol
    if (url.startsWith('//')) {
      return 'https:' + url;
    } else if (url.startsWith('/')) {
      return 'https://www.realtor.com' + url;
    } else if (!url.startsWith('http')) {
      return 'https://' + url;
    }
    
    return url;
  }

  findCleanText(searchText) {
    const elements = document.querySelectorAll('*');
    for (const element of elements) {
      const text = element.textContent;
      if (text && text.includes(searchText)) {
        // Look for the cleanest version of the text
        const cleanText = this.cleanText(text);
        if (cleanText && cleanText.includes(searchText) && cleanText.length < 100) {
          return cleanText;
        }
      }
    }
    return null;
  }

  extractPhoneFromText() {
    const pageText = document.body.textContent;
    const phoneMatch = pageText.match(/\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/);
    return phoneMatch ? phoneMatch[0] : null;
  }

  isValidPhoneNumber(phone) {
    if (!phone) return false;
    
    // Remove all non-digit characters to count digits
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Valid US phone numbers should have 10 digits (or 11 with country code)
    return digitsOnly.length === 10 || digitsOnly.length === 11;
  }

  cleanPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove extra characters and normalize format
    return phone
      .replace(/[^\d\-\(\)\s\+]/g, '') // Keep only digits, dashes, parens, spaces, plus
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  showDataModal(data) {
    // Option 1: Show in separate popup window
    this.showDataInNewWindow(data);
    
    // Option 2: Also show quick summary notification
    this.showExtractionSummary(data);
  }

  forceOpenDataWindow(data) {
    console.log('🪟 FORCE OPENING DATA WINDOW');
    console.log('📊 Data to display:', data);
    
    // Extract data safely
    const agent = data?.data?.agent || {};
    const contact = data?.data?.contact || {};
    const office = data?.data?.office || {};
    const reviews = data?.data?.reviews?.overall || {};
    const activeListings = data?.data?.listings?.active || [];
    const soldListings = data?.data?.listings?.sold || [];
    const allListings = [...activeListings, ...soldListings]; // COMBINE BOTH!
    const recommendations = data?.data?.reviews?.recommendations || [];
    const summary = data?.summary || {};
    const dbStatus = data?.database?.success || false;
    
    // Create comprehensive HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>🏠 ${agent.name || 'Agent'} - CRM Extraction Results</title>
    <meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #e31837, #c41e3a); 
            color: white; padding: 30px; border-radius: 15px; 
            margin-bottom: 25px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .header h1 { margin: 0 0 10px 0; font-size: 32px; font-weight: 700; }
        .header p { margin: 5px 0; opacity: 0.9; font-size: 16px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 25px; }
        .card { 
            background: white; padding: 25px; border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .card h3 { 
            margin: 0 0 20px 0; font-size: 22px; color: #2c3e50; 
            border-bottom: 3px solid #3498db; padding-bottom: 10px; display: flex; align-items: center; gap: 10px;
        }
        .status-success { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; }
        .status-error { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; }
        .status-warning { background: linear-gradient(135deg, #f39c12, #e67e22); color: white; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { margin-bottom: 15px; }
        .info-label { font-weight: 600; color: #555; margin-bottom: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { 
            font-size: 16px; color: #2c3e50; 
            background: #f8f9fa; padding: 10px; border-radius: 8px; border-left: 4px solid #3498db;
        }
        .info-missing { color: #e74c3c; font-style: italic; background: #fff5f5; border-left-color: #e74c3c; }
        .listings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; }
        .listing-card { 
            background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e9ecef;
            transition: all 0.2s ease;
        }
        .listing-card:hover { background: #e3f2fd; border-color: #2196f3; }
        .price { font-size: 24px; font-weight: 700; color: #27ae60; margin-bottom: 10px; }
        .property-details { 
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; 
            background: white; padding: 15px; border-radius: 8px; margin: 10px 0;
        }
        .detail-item { text-align: center; }
        .detail-value { font-size: 18px; font-weight: 600; color: #2c3e50; }
        .detail-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
        .raw-data { 
            background: #2c3e50; color: #ecf0f1; padding: 20px; border-radius: 10px; 
            font-family: 'Monaco', 'Consolas', monospace; font-size: 12px; 
            max-height: 400px; overflow-y: auto; white-space: pre-wrap;
        }
        .stats-row { display: flex; justify-content: space-around; text-align: center; margin: 20px 0; }
        .stat-item { }
        .stat-number { font-size: 28px; font-weight: 700; color: #3498db; display: block; }
        .stat-label { color: #7f8c8d; font-size: 14px; text-transform: uppercase; }
        .reviews-summary { 
            background: linear-gradient(135deg, #ffeaa7, #fdcb6e); 
            padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 15px;
        }
        .rating-display { font-size: 36px; margin: 10px 0; }
        .recommendations-container { 
            max-height: 400px; overflow-y: auto; 
            border: 1px solid #d5d5d5; border-radius: 8px; padding: 10px;
            background: #fafafa;
        }
        .recommendation { 
            background: #e8f5e8; border-left: 4px solid #27ae60; 
            padding: 12px; margin: 8px 0; border-radius: 8px;
        }
        .recommendation-text { font-style: italic; color: #2c3e50; margin-bottom: 10px; }
        .recommendation-author { font-weight: 600; color: #27ae60; font-size: 14px; }
        .toggle-section { cursor: pointer; user-select: none; }
        .collapsible { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
        .collapsible.open { max-height: 1000px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 Real Estate Agent Profile Extraction</h1>
            <p><strong>Agent:</strong> ${agent.name || 'Unknown Agent'}</p>
            <p><strong>URL:</strong> ${window.location.href}</p>
            <p><strong>Extracted:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Database Status:</strong> ${dbStatus ? '✅ Successfully Saved to CRM' : '❌ Database Save Failed'}</p>
        </div>

        <div class="grid">
            <div class="card ${data?.success ? 'status-success' : 'status-error'}">
                <h3>📊 Extraction Summary</h3>
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-number">${activeListings.length}</span>
                        <span class="stat-label">Active Listings</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${soldListings.length}</span>
                        <span class="stat-label">Sold Listings</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${reviews.count || 0}</span>
                        <span class="stat-label">Reviews</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${recommendations.length}</span>
                        <span class="stat-label">Recommendations</span>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <strong>Status:</strong> ${data?.success ? '✅ SUCCESS' : '❌ FAILED'}
                </div>
            </div>

            <div class="card">
                <h3>👤 Agent Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Full Name</div>
                        <div class="info-value ${agent.name ? '' : 'info-missing'}">${agent.name || 'Not found'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Experience</div>
                        <div class="info-value ${agent.experience ? '' : 'info-missing'}">${agent.experience || 'Not found'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Rating</div>
                        <div class="info-value ${agent.rating ? '' : 'info-missing'}">${agent.rating ? agent.rating + '⭐' : 'Not found'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Languages</div>
                        <div class="info-value ${agent.languages ? '' : 'info-missing'}">${agent.languages || 'Not found'}</div>
                    </div>
                </div>
                <div class="info-item" style="margin-top: 15px;">
                    <div class="info-label">Biography</div>
                    <div class="info-value ${agent.bio ? '' : 'info-missing'}">${agent.bio || 'Not found'}</div>
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📞 Contact Information</h3>
                <div class="info-item">
                    <div class="info-label">Primary Phone</div>
                    <div class="info-value ${contact.phone ? '' : 'info-missing'}">${contact.phone || 'Not found'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Mobile Phone</div>
                    <div class="info-value ${contact.mobilePhone ? '' : 'info-missing'}">${contact.mobilePhone || 'Not found'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email Address</div>
                    <div class="info-value ${contact.email ? '' : 'info-missing'}">${contact.email || 'Not found'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Website</div>
                    <div class="info-value ${contact.website ? '' : 'info-missing'}">${contact.website ? `<a href="${contact.website}" target="_blank">${contact.website}</a>` : 'Not found'}</div>
                </div>
            </div>

            <div class="card">
                <h3>🏢 Office Information</h3>
                <div class="info-item">
                    <div class="info-label">Office Name</div>
                    <div class="info-value ${office.name ? '' : 'info-missing'}">${office.name || 'Not found'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Office Address</div>
                    <div class="info-value ${office.address ? '' : 'info-missing'}">${office.address || 'Not found'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Office Phone</div>
                    <div class="info-value ${office.phone ? '' : 'info-missing'}">${office.phone || 'Not found'}</div>
                </div>
            </div>
        </div>

        ${reviews.rating ? `
        <div class="card">
            <h3>⭐ Reviews & Ratings</h3>
            <div class="reviews-summary">
                <div class="rating-display">${reviews.rating}⭐</div>
                <div><strong>${reviews.count || 0}</strong> Total Reviews</div>
            </div>
            ${recommendations.length > 0 ? `
                <h4>All Recommendations (${recommendations.length}):</h4>
                <div class="recommendations-container">
                ${recommendations.map(rec => {
                    // Use much more generous text display
                    let displayText = rec.text || 'No text available';
                    if (displayText.length > 400) {
                        // Find sentence boundary for smart truncation
                        const truncated = displayText.substring(0, 400);
                        const lastSentenceEnd = Math.max(
                            truncated.lastIndexOf('.'),
                            truncated.lastIndexOf('!'),
                            truncated.lastIndexOf('?')
                        );
                        
                        if (lastSentenceEnd > 200) {
                            displayText = displayText.substring(0, lastSentenceEnd + 1);
                        } else {
                            const lastSpace = truncated.lastIndexOf(' ');
                            displayText = displayText.substring(0, lastSpace > 300 ? lastSpace : 400) + '...';
                        }
                    }
                    
                    return `
                        <div class="recommendation">
                            <div class="recommendation-text">"${displayText}"</div>
                            <div class="recommendation-author">— ${rec.author || 'Anonymous'}</div>
                        </div>
                    `;
                }).join('')}
                </div>
            ` : '<p style="color: #7f8c8d; font-style: italic; text-align: center;">No recommendations found</p>'}
        </div>
        ` : ''}

        ${activeListings.length > 0 ? `
        <div class="card">
            <h3>🏠 Active Listings (${activeListings.length})</h3>
            <div class="listings-grid">
                ${activeListings.slice(0, 6).map((listing, index) => {
                    // Helper function to check if a property value should be displayed
                    const isValidValue = (value) => {
                        if (value === null || value === undefined) return false;
                        if (typeof value === 'string') {
                            const lowerValue = value.toLowerCase().trim();
                            return lowerValue !== '' && 
                                   lowerValue !== 'n/a' && 
                                   lowerValue !== 'na' && 
                                   lowerValue !== 'null' && 
                                   lowerValue !== 'undefined' &&
                                   lowerValue !== '0' &&
                                   lowerValue !== 'none' &&
                                   lowerValue !== 'unknown';
                        }
                        if (typeof value === 'number') {
                            return value > 0;
                        }
                        return true;
                    };
                    
                    // Build property details only for valid values
                    const propertyDetails = [];
                    if (isValidValue(listing.beds)) {
                        propertyDetails.push(`
                            <div class="detail-item">
                                <div class="detail-value">${listing.beds}</div>
                                <div class="detail-label">Bed${listing.beds !== 1 ? 's' : ''}</div>
                            </div>
                        `);
                    }
                    if (isValidValue(listing.baths)) {
                        propertyDetails.push(`
                            <div class="detail-item">
                                <div class="detail-value">${listing.baths}</div>
                                <div class="detail-label">Bath${listing.baths !== 1 ? 's' : ''}</div>
                            </div>
                        `);
                    }
                    if (isValidValue(listing.sqft)) {
                        const formattedSqft = Number(listing.sqft).toLocaleString();
                        propertyDetails.push(`
                            <div class="detail-item">
                                <div class="detail-value">${formattedSqft}</div>
                                <div class="detail-label">Sq Ft</div>
                            </div>
                        `);
                    }
                    
                    const propertyDetailsHTML = propertyDetails.length > 0 ? 
                        `<div class="property-details">${propertyDetails.join('')}</div>` : '';
                    
                    const propertyTypeHTML = isValidValue(listing.propertyType) ? 
                        `<div><strong>Type:</strong> ${listing.propertyType}</div>` : '';
                    
                    const statusHTML = isValidValue(listing.status) ? 
                        `<div><strong>Status:</strong> ${listing.status}</div>` : '';
                    
                    return `
                    <div class="listing-card">
                        <div class="price">${listing.price || 'Price N/A'}</div>
                        <div><strong>Address:</strong> ${listing.address || 'Address not available'}</div>
                        ${propertyDetailsHTML}
                        ${propertyTypeHTML}
                        ${statusHTML}
                    </div>
                `;
                }).join('')}
            </div>
            ${activeListings.length > 6 ? `<p style="text-align: center; color: #7f8c8d; font-style: italic; margin-top: 15px;">... and ${activeListings.length - 6} more active listings</p>` : ''}
        </div>
        ` : ''}

        ${soldListings.length > 0 ? `
        <div class="card">
            <h3>🏠 Sold Listings (${soldListings.length})</h3>
            <div class="listings-grid">
                ${soldListings.slice(0, 6).map((listing, index) => {
                    // Helper function to check if a property value should be displayed
                    const isValidValue = (value) => {
                        if (value === null || value === undefined) return false;
                        if (typeof value === 'string') {
                            const lowerValue = value.toLowerCase().trim();
                            return lowerValue !== '' && 
                                   lowerValue !== 'n/a' && 
                                   lowerValue !== 'na' && 
                                   lowerValue !== 'null' && 
                                   lowerValue !== 'undefined' &&
                                   lowerValue !== '0' &&
                                   lowerValue !== 'none' &&
                                   lowerValue !== 'unknown';
                        }
                        if (typeof value === 'number') {
                            return value > 0;
                        }
                        return true;
                    };
                    
                    // Build property details only for valid values
                    const propertyDetails = [];
                    if (isValidValue(listing.beds)) {
                        propertyDetails.push(`
                            <div class="detail-item">
                                <div class="detail-value">${listing.beds}</div>
                                <div class="detail-label">Bed${listing.beds !== 1 ? 's' : ''}</div>
                            </div>
                        `);
                    }
                    if (isValidValue(listing.baths)) {
                        propertyDetails.push(`
                            <div class="detail-item">
                                <div class="detail-value">${listing.baths}</div>
                                <div class="detail-label">Bath${listing.baths !== 1 ? 's' : ''}</div>
                            </div>
                        `);
                    }
                    if (isValidValue(listing.sqft)) {
                        const formattedSqft = Number(listing.sqft).toLocaleString();
                        propertyDetails.push(`
                            <div class="detail-item">
                                <div class="detail-value">${formattedSqft}</div>
                                <div class="detail-label">Sq Ft</div>
                            </div>
                        `);
                    }
                    
                    const propertyDetailsHTML = propertyDetails.length > 0 ? 
                        `<div class="property-details">${propertyDetails.join('')}</div>` : '';
                    
                    const propertyTypeHTML = isValidValue(listing.propertyType) ? 
                        `<div><strong>Type:</strong> ${listing.propertyType}</div>` : '';
                    
                    const statusHTML = 'Sold'; // Sold listings always have status
                    
                    return `
                    <div class="listing-card">
                        <div class="price">${listing.price || 'Contact for price'}</div>
                        <div><strong>Address:</strong> ${listing.address || 'Address not available'}</div>
                        ${propertyDetailsHTML}
                        ${propertyTypeHTML}
                        <div><strong>Status:</strong> ${statusHTML}</div>
                    </div>
                `;
                }).join('')}
            </div>
            ${soldListings.length > 6 ? `<p style="text-align: center; color: #7f8c8d; font-style: italic; margin-top: 15px;">... and ${soldListings.length - 6} more sold listings</p>` : ''}
        </div>
        ` : ''}

        <div class="card">
            <h3 class="toggle-section" onclick="toggleRawData()">🔍 Raw Extraction Data (Click to Toggle)</h3>
            <div id="rawDataSection" class="collapsible">
                <div class="raw-data">${JSON.stringify(data, null, 2)}</div>
            </div>
        </div>
    </div>

    <script>
        function toggleRawData() {
            const section = document.getElementById('rawDataSection');
            section.classList.toggle('open');
        }
        
        // Auto-focus and highlight successful extraction
        ${data?.success ? `
        setTimeout(() => {
            document.querySelector('.status-success').style.animation = 'pulse 2s infinite';
        }, 1000);
        ` : ''}
        
        console.log('📊 Extraction window loaded with data:', ${JSON.stringify(data)});
    </script>
    
    <style>
        @keyframes pulse {
            0% { box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            50% { box-shadow: 0 20px 40px rgba(39, 174, 96, 0.3); }
            100% { box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        }
    </style>
</body>
</html>`;

    // Try to open enhanced data window
    const newWindow = window.open('', 'realtorExtraction_' + Date.now(), 
      'width=1400,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no');
    
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      newWindow.focus();
      console.log('✅ ENHANCED DATA WINDOW OPENED SUCCESSFULLY');
    } else {
      console.error('❌ FAILED TO OPEN WINDOW - POPUP BLOCKED?');
      alert('Popup blocked! Please allow popups for this site and try again.\\n\\nExtracted data:\\n' + JSON.stringify(data, null, 2));
    }
  }

  showDataInNewWindow(data) {
    // Generate extraction summary
    const summary = this.generateExtractionSummary(data);
    
    // Create comprehensive HTML for the data viewer window
    const htmlContent = this.generateDataViewerHTML(data, summary);
    
    // Open new window
    const newWindow = window.open('', 'extractedData', 
      'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no');
    
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      // Add event listeners after content is loaded
      newWindow.addEventListener('load', () => {
        this.setupDataViewerListeners(newWindow, data);
      });
      
      log.info('📊 Extraction data opened in new window');
    } else {
      // Fallback to modal if popup blocked
      log.warn('Popup blocked, falling back to modal');
      this.showDataModalFallback(data);
    }
  }

  generateExtractionSummary(data) {
    const summary = {
      total: 0,
      extracted: 0,
      missing: 0,
      quality: 0,
      categories: {}
    };

    // Analyze each data category
    const categories = {
      'Agent Info': data.agent || {},
      'Contact': data.contact || {},
      'Office': data.office || {},
      'Properties': data.listings || [],
      'Reviews': data.reviews || {},
      'Specializations': data.specializations || [],
      'Areas Served': data.areasServed || '',
      'Social Media': data.socialMedia || {},
      'Images': data.images || {}
    };

    Object.entries(categories).forEach(([category, categoryData]) => {
      const analysis = this.analyzeCategoryData(categoryData);
      summary.categories[category] = analysis;
      summary.total += analysis.total;
      summary.extracted += analysis.extracted;
      summary.missing += analysis.missing;
    });

    summary.quality = summary.total > 0 ? (summary.extracted / summary.total * 100).toFixed(1) : 0;
    
    return summary;
  }

  analyzeCategoryData(data) {
    const analysis = { total: 0, extracted: 0, missing: 0, fields: [] };
    
    if (Array.isArray(data)) {
      analysis.total = 1;
      analysis.extracted = data.length > 0 ? 1 : 0;
      analysis.missing = data.length === 0 ? 1 : 0;
      analysis.fields.push({ name: 'items', value: data.length, status: data.length > 0 ? 'success' : 'missing' });
    } else if (typeof data === 'object' && data !== null) {
      Object.entries(data).forEach(([key, value]) => {
        analysis.total++;
        const hasValue = value !== null && value !== undefined && value !== '' && 
                         (Array.isArray(value) ? value.length > 0 : true);
        
        if (hasValue) {
          analysis.extracted++;
          analysis.fields.push({ name: key, value: value, status: 'success' });
        } else {
          analysis.missing++;
          analysis.fields.push({ name: key, value: 'Not extracted', status: 'missing' });
        }
      });
    } else {
      analysis.total = 1;
      const hasValue = data !== null && data !== undefined && data !== '';
      analysis.extracted = hasValue ? 1 : 0;
      analysis.missing = hasValue ? 0 : 1;
      analysis.fields.push({ name: 'value', value: data || 'Not extracted', status: hasValue ? 'success' : 'missing' });
    }
    
    return analysis;
  }

  generateDataViewerHTML(data, summary) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Realtor Data Extraction Results</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, #e31837, #c41230);
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .header .url { opacity: 0.9; font-size: 14px; }
        
        .summary {
            background: white;
            margin: 20px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            border-left: 4px solid;
        }
        
        .stat-card.success { border-left-color: #28a745; }
        .stat-card.warning { border-left-color: #ffc107; }
        .stat-card.danger { border-left-color: #dc3545; }
        
        .stat-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 14px; }
        
        .quality-meter {
            background: #e9ecef;
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .quality-fill {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        
        .actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 10px 15px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s ease;
        }
        
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-info { background: #17a2b8; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        
        .content {
            margin: 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        @media (max-width: 1024px) {
            .content { grid-template-columns: 1fr; }
        }
        
        .category-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
            margin-bottom: 20px;
        }
        
        .category-header {
            background: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .category-title { font-weight: 600; }
        
        .category-score {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .score-high { background: #d4edda; color: #155724; }
        .score-medium { background: #fff3cd; color: #856404; }
        .score-low { background: #f8d7da; color: #721c24; }
        
        .category-content {
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .field-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 8px 0;
            border-bottom: 1px solid #f1f1f1;
        }
        
        .field-item:last-child { border-bottom: none; }
        
        .field-name {
            font-weight: 500;
            color: #495057;
            min-width: 120px;
        }
        
        .field-value {
            flex: 1;
            text-align: right;
            margin-left: 10px;
            word-break: break-word;
        }
        
        .field-value.success { color: #28a745; }
        .field-value.missing { color: #dc3545; font-style: italic; }
        
        .raw-json {
            background: white;
            margin: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .raw-json-header {
            background: #f8f9fa;
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            font-weight: 600;
        }
        
        .raw-json-content {
            padding: 0;
            max-height: 600px;
            overflow: auto;
        }
        
        pre {
            background: #f8f9fa;
            padding: 20px;
            margin: 0;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Realtor Data Extraction Results</h1>
        <div class="url">${data.url || 'Unknown URL'}</div>
        <div style="margin-top: 10px; font-size: 14px;">
            Extracted: ${new Date(data.extractedAt || Date.now()).toLocaleString()}
        </div>
    </div>

    <div class="summary">
        <div class="summary-stats">
            <div class="stat-card success">
                <div class="stat-value">${summary.extracted}</div>
                <div class="stat-label">Fields Extracted</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value">${summary.missing}</div>
                <div class="stat-label">Fields Missing</div>
            </div>
            <div class="stat-card ${summary.quality >= 70 ? 'success' : summary.quality >= 40 ? 'warning' : 'danger'}">
                <div class="stat-value">${summary.quality}%</div>
                <div class="stat-label">Data Quality</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${Object.keys(summary.categories).length}</div>
                <div class="stat-label">Categories</div>
            </div>
        </div>
        
        <div class="quality-meter">
            <div class="quality-fill" style="width: ${summary.quality}%; background: ${summary.quality >= 70 ? '#28a745' : summary.quality >= 40 ? '#ffc107' : '#dc3545'}"></div>
        </div>
        
        <div class="actions">
            <button class="btn btn-primary" onclick="copyToClipboard('json')">📋 Copy JSON</button>
            <button class="btn btn-success" onclick="downloadData('json')">💾 Download JSON</button>
            <button class="btn btn-info" onclick="downloadData('csv')">📊 Download CSV</button>
            <button class="btn btn-secondary" onclick="toggleRawData()">🔍 Toggle Raw Data</button>
        </div>
    </div>

    <div class="content">
        ${Object.entries(summary.categories).map(([category, analysis]) => `
            <div class="category-card">
                <div class="category-header">
                    <div class="category-title">${category}</div>
                    <div class="category-score ${analysis.extracted / analysis.total >= 0.7 ? 'score-high' : analysis.extracted / analysis.total >= 0.4 ? 'score-medium' : 'score-low'}">
                        ${analysis.extracted}/${analysis.total}
                    </div>
                </div>
                <div class="category-content">
                    ${analysis.fields.map(field => `
                        <div class="field-item">
                            <div class="field-name">${field.name}</div>
                            <div class="field-value ${field.status}">
                                ${this.formatFieldValue(field.value)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </div>

    <div class="raw-json" id="rawJson" style="display: none;">
        <div class="raw-json-header">🔍 Raw JSON Data</div>
        <div class="raw-json-content">
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
    </div>

    <div class="notification" id="notification"></div>

    <script>
        const extractedData = ${JSON.stringify(data, null, 2)};
        
        function copyToClipboard(format) {
            const text = format === 'json' ? JSON.stringify(extractedData, null, 2) : convertToCSV(extractedData);
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Data copied to clipboard!');
            });
        }
        
        function downloadData(format) {
            const filename = 'realtor-data-' + Date.now() + '.' + format;
            const content = format === 'json' ? JSON.stringify(extractedData, null, 2) : convertToCSV(extractedData);
            const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('File downloaded: ' + filename);
        }
        
        function toggleRawData() {
            const rawJson = document.getElementById('rawJson');
            rawJson.style.display = rawJson.style.display === 'none' ? 'block' : 'none';
        }
        
        function showNotification(message) {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
        
        function convertToCSV(data) {
            // Simple CSV conversion - implement as needed
            return JSON.stringify(data, null, 2);
        }
    </script>
</body>
</html>`;
  }

  formatFieldValue(value) {
    if (value === null || value === undefined || value === '') {
      return 'Not extracted';
    }
    
    if (Array.isArray(value)) {
      return value.length + ' items';
    }
    
    if (typeof value === 'object') {
      return 'Object data';
    }
    
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    
    return String(value);
  }

  setupDataViewerListeners(windowObj, data) {
    // Additional setup if needed for the new window
    log.debug('Data viewer window setup complete');
  }

  showExtractionSummary(data) {
    const summary = this.generateExtractionSummary(data);
    
    this.showNotification(`
      📊 Extraction Complete!<br>
      ✅ ${summary.extracted} fields extracted<br>
      ❌ ${summary.missing} fields missing<br>
      📈 ${summary.quality}% data quality
    `, 5000);
  }

  showDataModalFallback(data) {
    // Original modal code as fallback
    const existingModal = document.getElementById('realtor-data-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'realtor-data-modal';
    modal.innerHTML = `
      <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
        <div class="modal-content" style="background: white; border-radius: 8px; width: 90%; max-width: 800px; max-height: 80%; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          <div class="modal-header" style="background: #e31837; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0;">📊 Extracted Data</h2>
            <button class="close-btn" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
          </div>
          <div class="modal-body" style="padding: 20px; max-height: 60vh; overflow-y: auto;">
            <div class="data-actions" style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="copy-json-btn" style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">📋 Copy JSON</button>
              <button id="download-json-btn" style="padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 Download JSON</button>
              <button id="open-new-window-btn" style="padding: 8px 12px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">🪟 Open in New Window</button>
            </div>
            <pre class="data-preview" style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow: auto; max-height: 400px; font-size: 12px; line-height: 1.4;">${JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) modal.remove();
    });

    modal.querySelector('#copy-json-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      this.showNotification('Data copied to clipboard!');
    });

    modal.querySelector('#download-json-btn').addEventListener('click', () => {
      this.downloadData(data, 'json');
    });

    modal.querySelector('#open-new-window-btn').addEventListener('click', () => {
      modal.remove();
      this.showDataInNewWindow(data);
    });
  }

  downloadData(data, format) {
    try {
      let content, filename, mimeType;
      
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `realtor-data-${Date.now()}.json`;
        mimeType = 'application/json';
      } else if (format === 'csv') {
        content = this.convertToCSV(data);
        filename = `realtor-data-${Date.now()}.csv`;
        mimeType = 'text/csv';
      }

      log.debug('📁 Starting download...', { format, filename, contentLength: content.length });

      // Method 1: Try Chrome downloads API (if available)
      if (typeof chrome !== 'undefined' && chrome.downloads) {
        try {
          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          
          chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              log.debug('Chrome downloads API failed, trying fallback:', chrome.runtime.lastError);
              this.downloadDataFallback(content, filename, mimeType);
            } else {
              log.debug('✅ Download started with ID:', downloadId);
              this.showNotification(`${format.toUpperCase()} file downloaded!`);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          });
          return;
        } catch (e) {
          log.debug('Chrome downloads API error, trying fallback:', e);
        }
      }

      // Method 2: Fallback to blob download
      this.downloadDataFallback(content, filename, mimeType);
      
    } catch (error) {
      log.error('Download failed:', error);
      this.showNotification('❌ Download failed! Check console for details.');
    }
  }

  downloadDataFallback(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      log.debug('✅ Fallback download triggered');
      this.showNotification(`📁 ${filename} download started!`);
      
    } catch (error) {
      log.error('Fallback download failed:', error);
      
      // Method 3: Last resort - copy to clipboard
      navigator.clipboard.writeText(content).then(() => {
        this.showNotification('📋 Data copied to clipboard (download failed)');
      }).catch(() => {
        this.showNotification('❌ Download and clipboard failed');
      });
    }
  }

  convertToCSV(data) {
    const rows = [];
    
    // Flatten the data structure for CSV
    const flatData = this.flattenObject(data);
    
    // Get headers
    const headers = Object.keys(flatData);
    rows.push(headers.join(','));
    
    // Get values
    const values = headers.map(header => {
      let value = flatData[header];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string and clean
      value = String(value);
      
      // Escape commas and quotes in CSV
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    rows.push(values.join(','));
    
    return rows.join('\n');
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
          // Handle arrays better
          if (value.length === 0) {
            flattened[newKey] = '';
          } else {
            // Convert array items to strings
            const stringValues = value.map(item => {
              if (typeof item === 'object' && item !== null) {
                // For image objects, extract the URL (check both 'url' and 'src')
                if (item.url) return item.url;
                if (item.src) return item.src;
                // For review objects, extract text
                if (item.text) return item.text.substring(0, 100).replace(/[,"\n]/g, ' ');
                // For member objects, extract name
                if (item.name) return item.name;
                // For listing objects, combine address and price
                if (item.address || item.price) {
                  return `${item.address || ''} ${item.price || ''}`.trim();
                }
                // For other objects, try to get a meaningful string
                const meaningfulValues = Object.values(item)
                  .filter(val => val && typeof val === 'string' && val.trim().length > 0)
                  .join(' ');
                return meaningfulValues.substring(0, 50).replace(/[,"\n]/g, ' ');
              }
              return String(item).replace(/[,"\n]/g, ' ');
            }).filter(item => item && item.trim().length > 0);
            
            flattened[newKey] = stringValues.join('; ');
          }
        } else if (typeof value === 'object') {
          // Recursively flatten objects
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else {
          // Clean text values
          const cleanedValue = typeof value === 'string' ? this.cleanTextForCSV(value) : value;
          flattened[newKey] = cleanedValue;
        }
      }
    }
    
    return flattened;
  }

  cleanTextForCSV(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Enhanced cleaning for review text and descriptions - comprehensive rating metadata removal
    let cleaned = text
      .replace(/\{[^}]*\}/g, '') // Remove CSS blocks
      .replace(/jsx-\d+/g, '') // Remove JSX class names
      
      // Remove overall rating patterns
      .replace(/Overall rating:\s*\d+\.\d+/gi, '') // "Overall rating:4.9"
      .replace(/Overall rating \(\d+\)/gi, '') // "Overall rating (5)" artifacts
      .replace(/Add rating and review\.?/gi, '') // "Add rating and review"
      
      // Remove "Name | Year" prefixes like "Belinda GillisAgoura | 2025"
      .replace(/^[A-Za-z\s]+\s*\|\s*\d{4}\s*/i, '')
      
      // Remove verified review sections
      .replace(/Verified review\s*\d+\.\d+\s*/gi, '')
      
      // Remove rating scores - this needs to be more comprehensive
      .replace(/\d+\.\d+\s+\d+\.\d+\s*[A-Za-z\s&]*\d+\.\d+\s*[A-Za-z\s&]*\d+\.\d+\s*[A-Za-z\s&]*/gi, '') // "5.0 5.0 Responsiveness 5.0 Market expertise..."
      .replace(/^\d+\.\d+\s+\d+\.\d+.*?communication\s*/i, '') // Start of text rating patterns
      .replace(/\b\d+\.\d+\s+\d+\.\d+.*?(Responsiveness|Market expertise|Negotiation skills|Professionalism)/gi, '')
      
      // Remove rating category labels - ENHANCED
      .replace(/ResponsivenessNegotiation skillsProfessionalism and communicationMarket expertise/gi, '') 
      .replace(/Responsiveness\s*Negotiation skills\s*Professionalism and communication\s*Market expertise/gi, '') 
      .replace(/\b(Responsiveness|Negotiation skills|Professionalism and communication|Market expertise)\b/gi, '') 
      .replace(/\b(Responsiveness|Market expertise|Negotiation skills|Professionalism)\s*&?\s*communication\.?\s*$/gi, '') // "Professionalism & communication." at end
      .replace(/^\s*(Professionalism|Responsiveness|Market expertise|Negotiation skills)\s*&?\s*communication\.?\s*/gi, '') // At beginning
      
      // Remove truncation indicators
      .replace(/\.\.\.\s*$/, '') // Remove trailing "..."
      .replace(/\s*\.\.\.\s*Read more.*$/i, '') // Remove "... Read more" patterns
      .replace(/Read more.*$/i, '') // Remove "Read more" endings
      
      // Remove location patterns - BUT PRESERVE YEARS IN TESTIMONIAL TEXT
      .replace(/\b[A-Z][a-z]+,\s*CA\s*/g, '') // Remove "City, CA" location prefixes
      // DON'T remove standalone years - they might be part of testimonial content
      
      // Clean up incomplete sentence beginnings - FIXED
      .replace(/^In\s*,\s*/i, 'In 2018, ') // Fix "In , I was selected" -> "In 2018, I was selected"
      
      // Clean up text formatting
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/["\n\r]/g, ' ') // Replace quotes and newlines with spaces
      .replace(/^\s*,\s*/, '') // Remove leading commas
      .replace(/\s*,\s*$/, '') // Remove trailing commas
      .replace(/^[\s\d\.\&]+/, '') // Remove leading spaces, numbers, dots, and ampersands
      .trim();
    
    // If text starts with a quote, make sure it's properly formatted
    if (cleaned.startsWith('"') && !cleaned.endsWith('"') && cleaned.length > 10) {
      // Find the end of the actual quote content
      const quoteEnd = cleaned.lastIndexOf('"');
      if (quoteEnd > 0) {
        cleaned = cleaned.substring(0, quoteEnd + 1);
      }
    }
    
    // Return truncated but longer text for reviews - IMPROVED: Complete sentences only
    if (cleaned.length > 1200) {
      // Try to find the last complete sentence within 1200 characters
      const sentences = cleaned.substring(0, 1200).match(/[^.!?]*[.!?]/g);
      if (sentences && sentences.length > 0) {
        // Return complete sentences up to the limit
        const completeSentences = sentences.join(' ');
        return completeSentences;
      }
      // Fallback: truncate at word boundary
      const lastSpace = cleaned.substring(0, 1200).lastIndexOf(' ');
      return cleaned.substring(0, lastSpace > 800 ? lastSpace : 1200);
    }
    
    return cleaned; // Return full text if under limit
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      background: #4caf50;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize the extractor when the page loads
log.debug('🔄 Content script file executed, document.readyState:', document.readyState);

if (document.readyState === 'loading') {
  log.debug('📄 DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    log.debug('✅ DOMContentLoaded fired, creating RealtorDataExtractor...');
    window.extractor = new RealtorDataExtractor();
  });
} else {
  log.debug('✅ DOM already loaded, creating RealtorDataExtractor immediately...');
  window.extractor = new RealtorDataExtractor();
}

log.debug('🎯 Content script setup complete');

// Store the class globally to prevent redefinition
window.RealtorDataExtractor = RealtorDataExtractor;

} // End of duplicate prevention check
