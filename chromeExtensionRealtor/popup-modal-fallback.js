/**
 * Modal Fallback for Popup System
 * 
 * This module provides modal fallback functionality when tab opening is blocked.
 * Creates an overlay modal with the same enhanced design as the tab version.
 */

class PopupModalFallback {
  
  constructor() {
    this.log = console;
  }

  /**
   * Show data in modal fallback when tab opening fails
   * @param {Object} data - The extracted data
   */
  showDataModalFallback(data) {
    // Remove any existing modal
    this.removeExistingModal();
    
    // Generate extraction summary
    const summary = this.generateExtractionSummary(data);
    
    // Create modal HTML
    const modalHtml = this.generateModalHTML(data, summary);
    
    // Create and show modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Setup modal interactions
    this.setupModalListeners();
    
    this.log.info('📊 Data modal fallback displayed');
  }

  /**
   * Remove any existing modal from the page
   */
  removeExistingModal() {
    const existingModal = document.getElementById('realtor-data-modal');
    if (existingModal) {
      existingModal.remove();
    }
  }

  /**
   * Generate modal HTML content
   * @param {Object} data - The extracted data
   * @param {Object} summary - The extraction summary
   * @returns {string} Modal HTML
   */
  generateModalHTML(data, summary) {
    const htmlGenerator = new PopupHtmlGenerator();
    const sectionGenerator = new PopupSectionGenerator();
    
    return `
      <div id="realtor-data-modal" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; 
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.3s ease;
      ">
        <div style="
          background: white; border-radius: 12px; 
          max-width: 90vw; max-height: 90vh; 
          overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease;
        ">
          <div style="
            position: sticky; top: 0; background: linear-gradient(135deg, #3498db, #2980b9); 
            color: white; padding: 15px; border-radius: 12px 12px 0 0;
            display: flex; justify-content: space-between; align-items: center;
            z-index: 1;
          ">
            <div>
              <h2 style="margin: 0; font-size: 18px;">🏠 Realtor Data Extraction Results</h2>
              <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">${summary.url}</div>
            </div>
            <button onclick="document.getElementById('realtor-data-modal').remove()" style="
              background: rgba(255,255,255,0.2); border: none; color: white; 
              padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;
              transition: background 0.2s ease;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
              ❌ Close
            </button>
          </div>
          
          <div style="padding: 20px;">
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">📊 Extraction Summary</h3>
              <div style="
                display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); 
                gap: 12px; margin-bottom: 15px;
              ">
                <div style="
                  background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center;
                  border-left: 3px solid ${this.getQualityColor(summary.qualityScore)};
                ">
                  <div style="font-size: 20px; font-weight: 600; color: #2c3e50;">${Math.round(summary.qualityScore)}%</div>
                  <div style="font-size: 11px; color: #7f8c8d;">Quality</div>
                </div>
                <div style="
                  background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center;
                  border-left: 3px solid #3498db;
                ">
                  <div style="font-size: 20px; font-weight: 600; color: #2c3e50;">${summary.agentFields}</div>
                  <div style="font-size: 11px; color: #7f8c8d;">Agent</div>
                </div>
                <div style="
                  background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center;
                  border-left: 3px solid #3498db;
                ">
                  <div style="font-size: 20px; font-weight: 600; color: #2c3e50;">${summary.propertyFields}</div>
                  <div style="font-size: 11px; color: #7f8c8d;">Properties</div>
                </div>
                <div style="
                  background: #f8f9fa; padding: 12px; border-radius: 6px; text-align: center;
                  border-left: 3px solid #3498db;
                ">
                  <div style="font-size: 20px; font-weight: 600; color: #2c3e50;">${summary.reviewFields}</div>
                  <div style="font-size: 11px; color: #7f8c8d;">Reviews</div>
                </div>
              </div>
            </div>
            
            <div style="
              background: #f8fafc; border-radius: 8px; 
              border: 1px solid #e2e8f0; overflow: hidden;
            ">
              ${sectionGenerator.createAgentInfoSection(data)}
              ${sectionGenerator.createPropertyInfoSection(data)}
              ${sectionGenerator.createContactInfoSection(data)}
              ${sectionGenerator.createReviewsInfoSection(data)}
              ${sectionGenerator.createRawDataSection(data)}
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
              <button onclick="window.print()" style="
                background: #007bff; color: white; border: none; padding: 8px 16px; 
                border-radius: 4px; margin: 0 4px; cursor: pointer; font-size: 12px;
              ">🖨️ Print</button>
              <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(data).replace(/"/g, '&quot;')}, null, 2))" style="
                background: #28a745; color: white; border: none; padding: 8px 16px; 
                border-radius: 4px; margin: 0 4px; cursor: pointer; font-size: 12px;
              ">📋 Copy JSON</button>
              <button onclick="window.open('${summary.url}', '_blank')" style="
                background: #17a2b8; color: white; border: none; padding: 8px 16px; 
                border-radius: 4px; margin: 0 4px; cursor: pointer; font-size: 12px;
              ">🔗 View Source</button>
            </div>
          </div>
        </div>
        
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: scale(0.9) translateY(-20px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        </style>
      </div>
    `;
  }

  /**
   * Setup modal event listeners
   */
  setupModalListeners() {
    const modal = document.getElementById('realtor-data-modal');
    if (!modal) return;
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Generate extraction summary (simplified version)
   * @param {Object} data - The extracted data
   * @returns {Object} Summary statistics
   */
  generateExtractionSummary(data) {
    const agent = data.agent || {};
    
    // Handle both properties and listings data structures
    const properties = data.properties || [];
    const listings = data.listings || {};
    const allListings = [
      ...(listings.active || []),
      ...(listings.sold || [])
    ];
    const propertyCount = properties.length > 0 ? properties.length : allListings.length;
    
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
    
    const contact = data.contact || {};
    
    const agentFields = this.countExtractedFields(agent);
    const propertyFields = propertyCount;
    const reviewFields = reviewCount;
    const contactFields = this.countExtractedFields(contact);
    
    const totalFields = agentFields + propertyFields + reviewFields + contactFields;
    const qualityScore = Math.min(100, (totalFields / 20) * 100);
    
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
   * Get quality color based on score
   * @param {number} score - Quality score (0-100)
   * @returns {string} Color value
   */
  getQualityColor(score) {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  }
}

// Export for use in popup system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupModalFallback;
} else {
  window.PopupModalFallback = PopupModalFallback;
}
