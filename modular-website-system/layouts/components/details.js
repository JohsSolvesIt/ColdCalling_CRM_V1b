/**
 * Details Component Variants
 * Professional details: specializations, languages, certifications, service areas, bio
 */

const detailsComponents = {
  /**
   * Sections format with clear categories
   */
  'details-sections': (data) => {
    const sections = [];

    // Bio/Description section
    if (data.bio) {
      sections.push(`
        <div class="details-section">
          <h3>About</h3>
          <p class="bio-text">${data.bio}</p>
        </div>`);
    }

    // Specializations
    if (data.specializations) {
      const specs = Array.isArray(data.specializations) ? 
        data.specializations : 
        data.specializations.split(',').map(s => s.trim());
      
      sections.push(`
        <div class="details-section">
          <h3>Specializations</h3>
          <ul class="details-list">
            ${specs.map(spec => `<li>${spec}</li>`).join('')}
          </ul>
        </div>`);
    }

    // Languages
    if (data.languages) {
      const langs = Array.isArray(data.languages) ? 
        data.languages : 
        data.languages.split(',').map(l => l.trim());
      
      sections.push(`
        <div class="details-section">
          <h3>Languages</h3>
          <div class="language-tags">
            ${langs.map(lang => `<span class="language-tag">${lang}</span>`).join('')}
          </div>
        </div>`);
    }

    // Certifications
    if (data.certifications) {
      const certs = Array.isArray(data.certifications) ? 
        data.certifications : 
        data.certifications.split(',').map(c => c.trim());
      
      sections.push(`
        <div class="details-section">
          <h3>Certifications</h3>
          <ul class="details-list">
            ${certs.map(cert => `<li>${cert}</li>`).join('')}
          </ul>
        </div>`);
    }

    // Service Areas
    if (data.service_areas) {
      const areas = Array.isArray(data.service_areas) ? 
        data.service_areas : 
        data.service_areas.split(',').map(a => a.trim());
      
      sections.push(`
        <div class="details-section">
          <h3>Service Areas</h3>
          <div class="service-areas">
            ${areas.map(area => `<span class="area-tag">${area}</span>`).join('')}
          </div>
        </div>`);
    }

    return `
    <section class="details-component details-sections">
      <h2>Professional Details</h2>
      ${sections.join('')}
    </section>`;
  },

  /**
   * Compact list format
   */
  'details-list': (data) => {
    const items = [];

    if (data.bio) {
      items.push(`
        <div class="detail-item">
          <strong>About:</strong> ${data.bio}
        </div>`);
    }

    if (data.specializations) {
      const specs = Array.isArray(data.specializations) ? 
        data.specializations.join(', ') : 
        data.specializations;
      
      items.push(`
        <div class="detail-item">
          <strong>Specializations:</strong> ${specs}
        </div>`);
    }

    if (data.languages) {
      const langs = Array.isArray(data.languages) ? 
        data.languages.join(', ') : 
        data.languages;
      
      items.push(`
        <div class="detail-item">
          <strong>Languages:</strong> ${langs}
        </div>`);
    }

    if (data.certifications) {
      const certs = Array.isArray(data.certifications) ? 
        data.certifications.join(', ') : 
        data.certifications;
      
      items.push(`
        <div class="detail-item">
          <strong>Certifications:</strong> ${certs}
        </div>`);
    }

    if (data.service_areas) {
      const areas = Array.isArray(data.service_areas) ? 
        data.service_areas.join(', ') : 
        data.service_areas;
      
      items.push(`
        <div class="detail-item">
          <strong>Service Areas:</strong> ${areas}
        </div>`);
    }

    return `
    <section class="details-component details-list">
      <h2>Professional Information</h2>
      <div class="details-list-container">
        ${items.join('')}
      </div>
    </section>`;
  },

  /**
   * Card-based layout for details
   */
  'details-cards': (data) => {
    const cards = [];

    // Expertise card
    if (data.specializations || data.certifications) {
      const expertise = [];
      
      if (data.specializations) {
        const specs = Array.isArray(data.specializations) ? 
          data.specializations : 
          data.specializations.split(',').map(s => s.trim());
        expertise.push(`<p><strong>Specializations:</strong></p><ul>${specs.map(spec => `<li>${spec}</li>`).join('')}</ul>`);
      }
      
      if (data.certifications) {
        const certs = Array.isArray(data.certifications) ? 
          data.certifications : 
          data.certifications.split(',').map(c => c.trim());
        expertise.push(`<p><strong>Certifications:</strong></p><ul>${certs.map(cert => `<li>${cert}</li>`).join('')}</ul>`);
      }

      cards.push(`
        <div class="detail-card">
          <h4>Expertise</h4>
          ${expertise.join('')}
        </div>`);
    }

    // Communication card
    if (data.languages) {
      const langs = Array.isArray(data.languages) ? 
        data.languages : 
        data.languages.split(',').map(l => l.trim());

      cards.push(`
        <div class="detail-card">
          <h4>Languages</h4>
          <div class="language-badges">
            ${langs.map(lang => `<span class="language-badge">${lang}</span>`).join('')}
          </div>
        </div>`);
    }

    // Service areas card
    if (data.service_areas) {
      const areas = Array.isArray(data.service_areas) ? 
        data.service_areas : 
        data.service_areas.split(',').map(a => a.trim());

      cards.push(`
        <div class="detail-card">
          <h4>Service Areas</h4>
          <div class="area-badges">
            ${areas.map(area => `<span class="area-badge">${area}</span>`).join('')}
          </div>
        </div>`);
    }

    // Bio card (if available and not too long)
    if (data.bio && data.bio.length < 300) {
      cards.push(`
        <div class="detail-card detail-card-full">
          <h4>About Me</h4>
          <p>${data.bio}</p>
        </div>`);
    }

    return `
    <section class="details-component details-cards">
      <h2>Professional Details</h2>
      <div class="details-cards-grid">
        ${cards.join('')}
      </div>
    </section>`;
  }
};

module.exports = {
  render: (variant, data) => {
    const renderer = detailsComponents[variant] || detailsComponents['details-sections'];
    return renderer(data);
  },
  
  getVariants: () => Object.keys(detailsComponents)
};
