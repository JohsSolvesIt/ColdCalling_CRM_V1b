/**
 * Section Generator for Popup System
 * 
 * This module generates individual content sections (agent, properties, contact, reviews, etc.)
 * for the popup display with enhanced informational design.
 */

class PopupSectionGenerator {

  /**
   * Create agent information section
   * @param {Object} data - The extracted data
   * @returns {string} HTML for agent section
   */
  createAgentInfoSection(data) {
    const agent = data.agent || {};
    const photos = data.agentPhotos || [];
    
    return `
      <div class="info-section" style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          👤 Agent Information
        </h3>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start;">
          ${photos.length > 0 ? `
            <div class="agent-photos" style="display: flex; gap: 4px;">
              ${photos.slice(0, 2).map(photo => `
                <img src="${photo}" alt="Agent" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0;" onerror="this.style.display='none'">
              `).join('')}
            </div>
          ` : ''}
          <div class="agent-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; font-size: 13px;">
            ${agent.name ? `<div>👤 <strong>${agent.name}</strong></div>` : ''}
            ${agent.title ? `<div>💼 ${agent.title}</div>` : ''}
            ${agent.company ? `<div>🏢 ${agent.company}</div>` : ''}
            ${agent.license ? `<div>📄 License: ${agent.license}</div>` : ''}
            ${agent.experience ? `<div>📈 ${agent.experience}</div>` : ''}
            ${agent.specialties ? `<div>⭐ ${agent.specialties}</div>` : ''}
            ${agent.rating ? `<div>⭐ Rating: ${agent.rating}</div>` : ''}
            ${agent.salesVolume ? `<div>💰 Sales: ${agent.salesVolume}</div>` : ''}
            ${agent.languages ? `<div>🌐 ${agent.languages}</div>` : ''}
            ${agent.certifications ? `<div>🏆 ${agent.certifications}</div>` : ''}
          </div>
        </div>
        ${agent.bio ? `
          <div style="margin-top: 8px; padding: 8px; background: #f8fafc; border-radius: 4px; border-left: 2px solid #3b82f6;">
            <div style="font-size: 12px; line-height: 1.4; color: #334155;">${agent.bio.slice(0, 300)}${agent.bio.length > 300 ? '...' : ''}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Create property information section
   * @param {Object} data - The extracted data
   * @returns {string} HTML for property section
   */
  createPropertyInfoSection(data) {
    // Handle both properties and listings data structures
    let properties = data.properties || [];
    
    // If no properties but we have listings, use those
    if (properties.length === 0 && data.listings) {
      const listings = data.listings;
      properties = [
        ...(listings.active || []),
        ...(listings.sold || [])
      ];
    }
    
    if (properties.length === 0) {
      return `
        <div class="info-section" style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            🏠 Properties <span style="background: #ef4444; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 500;">0 found</span>
          </h3>
          <p style="color: #64748b; margin: 0; font-size: 13px;">No property listings found on this page.</p>
        </div>
      `;
    }

    return `
      <div class="info-section" style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          🏠 Properties <span style="background: #10b981; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 500;">${properties.length} found</span>
        </h3>
        <div class="properties-grid" style="display: grid; gap: 8px;">
          ${properties.slice(0, 8).map((property, index) => `
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f8fafc;">
              <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: start;">
                ${property.images && property.images.length > 0 ? `
                  <div class="property-images" style="display: flex; flex-wrap: wrap; gap: 4px; max-width: 120px;">
                    ${property.images.slice(0, 3).map(img => `
                      <img src="${img}" alt="Property" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover; border: 1px solid #e2e8f0;" onerror="this.style.display='none'">
                    `).join('')}
                  </div>
                ` : ''}
                <div class="property-details" style="min-width: 0;">
                  ${property.address ? `<div style="font-weight: 600; color: #1e293b; margin-bottom: 4px; font-size: 13px; line-height: 1.3;">${property.address}</div>` : ''}
                  ${property.description ? `<div style="color: #64748b; font-size: 12px; margin-bottom: 4px; line-height: 1.2;">${property.description.slice(0, 120)}${property.description.length > 120 ? '...' : ''}</div>` : ''}
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 4px; font-size: 11px;">
                    ${property.price ? `<div><strong style="color: #dc2626;">${property.price}</strong></div>` : ''}
                    ${property.beds ? `<div>🛏️ ${property.beds}</div>` : ''}
                    ${property.baths ? `<div>🚿 ${property.baths}</div>` : ''}
                    ${property.sqft ? `<div>📐 ${property.sqft}</div>` : ''}
                    ${property.type ? `<div>🏠 ${property.type}</div>` : ''}
                    ${property.status ? `<div>📊 ${property.status}</div>` : ''}
                    ${property.lotSize ? `<div>🌲 ${property.lotSize}</div>` : ''}
                    ${property.yearBuilt ? `<div>🗓️ ${property.yearBuilt}</div>` : ''}
                    ${property.daysOnMarket ? `<div>📅 ${property.daysOnMarket} days</div>` : ''}
                    ${property.hoa ? `<div>🏘️ ${property.hoa}</div>` : ''}
                  </div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #94a3b8;">
                  ${property.mls ? `<div>MLS: ${property.mls}</div>` : ''}
                  ${property.listDate ? `<div>Listed: ${property.listDate}</div>` : ''}
                  ${property.priceHistory ? `<div>📈 ${property.priceHistory.length} changes</div>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
          ${properties.length > 8 ? `
            <div style="text-align: center; padding: 6px; color: #64748b; font-style: italic; font-size: 11px;">
              ... and ${properties.length - 8} more properties (see raw data below)
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Create contact information section
   * @param {Object} data - The extracted data
   * @returns {string} HTML for contact section
   */
  createContactInfoSection(data) {
    const contact = data.contact || {};
    const hasContact = contact.phone || contact.email || contact.website || contact.address;
    
    return `
      <div class="info-section" style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          📞 Contact Information ${hasContact ? '' : '<span style="background: #ef4444; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 500;">Limited</span>'}
        </h3>
        ${hasContact ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 13px;">
            ${contact.phone ? `<div>📱 <strong>${contact.phone}</strong></div>` : ''}
            ${contact.email ? `<div>📧 <strong>${contact.email}</strong></div>` : ''}
            ${contact.website ? `<div>🌐 <a href="${contact.website}" target="_blank" style="color: #3b82f6; font-weight: 600;">${contact.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
            ${contact.address ? `<div>📍 <strong>${contact.address}</strong></div>` : ''}
            ${contact.officePhone ? `<div>🏢 Office: ${contact.officePhone}</div>` : ''}
            ${contact.cellPhone ? `<div>📲 Cell: ${contact.cellPhone}</div>` : ''}
            ${contact.fax ? `<div>📠 Fax: ${contact.fax}</div>` : ''}
            ${contact.licenseNumber ? `<div>📄 License: ${contact.licenseNumber}</div>` : ''}
          </div>
        ` : `
          <p style="color: #64748b; margin: 0; font-size: 13px;">Limited contact information available. Check raw data section for any additional details.</p>
        `}
      </div>
    `;
  }

  /**
   * Create reviews and testimonials section
   * @param {Object} data - The extracted data
   * @returns {string} HTML for reviews section
   */
  createReviewsInfoSection(data) {
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
    
    console.log('📝 Review processing:', {
      originalReviewsType: Array.isArray(data.reviews) ? 'array' : typeof data.reviews,
      individualReviews: data.reviews?.individual?.length || 0,
      recommendations: data.reviews?.recommendations?.length || 0,
      standalonerecommendations: data.recommendations?.length || 0,
      totalFound: allReviews.length,
      afterDeduplication: uniqueReviews.length
    });
    
    return `
      <div class="info-section" style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          ⭐ Reviews & Testimonials <span style="background: ${uniqueReviews.length > 0 ? '#10b981' : '#ef4444'}; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 500;">${uniqueReviews.length} found</span>
        </h3>
        ${uniqueReviews.length > 0 ? `
          <div class="reviews-grid" style="display: grid; gap: 8px;">
            ${uniqueReviews.slice(0, 8).map(review => `
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                  ${review.rating ? `<div style="color: #f59e0b; font-size: 12px;">${'★'.repeat(Math.floor(review.rating))} ${review.rating}/5</div>` : ''}
                  ${review.date ? `<div style="color: #94a3b8; font-size: 10px;">${review.date}</div>` : ''}
                </div>
                ${review.author ? `<div style="font-weight: 600; color: #1e293b; margin-bottom: 4px; font-size: 12px;">${review.author}</div>` : ''}
                ${review.text ? `<div style="font-size: 11px; line-height: 1.4; color: #334155;">${review.text.length > 150 ? review.text.substring(0, 150) + '...' : review.text}</div>` : ''}
                ${review.type ? `<div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">Type: ${review.type}</div>` : ''}
                ${review.source ? `<div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Source: ${review.source}</div>` : ''}
              </div>
            `).join('')}
            ${uniqueReviews.length > 4 ? `
              <div style="text-align: center; padding: 6px; color: #64748b; font-style: italic; font-size: 11px;">
                ... and ${uniqueReviews.length - 4} more reviews (see raw data below)
              </div>
            ` : ''}
          </div>
        ` : `
          <p style="color: #64748b; margin: 0; font-size: 13px;">No reviews or testimonials found on this page.</p>
        `}
      </div>
    `;
  }

  /**
   * Create raw data section with collapsible JSON
   * @param {Object} data - The extracted data
   * @returns {string} HTML for raw data section
   */
  createRawDataSection(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const escapedJson = jsonString.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `
      <div class="info-section" style="padding: 12px;">
        <details style="cursor: pointer;">
          <summary style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            📊 Raw Data (JSON) 
            <span style="background: #6366f1; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 500;">Click to expand</span>
            <button 
              onclick="navigator.clipboard.writeText('${escapedJson}').then(() => { 
                this.textContent = '✅ Copied!'; 
                setTimeout(() => this.textContent = '📋 Copy JSON', 1500); 
              }).catch(() => { 
                this.textContent = '❌ Failed'; 
                setTimeout(() => this.textContent = '📋 Copy JSON', 1500); 
              })" 
              style="background: #10b981; color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; cursor: pointer; margin-left: auto;">
              📋 Copy JSON
            </button>
          </summary>
          <div style="position: relative;">
            <button 
              onclick="navigator.clipboard.writeText('${escapedJson}').then(() => { 
                this.textContent = '✅ Copied!'; 
                setTimeout(() => this.textContent = '📋 Copy', 1500); 
              }).catch(() => { 
                this.textContent = '❌ Failed'; 
                setTimeout(() => this.textContent = '📋 Copy', 1500); 
              })" 
              style="position: absolute; top: 8px; right: 8px; background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; cursor: pointer; z-index: 10;">
              📋 Copy
            </button>
            <pre style="background: #f1f5f9; padding: 10px; border-radius: 6px; overflow: auto; max-height: 300px; font-size: 10px; line-height: 1.3; border: 1px solid #e2e8f0; margin: 6px 0 0 0; padding-right: 80px;">${jsonString}</pre>
          </div>
        </details>
      </div>
    `;
  }
}

// Export for use in HTML generator
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupSectionGenerator;
} else {
  window.PopupSectionGenerator = PopupSectionGenerator;
}
