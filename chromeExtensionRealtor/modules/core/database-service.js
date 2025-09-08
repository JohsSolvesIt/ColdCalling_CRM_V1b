// Database service for Chrome Extension Data Extractor
// Handles data persistence and cleaning operations

// Import logging utilities
// Note: In Chrome extensions, we'll use global variables for now
// const { log } = require('./logging-utils');

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
      if (typeof log !== 'undefined') {
        log.debug('🔗 Database service connection:', this.isConnected ? 'Connected' : 'Disconnected');
      }
      return this.isConnected;
    } catch (error) {
      if (typeof log !== 'undefined') {
        log.warn('Database service not available:', error.message);
      }
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

      if (typeof log !== 'undefined') {
        log.debug('💾 Saving data to database...', payload);
      }

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
      if (typeof log !== 'undefined') {
        log.debug('✅ Data saved successfully:', result);
      }
      return result;

    } catch (error) {
      if (typeof log !== 'undefined') {
        log.error('❌ Error saving to database:', error);
      }
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
        if (typeof log !== 'undefined') {
          log.warn('Could not check for duplicates');
        }
        return { isDuplicate: false, existingAgent: null };
      }

      const result = await response.json();
      return result;

    } catch (error) {
      if (typeof log !== 'undefined') {
        log.warn('Error checking for duplicates:', error);
      }
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
    }).filter(prop => 
      prop.property_id || 
      (prop.address && !prop.address.startsWith('Sold -')) // Require real addresses, not placeholders
    ); // Keep properties with ID or real address
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
    if (typeof log !== 'undefined') {
      log.debug('🔧 enhanceImageQuality called with:', url, isProfile);
      log.debug('🔧 this object keys:', Object.getOwnPropertyNames(this));
    }
    
    if (!url || typeof url !== 'string') return url;
    
    // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
    if (!url.includes('rdcpix.com')) return url;
    
    try {
      // Determine target dimensions based on image type
      const targetWidth = isProfile ? 768 : 1024;
      const targetHeight = isProfile ? 768 : 1024;
      
      // Enhanced pattern to handle both width-only and width+height patterns
      // Handles formats like: -w260_h260, -w260, -c0rd-w260_h260
      const widthHeightPattern = /-w(\d+)_h(\d+)/i;
      const widthOnlyPattern = /-w(\d+)/i;
      
      // Check for width+height pattern first (realtor profile pictures)
      const whMatch = url.match(widthHeightPattern);
      if (whMatch) {
        const currentWidth = parseInt(whMatch[1]);
        const currentHeight = parseInt(whMatch[2]);
        
        // Special handling for 260x260 realtor profile pictures - always upgrade to 768x768
        if (currentWidth === 260 && currentHeight === 260) {
          const enhancedUrl = url.replace(widthHeightPattern, `-w${targetWidth}_h${targetHeight}`);
          if (typeof log !== 'undefined') {
            log.debug(`🖼️ Enhanced realtor profile picture: ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
          }
          return enhancedUrl;
        }
        
        // For other dimensions, only enhance if both are smaller than target
        if (currentWidth < targetWidth && currentHeight < targetHeight) {
          const enhancedUrl = url.replace(widthHeightPattern, `-w${targetWidth}_h${targetHeight}`);
          if (typeof log !== 'undefined') {
            log.debug(`🖼️ Enhanced image quality (w+h): ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
          }
          return enhancedUrl;
        }
      } else {
        // Handle width-only pattern (existing logic)
        const wMatch = url.match(widthOnlyPattern);
        if (wMatch) {
          const currentWidth = parseInt(wMatch[1]);
          // Only enhance if current width is smaller than target
          if (currentWidth < targetWidth) {
            const enhancedUrl = url.replace(widthOnlyPattern, `-w${targetWidth}`);
            if (typeof log !== 'undefined') {
              log.debug(`🖼️ Enhanced image quality (w only): ${url.substring(0, 50)}... → ${enhancedUrl.substring(0, 50)}...`);
            }
            return enhancedUrl;
          }
        }
      }
      
      // If no width parameter found or current dimensions are already good, return original
      return url;
      
    } catch (error) {
      if (typeof log !== 'undefined') {
        log.warn('⚠️ Failed to enhance image quality:', error);
      }
      return url;
    }
  }

  // Generate multiple candidate URLs for robust image quality enhancement
  generateImageCandidates(url, isProfile = false) {
    if (!url || typeof url !== 'string') return [url];
    
    // Check if this is an rdcpix URL (Realtor.com Akamai CDN)
    if (!url.includes('rdcpix.com')) return [url];
    
    try {
      const widthHeightPattern = /-w(\d+)_h(\d+)/i;
      const widthOnlyPattern = /-w(\d+)/i;
      
      const candidates = [];
      
      // Check for width+height pattern first (realtor profile pictures)
      const whMatch = url.match(widthHeightPattern);
      if (whMatch) {
        const currentWidth = parseInt(whMatch[1]);
        const currentHeight = parseInt(whMatch[2]);
        
        // Generate candidates for width+height format
        const dimensions = isProfile ? 
          [{w: 768, h: 768}, {w: 512, h: 512}, {w: 600, h: 600}, {w: 400, h: 400}] :
          [{w: 1024, h: 1024}, {w: 1200, h: 1200}, {w: 800, h: 800}, {w: 600, h: 600}];
        
        for (const dim of dimensions) {
          if (dim.w >= currentWidth && dim.h >= currentHeight) {
            const candidate = url.replace(widthHeightPattern, `-w${dim.w}_h${dim.h}`);
            candidates.push(candidate);
          }
        }
      } else {
        // Handle width-only pattern (existing logic)
        const wMatch = url.match(widthOnlyPattern);
        if (wMatch) {
          const currentWidth = parseInt(wMatch[1]);
          
          // Determine target widths based on image type
          const widths = isProfile ? [768, 512, 600, 400, 300] : [1024, 1200, 800, 600];
          
          // Generate candidates by replacing width, preserving everything else
          for (const width of widths) {
            if (width >= currentWidth) { // Only try larger or equal widths
              const candidate = url.replace(widthOnlyPattern, `-w${width}`);
              candidates.push(candidate);
            }
          }
        }
      }
      
      // Always include original as fallback
      if (!candidates.includes(url)) {
        candidates.push(url);
      }
      
      return candidates;
      
    } catch (error) {
      if (typeof log !== 'undefined') {
        log.warn('⚠️ Failed to generate image candidates:', error);
      }
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

// Make DatabaseService available globally for backward compatibility
if (typeof window !== 'undefined') {
  window.DatabaseService = DatabaseService;
  if (typeof log !== 'undefined') {
    log.debug('🔧 DatabaseService loaded and attached to window');
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseService };
}
