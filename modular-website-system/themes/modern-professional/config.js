/**
 * Modern Professional Theme Configuration  
 * Shannon Lavin inspired luxury real estate theme
 */

module.exports = {
  name: "Modern Professional",
  description: "Shannon Lavin inspired luxury real estate theme with sophisticated typography, full-screen hero design, and professional aesthetic perfect for high-end real estate professionals",
  version: "3.0.0",
  
  colors: {
    // Sophisticated color palette inspired by Shannon Lavin
    primary: "#000000",        // Pure black for maximum sophistication
    secondary: "#ffffff",      // Pure white for clean contrast  
    accent: "#666666",         // Refined gray for subtle accents
    background: "#ffffff",     // Clean white background
    surface: "#f8fafc",        // Very light gray for sections
    text: {
      primary: "#000000",      // Black text for maximum readability
      secondary: "#666666",    // Gray for secondary text
      muted: "#999999",        // Light gray for captions
      inverse: "#ffffff"       // White text on dark backgrounds
    },
    borders: "#e2e8f0"         // Very light gray borders
  },
  
  typography: {
    // Clean, professional typography system
    headings: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: 600,
      lineHeight: 1.2
    },
    body: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", 
      fontWeight: 400,
      lineHeight: 1.6
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    sizes: {
      xs: "12px",
      sm: "14px", 
      base: "16px",
      lg: "18px",
      xl: "24px",
      xxl: "32px",
      xxxl: "48px",
      hero: "72px"
    }
  },
  
  animations: {
    // Minimal, sophisticated animations only
    enabled: true,
    
    // Disable flashy animations for professional look
    parallax: false,
    floating: false,
    bounce: false,
    pulse: false,
    
    // Keep only subtle, professional effects
    hover: true,
    fade: true,
    slide: false
  },
  
  // Professional theme features
  features: {
    fullScreenHero: true,
    heroBackgroundImage: true,
    videoBackground: true,
    professionalNav: true,
    sophisticatedTypography: true,
    luxurySpacing: true,
    minimalAnimations: true,
    cleanPortfolio: true,
    elegantTestimonials: true,
    professionalContact: true
  },

  // Hero image configuration
  heroImage: {
    enabled: true,
    defaultOverlay: 'rgba(0, 0, 0, 0.4)', // Dark overlay for better text readability
    fallbackGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    sources: [
      'property_featured', // Use featured property image
      'property_first',    // Use first property image
      'custom_url',        // Use custom URL provided
      'placeholder'        // Use placeholder if no image available
    ]
  }
};
