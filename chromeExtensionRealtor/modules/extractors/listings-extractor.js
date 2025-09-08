/**
 * ListingsExtractor Module
 * 
 * Handles all property listings extraction functionality including:
 * - Finding listing elements on the page
 * - Extracting detailed property information
 * - Processing property data and metadata
 * - Duplicate detection and filtering
 * - Text-based extraction fallbacks
 * - Property data validation and enhancement
 * 
 * This is the largest extractor module (~2,400 lines) containing comprehensive
 * property listings processing logic extracted from content.js
 */

class ListingsExtractor {
  constructor() {
    // Set up logging - will use global log object with comprehensive fallback
    this.log = this.initializeLogging();
    
    // Initialize extractor state
    this.extractorName = 'ListingsExtractor';
    this.version = '1.0.0';
    
    this.log.debug(`🏠 ${this.extractorName} v${this.version} initialized`);
  }

  // Robust logging initialization with fallbacks
  initializeLogging() {
    // Try multiple ways to get the logging object
    if (typeof log !== 'undefined' && log.debug) {
      return log;
    }
    
    if (typeof window !== 'undefined' && window.log && window.log.debug) {
      return window.log;
    }
    
    // Create a safe fallback logger
    return {
      debug: (...args) => console.log('[DEBUG]', ...args),
      info: (...args) => console.log('[INFO]', ...args),
      warn: (...args) => console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args)
    };
  }

  // Delegate utility method access to main extractor
  getAttribute(selectors, attribute = 'textContent') {
    // Access the main extractor's utility method
    if (window.realtorExtractor && typeof window.realtorExtractor.getAttribute === 'function') {
      return window.realtorExtractor.getAttribute(selectors, attribute);
    }
    
    // Fallback implementation
    if (typeof selectors === 'string') {
      selectors = [selectors];
    }
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        if (attribute === 'textContent') {
          return element.textContent?.trim() || null;
        } else {
          return element.getAttribute(attribute);
        }
      }
    }
    return null;
  }

  // Main listing extraction entry point
  async extractListings() {
    this.log.debug('Starting listings extraction...');
    return this.extractListingsWithLimit();
  }

  // Enhanced listings extraction with property limit
  async extractListingsWithLimit(maxProperties = 20) {
    
    // STEP 1: Try to expand listings first
    await this.expandListings();
    
    // CRITICAL FIX: Disable aggressive tab activation that causes navigation issues
    const tabsClicked = this.clickAllListingsTabSafely();
    
    // Poll for listings content to load instead of fixed delay
    if (tabsClicked > 0) {
      const isReady = await ContentPollingManager.pollForListingsLoad({
        maxAttempts: 40,
        interval: 50,
        timeout: 3000
      });
      
      if (isReady) {
        this.log.debug('✅ Listings content loaded after tab clicks');
      } else {
        this.log.debug('⚠️ Listings content may not have fully loaded');
      }
    } else {
      await ContentPollingManager.pollForContentStability('[data-testid*="listing"], .listing-item', {
        maxAttempts: 10,
        interval: 100,
        timeout: 1000,
        stabilityPeriod: 200
      });
    }
    
    return this.performListingsExtractionWithLimit(maxProperties);
  }

  /**
   * Expand listings by clicking "Show more" or "Load more" buttons
   */
  async expandListings() {
    this.log.debug('🔍 Looking for listings expansion buttons...');
    
    const expandButtons = [
      'button:contains("Show more")',
      'button:contains("Load more")',
      'button:contains("View more")', 
      'button:contains("See more listings")',
      '[data-testid*="show-more"]',
      '[data-testid*="load-more"]',
      '[data-testid*="expand"]',
      'button[class*="show-more"]',
      'button[class*="load-more"]'
    ];
    
    // Also look for text-based expansion buttons
    const allButtons = document.querySelectorAll('button, a, span[role="button"], div[role="button"]');
    let expandedCount = 0;
    
    for (const button of allButtons) {
      const text = button.textContent?.toLowerCase().trim();
      
      if (text === 'show more' || 
          text === 'load more' ||
          text === 'view more listings' ||
          text === 'see more listings' ||
          text === 'show all listings' ||
          (text.includes('show') && text.includes('more')) ||
          (text.includes('load') && text.includes('more'))) {
        
        try {
          this.log.debug(`🎯 Found listings expansion button: "${button.textContent.trim()}"`);
          
          // Check if button is clickable
          if (button.offsetParent !== null && !button.disabled) {
            button.click();
            expandedCount++;
            this.log.debug(`✅ Clicked listings expansion button ${expandedCount}`);
            
            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Only click a few to avoid infinite loops
            if (expandedCount >= 3) break;
          }
        } catch (error) {
          this.log.debug(`❌ Failed to click listings expansion button: ${error.message}`);
        }
      }
    }
    
    if (expandedCount > 0) {
      this.log.debug(`🎯 Expanded ${expandedCount} listings sections, waiting for content...`);
      // Wait additional time for content to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } else {
      this.log.debug('❌ No listings expansion buttons found');
      return false;
    }
  }

  // Synchronous version for immediate use (no async/await delays)
  performListingsExtractionSync(maxProperties = 20) {
    
    const listings = {
      active: [],
      sold: [],
      metadata: {
        totalFound: 0,
        totalExtracted: 0,
        reachedLimit: false,
        extractionMethod: 'enhanced-sync'
      }
    };

    try {
      // Get all potential listing elements
      const listingElements = this.findAllListingElements();
      
      listings.metadata.totalFound = listingElements.length;
      this.log.debug(`🏠 Found ${listingElements.length} potential property elements`);

      // Process listings with limit checking
      for (let i = 0; i < listingElements.length; i++) {
        // Check if we've reached the limit
        const currentTotal = listings.active.length + listings.sold.length;
        if (currentTotal >= maxProperties) {
          listings.metadata.reachedLimit = true;
          this.log.debug(`🏠 Reached limit of ${maxProperties} properties`);
          break;
        }

        const element = listingElements[i];
        
        try {
          const listing = this.extractDetailedListing(element, `property_${i + 1}`);
          
          // INCLUDE ALL LISTINGS (even without address) for debugging
          if (listing && listing.price) {
            // Determine if it's sold or active
            const isSold = listing.status?.toLowerCase().includes('sold') || 
                          listing.listingType?.toLowerCase().includes('sold') ||
                          listing.price === 'Contact for price';
            
            if (isSold) {
              listings.sold.push(listing);
            } else {
              listings.active.push(listing);
            }
            
            listings.metadata.totalExtracted++;
            this.log.debug(`✅ Extracted property ${i + 1}: price=${listing.price}, address=${listing.address || 'null'}`);
          } else {
            this.log.debug(`❌ Skipped property ${i + 1}: missing price or listing data`);
          }
          
        } catch (error) {
          this.log.debug(`❌ Error extracting property ${i + 1}:`, error.message);
        }
      }

      this.log.debug(`🏠 Extraction complete: ${listings.active.length} active, ${listings.sold.length} sold (${listings.metadata.totalExtracted} total)`);
      return listings;
      
    } catch (error) {
      this.log.debug('❌ Listings extraction failed:', error);
      return listings;
    }
  }

  // Enhanced extraction with property counting and smart stopping
  async performListingsExtractionWithLimit(maxProperties = 20) {
    
    const listings = {
      active: [],
      sold: [],
      metadata: {
        totalFound: 0,
        totalExtracted: 0,
        reachedLimit: false,
        extractionMethod: 'enhanced-limited'
      }
    };

    try {
      // Get all potential listing elements
      const listingElements = this.findAllListingElements();
      
      listings.metadata.totalFound = listingElements.length;

      // Process listings with limit checking
      for (let i = 0; i < listingElements.length; i++) {
        // Check if we've reached the limit
        const currentTotal = listings.active.length + listings.sold.length;
        if (currentTotal >= maxProperties) {
          listings.metadata.reachedLimit = true;
          break;
        }

        const element = listingElements[i];
        
        try {
          const listing = this.extractDetailedListing(element, i);
          
          // DEBUG: Show the raw element structure for the first few sold properties
          if (i < 3) {
            
            // Try to find address-looking text in all child elements
            const allTextNodes = [];
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
              if (node.textContent.trim().length > 5) {
                allTextNodes.push(node.textContent.trim());
              }
            }
          }
          
          // Only include if we have critical data
          if (listing && listing.price && listing.address) {
            // Determine if it's sold or active
            const isSold = listing.status?.toLowerCase().includes('sold') || 
                          listing.listingType?.toLowerCase().includes('sold') ||
                          listing.price === 'Contact for price';
            
            if (isSold) {
              listings.sold.push(listing);
            } else {
              listings.active.push(listing);
            }
            
            listings.metadata.totalExtracted++;
            
            // Brief pause to allow for activity monitoring
            if (i % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
          }
        } catch (error) {
          console.warn(`❌ Error processing property ${i + 1}:`, error.message);
        }
      }

      // Try text-based extraction for any remaining slots
      if (listings.metadata.totalExtracted < maxProperties) {
        this.extractListingsFromTextWithLimit(listings, maxProperties - listings.metadata.totalExtracted);
      }

      console.log('🎯 Listings extraction summary:', {
        active: listings.active.length,
        sold: listings.sold.length,
        total: listings.metadata.totalExtracted,
        foundElements: listings.metadata.totalFound,
        reachedLimit: listings.metadata.reachedLimit
      });

      return listings;

    } catch (error) {
      console.error('❌ Error in enhanced listings extraction:', error);
      listings.metadata.error = error.message;
      return listings;
    }
  }

  // Safe tab clicking to activate "All" listings view
  clickAllListingsTabSafely() {
    const tabSelectors = [
      'button[aria-label*="All"]',
      'button[title*="All"]',
      'button:contains("All")',
      '[data-testid*="all"]',
      '.tab-button:contains("All")',
      '.listing-tab:contains("All")'
    ];

    let clicked = 0;
    
    for (const selector of tabSelectors) {
      try {
        // Skip jQuery-style selectors that don't work with querySelector
        if (selector.includes(':contains(')) continue;
        
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null) { // Check if visible
          this.log.debug(`🎯 Found "All" tab button: ${selector}`);
          button.click();
          clicked++;
          break;
        }
      } catch (e) {
        this.log.debug(`⚠️ Tab selector failed: ${selector}`, e);
      }
    }
    
    return clicked;
  }

  // Enhanced method to find all listing elements efficiently
  findAllListingElements() {
    
    // Enhanced selectors for different types of listing containers
    const listingSelectors = [
      '[data-testid*="listing"]',
      '[data-testid*="property"]', 
      '.listing-item',
      '.property-card',
      '.listing-card',
      '[class*="ListingCard"]',
      '[class*="PropertyCard"]',
      '.BasePropertyCard',
      '.PropertyResult',
      '[data-testid="card-content"]',
      // More aggressive selectors for edge cases
      'article[data-testid*="property"]',
      'div[class*="property-"]:not(.property-details):not(.property-image)',
      'div[class*="listing-"]:not(.listing-details):not(.listing-image)'
    ];

    const foundElements = new Set(); // Use Set to avoid duplicates
    
    listingSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
          // Basic filtering to ensure it looks like a property listing
          const text = element.textContent || '';
          const hasPrice = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
          const hasAddress = text.match(/\d+\s+\w+.*(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way)/i) || 
                           text.match(/\b\d{5}\b/) || // Zip code
                           text.match(/\b[A-Z]{2}\b/); // State code
          
          // More lenient - just need some property-like content
          if ((hasPrice || hasAddress) && text.length > 20) {
            foundElements.add(element);
          }
        });
      } catch (error) {
        console.warn(`❌ Selector failed: ${selector}`, error);
      }
    });

    const elementsArray = Array.from(foundElements);
    
    return elementsArray;
  }

  // Complete detailed listing extraction with all property data
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
        this.log.debug('📞 Found "Contact for price" property');
      } else {
        return null; // No price at all, skip this element
      }
    }

    // Extract URL first to help with address extraction
    let propertyUrl = null;
    const link = element.querySelector('a[href*="/realestateandhomes-detail/"]');
    if (link && link.href) {
      propertyUrl = link.href;
      this.log.debug(`🔗 Found property URL: ${propertyUrl}`);
    } else {
      this.log.debug(`❌ No property URL found in element`);
      // Enhanced debugging for URL extraction
      const allLinks = element.querySelectorAll('a[href]');
      this.log.debug(`🔍 Found ${allLinks.length} total links in element`);
      
      // Check all links to see what we're finding
      for (let i = 0; i < Math.min(allLinks.length, 5); i++) {
        const href = allLinks[i].href;
        this.log.debug(`  🔗 Link ${i + 1}: ${href}`);
        
        // Check if it contains any realtor.com property patterns
        if (href.includes('realtor.com')) {
          this.log.debug(`    ↳ Realtor.com link detected`);
          if (href.includes('/realestateandhomes-detail/')) {
            this.log.debug(`    ↳ 🎯 PROPERTY DETAIL URL! ${href}`);
            propertyUrl = href; // Use this as the property URL
          } else if (href.includes('/property/')) {
            this.log.debug(`    ↳ Alternative property URL pattern`);
          } else {
            this.log.debug(`    ↳ Other realtor.com URL type`);
          }
        }
      }
      
      if (!propertyUrl) {
        this.log.debug(`❌ No valid property detail URLs found in ${allLinks.length} links`);
      }
    }

    const listing = {
      id: index,
      price: price,
      address: this.extractAddress(element, text, propertyUrl),
      beds: this.extractBedrooms(element, text),
      baths: this.extractBathrooms(element, text),
      sqft: this.extractSquareFeet(element, text),
      status: this.extractListingStatus(element, text),
      image: this.extractListingImage(element),
      photos: this.extractAllListingPhotos(element), // Multiple photos
      listingType: this.extractListingType(element, text),
      dateInfo: this.extractListingDate(element, text),
      description: this.extractListingDescription(element, text),
      propertyType: this.extractPropertyType(element, text),
      url: propertyUrl  // Include the URL in the listing data
    };

    // ENHANCED DEBUG: Show address extraction result
    this.log.debug(`🏠 Address extraction result for property ${index}: "${listing.address}"`);
    this.log.debug(`🏠 Property URL used: ${propertyUrl || 'none'}`);
    if (!listing.address) {
      this.log.debug(`❌ ADDRESS IS NULL - investigating element text`);
      this.log.debug(`📝 Element text (first 300 chars): "${text.substring(0, 300)}"`);
    }

    // CRITICAL DEBUG: Let's see exactly what we extracted vs what's in the text
    
    if (!listing.address || listing.address.includes('square feet')) {
      
      // Manual address search for debugging
      const possibleAddresses = text.match(/\d+\s+[A-Za-z][A-Za-z\s]+(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way|Street|Avenue|Drive|Road|Lane|Court|Boulevard)/gi);
      if (possibleAddresses) {
      }
      
      const cityStateMatches = text.match(/[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5}/g);
      if (cityStateMatches) {
      }
    }

    return listing;
  }

  // Extract bedrooms from element
  extractBedrooms(element, text) {
    // Try specific selectors first
    const bedSelectors = [
      '[data-testid*="bed"]',
      '.beds',
      '.bedrooms',
      '.property-beds'
    ];
    
    for (const selector of bedSelectors) {
      const bedEl = element.querySelector(selector);
      if (bedEl && bedEl.textContent) {
        const bedMatch = bedEl.textContent.match(/(\d+)/);
        if (bedMatch) return parseInt(bedMatch[1]);
      }
    }
    
    // Fallback to text extraction
    const bedMatch = text.match(/(\d+)\s*(?:bed|bd|bedroom)/i);
    return bedMatch ? parseInt(bedMatch[1]) : null;
  }

  // Extract bathrooms from element
  extractBathrooms(element, text) {
    // Try specific selectors first
    const bathSelectors = [
      '[data-testid*="bath"]',
      '.baths',
      '.bathrooms',
      '.property-baths'
    ];
    
    for (const selector of bathSelectors) {
      const bathEl = element.querySelector(selector);
      if (bathEl && bathEl.textContent) {
        const bathMatch = bathEl.textContent.match(/(\d+(?:\.\d+)?)/);
        if (bathMatch) return parseFloat(bathMatch[1]);
      }
    }
    
    // Fallback to text extraction
    const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
    return bathMatch ? parseFloat(bathMatch[1]) : null;
  }

  // Extract square feet from element
  extractSquareFeet(element, text) {
    // Try specific selectors first
    const sqftSelectors = [
      '[data-testid*="sqft"]',
      '[data-testid*="area"]',
      '.sqft',
      '.square-feet',
      '.property-size'
    ];
    
    for (const selector of sqftSelectors) {
      const sqftEl = element.querySelector(selector);
      if (sqftEl && sqftEl.textContent) {
        const sqftMatch = sqftEl.textContent.match(/([\d,]+)\s*(?:sqft|sq\s*ft|square\s*feet)/i);
        if (sqftMatch) return parseInt(sqftMatch[1].replace(/,/g, ''));
      }
    }
    
    // Fallback to text extraction
    const sqftMatch = text.match(/([\d,]+)\s*(?:sqft|sq\s*ft|square\s*feet)/i);
    return sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null;
  }

  // Extract listing status
  extractListingStatus(element, text) {
    // Try specific selectors first
    const statusSelectors = [
      '[data-testid*="status"]',
      '.status',
      '.listing-status',
      '.property-status'
    ];
    
    for (const selector of statusSelectors) {
      const statusEl = element.querySelector(selector);
      if (statusEl && statusEl.textContent) {
        return statusEl.textContent.trim();
      }
    }
    
    // Look for status keywords in text
    const statusPatterns = [
      /\b(for sale|active|pending|sold|off market|contingent|under contract)\b/i,
      /\b(new|price change|back on market)\b/i
    ];
    
    for (const pattern of statusPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  // Extract listing image
  extractListingImage(element) {
    // Try to find the primary listing image
    const imageSelectors = [
      'img[data-testid*="listing"]',
      'img[data-testid*="property"]',
      '.listing-image img',
      '.property-image img',
      'img[src*="rdcpix"]',
      'img:first-child'
    ];
    
    for (const selector of imageSelectors) {
      const img = element.querySelector(selector);
      if (img && img.src) {
        return this.normalizeImageUrl(img.src);
      }
    }
    
    return null;
  }

  // Use PhotoExtractor for listing photos
  extractAllListingPhotos(element) {
    if (window.PhotoExtractor) {
      const photoExtractor = new window.PhotoExtractor();
      return photoExtractor.extractAllListingPhotos(element);
    }
    
    // Fallback
    const images = [];
    const imgs = element.querySelectorAll('img');
    imgs.forEach(img => {
      if (img.src && !img.src.includes('data:')) {
        images.push(this.normalizeImageUrl(img.src));
      }
    });
    return images;
  }

  // Extract listing type
  extractListingType(element, text) {
    const typePatterns = [
      /\b(for sale|sold|rental|lease|pending)\b/i,
      /\b(new listing|price change|back on market)\b/i
    ];
    
    for (const pattern of typePatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    
    return 'For Sale'; // Default
  }

  // Extract listing date
  extractListingDate(element, text) {
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    return dateMatch ? dateMatch[1] : null;
  }

  // Extract listing description
  extractListingDescription(element, text) {
    // Try to find description elements
    const descSelectors = [
      '[data-testid*="description"]',
      '.description',
      '.property-description',
      '.listing-description'
    ];
    
    for (const selector of descSelectors) {
      const descEl = element.querySelector(selector);
      if (descEl && descEl.textContent) {
        return descEl.textContent.trim();
      }
    }
    
    // Fallback - take a relevant portion of the text
    if (text.length > 100) {
      return text.substring(0, 200) + '...';
    }
    
    return text;
  }

  // Extract property type
  extractPropertyType(element, text) {
    // Updated property type patterns to include common variations
    const typePatterns = [
      /\b(single[- ]family|single family home|house)\b/i,
      /\b(townhouse|town home|townhome)\b/i,
      /\b(condo|condominium)\b/i,
      /\b(duplex|triplex|fourplex)\b/i,
      /\b(apartment|apt)\b/i,
      /\b(villa|mansion|estate)\b/i,
      /\b(mobile home|manufactured home)\b/i,
      /\b(land|lot|vacant land)\b/i,
      /\b(commercial|office|retail)\b/i
    ];

    for (const pattern of typePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Default based on price range
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
    if (priceMatch) {
      let price = parseFloat(priceMatch[0].replace(/[$,]/g, ''));
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

  // Validate if extracted text is a valid address - enhanced for better detection
  isValidAddress(address) {
    if (!address || address.length < 5) {
      this.log.debug(`❌ Address too short: "${address}"`);
      return false;
    }
    
    // Should not contain obvious price information
    if (address.includes('$') || /\d+\s*sqft/i.test(address)) {
      this.log.debug(`❌ Address contains price/sqft info: "${address}"`);
      return false;
    }
    
    // Should not be just bed/bath info
    if (/^\s*\d+\s*bed/i.test(address) || /^\s*\d+\s*bath/i.test(address)) {
      this.log.debug(`❌ Address is just bed/bath info: "${address}"`);
      return false;
    }
    
    // More flexible address validation
    const hasNumber = /\d/.test(address);
    const hasStreetType = /\b(?:St|Ave|Rd|Dr|Ln|Ct|Blvd|Way|Street|Avenue|Road|Drive|Lane|Court|Boulevard|Place|Pl|Circle|Cir|Parkway|Pkwy|Trail|Tr)\b/i.test(address);
    const hasCity = /\b[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}/i.test(address); // City, State pattern
    const hasStreetName = /\b[A-Z][a-zA-Z\s]{3,}/i.test(address); // At least some street name
    
    // Accept if it has number + street type OR city + state OR just a reasonable street name
    const isValid = (hasNumber && hasStreetType) || hasCity || (hasStreetName && hasStreetType);
    
    if (isValid) {
      this.log.debug(`✅ Valid address: "${address}" (hasNumber: ${hasNumber}, hasStreetType: ${hasStreetType}, hasCity: ${hasCity}, hasStreetName: ${hasStreetName})`);
    } else {
      this.log.debug(`❌ Invalid address: "${address}" (hasNumber: ${hasNumber}, hasStreetType: ${hasStreetType}, hasCity: ${hasCity}, hasStreetName: ${hasStreetName})`);
    }
    
    return isValid;
  }

  // URL normalization - delegate to PhotoExtractor if available
  normalizeImageUrl(url) {
    if (window.PhotoExtractor) {
      const photoExtractor = new window.PhotoExtractor();
      return photoExtractor.normalizeImageUrl(url);
    }
    
    // Basic fallback
    if (!url) return null;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return 'https://www.realtor.com' + url;
    return url;
  }

  // Enhanced duplicate detection for listings with comprehensive checking
  isListingDuplicate(newListing, activeListings, soldListings) {
    const allListings = [...activeListings, ...soldListings];
    
    return allListings.some(existingListing => {
      // Primary check: Same property_id (most reliable)
      if (newListing.property_id && existingListing.property_id) {
        if (newListing.property_id === existingListing.property_id) {
          this.log.debug(`🚫 DUPLICATE DETECTED: Same property_id ${newListing.property_id}`);
          return true; // Exact property ID match = definite duplicate
        }
      }
      
      // Secondary check: Same MLS number (also very reliable)
      if (newListing.mls && existingListing.mls) {
        if (newListing.mls === existingListing.mls) {
          this.log.debug(`🚫 DUPLICATE DETECTED: Same MLS ${newListing.mls}`);
          return true; // Same MLS = duplicate
        }
      }
      
      // Tertiary check: Same address (strong indicator) - ENHANCED FOR MINIMAL DATA
      if (newListing.address && existingListing.address) {
        const newAddr = this.normalizeAddress(newListing.address);
        const existingAddr = this.normalizeAddress(existingListing.address);
        if (newAddr === existingAddr) {
          this.log.debug(`🚫 DUPLICATE DETECTED: Same address "${newAddr}" - blocking duplicate property`);
          return true; // Exact address match = duplicate
        }
        
        // ADDITIONAL: Check for address similarity for minimal data properties
        if (this.isMinimalDataProperty(newListing) && this.isMinimalDataProperty(existingListing)) {
          if (this.addressesSimilar(newAddr, existingAddr)) {
            this.log.debug(`🚫 DUPLICATE DETECTED: Similar addresses for minimal data properties - "${newAddr}" vs "${existingAddr}"`);
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
          this.log.debug(`🚫 DUPLICATE DETECTED: Same price/beds/baths/sqft ${newListing.price}-${newListing.beds}/${newListing.baths}-${newListing.sqft}sqft`);
          return true; // All key characteristics match = likely duplicate
        }
      }
      
      return false; // No duplicate indicators found
    });
  }

  // Helper method to normalize addresses for comparison
  normalizeAddress(address) {
    if (!address) return '';
    
    return address
      .toLowerCase()
      .replace(/\bstreet\b/g, 'st')
      .replace(/\bavenue\b/g, 'ave')
      .replace(/\broad\b/g, 'rd')
      .replace(/\bdrive\b/g, 'dr')
      .replace(/\blane\b/g, 'ln')
      .replace(/\bcourt\b/g, 'ct')
      .replace(/\bboulevard\b/g, 'blvd')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Check if two addresses are similar (for minimal data properties)
  addressesSimilar(addr1, addr2) {
    if (!addr1 || !addr2) return false;
    
    // Split into words and compare
    const words1 = addr1.split(' ');
    const words2 = addr2.split(' ');
    
    // Check if at least 70% of words match
    const matchingWords = words1.filter(word => 
      word.length > 2 && words2.some(w => w.includes(word) || word.includes(w))
    );
    
    return matchingWords.length >= Math.min(words1.length, words2.length) * 0.7;
  }

  // Helper method to check if a property has minimal data
  isMinimalDataProperty(listing) {
    if (!listing) return true;
    
    const hasPrice = listing.price && listing.price !== 'Contact for price';
    const hasAddress = listing.address && listing.address.length > 10;
    const hasBeds = listing.beds !== null && listing.beds !== undefined;
    const hasBaths = listing.baths !== null && listing.baths !== undefined;
    const hasSqft = listing.sqft !== null && listing.sqft !== undefined;
    
    // Consider minimal if missing more than 2 key data points
    const dataPoints = [hasPrice, hasAddress, hasBeds, hasBaths, hasSqft];
    const presentData = dataPoints.filter(Boolean).length;
    
    return presentData <= 2; // Has 2 or fewer data points = minimal
  }

  // Complete text-based extraction implementation
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

  // Enhanced text parsing for listings
  parseListingFromText(text, index) {
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
    const bedMatch = text.match(/(\d+) bed/);
    const bathMatch = text.match(/(\d+(?:\.\d+)?) bath/);
    const sqftMatch = text.match(/([\d,]+) sqft/);
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    const statusMatch = text.match(/(For sale|Sold)/i);
    const addressMatch = text.match(/\d+\s+[\w\s]+(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way)/i);

    if (!priceMatch) return null;

    return {
      id: `text-listing-${index}`,
      price: priceMatch[0],
      beds: bedMatch ? parseInt(bedMatch[1]) : null,
      baths: bathMatch ? parseFloat(bathMatch[1]) : null,
      sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null,
      address: addressMatch ? addressMatch[0] : null,
      status: statusMatch ? statusMatch[1] : null,
      dateInfo: dateMatch ? dateMatch[1] : null,
      source: 'text-extraction',
      index: index
    };
  }

  // Basic price extraction placeholder
  extractPrice(element, text) {
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
    return priceMatch ? priceMatch[0] : null;
  }

  // Enhanced address extraction with URL priority 
  extractAddress(element, text, propertyUrl = null) {
    this.log.debug(`🔍 Starting address extraction. propertyUrl: ${propertyUrl}`);
    
    // FIRST PRIORITY: Extract from URL if present (most reliable and properly formatted)
    const urlAddress = this.extractAddressFromURL(element, propertyUrl);
    if (urlAddress) {
      this.log.debug(`✅ Extracted address from URL (PRIORITY): ${urlAddress}`);
      return urlAddress;
    }
    
    // SECOND PRIORITY: Try the DOM-based extraction
    const domAddress = this.extractAddressFromDOM(element, text);
    if (domAddress) {
      this.log.debug(`✅ Extracted address from DOM: ${domAddress}`);
      return domAddress;
    }
    
    // Final fallback: simple regex on text
    const addressMatch = text.match(/\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Cir|Court|Ct|Place|Pl)/i);
    if (addressMatch) {
      this.log.debug(`✅ Extracted address from text regex: ${addressMatch[0]}`);
      return addressMatch[0];
    }
    
    this.log.debug(`❌ No address found for property - domAddress: ${domAddress}, urlAddress: ${urlAddress}, propertyUrl: ${propertyUrl}`);
    return null;
  }

  // NEW: Extract address from Realtor.com URLs
  extractAddressFromURL(element, propertyUrl = null) {
    let urlsToCheck = [];
    
    // If a URL was passed in, use it first
    if (propertyUrl) {
      urlsToCheck.push(propertyUrl);
      this.log.debug(`🔗 Using provided property URL: ${propertyUrl}`);
    }
    
    // Also look for links within the property element as backup
    const links = element.querySelectorAll('a[href*="/realestateandhomes-detail/"]');
    for (const link of links) {
      if (link.href) {
        urlsToCheck.push(link.href);
      }
    }
    
    for (const href of urlsToCheck) {
      if (href && href.includes('/realestateandhomes-detail/')) {
        this.log.debug(`🔗 Processing URL: ${href}`);
        
        // Realtor.com URL format: /realestateandhomes-detail/ADDRESS_CITY_STATE_ZIP_ID
        // Example: https://www.realtor.com/realestateandhomes-detail/230-W-Old-Main-Rd_Lowell_ME_04493_M38440-85037
        const urlMatch = href.match(/\/realestateandhomes-detail\/([^_]+)_([^_]+)_([^_]+)_([^_]+)_/);
        
        if (urlMatch) {
          const [, street, city, state, zip] = urlMatch;
          this.log.debug(`🔗 URL components: street="${street}", city="${city}", state="${state}", zip="${zip}"`);
          
          // Convert URL encoding back to readable address
          const decodedStreet = decodeURIComponent(street).replace(/-/g, ' ');
          const decodedCity = decodeURIComponent(city).replace(/-/g, ' ');
          
          const fullAddress = `${decodedStreet}, ${decodedCity}, ${state} ${zip}`;
          
          this.log.debug(`🔗 Successfully extracted from URL: ${fullAddress}`);
          return fullAddress;
        } else {
          this.log.debug(`❌ URL doesn't match expected pattern: ${href}`);
          // Let's also try a more flexible pattern
          const flexibleMatch = href.match(/\/realestateandhomes-detail\/(.+)_([A-Z]{2})_(\d{5})_/);
          if (flexibleMatch) {
            const [, addressPart, state, zip] = flexibleMatch;
            const parts = addressPart.split('_');
            if (parts.length >= 2) {
              const street = decodeURIComponent(parts[0]).replace(/-/g, ' ');
              const city = decodeURIComponent(parts[1]).replace(/-/g, ' ');
              const fullAddress = `${street}, ${city}, ${state} ${zip}`;
              this.log.debug(`🔗 Extracted with flexible pattern: ${fullAddress}`);
              return fullAddress;
            }
          }
        }
      }
    }
    
    this.log.debug(`❌ No valid Realtor.com URLs found for address extraction`);
    return null;
  }

  // Rename the existing comprehensive method to avoid conflicts
  extractAddressFromDOM(element, text) {
    // Enhanced debugging for address extraction
    this.log.debug(`🔍 Extracting address from element with text: "${text.substring(0, 200)}..."`);
    
    // Try specific address selectors first
    const addressSelectors = [
      '[data-testid*="address"]',
      '[data-testid*="Address"]',  // Capital A
      '.address',
      '.property-address',
      '.listing-address',
      '[class*="address"]',  // Any class containing address
      '[aria-label*="address"]',
      '[title*="address"]'
    ];
    
    for (const selector of addressSelectors) {
      const addressEl = element.querySelector(selector);
      if (addressEl && addressEl.textContent) {
        const addr = addressEl.textContent.trim();
        this.log.debug(`🎯 Found potential address via selector ${selector}: "${addr}"`);
        if (this.isValidAddress(addr)) {
          this.log.debug(`✅ Valid address via selector ${selector}: ${addr}`);
          return addr;
        } else {
          this.log.debug(`❌ Invalid address via selector ${selector}: ${addr}`);
        }
      }
    }
    
    // Enhanced address patterns - more comprehensive
    const addressPatterns = [
      // Standard US address: number + street + type (more flexible)
      /\b\d+[A-Za-z]?\s+[A-Za-z][A-Za-z\s\-\.]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd|Way|Circle|Cir|Place|Pl|Parkway|Pkwy|Trail|Tr)\b/gi,
      
      // Address with unit numbers  
      /\b\d+[A-Za-z]?\s+[A-Za-z][A-Za-z\s\-\.]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd|Way|Circle|Cir|Place|Pl)(?:\s+(?:Unit|Apt|Apartment|Suite|Ste|#)\s*[A-Za-z0-9\-]+)?\b/gi,
      
      // Just street name with city state (for listings that omit house number)
      /\b[A-Z][a-zA-Z\s\-\.]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd|Way|Circle|Cir|Place|Pl),?\s*[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\b/gi,
      
      // City, State ZIP only
      /\b[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/g,
      
      // More flexible: any text that looks like address parts
      /\b\d+\s+[A-Za-z][A-Za-z\s\-\.]{3,30}(?:St|Ave|Rd|Dr|Ln|Ct|Blvd|Way|Cir|Pl)\b/gi
    ];
    
    this.log.debug(`🔎 Testing ${addressPatterns.length} address patterns...`);
    
    for (let i = 0; i < addressPatterns.length; i++) {
      const pattern = addressPatterns[i];
      const matches = text.match(pattern);
      
      if (matches) {
        this.log.debug(`🎯 Pattern ${i + 1} found ${matches.length} matches: ${JSON.stringify(matches)}`);
        
        for (const match of matches) {
          const cleanMatch = match.trim();
          this.log.debug(`🧪 Testing match: "${cleanMatch}"`);
          
          if (this.isValidAddress(cleanMatch)) {
            this.log.debug(`✅ Found valid address via pattern ${i + 1}: ${cleanMatch}`);
            return cleanMatch;
          } else {
            this.log.debug(`❌ Invalid address from pattern ${i + 1}: ${cleanMatch}`);
          }
        }
      } else {
        this.log.debug(`❌ Pattern ${i + 1} found no matches`);
      }
    }
    
    // Fallback: look for any text that might be an address in child elements
    const allTextElements = element.querySelectorAll('*');
    for (const el of allTextElements) {
      const elText = el.textContent?.trim();
      if (elText && elText.length > 10 && elText.length < 100) {
        // Simple check for address-like strings
        if (/\d+.*[A-Za-z].*(?:St|Ave|Rd|Dr|Ln|Ct|Blvd|Way|Cir|Pl)/i.test(elText)) {
          this.log.debug(`🔍 Found potential address in child element: "${elText}"`);
          if (this.isValidAddress(elText)) {
            this.log.debug(`✅ Valid address from child element: ${elText}`);
            return elText;
          }
        }
      }
    }
    
    this.log.debug(`❌ No valid address found in text: "${text.substring(0, 100)}..."`);
    return null;
  }

  // Text-based extraction fallback
  extractListingsFromTextWithLimit(listings, remainingSlots) {
    if (remainingSlots <= 0) return;
    
    this.log.debug(`🔍 Text-based extraction for ${remainingSlots} remaining slots`);
    
    // This will contain text parsing logic for fallback extraction
    const pageText = document.body.textContent || '';
    const propertyMatches = pageText.match(/\$[\d,]+(?:\.\d+)?[KMB]?\s+[^$]*?\d+\s+[\w\s]+(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way)/gi) || [];
    
    let added = 0;
    for (let i = 0; i < propertyMatches.length && added < remainingSlots; i++) {
      const match = propertyMatches[i];
      const listing = this.parseListingFromText(match, `text-${i}`);
      
      if (listing && listing.address && listing.price) {
        // Check for duplicates
        const isDuplicate = this.isListingDuplicate(listing, listings.active, listings.sold);
        
        if (!isDuplicate) {
          listings.active.push(listing);
          added++;
          listings.metadata.totalExtracted++;
        }
      }
    }
    
  }

  // Parse listing from text
  parseListingFromText(text, index) {
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
    const addressMatch = text.match(/\d+\s+[\w\s]+(?:St|Ave|Dr|Rd|Ln|Ct|Blvd|Way)/i);
    
    if (!priceMatch || !addressMatch) return null;
    
    return {
      id: `text-listing-${index}`,
      address: addressMatch[0].trim(),
      price: priceMatch[0],
      source: 'text-extraction',
      index: index
    };
  }

  // Basic duplicate detection
  isListingDuplicate(newListing, activeListings, soldListings) {
    const allListings = [...activeListings, ...soldListings];
    
    return allListings.some(existing => {
      // Compare by address and price
      const addressMatch = existing.address && newListing.address && 
                          existing.address.toLowerCase().includes(newListing.address.toLowerCase().substring(0, 20));
      const priceMatch = existing.price === newListing.price;
      
      return addressMatch && priceMatch;
    });
  }
}

// Make ListingsExtractor available globally
window.ListingsExtractor = ListingsExtractor;

// Log successful module load
if (typeof console !== 'undefined') {
  console.log('🏠 ListingsExtractor module loaded successfully');
}
