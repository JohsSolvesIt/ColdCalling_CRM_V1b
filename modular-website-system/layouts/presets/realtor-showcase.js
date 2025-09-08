/**
 * Showcase Realtor Layout Preset
 * Property-focused layout emphasizing listings and portfolio
 */

module.exports = {
  name: "Showcase Realtor",
  description: "Property-focused layout emphasizing listings and real estate portfolio",
  version: "1.0.0",
  
  baseLayout: "grid-layout",
  
  components: {
    hero: "hero-detailed",
    contact: "contact-cards", 
    stats: "stats-grid",
    details: "details-cards",
    properties: "properties-carousel",
    social: "social-icons"
  },
  
  componentOrder: [
    "hero", 
    "properties",
    "stats", 
    "contact",
    "details",
    "social"
  ],
  
  responsiveBreakpoints: ["mobile", "tablet", "desktop"],
  
  contentRules: {
    hideEmptyComponents: true,
    minimumComponentsRequired: 2,
    fallbackContent: true,
    emphasizeProperties: true
  },
  
  // Layout-specific options
  options: {
    propertiesFirst: true,
    showPropertyCarousel: true,
    emphasizePortfolio: true,
    visualFocus: true
  }
};
