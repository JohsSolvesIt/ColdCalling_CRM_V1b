/**
 * Personal Brand Realtor Layout Preset
 * Personal brand focused layout emphasizing the individual agent
 */

module.exports = {
  name: "Personal Brand",
  description: "Personal brand focused layout emphasizing the individual real estate professional",
  version: "1.0.0",
  
  baseLayout: "hero-focused",
  
  components: {
    hero: "hero-detailed",
    contact: "contact-inline", 
    stats: "stats-horizontal",
    details: "details-sections",
    properties: "properties-list",
    social: "social-buttons"
  },
  
  componentOrder: [
    "hero", 
    "details",
    "stats", 
    "contact",
    "properties",
    "social"
  ],
  
  responsiveBreakpoints: ["mobile", "tablet", "desktop"],
  
  contentRules: {
    hideEmptyComponents: true,
    minimumComponentsRequired: 2,
    fallbackContent: true,
    emphasizePersonalBrand: true
  },
  
  // Layout-specific options
  options: {
    largeHero: true,
    emphasizeBio: true,
    personalApproach: true,
    socialMediaFocus: true
  }
};
