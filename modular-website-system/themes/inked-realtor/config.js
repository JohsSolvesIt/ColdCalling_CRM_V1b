/**
 * Inked Realtor Theme Configuration  
 * Inspired by InkedRealEstate.com - modern, professional real estate theme
 */

module.exports = {
  name: "Inked Realtor",
  description: "Modern real estate theme inspired by InkedRealEstate.com featuring bold typography, client success focus, and professional design for real estate professionals",
  version: "1.0.0",
  
  colors: {
    // Professional color palette refined to match InkedRealEstate.com
    primary: "#2563eb",        // Refined professional blue
    secondary: "#1d4ed8",      // Balanced darker blue
    accent: "#10b981",         // Success green (InkedRealEstate.com style)
    success: "#10b981",        // Modern green for success states
    background: "#ffffff",     // Pure white background
    surface: "#f8fafc",        // Very light blue-gray for sections
    dark: "#0f172a",          // Deep slate for maximum contrast
    text: {
      primary: "#0f172a",      // Deep slate for primary text
      secondary: "#64748b",    // Balanced gray for secondary text
      muted: "#94a3b8",        // Light gray for captions
      inverse: "#ffffff",      // White text on dark backgrounds
      accent: "#2563eb"        // Blue text for links and accents
    },
    borders: "#e2e8f0",        // Light gray borders
    overlay: {
      dark: "rgba(15, 23, 42, 0.85)",    // Deeper dark overlay
      light: "rgba(255, 255, 255, 0.95)", // Clean light overlay
      blue: "rgba(37, 99, 235, 0.1)"     // Blue tint overlay
    }
  },
  
  typography: {
    // Modern, clean typography system
    headings: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: 700,
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
      bold: 700,
      extrabold: 800
    },
    sizes: {
      xs: "12px",
      sm: "14px", 
      base: "16px",
      lg: "18px",
      xl: "24px",
      xxl: "32px",
      xxxl: "48px",
      hero: "96px",
      display: "120px"
    }
  },
  
  animations: {
    // Professional animations with subtle effects
    enabled: true,
    
    // Modern, professional animation preferences
    parallax: false,
    floating: false,
    bounce: false,
    pulse: true,      // For CTA buttons
    
    // Keep professional effects
    hover: true,
    fade: true,
    slide: true,
    scale: true
  },
  
  // Inked Realtor theme features
  features: {
    welcomeHomeBranding: true,
    fullScreenHero: true,
    heroBackgroundImage: true,
    videoBackground: true,
    modernNav: true,
    boldTypography: true,
    clientSuccessStats: true,
    testimonialCarousel: true,
    propertyShowcase: true,
    modernContact: true,
    socialProof: true,
    ctaButtons: true
  },

  // Hero configuration inspired by "WELCOME HOME" branding
  hero: {
    welcomeMessage: "WELCOME HOME",
    subtitle: "LET'S FIND THE RIGHT ONE FOR YOU",
    defaultOverlay: 'rgba(30, 41, 59, 0.6)', // Dark blue overlay
    fallbackGradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    textStyle: 'bold', // Bold, impactful text style
    sources: [
      'property_featured', // Use featured property image
      'property_first',    // Use first property image
      'custom_url',        // Use custom URL provided
      'placeholder'        // Use placeholder if no image available
    ]
  },

  // Client success metrics (inspired by "623 clients helped, $200M volume")
  metrics: {
    enabled: true,
    defaultStats: [
      { value: '500+', label: 'CLIENTS HELPED' },
      { value: '$150M+', label: 'VOLUME CLOSED' },
      { value: '15+', label: 'YEARS EXPERIENCE' },
      { value: '98%', label: 'CLIENT SATISFACTION' }
    ]
  },

  // Modern portfolio display
  portfolio: {
    gridStyle: 'modern',
    cardStyle: 'elevated',
    hoverEffects: true,
    propertyBadges: true
  }
};
