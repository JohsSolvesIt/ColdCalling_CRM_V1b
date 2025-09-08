/**
 * Hero Component Variants
 * Main introduction section with name, title, company, image, ratings
 */

const heroComponents = {
  /**
   * Standard hero with all available elements
   */
  'hero-standard': (data) => {
    const profileImage = data.profile_image ? 
      `<img src="${data.profile_image}" alt="${data.name}" class="hero-profile-image">` :
      '<div class="hero-profile-placeholder">👤</div>';

    const ratings = data.ratings ? 
      `<div class="hero-ratings">${'★'.repeat(Math.floor(data.ratings))}${'☆'.repeat(5-Math.floor(data.ratings))} (${data.ratings}/5)</div>` :
      '';

    const title = data.title ? `<h2 class="hero-title">${data.title}</h2>` : '';
    const company = data.company ? `<h3 class="hero-company">${data.company}</h3>` : '';

    return `
    <section class="hero-component hero-standard">
      ${profileImage}
      <h1 class="hero-name">${data.name}</h1>
      ${title}
      ${company}
      ${ratings}
    </section>`;
  },

  /**
   * Minimal hero with just name and title
   */
  'hero-minimal': (data) => {
    const title = data.title ? `<h2 class="hero-title">${data.title}</h2>` : '';
    
    return `
    <section class="hero-component hero-minimal">
      <h1 class="hero-name">${data.name}</h1>
      ${title}
    </section>`;
  },

  /**
   * Detailed hero with image and all elements
   */
  'hero-detailed': (data) => {
    const profileImage = data.profile_image ? 
      `<img src="${data.profile_image}" alt="${data.name}" class="hero-profile-image">` :
      '<div class="hero-profile-placeholder">👤</div>';

    const ratings = data.ratings ? 
      `<div class="hero-ratings">
        <span class="rating-stars">${'★'.repeat(Math.floor(data.ratings))}${'☆'.repeat(5-Math.floor(data.ratings))}</span>
        <span class="rating-text">(${data.ratings}/5 rating)</span>
      </div>` :
      '';

    const title = data.title ? `<h2 class="hero-title">${data.title}</h2>` : '';
    const company = data.company ? `<h3 class="hero-company">${data.company}</h3>` : '';

    return `
    <section class="hero-component hero-detailed">
      <div class="hero-image-container">
        ${profileImage}
      </div>
      <div class="hero-content">
        <h1 class="hero-name">${data.name}</h1>
        ${title}
        ${company}
        ${ratings}
      </div>
    </section>`;
  }
};

module.exports = {
  render: (variant, data) => {
    const renderer = heroComponents[variant] || heroComponents['hero-standard'];
    return renderer(data);
  },
  
  getVariants: () => Object.keys(heroComponents)
};
