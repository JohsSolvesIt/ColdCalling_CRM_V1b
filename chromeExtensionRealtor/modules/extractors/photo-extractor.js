// Photo and Image Extraction Module
// Extracted from content.js for modularization

window.PhotoExtractor = class PhotoExtractor {
  constructor() {
    // Initialize logging with comprehensive fallbacks
    this.initializeLogging();
  }

  initializeLogging() {
    try {
      // First, try to use the global log object
      if (typeof window !== 'undefined' && window.log && typeof window.log.debug === 'function') {
        this.log = window.log;
        return;
      }

      // Second, try to use log if it exists
      if (typeof log !== 'undefined' && typeof log.debug === 'function') {
        this.log = log;
        return;
      }

      // Third, create a fallback logger that uses console
      this.log = {
        debug: (...args) => console.log('[PhotoExtractor DEBUG]', ...args),
        info: (...args) => console.log('[PhotoExtractor INFO]', ...args),
        warn: (...args) => console.warn('[PhotoExtractor WARN]', ...args),
        error: (...args) => console.error('[PhotoExtractor ERROR]', ...args)
      };
    } catch (error) {
      // Ultimate fallback - basic console logging
      this.log = {
        debug: (...args) => console.log('[PhotoExtractor DEBUG]', ...args),
        info: (...args) => console.log('[PhotoExtractor INFO]', ...args),
        warn: (...args) => console.warn('[PhotoExtractor WARN]', ...args),
        error: (...args) => console.error('[PhotoExtractor ERROR]', ...args)
      };
    }
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

  // Helper method to access utility functions from main extractor
  getAttribute(selectors, attribute) {
    // Access the method from the global extractor if available
    if (window.extractor && window.extractor.getAttribute) {
      return window.extractor.getAttribute(selectors, attribute);
    }
    
    // Fallback implementation
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.hasAttribute(attribute)) {
        return element.getAttribute(attribute);
      }
    }
    return null;
  }

  // Placeholder methods - will be implemented in parts
  extractAllPropertyPhotosFromPage() {
    log.debug('🏠 Extracting all property photos from the current page...');
    
    const propertyPhotos = {
      byListing: [],
      allUrls: [],
      metadata: {
        totalFound: 0,
        extractedAt: new Date().toISOString(),
        pageUrl: window.location.href,
        listingsWithPhotos: 0
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
      const photos = this.extractPhotosFromElement(propertyEl);
      
      if (photos && photos.length > 0) {
        // Try to get property details for this element
        const propertyData = {
          elementIndex: index,
          address: this.extractSimpleAddress(propertyEl),
          price: this.extractSimplePrice(propertyEl),
          photos: photos,
          photoCount: photos.length
        };

        propertyPhotos.byListing.push(propertyData);
        propertyPhotos.metadata.listingsWithPhotos++;
        
        // Add to flat array as well
        photos.forEach(photoUrl => {
          if (!propertyPhotos.allUrls.includes(photoUrl)) {
            propertyPhotos.allUrls.push(photoUrl);
          }
        });
      }
    });

    propertyPhotos.metadata.totalFound = propertyPhotos.allUrls.length;
    
    log.debug(`🏠 Extracted ${propertyPhotos.metadata.totalFound} total photos from ${propertyPhotos.metadata.listingsWithPhotos} listings`);
    
    return propertyPhotos;
  }

  // Helper methods for property photo extraction
  extractPhotosFromElement(element) {
    const photos = [];
    const images = element.querySelectorAll('img');
    
    images.forEach(img => {
      if (this.isValidPropertyImage({src: img.src, alt: img.alt || '', element: img})) {
        const normalizedUrl = this.normalizeImageUrl(img.src);
        if (normalizedUrl && !photos.includes(normalizedUrl)) {
          photos.push(normalizedUrl);
        }
      }
    });
    
    return photos;
  }

  extractSimpleAddress(element) {
    // Simple address extraction from element text
    const text = element.textContent || '';
    const addressPatterns = [
      /\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place)/i,
      /\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+/
    ];
    
    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    
    return null;
  }

  extractSimplePrice(element) {
    // Simple price extraction from element text
    const text = element.textContent || '';
    const priceMatch = text.match(/\$[\d,]+/);
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
      this.log.debug('⚠️ enhanceImageQuality method not found, returning normalized URL as-is');
      return normalizedUrl;
    }
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
        this.log.debug(`❌ Image too small: ${width}x${height}`);
        return false;
      }
      
      // Skip extremely wide or tall images (likely UI elements) - MADE MORE FLEXIBLE
      if (width > 0 && height > 0) {
        const aspectRatio = width / height;
        if (aspectRatio > 8 || aspectRatio < 0.125) { // Was more restrictive
          this.log.debug(`❌ Image bad aspect ratio: ${aspectRatio} (${width}x${height})`);
          return false;
        }
      }
    }
    
    this.log.debug(`✅ Image passed validation: ${src.substring(0, 50)}`);
    return true;
  }

  // Extract all property photos from the entire page
  extractAllPropertyPhotosFromPage() {
    this.log.debug('🏠 Extracting all property photos from the current page...');
    
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
        this.log.warn('Property selector failed:', selector, e);
      }
    });

    this.log.debug(`Found ${allPropertyElements.length} potential property elements`);

    // Extract images from each property element
    allPropertyElements.forEach((propertyEl, index) => {
      const photos = this.extractPhotosFromElement(propertyEl);
      
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

    this.log.debug('🏠 Property photo extraction summary:', {
      totalPhotos: propertyPhotos.metadata.totalFound,
      listingsWithPhotos: propertyPhotos.metadata.listingsWithPhotos,
      averagePhotosPerListing: propertyPhotos.byListing.length > 0 ? 
        (propertyPhotos.metadata.totalFound / propertyPhotos.byListing.length).toFixed(1) : 0
    });

    return propertyPhotos;
  }

  // Helper method to extract address from element
  extractAddress(element, text) {
    // Try common address selectors first
    const addressSelectors = [
      '[data-testid*="address"]',
      '.address',
      '[class*="address"]',
      '[class*="Address"]'
    ];
    
    for (const selector of addressSelectors) {
      const addressEl = element.querySelector(selector);
      if (addressEl) {
        return addressEl.textContent.trim();
      }
    }
    
    // Fallback to text pattern matching
    const addressMatch = text.match(/\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Cir|Court|Ct|Place|Pl)/i);
    return addressMatch ? addressMatch[0] : null;
  }

  // Extract all photos for a specific listing element
  extractAllListingPhotos(element) {
    this.log.debug('🖼️ Extracting images for listing element:', element);
    
    // First, try to extract property ID or unique identifier from the listing
    const propertyId = this.extractPropertyId(element);
    const propertyPrice = this.extractPropertyPrice(element);
    const propertyAddress = this.extractPropertyAddress(element);
    
    this.log.debug('🔍 Property identifiers:', { 
      id: propertyId, 
      price: propertyPrice, 
      address: propertyAddress?.substring(0, 50) + '...' 
    });

    // Strategy 1: Find images within the immediate listing element
    const immediateImages = this.extractImagesFromElement(element, 'immediate');
    if (immediateImages.length > 0) {
      this.log.debug(`✅ Found ${immediateImages.length} images in immediate element`);
      return immediateImages;
    }

    // Strategy 2: Find the specific property card that matches this listing data
    const matchedCard = this.findMatchingPropertyCard(element, propertyAddress, propertyPrice, propertyId);
    if (matchedCard) {
      this.log.debug('✅ Found matching property card');
      const cardImages = this.extractImagesFromElement(matchedCard, 'matched-card');
      if (cardImages.length > 0) {
        this.log.debug(`✅ Found ${cardImages.length} images in matched card`);
        return cardImages;
      }
    }

    // Strategy 3: Look for images in close proximity to this listing
    const proximityImages = this.extractImagesFromProximity(element, propertyAddress);
    if (proximityImages.length > 0) {
      this.log.debug(`✅ Found ${proximityImages.length} images in proximity`);
      return proximityImages;
    }

    // Strategy 4: Use property URL to find specific images
    if (propertyId) {
      const urlBasedImages = this.extractImagesByPropertyId(propertyId);
      if (urlBasedImages.length > 0) {
        this.log.debug(`✅ Found ${urlBasedImages.length} images by property ID`);
        return urlBasedImages;
      }
    }

    this.log.debug('❌ No specific images found for this property');
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
    const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
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
    const allImages = element.querySelectorAll('img');
    
    allImages.forEach(img => {
      const src = img.src;
      const alt = img.alt || '';
      
      if (src && !src.includes('data:') && this.isValidPropertyImage({src, alt, element: img})) {
        const normalizedUrl = this.normalizeImageUrl(src);
        if (normalizedUrl && !images.includes(normalizedUrl)) {
          images.push(normalizedUrl);
        }
      }
    });

    return images;
  }

  // Find matching property card based on identifiers
  findMatchingPropertyCard(element, address, price, propertyId) {
    const propertyCards = document.querySelectorAll([
      '[data-testid*="property"]',
      '.property-card',
      '.listing-card',
      '[class*="PropertyCard"]'
    ].join(','));

    for (const card of propertyCards) {
      const cardText = card.textContent || '';
      
      // Check for matching identifiers
      if (propertyId && cardText.includes(propertyId)) {
        return card;
      }
      
      if (price && cardText.includes(price)) {
        return card;
      }
      
      if (address) {
        const addressWords = address.split(' ').filter(word => word.length > 2);
        const matchingWords = addressWords.filter(word => cardText.includes(word));
        if (matchingWords.length >= Math.min(2, addressWords.length)) {
          return card;
        }
      }
    }
    
    return null;
  }

  // Extract images in proximity to the listing element
  extractImagesFromProximity(element, address) {
    const proximityImages = [];
    
    // Check parent elements for images
    let parent = element.parentElement;
    let depth = 0;
    
    while (parent && depth < 3) {
      const parentImages = this.extractImagesFromElement(parent, 'proximity');
      proximityImages.push(...parentImages);
      parent = parent.parentElement;
      depth++;
    }
    
    // Remove duplicates
    return [...new Set(proximityImages)];
  }

  // Extract images by property ID from URLs
  extractImagesByPropertyId(propertyId) {
    const images = [];
    const allImages = document.querySelectorAll('img');
    
    allImages.forEach(img => {
      const imgSrc = img.src;
      if (imgSrc.includes(propertyId) && this.isValidPropertyImage({src: imgSrc, alt: img.alt || '', element: img})) {
        const normalizedUrl = this.normalizeImageUrl(imgSrc);
        if (normalizedUrl && !images.includes(normalizedUrl)) {
          images.push(normalizedUrl);
        }
      }
    });
    
    return images;
  }
};

// Module loading confirmation
if (typeof window !== 'undefined') {
  console.log('✅ PhotoExtractor module loaded successfully');
} else {
  console.error('❌ Window object not available - PhotoExtractor not assigned');
}
