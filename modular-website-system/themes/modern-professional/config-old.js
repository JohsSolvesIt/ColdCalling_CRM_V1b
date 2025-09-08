/**
 * Modern Professional Theme Configuration  
 * Shannon Lavin inspired luxury real estate theme
 */

module.exports = {
  name: "Modern Professional",
  description: "Shannon Lavin inspired luxury real estate theme with sophisticated typography and professional aesthetic",
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
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
    videoBackground: true,
    professionalNav: true,
    sophisticatedTypography: true,
    luxurySpacing: true,
    minimalAnimations: true,
    cleanPortfolio: true,
    elegantTestimonials: true,
    professionalContact: true
  }
}
      muted: "#6b6b6b",      // Light gray for supporting text
      inverse: "#ffffff",    // White text on dark backgrounds
      caption: "#9a9a9a"     // Ultra-light for captions
    },
    
    // Borders and dividers - minimal and clean
    borders: "#f0f0f0",      // Ultra-light borders
    bordersSubtle: "#f5f5f5", // Even lighter for subtle divisions
    bordersHover: "#e5e5e5", // Slightly visible on interaction
    
    // Shadows - barely perceptible
    shadows: {
      subtle: "rgba(26, 26, 26, 0.02)",
      soft: "rgba(26, 26, 26, 0.04)",
      medium: "rgba(26, 26, 26, 0.06)",
      elevated: "rgba(26, 26, 26, 0.08)"
    },
    
    // Minimal status colors
    success: "#0d7526",      // Refined green
    warning: "#b45309",      // Sophisticated amber
    error: "#b91c1c"         // Refined red
  },
  
  typography: {
    // Clean, readable typography inspired by Shannon Lavin
    headings: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontWeight: "600", // Semi-bold for sophistication
      lineHeight: "1.25", // Tight, elegant line height
      letterSpacing: "-0.02em" // Slightly tighter for modern look
    },
    body: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontWeight: "400", // Regular weight
      lineHeight: "1.65", // Comfortable reading
      letterSpacing: "0em" // Natural spacing
    },
    accent: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: "500" // Medium weight for subtle emphasis
    },
    sizes: {
      xs: "0.75rem",     // 12px - captions
      sm: "0.875rem",    // 14px - secondary text
      base: "1rem",      // 16px - body text
      lg: "1.125rem",    // 18px - emphasized body
      xl: "1.25rem",     // 20px - small headings
      "2xl": "1.5rem",   // 24px - medium headings
      "3xl": "1.875rem", // 30px - large headings
      "4xl": "2.25rem",  // 36px - hero text
      "5xl": "2.75rem",  // 44px - display text
      "6xl": "3.5rem"    // 56px - hero display
    }
  },

  spacing: {
    // Generous, sophisticated spacing
    componentGap: "5rem",   // More breathing room between sections
    sectionPadding: "6rem", // Luxury-level section padding
    cardPadding: "2.5rem",  // Comfortable card padding
    buttonPadding: "1.25rem 2.5rem", // Substantial button padding
    responsive: {
      mobile: "2rem",       // Comfortable mobile spacing
      tablet: "3.5rem",     // Tablet breathing room
      desktop: "5rem"       // Desktop luxury spacing
    }
  },

  animations: {
    // Ultra-subtle, refined animations
    duration: {
      instant: "0ms",      // No animation
      ultraFast: "150ms",  // Minimal feedback
      fast: "200ms",       // Subtle transitions
      normal: "300ms",     // Standard transitions
      slow: "400ms",       // Considered transitions
      slower: "600ms"      // Deliberate transitions
    },
    easing: {
      linear: "linear",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",    // Gentle ease out
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)", // Sophisticated curve
      bounce: "cubic-bezier(0.4, 0, 0.2, 1)"    // No actual bounce - keep it minimal
    },
    scale: {
      hover: "1.02",       // Barely perceptible scale
      active: "0.98",      // Subtle press feedback
      focus: "1.01"        // Minimal focus scale
    },
    
    // Animation effects - minimal and professional
    effects: {
      fadeIn: true,              // Subtle fade-in is professional
      slideIn: false,            // No slide animations
      parallax: false,           // No parallax - too flashy
      hoverLift: true,           // Minimal hover feedback
      scaleOnHover: false,       // No scaling effects
      glowOnHover: false,        // No glow effects
      morphBorders: false,       // No morphing
      flowingGradients: false,   // No flowing gradients
      magneticButtons: false,    // No magnetic effects
      floatingElements: false,   // No floating
      staggeredAnimations: false // No staggered animations
    },
    
    // Minimal transform effects
    transforms: {
      hoverLift: "translateY(-1px)",    // Barely perceptible lift
      cardHover: "translateY(-2px)",    // Subtle card hover
      buttonHover: "none",              // No button transforms
      focusScale: "scale(1.01)"         // Minimal focus feedback
    }
  },

  // Theme-specific styling options
  styling: {
    borderRadius: {
      small: "4px",   // Conservative border radius
      medium: "6px",  // Slightly more rounded
      large: "8px",   // Less rounded for sophistication
      round: "50%"
    },
    shadows: {
      subtle: "0 1px 2px 0 rgba(26, 26, 26, 0.03)",  // Ultra-subtle
      medium: "0 2px 4px 0 rgba(26, 26, 26, 0.04)",  // Minimal shadows
      large: "0 4px 8px 0 rgba(26, 26, 26, 0.06)",   // Conservative elevation
      elevated: "0 8px 16px 0 rgba(26, 26, 26, 0.08)", // Refined elevation
      focus: "0 0 0 2px rgba(26, 26, 26, 0.1)",       // Subtle focus ring
      inset: "inset 0 1px 2px 0 rgba(26, 26, 26, 0.03)"
    },
    buttonStyle: "minimal",     // Clean, minimal buttons
    cardStyle: "clean",         // Simple, clean cards
    glassEffect: {
      enabled: false,           // No glass effects - too flashy
      backdrop: "none",
      opacity: "1"
    },
    patterns: {
      noise: false,             // No decorative patterns
      dots: false,
      grid: false
    }
  },

  // Advanced design features
  features: {
    parallaxScrolling: false,    // Disable for professionalism
    smoothScrolling: true,
    lazyLoading: true,
    progressiveEnhancement: true,
    darkModeSupport: false,
    rtlSupport: false,
    accessibilityEnhanced: true,
    performanceOptimized: true
  },

  // Breakpoints for responsive design
  breakpoints: {
    mobile: "640px",
    tablet: "768px", 
    laptop: "1024px",
    desktop: "1280px",
    wide: "1536px"
  }
};
