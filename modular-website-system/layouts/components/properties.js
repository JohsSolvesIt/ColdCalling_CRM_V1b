/**
 * Properties Component Variants
 * Real estate property listings display
 */

// Helper function to validate property field values
const isValidPropertyValue = (value) => {
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
           lowerValue !== 'not available' &&
           lowerValue !== 'not provided' &&
           lowerValue !== 'unknown';
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  return true;
};

const propertiesComponents = {
  /**
   * Simple list format
   */
  'properties-list': (data) => {
    const properties = data.properties || [];
    
    if (properties.length === 0) {
      return '';
    }

    const propertyItems = properties.map(property => {
      const price = property.price_formatted || property.price || 'Contact for price';
      const address = property.address || 'Property Address Available';
      
      const details = [];
      if (isValidPropertyValue(property.bedrooms)) details.push(`${property.bedrooms} bed`);
      if (isValidPropertyValue(property.bathrooms)) details.push(`${property.bathrooms} bath`);
      if (isValidPropertyValue(property.square_feet)) details.push(`${property.square_feet.toLocaleString()} sqft`);
      
      const detailsText = details.length > 0 ? `<p class="property-specs">${details.join(' • ')}</p>` : '';
      const description = isValidPropertyValue(property.description) ? `<p class="property-description">${property.description}</p>` : '';

      return `
        <div class="property-item">
          <div class="property-header">
            <h4 class="property-address">${address}</h4>
            <span class="property-price">${price}</span>
          </div>
          ${detailsText}
          ${description}
        </div>`;
    }).join('');

    return `
    <section class="properties-component properties-list">
      <h2>Featured Properties</h2>
      <div class="properties-list-container">
        ${propertyItems}
      </div>
    </section>`;
  },

  /**
   * Grid layout for properties
   */
  'properties-grid': (data) => {
    const properties = data.properties || [];
    
    if (properties.length === 0) {
      return '';
    }

    const propertyCards = properties.map(property => {
      const price = property.price_formatted || property.price || 'Contact for price';
      const address = property.address || 'Property Address Available';
      
      const specs = [];
      if (isValidPropertyValue(property.bedrooms)) specs.push(`<span class="spec">${property.bedrooms} 🛏️</span>`);
      if (isValidPropertyValue(property.bathrooms)) specs.push(`<span class="spec">${property.bathrooms} 🛁</span>`);
      if (isValidPropertyValue(property.square_feet)) specs.push(`<span class="spec">${property.square_feet.toLocaleString()} sq ft</span>`);
      
      const specsHTML = specs.length > 0 ? `<div class="property-specs">${specs.join('')}</div>` : '';
      const description = isValidPropertyValue(property.description) ? 
        `<p class="property-description">${property.description.substring(0, 100)}${property.description.length > 100 ? '...' : ''}</p>` : 
        '';

      return `
        <div class="property-card">
          <div class="property-card-header">
            <h4 class="property-address">${address}</h4>
            <div class="property-price">${price}</div>
          </div>
          ${specsHTML}
          ${description}
        </div>`;
    }).join('');

    return `
    <section class="properties-component properties-grid">
      <h2>Featured Properties</h2>
      <div class="properties-grid-container">
        ${propertyCards}
      </div>
    </section>`;
  },

  /**
   * Carousel/slider format (horizontal scrolling)
   */
  'properties-carousel': (data) => {
    const properties = data.properties || [];
    
    if (properties.length === 0) {
      return '';
    }

    const propertySlides = properties.map((property, index) => {
      const price = property.price_formatted || property.price || 'Contact for price';
      const address = property.address || 'Property Address Available';
      
      const highlights = [];
      if (isValidPropertyValue(property.bedrooms)) highlights.push(`${property.bedrooms} Bedroom${property.bedrooms !== 1 ? 's' : ''}`);
      if (isValidPropertyValue(property.bathrooms)) highlights.push(`${property.bathrooms} Bathroom${property.bathrooms !== 1 ? 's' : ''}`);
      if (isValidPropertyValue(property.square_feet)) highlights.push(`${property.square_feet.toLocaleString()} sq ft`);
      
      const highlightsHTML = highlights.length > 0 ? 
        `<ul class="property-highlights">${highlights.map(h => `<li>${h}</li>`).join('')}</ul>` : 
        '';

      return `
        <div class="property-slide" data-slide="${index}">
          <div class="property-slide-content">
            <div class="property-price-badge">${price}</div>
            <h4 class="property-address">${address}</h4>
            ${highlightsHTML}
            ${isValidPropertyValue(property.description) ? `<p class="property-summary">${property.description.substring(0, 120)}...</p>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
    <section class="properties-component properties-carousel">
      <h2>Featured Properties</h2>
      <div class="properties-carousel-container">
        <div class="properties-carousel-track">
          ${propertySlides}
        </div>
        ${properties.length > 1 ? `
        <div class="carousel-controls">
          <button class="carousel-btn carousel-prev">‹</button>
          <div class="carousel-dots">
            ${properties.map((_, i) => `<button class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></button>`).join('')}
          </div>
          <button class="carousel-btn carousel-next">›</button>
        </div>` : ''}
      </div>
    </section>`;
  },

  /**
   * Compact summary format
   */
  'properties-summary': (data) => {
    const properties = data.properties || [];
    
    if (properties.length === 0) {
      return '';
    }

    // Calculate summary stats
    const totalProperties = properties.length;
    const prices = properties
      .map(p => parseFloat(p.price || 0))
      .filter(price => price > 0);
    
    const avgPrice = prices.length > 0 ? 
      `$${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length / 1000)}K` : 
      'Varies';

    const priceRange = prices.length > 1 ? 
      `$${Math.round(Math.min(...prices) / 1000)}K - $${Math.round(Math.max(...prices) / 1000)}K` : 
      '';

    // Show top 3 properties
    const featuredProperties = properties.slice(0, 3).map(property => {
      const price = property.price_formatted || property.price || 'Contact for price';
      const address = property.address || 'Property Available';
      
      return `
        <div class="property-summary-item">
          <span class="property-summary-address">${address}</span>
          <span class="property-summary-price">${price}</span>
        </div>`;
    }).join('');

    return `
    <section class="properties-component properties-summary">
      <h2>Property Portfolio</h2>
      <div class="portfolio-stats">
        <div class="portfolio-stat">
          <span class="stat-value">${totalProperties}</span>
          <span class="stat-label">Properties</span>
        </div>
        <div class="portfolio-stat">
          <span class="stat-value">${avgPrice}</span>
          <span class="stat-label">Avg Price</span>
        </div>
        ${priceRange ? `
        <div class="portfolio-stat">
          <span class="stat-value">${priceRange}</span>
          <span class="stat-label">Price Range</span>
        </div>` : ''}
      </div>
      
      ${totalProperties > 0 ? `
      <div class="featured-properties">
        <h4>Featured Listings</h4>
        ${featuredProperties}
        ${totalProperties > 3 ? `<p class="more-properties">+ ${totalProperties - 3} more properties available</p>` : ''}
      </div>` : ''}
    </section>`;
  }
};

module.exports = {
  render: (variant, data) => {
    const renderer = propertiesComponents[variant] || propertiesComponents['properties-list'];
    return renderer(data);
  },
  
  getVariants: () => Object.keys(propertiesComponents)
};
