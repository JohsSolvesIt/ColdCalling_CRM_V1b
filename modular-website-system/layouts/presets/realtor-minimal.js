/**
 * Minimal Realtor Layout Preset
 * Clean, minimal layout focusing on essential information only
 */

module.exports = {
  name: "Minimal Realtor",
  description: "Clean, minimal layout focusing on essential contact and property information",
  version: "1.0.0",
  
  baseLayout: "single-column",
  
  components: {
    hero: "hero-minimal",
    contact: "contact-list", 
    stats: "stats-minimal",
    details: "details-list",
    properties: "properties-summary",
    social: "social-inline"
  },
  
  componentOrder: [
    "hero", 
    "contact",
    "stats", 
    "properties",
    "details",
    "social"
  ],
  
  responsiveBreakpoints: ["mobile", "tablet", "desktop"],
  
  contentRules: {
    hideEmptyComponents: true,
    minimumComponentsRequired: 2,
    fallbackContent: true,
    preferConciseContent: true
  },
  
  // Layout-specific options
  options: {
    emphasizeContact: true,
    limitPropertyDisplay: 3,
    showKeyStatsOnly: true,
    compactSocial: true
  }
};
