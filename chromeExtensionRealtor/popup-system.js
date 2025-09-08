/**
 * Modular Popup System for Realtor CRM Extension
 * 
 * This module handles all popup/tab display functionality for extracted realtor data.
 * Supports both tab opening and modal fallback with enhanced informational design.
 */

class PopupSystem {
  constructor() {
    this.log = console; // Can be replaced with actual logging system
    this.htmlGenerator = new PopupHtmlGenerator();
    this.modalFallback = new PopupModalFallback();
  }

  /**
   * Main entry point for displaying extracted data
   * @param {Object} data - The extracted realtor data
   */
  showDataInNewWindow(data) {
    // Generate extraction summary
    const summary = this.generateExtractionSummary(data);
    
    // Create comprehensive HTML for the data viewer window
    const htmlContent = this.htmlGenerator.generateDataViewerHTML(data, summary);
    
    // Open in new tab instead of popup window to avoid blocking
    const newTab = window.open('about:blank', '_blank');
    
    if (newTab) {
      newTab.document.write(htmlContent);
      newTab.document.close();
      
      // Add event listeners after content is loaded
      newTab.addEventListener('load', () => {
        this.setupDataViewerListeners(newTab, data);
      });
      
      this.log.info('📊 Extraction data opened in new tab');
    } else {
      // Fallback to modal if tab opening fails
      this.log.warn('Tab opening blocked, falling back to modal');
      this.modalFallback.showDataModalFallback(data);
    }
  }

  /**
   * Show data in modal fallback (delegated to modal fallback module)
   * @param {Object} data - The extracted data
   */
  showDataModalFallback(data) {
    this.modalFallback.showDataModalFallback(data);
  }

  /**
   * Generate extraction summary statistics
   * @param {Object} data - The extracted data
   * @returns {Object} Summary statistics
   */
  generateExtractionSummary(data) {
    console.log('📊 Generating extraction summary with data:', data);
    
    const agent = data.agent || {};
    
    // Handle both properties and listings data structures
    const properties = data.properties || [];
    const listings = data.listings || {};
    const allListings = [
      ...(listings.active || []),
      ...(listings.sold || [])
    ];
    const propertyCount = properties.length > 0 ? properties.length : allListings.length;
    
    console.log('🏠 Property analysis:', {
      hasProperties: properties.length > 0,
      propertiesLength: properties.length,
      hasListings: Object.keys(listings).length > 0,
      activeListings: listings.active?.length || 0,
      soldListings: listings.sold?.length || 0,
      finalPropertyCount: propertyCount
    });
    
    // Handle comprehensive review data structures  
    let allReviews = [];
    
    // Check for structured reviews object
    if (data.reviews && typeof data.reviews === 'object' && !Array.isArray(data.reviews)) {
      // Add individual reviews if they exist
      if (data.reviews.individual && Array.isArray(data.reviews.individual)) {
        allReviews = [...allReviews, ...data.reviews.individual];
      }
      
      // Add recommendations if they exist
      if (data.reviews.recommendations && Array.isArray(data.reviews.recommendations)) {
        allReviews = [...allReviews, ...data.reviews.recommendations];
      }
    }
    // Handle direct reviews array
    else if (Array.isArray(data.reviews)) {
      allReviews = data.reviews;
    }
    
    // Also check for standalone recommendations array
    if (data.recommendations && Array.isArray(data.recommendations)) {
      allReviews = [...allReviews, ...data.recommendations];
    }
    
    // Remove duplicates based on text content
    const uniqueReviews = allReviews.filter((review, index, self) => 
      index === self.findIndex(r => r.text === review.text)
    );
    
    const reviewCount = uniqueReviews.length;
    
    console.log('📝 Review analysis:', {
      reviewsType: Array.isArray(data.reviews) ? 'array' : typeof data.reviews,
      individualReviews: data.reviews?.individual?.length || 0,
      recommendations: data.reviews?.recommendations?.length || 0,
      standaloneRecommendations: data.recommendations?.length || 0,
      totalFound: allReviews.length,
      afterDeduplication: uniqueReviews.length,
      finalReviewCount: reviewCount
    });
    
    const contact = data.contact || {};
    
    // Count extracted fields
    const agentFields = this.countExtractedFields(agent);
    const propertyFields = propertyCount;
    const reviewFields = reviewCount;
    const contactFields = this.countExtractedFields(contact);
    
    const totalFields = agentFields + propertyFields + reviewFields + contactFields;
    const qualityScore = Math.min(100, (totalFields / 20) * 100); // Rough quality metric
    
    console.log('📊 Final summary stats:', {
      agentFields,
      propertyFields,
      reviewFields,
      contactFields,
      totalFields,
      qualityScore
    });
    
    return {
      totalFields,
      agentFields,
      propertyFields,
      reviewFields,
      contactFields,
      qualityScore,
      timestamp: new Date().toLocaleString(),
      url: window.location.href
    };
  }

  /**
   * Count non-empty fields in an object
   * @param {Object} obj - Object to count fields in
   * @returns {number} Number of non-empty fields
   */
  countExtractedFields(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    
    return Object.values(obj).filter(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return value !== null && value !== undefined;
    }).length;
  }

  /**
   * Format a field value for display
   * @param {any} value - The value to format
   * @returns {string} Formatted value
   */
  formatFieldValue(value) {
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} items` : 'Empty array';
    }
    if (typeof value === 'object' && value !== null) {
      return `Object (${Object.keys(value).length} properties)`;
    }
    if (typeof value === 'string') {
      return value.length > 50 ? value.substring(0, 50) + '...' : value;
    }
    return String(value);
  }

  /**
   * Setup event listeners for the data viewer window
   * @param {Window} windowObj - The popup window object
   * @param {Object} data - The extracted data
   */
  setupDataViewerListeners(windowObj, data) {
    // Add any interactive functionality here
    // For now, just log that listeners are set up
    this.log.info('📊 Data viewer listeners setup complete');
  }

  /**
   * Show extraction summary in console (for debugging)
   * @param {Object} data - The extracted data
   */
  showExtractionSummary(data) {
    const summary = this.generateExtractionSummary(data);
    this.log.info('📊 Extraction Summary:', summary);
  }
}

// Export for use in content.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupSystem;
} else {
  window.PopupSystem = PopupSystem;
}
