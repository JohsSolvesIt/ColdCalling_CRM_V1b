/**
 * Professional Realtor Layout Preset
 * Clean, professional layout suitable for established real estate professionals
 */

module.exports = {
  name: "Professional Realtor",
  description: "Clean, professional layout with comprehensive information display",
  version: "1.0.0",
  
  baseLayout: "two-column",
  
  components: {
    hero: "hero-standard",
    contact: "contact-cards", 
    stats: "stats-grid",
    details: "details-sections",
    properties: "properties-grid",
    social: "social-buttons"
  },
  
  componentOrder: [
    "hero", 
    "stats", 
    "details", 
    "properties", 
    "contact", 
    "social"
  ],
  
  responsiveBreakpoints: ["mobile", "tablet", "desktop"],
  
  contentRules: {
    hideEmptyComponents: true,
    minimumComponentsRequired: 2,
    fallbackContent: true
  },
  
  // Layout-specific options
  options: {
    sidebarPosition: "right",
    heroStyle: "standard",
    emphasizeProperties: true,
    showAllStats: true
  }
};
