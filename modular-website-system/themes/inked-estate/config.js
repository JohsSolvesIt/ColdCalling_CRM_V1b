/**
 * Inked Estate Theme Configuration
 * InkedRealEstate.com inspired professional theme
 * Compatible with Modular Website Generator v1.0
 */

module.exports = {
  // REQUIRED: Basic metadata for UI dropdown
  name: "Inked Estate",
  description: "Professional real estate theme inspired by InkedRealEstate.com featuring blue branding with green action elements",
  version: "1.0.0",
  category: "professional",
  author: "CRM System",
  
  // REQUIRED: Color system for generator compatibility - DARK SATURATED THEME
  colors: {
    primary: "#1a3d1a",        // Very dark saturated forest green
    secondary: "#2d4a2d",      // Dark forest green
    accent: "#4a6b4a",         // Medium forest green
    success: "#6b8e6b",        // Sage green for success states
    background: "#1a3d1a",     // Very dark forest green background
    surface: "#2d4a2d",        // Dark forest green surface
    dark: "#0d1a0d",          // Almost black forest green
    text: {
      primary: "#f0f8f0",      // Very bright, slightly green-tinted white
      secondary: "#d8e8d8",    // Bright light sage
      muted: "#c0d0c0",        // Medium light sage
      inverse: "#1a3d1a",      // Dark text for light surfaces
      accent: "#a8c8a8"        // Bright desaturated sage accent
    },
    borders: "#4a6b4a",        // Medium forest borders
    overlay: {
      dark: "rgba(26, 61, 26, 0.95)",
      light: "rgba(240, 248, 240, 0.95)",
      green: "rgba(74, 107, 74, 0.4)"
    }
  },
  
  // REQUIRED: Typography system
  typography: {
    headings: {
      fontFamily: "'Playfair Display', serif",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "2px"
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
    }
  },
  
  // REQUIRED: Layout configuration
  layout: {
    maxWidth: "1400px",
    spacing: {
      section: "120px",
      component: "40px",
      card: "30px",
      element: "20px"
    },
    borderRadius: {
      small: "6px",
      medium: "8px", 
      large: "12px",
      xlarge: "16px"
    }
  },
  
  // REQUIRED: Animation settings
  animations: {
    duration: {
      fast: "0.15s",
      normal: "0.3s",
      slow: "0.5s"
    },
    easing: {
      linear: "linear",
      ease: "ease",
      bounce: "cubic-bezier(0.4, 0, 0.2, 1)"
    }
  },
  
  // OPTIONAL: Feature list for documentation
  features: [
    "Welcome Home hero section",
    "Professional blue and green color scheme", 
    "Playfair Display + Inter typography",
    "Smooth animations and micro-interactions",
    "Mobile-first responsive design",
    "Property showcase grid",
    "Statistics highlight section",
    "Green CTA buttons throughout",
    "Professional navigation with backdrop blur",
    "Clean contact sections"
  ]
};
