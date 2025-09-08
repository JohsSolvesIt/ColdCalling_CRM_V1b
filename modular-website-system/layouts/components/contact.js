/**
 * Contact Component Variants
 * Contact information display with phone, email, address, website, license
 */

const contactComponents = {
  /**
   * Simple list format
   */
  'contact-list': (data) => {
    const contactItems = [];

    if (data.phone) {
      contactItems.push(`
        <div class="contact-item">
          <span class="contact-label">Phone:</span>
          <span class="contact-value">${data.phone}</span>
        </div>`);
    }

    if (data.email) {
      contactItems.push(`
        <div class="contact-item">
          <span class="contact-label">Email:</span>
          <span class="contact-value">
            <a href="mailto:${data.email}">${data.email}</a>
          </span>
        </div>`);
    }

    if (data.address) {
      contactItems.push(`
        <div class="contact-item">
          <span class="contact-label">Address:</span>
          <span class="contact-value">${data.address}</span>
        </div>`);
    }

    if (data.website) {
      contactItems.push(`
        <div class="contact-item">
          <span class="contact-label">Website:</span>
          <span class="contact-value">
            <a href="${data.website}" target="_blank">${data.website}</a>
          </span>
        </div>`);
    }

    if (data.license_number) {
      contactItems.push(`
        <div class="contact-item">
          <span class="contact-label">License:</span>
          <span class="contact-value">${data.license_number}${data.license_state ? ` (${data.license_state})` : ''}</span>
        </div>`);
    }

    return `
    <section class="contact-component contact-list">
      <h2>Contact Information</h2>
      <div class="contact-items">
        ${contactItems.join('')}
      </div>
    </section>`;
  },

  /**
   * Card-based layout
   */
  'contact-cards': (data) => {
    const cards = [];

    if (data.phone || data.email) {
      const primaryContact = [];
      if (data.phone) {
        primaryContact.push(`<p><strong>Phone:</strong> ${data.phone}</p>`);
      }
      if (data.email) {
        primaryContact.push(`<p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>`);
      }

      cards.push(`
        <div class="contact-card">
          <h4>Primary Contact</h4>
          ${primaryContact.join('')}
        </div>`);
    }

    if (data.address || data.website) {
      const locationInfo = [];
      if (data.address) {
        locationInfo.push(`<p><strong>Address:</strong> ${data.address}</p>`);
      }
      if (data.website) {
        locationInfo.push(`<p><strong>Website:</strong> <a href="${data.website}" target="_blank">${data.website}</a></p>`);
      }

      cards.push(`
        <div class="contact-card">
          <h4>Location & Web</h4>
          ${locationInfo.join('')}
        </div>`);
    }

    if (data.license_number || data.license_state) {
      cards.push(`
        <div class="contact-card">
          <h4>Professional License</h4>
          <p><strong>License:</strong> ${data.license_number || 'Licensed Professional'}</p>
          ${data.license_state ? `<p><strong>State:</strong> ${data.license_state}</p>` : ''}
        </div>`);
    }

    return `
    <section class="contact-component contact-cards">
      <h2>Contact Information</h2>
      <div class="contact-grid">
        ${cards.join('')}
      </div>
    </section>`;
  },

  /**
   * Horizontal inline format
   */
  'contact-inline': (data) => {
    const inlineItems = [];

    if (data.phone) {
      inlineItems.push(`<span class="contact-inline-item">📞 ${data.phone}</span>`);
    }

    if (data.email) {
      inlineItems.push(`<span class="contact-inline-item">✉️ <a href="mailto:${data.email}">${data.email}</a></span>`);
    }

    if (data.website) {
      inlineItems.push(`<span class="contact-inline-item">🌐 <a href="${data.website}" target="_blank">Website</a></span>`);
    }

    if (data.address) {
      inlineItems.push(`<span class="contact-inline-item">📍 ${data.address}</span>`);
    }

    return `
    <section class="contact-component contact-inline">
      <h2>Contact</h2>
      <div class="contact-inline-list">
        ${inlineItems.join(' • ')}
      </div>
    </section>`;
  }
};

module.exports = {
  render: (variant, data) => {
    const renderer = contactComponents[variant] || contactComponents['contact-list'];
    return renderer(data);
  },
  
  getVariants: () => Object.keys(contactComponents)
};
