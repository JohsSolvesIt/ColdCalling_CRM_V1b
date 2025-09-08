/**
 * Social Media Component Variants
 * Social media links and contact methods
 */

const socialComponents = {
  /**
   * Button-style social media links
   */
  'social-buttons': (data) => {
    const socialLinks = [];

    if (data.facebook) {
      socialLinks.push(`
        <a href="${data.facebook}" target="_blank" class="social-link social-facebook">
          Facebook
        </a>`);
    }

    if (data.linkedin) {
      socialLinks.push(`
        <a href="${data.linkedin}" target="_blank" class="social-link social-linkedin">
          LinkedIn
        </a>`);
    }

    if (data.instagram) {
      socialLinks.push(`
        <a href="${data.instagram}" target="_blank" class="social-link social-instagram">
          Instagram
        </a>`);
    }

    if (data.twitter) {
      socialLinks.push(`
        <a href="${data.twitter}" target="_blank" class="social-link social-twitter">
          Twitter
        </a>`);
    }

    if (data.youtube) {
      socialLinks.push(`
        <a href="${data.youtube}" target="_blank" class="social-link social-youtube">
          YouTube
        </a>`);
    }

    if (socialLinks.length === 0) {
      return '';
    }

    return `
    <section class="social-component social-buttons">
      <h2>Connect With Me</h2>
      <div class="social-links">
        ${socialLinks.join('')}
      </div>
    </section>`;
  },

  /**
   * Icon-style social media links
   */
  'social-icons': (data) => {
    const socialIcons = [];

    if (data.facebook) {
      socialIcons.push(`
        <a href="${data.facebook}" target="_blank" class="social-icon social-facebook" title="Facebook">
          📘
        </a>`);
    }

    if (data.linkedin) {
      socialIcons.push(`
        <a href="${data.linkedin}" target="_blank" class="social-icon social-linkedin" title="LinkedIn">
          💼
        </a>`);
    }

    if (data.instagram) {
      socialIcons.push(`
        <a href="${data.instagram}" target="_blank" class="social-icon social-instagram" title="Instagram">
          📷
        </a>`);
    }

    if (data.twitter) {
      socialIcons.push(`
        <a href="${data.twitter}" target="_blank" class="social-icon social-twitter" title="Twitter">
          🐦
        </a>`);
    }

    if (data.youtube) {
      socialIcons.push(`
        <a href="${data.youtube}" target="_blank" class="social-icon social-youtube" title="YouTube">
          📺
        </a>`);
    }

    if (socialIcons.length === 0) {
      return '';
    }

    return `
    <section class="social-component social-icons">
      <h3>Follow Me</h3>
      <div class="social-icons-container">
        ${socialIcons.join('')}
      </div>
    </section>`;
  },

  /**
   * Text-based social media links
   */
  'social-text': (data) => {
    const socialTexts = [];

    if (data.facebook) {
      socialTexts.push(`
        <p class="social-text-item">
          <strong>Facebook:</strong> <a href="${data.facebook}" target="_blank">Visit my Facebook page</a>
        </p>`);
    }

    if (data.linkedin) {
      socialTexts.push(`
        <p class="social-text-item">
          <strong>LinkedIn:</strong> <a href="${data.linkedin}" target="_blank">Connect with me professionally</a>
        </p>`);
    }

    if (data.instagram) {
      socialTexts.push(`
        <p class="social-text-item">
          <strong>Instagram:</strong> <a href="${data.instagram}" target="_blank">Follow my listings and updates</a>
        </p>`);
    }

    if (data.twitter) {
      socialTexts.push(`
        <p class="social-text-item">
          <strong>Twitter:</strong> <a href="${data.twitter}" target="_blank">Follow for real estate news</a>
        </p>`);
    }

    if (data.youtube) {
      socialTexts.push(`
        <p class="social-text-item">
          <strong>YouTube:</strong> <a href="${data.youtube}" target="_blank">Watch property tours and tips</a>
        </p>`);
    }

    if (socialTexts.length === 0) {
      return '';
    }

    return `
    <section class="social-component social-text">
      <h2>Social Media</h2>
      <div class="social-text-container">
        ${socialTexts.join('')}
      </div>
    </section>`;
  },

  /**
   * Inline social links (compact format)
   */
  'social-inline': (data) => {
    const inlineLinks = [];

    if (data.facebook) {
      inlineLinks.push(`<a href="${data.facebook}" target="_blank" class="social-inline-link">Facebook</a>`);
    }

    if (data.linkedin) {
      inlineLinks.push(`<a href="${data.linkedin}" target="_blank" class="social-inline-link">LinkedIn</a>`);
    }

    if (data.instagram) {
      inlineLinks.push(`<a href="${data.instagram}" target="_blank" class="social-inline-link">Instagram</a>`);
    }

    if (data.twitter) {
      inlineLinks.push(`<a href="${data.twitter}" target="_blank" class="social-inline-link">Twitter</a>`);
    }

    if (data.youtube) {
      inlineLinks.push(`<a href="${data.youtube}" target="_blank" class="social-inline-link">YouTube</a>`);
    }

    if (inlineLinks.length === 0) {
      return '';
    }

    return `
    <section class="social-component social-inline">
      <p class="social-inline-text">
        <strong>Connect:</strong> ${inlineLinks.join(' • ')}
      </p>
    </section>`;
  }
};

module.exports = {
  render: (variant, data) => {
    const renderer = socialComponents[variant] || socialComponents['social-buttons'];
    return renderer(data);
  },
  
  getVariants: () => Object.keys(socialComponents)
};
