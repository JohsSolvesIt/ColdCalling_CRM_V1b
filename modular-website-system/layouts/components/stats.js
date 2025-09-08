/**
 * Stats Component Variants
 * Professional statistics and metrics display
 */

const statsComponents = {
  /**
   * Grid layout for statistics
   */
  'stats-grid': (data) => {
    const stats = [];

    if (data.total_properties !== undefined && data.total_properties !== null) {
      stats.push(`
        <div class="stat-item">
          <span class="stat-value">${data.total_properties}</span>
          <span class="stat-label">Properties Listed</span>
        </div>`);
    }

    if (data.experience_years) {
      stats.push(`
        <div class="stat-item">
          <span class="stat-value">${data.experience_years}</span>
          <span class="stat-label">Years Experience</span>
        </div>`);
    }

    if (data.cities_served) {
      const cityCount = Array.isArray(data.cities_served) ? 
        data.cities_served.length : 
        data.cities_served.split(',').length;
      
      stats.push(`
        <div class="stat-item">
          <span class="stat-value">${cityCount}</span>
          <span class="stat-label">Cities Served</span>
        </div>`);
    }

    if (data.avg_price) {
      const avgPriceFormatted = typeof data.avg_price === 'number' ? 
        `$${Math.round(data.avg_price / 1000)}K` : 
        data.avg_price;
      
      stats.push(`
        <div class="stat-item">
          <span class="stat-value">${avgPriceFormatted}</span>
          <span class="stat-label">Average Price</span>
        </div>`);
    }

    if (data.min_price && data.max_price) {
      const minFormatted = `$${Math.round(data.min_price / 1000)}K`;
      const maxFormatted = `$${Math.round(data.max_price / 1000)}K`;
      
      stats.push(`
        <div class="stat-item">
          <span class="stat-value">${minFormatted} - ${maxFormatted}</span>
          <span class="stat-label">Price Range</span>
        </div>`);
    }

    if (stats.length === 0) {
      stats.push(`
        <div class="stat-item">
          <span class="stat-value">Professional</span>
          <span class="stat-label">Real Estate Agent</span>
        </div>`);
    }

    return `
    <section class="stats-component stats-grid">
      <h2>Professional Statistics</h2>
      <div class="stats-grid-container">
        ${stats.join('')}
      </div>
    </section>`;
  },

  /**
   * Horizontal bar format
   */
  'stats-horizontal': (data) => {
    const stats = [];

    if (data.total_properties !== undefined && data.total_properties !== null) {
      stats.push(`<span class="stat-horizontal"><strong>${data.total_properties}</strong> Properties Listed</span>`);
    }

    if (data.experience_years) {
      stats.push(`<span class="stat-horizontal"><strong>${data.experience_years} Years</strong> Experience</span>`);
    }

    if (data.cities_served) {
      const cityCount = Array.isArray(data.cities_served) ? 
        data.cities_served.length : 
        data.cities_served.split(',').length;
      stats.push(`<span class="stat-horizontal"><strong>${cityCount}</strong> Cities Served</span>`);
    }

    if (data.avg_price) {
      const avgPriceFormatted = typeof data.avg_price === 'number' ? 
        `$${Math.round(data.avg_price / 1000)}K` : 
        data.avg_price;
      stats.push(`<span class="stat-horizontal"><strong>${avgPriceFormatted}</strong> Average Price</span>`);
    }

    return `
    <section class="stats-component stats-horizontal">
      <h2>Professional Overview</h2>
      <div class="stats-horizontal-container">
        ${stats.join(' • ')}
      </div>
    </section>`;
  },

  /**
   * Minimal key stats only
   */
  'stats-minimal': (data) => {
    const keyStats = [];

    // Prioritize most important stats
    if (data.total_properties !== undefined && data.total_properties !== null) {
      keyStats.push({
        value: data.total_properties,
        label: 'Properties',
        priority: 1
      });
    }

    if (data.experience_years) {
      keyStats.push({
        value: `${data.experience_years}+`,
        label: 'Years Experience',
        priority: 2
      });
    }

    if (data.avg_price && typeof data.avg_price === 'number') {
      keyStats.push({
        value: `$${Math.round(data.avg_price / 1000)}K`,
        label: 'Avg Price',
        priority: 3
      });
    }

    // Sort by priority and take top 3
    keyStats.sort((a, b) => a.priority - b.priority);
    const topStats = keyStats.slice(0, 3);

    if (topStats.length === 0) {
      topStats.push({
        value: 'Professional',
        label: 'Real Estate Agent'
      });
    }

    const statsHTML = topStats.map(stat => `
      <div class="stat-minimal-item">
        <span class="stat-minimal-value">${stat.value}</span>
        <span class="stat-minimal-label">${stat.label}</span>
      </div>
    `).join('');

    return `
    <section class="stats-component stats-minimal">
      <div class="stats-minimal-container">
        ${statsHTML}
      </div>
    </section>`;
  }
};

module.exports = {
  render: (variant, data) => {
    const renderer = statsComponents[variant] || statsComponents['stats-grid'];
    return renderer(data);
  },
  
  getVariants: () => Object.keys(statsComponents)
};
