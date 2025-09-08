/**
 * Theme Engine - System 2
 * Handles all visual presentation: colors, fonts, spacing, animations
 * Layout agnostic - works with any layout configuration
 */

class ThemeEngine {
  constructor(themeConfig) {
    this.config = themeConfig;
    this.cssVariables = new Map();
    this.mediaQueries = new Map();
    this.animations = new Map();
    this.initializeTheme();
  }

  /**
   * Initialize theme system
   */
  initializeTheme() {
    // Theme is ready to use
    console.log(`🎨 Theme initialized: ${this.config.name}`);
  }

  /**
   * Generate complete CSS for the theme
   */
  generateCSS() {
    const cssBlocks = [];

    // CSS Variables (Custom Properties)
    cssBlocks.push(this.generateVariablesCSS());

    // Base styles
    cssBlocks.push(this.generateBaseStyles());

    // Typography styles
    cssBlocks.push(this.generateTypographyCSS());

    // Component styles
    cssBlocks.push(this.generateComponentCSS());

    // Layout styles
    cssBlocks.push(this.generateLayoutCSS());

    // Animation styles
    cssBlocks.push(this.generateAnimationCSS());

    // Special effects (for enhanced themes)
    cssBlocks.push(this.generateSpecialEffectsCSS());

    // Responsive styles
    cssBlocks.push(this.generateResponsiveCSS());

    return cssBlocks.join('\n\n');
  }

  /**
   * Generate CSS custom properties (variables)
   */
  generateVariablesCSS() {
    const variables = [];

    // Colors - Enhanced with gradients and shadows
    variables.push('  /* Colors */');
    variables.push(`  --color-primary: ${this.config.colors.primary};`);
    variables.push(`  --color-primary-light: ${this.config.colors.primaryLight || this.config.colors.primary};`);
    variables.push(`  --color-primary-dark: ${this.config.colors.primaryDark || this.config.colors.primary};`);
    variables.push(`  --color-secondary: ${this.config.colors.secondary};`);
    variables.push(`  --color-accent: ${this.config.colors.accent};`);
    variables.push(`  --color-background: ${this.config.colors.background};`);
    variables.push(`  --color-background-gradient: ${this.config.colors.backgroundGradient || this.config.colors.background};`);
    variables.push(`  --color-surface: ${this.config.colors.surface};`);
    variables.push(`  --color-surface-elevated: ${this.config.colors.surfaceElevated || this.config.colors.surface};`);
    variables.push(`  --color-surface-hover: ${this.config.colors.surfaceHover || this.config.colors.surface};`);
    variables.push(`  --color-text-primary: ${this.config.colors.text.primary};`);
    variables.push(`  --color-text-secondary: ${this.config.colors.text.secondary};`);
    variables.push(`  --color-text-muted: ${this.config.colors.text.muted};`);
    variables.push(`  --color-text-inverse: ${this.config.colors.text.inverse || '#ffffff'};`);
    variables.push(`  --color-borders: ${this.config.colors.borders};`);
    variables.push(`  --color-borders-hover: ${this.config.colors.bordersHover || this.config.colors.borders};`);

    // Shadow colors
    if (this.config.colors.shadows) {
      variables.push(`  --shadow-light: ${this.config.colors.shadows.light};`);
      variables.push(`  --shadow-medium: ${this.config.colors.shadows.medium};`);
      variables.push(`  --shadow-heavy: ${this.config.colors.shadows.heavy};`);
      variables.push(`  --shadow-glow: ${this.config.colors.shadows.glow};`);
    }

    // Gradients
    if (this.config.colors.gradients) {
      variables.push('');
      variables.push('  /* Gradients */');
      Object.entries(this.config.colors.gradients).forEach(([name, gradient]) => {
        variables.push(`  --gradient-${name}: ${gradient};`);
      });
    }

    // Typography - Enhanced with letter spacing
    variables.push('');
    variables.push('  /* Typography */');
    variables.push(`  --font-family-headings: ${this.config.typography.headings.fontFamily};`);
    variables.push(`  --font-family-body: ${this.config.typography.body.fontFamily};`);
    if (this.config.typography.accent) {
      variables.push(`  --font-family-accent: ${this.config.typography.accent.fontFamily};`);
    }
    variables.push(`  --font-weight-headings: ${this.config.typography.headings.fontWeight};`);
    variables.push(`  --font-weight-body: ${this.config.typography.body.fontWeight};`);
    variables.push(`  --line-height-headings: ${this.config.typography.headings.lineHeight};`);
    variables.push(`  --line-height-body: ${this.config.typography.body.lineHeight};`);
    
    if (this.config.typography.headings.letterSpacing) {
      variables.push(`  --letter-spacing-headings: ${this.config.typography.headings.letterSpacing};`);
    }
    if (this.config.typography.body.letterSpacing) {
      variables.push(`  --letter-spacing-body: ${this.config.typography.body.letterSpacing};`);
    }

    // Font sizes
    Object.entries(this.config.typography.sizes).forEach(([size, value]) => {
      variables.push(`  --font-size-${size}: ${value};`);
    });

    // Spacing - Enhanced
    variables.push('');
    variables.push('  /* Spacing */');
    variables.push(`  --spacing-component-gap: ${this.config.spacing.componentGap};`);
    variables.push(`  --spacing-section-padding: ${this.config.spacing.sectionPadding};`);
    variables.push(`  --spacing-card-padding: ${this.config.spacing.cardPadding};`);
    if (this.config.spacing.buttonPadding) {
      variables.push(`  --spacing-button-padding: ${this.config.spacing.buttonPadding};`);
    }

    // Border radius
    if (this.config.styling.borderRadius && typeof this.config.styling.borderRadius === 'object') {
      variables.push('');
      variables.push('  /* Border Radius */');
      Object.entries(this.config.styling.borderRadius).forEach(([size, value]) => {
        variables.push(`  --border-radius-${size}: ${value};`);
      });
    } else if (this.config.styling.borderRadius) {
      variables.push('');
      variables.push('  /* Border Radius */');
      variables.push(`  --border-radius: ${this.config.styling.borderRadius};`);
    }

    // Animations - Enhanced with multiple easing functions
    variables.push('');
    variables.push('  /* Animations */');
    Object.entries(this.config.animations.duration).forEach(([speed, duration]) => {
      variables.push(`  --animation-duration-${speed}: ${duration};`);
    });

    if (this.config.animations.easing && typeof this.config.animations.easing === 'object') {
      Object.entries(this.config.animations.easing).forEach(([type, easing]) => {
        variables.push(`  --animation-easing-${type}: ${easing};`);
      });
    } else if (this.config.animations.easing) {
      variables.push(`  --animation-easing: ${this.config.animations.easing};`);
    }

    // Transform values
    if (this.config.animations.transforms) {
      variables.push('');
      variables.push('  /* Transforms */');
      Object.entries(this.config.animations.transforms).forEach(([name, transform]) => {
        variables.push(`  --transform-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${transform};`);
      });
    }

    // Shadows
    if (this.config.styling.shadows) {
      variables.push('');
      variables.push('  /* Shadows */');
      Object.entries(this.config.styling.shadows).forEach(([level, shadow]) => {
        variables.push(`  --shadow-${level}: ${shadow};`);
      });
    }

    return `:root {\n${variables.join('\n')}\n}`;
  }

  /**
   * Generate base styles
   */
  generateBaseStyles() {
    return `/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: ${this.config.features?.smoothScrolling ? 'smooth' : 'auto'};
  font-size: 16px;
}

body {
  font-family: var(--font-family-body);
  font-weight: var(--font-weight-body);
  line-height: var(--line-height-body);
  color: var(--color-text-primary);
  background: var(--color-background-gradient, var(--color-background));
  font-size: var(--font-size-base);
  letter-spacing: var(--letter-spacing-body, normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

.website-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-section-padding);
  position: relative;
}

/* Enhanced scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-dark, var(--color-primary));
}

/* Selection styling */
::selection {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

::-moz-selection {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

/* Focus indicators */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--border-radius-small, 4px);
}`;
  }

  /**
   * Generate typography styles
   */
  generateTypographyCSS() {
    return `/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-family-headings);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
  letter-spacing: var(--letter-spacing-headings, normal);
  color: var(--color-text-primary);
  margin-bottom: 0.75em;
  position: relative;
}

h1 { 
  font-size: var(--font-size-5xl, var(--font-size-3xl)); 
  background: var(--gradient-primary, var(--color-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h2 { 
  font-size: var(--font-size-4xl, var(--font-size-2xl)); 
  position: relative;
}

h2::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 60px;
  height: 3px;
  background: var(--gradient-accent, var(--color-accent));
  border-radius: 2px;
  opacity: 0;
  transform: scaleX(0);
  transition: all var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
}

h2:hover::after {
  opacity: 1;
  transform: scaleX(1);
}

h3 { font-size: var(--font-size-3xl, var(--font-size-xl)); }
h4 { font-size: var(--font-size-2xl, var(--font-size-lg)); }
h5 { font-size: var(--font-size-xl, var(--font-size-base)); }
h6 { font-size: var(--font-size-lg, var(--font-size-sm)); }

p {
  margin-bottom: 1.5em;
  color: var(--color-text-primary);
  letter-spacing: var(--letter-spacing-body, normal);
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp var(--animation-duration-slow, 600ms) var(--animation-easing-default, ease) forwards;
}

.text-muted {
  color: var(--color-text-muted);
}

.text-accent {
  color: var(--color-accent);
  font-family: var(--font-family-accent, var(--font-family-headings));
  font-weight: 600;
}

.text-gradient {
  background: var(--gradient-primary, var(--color-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Enhanced text animations */
.animate-text-reveal {
  overflow: hidden;
  position: relative;
}

.animate-text-reveal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-primary);
  transform: translateX(-100%);
  animation: textReveal var(--animation-duration-slow, 600ms) var(--animation-easing-default, ease) forwards;
}

.animate-typewriter {
  overflow: hidden;
  border-right: 2px solid var(--color-primary);
  white-space: nowrap;
  margin: 0 auto;
  animation: 
    typing 3.5s steps(40, end),
    blink-caret 0.75s step-end infinite;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes textReveal {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes typing {
  from { width: 0 }
  to { width: 100% }
}

@keyframes blink-caret {
  from, to { border-color: transparent }
  50% { border-color: var(--color-primary) }
}`;
  }

  /**
   * Generate component styles
   */
  generateComponentCSS() {
    return `/* Component Styles */

/* Enhanced base elements */
.text-secondary {
  color: var(--color-text-secondary);
}

a {
  color: var(--color-primary);
  text-decoration: none;
  position: relative;
  transition: all var(--animation-duration-fast, 200ms) var(--animation-easing-default, ease);
}

a::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--gradient-accent, var(--color-accent));
  transition: width var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
}

a:hover {
  color: var(--color-accent);
  transform: translateY(-1px);
}

a:hover::after {
  width: 100%;
}

/* Enhanced Hero Component */
.hero-component {
  padding: var(--spacing-section-padding);
  margin-bottom: var(--spacing-component-gap);
  text-align: center;
  position: relative;
  background: var(--gradient-hero, var(--color-background));
  border-radius: var(--border-radius-large, 20px);
  overflow: hidden;
}

.hero-component::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%);
  transform: translateX(-100%);
  animation: shimmer 3s infinite;
}

.hero-profile-image {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 2rem;
  border: 4px solid var(--color-surface-elevated);
  box-shadow: var(--shadow-large, 0 10px 25px rgba(0,0,0,0.1));
  transition: all var(--animation-duration-normal, 300ms) var(--animation-easing-bounce, ease);
  position: relative;
  z-index: 1;
}

.hero-profile-image:hover {
  transform: var(--transform-card-hover, scale(1.05));
  box-shadow: var(--shadow-glow, 0 0 20px rgba(59, 130, 246, 0.25));
}

.hero-ratings {
  color: var(--color-accent);
  font-size: var(--font-size-lg);
  margin-top: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.hero-ratings::before {
  content: '⭐';
  animation: sparkle 2s infinite alternate;
}

/* Enhanced Contact Component */
.contact-component {
  background: var(--gradient-surface, var(--color-surface-elevated));
  padding: var(--spacing-card-padding);
  border-radius: var(--border-radius-medium, 12px);
  margin-bottom: var(--spacing-component-gap);
  box-shadow: var(--shadow-medium, 0 4px 6px rgba(0,0,0,0.1));
  border: 1px solid var(--color-borders);
  transition: all var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
  position: relative;
  overflow: hidden;
}

.contact-component:hover {
  transform: var(--transform-hover-lift, translateY(-4px));
  box-shadow: var(--shadow-elevated, 0 20px 25px rgba(0,0,0,0.1));
  border-color: var(--color-borders-hover);
}

.contact-component::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--gradient-primary, var(--color-primary));
  transform: scaleX(0);
  transition: transform var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
}

.contact-component:hover::before {
  transform: scaleX(1);
}

.contact-item {
  margin-bottom: 1rem;
  opacity: 0;
  transform: translateY(10px);
  animation: slideInLeft var(--animation-duration-slow, 600ms) var(--animation-easing-default, ease) forwards;
}

.contact-item:nth-child(2) { animation-delay: 100ms; }
.contact-item:nth-child(3) { animation-delay: 200ms; }
.contact-item:nth-child(4) { animation-delay: 300ms; }

.contact-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 0.25rem;
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.contact-value {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-weight: 500;
}

/* Enhanced Stats Component */
.stats-component {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: var(--spacing-component-gap);
}

.stat-item {
  background: var(--gradient-surface, var(--color-surface-elevated));
  padding: var(--spacing-card-padding);
  border-radius: var(--border-radius-medium, 12px);
  text-align: center;
  box-shadow: var(--shadow-medium, 0 4px 6px rgba(0,0,0,0.1));
  border: 1px solid var(--color-borders);
  transition: all var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
  position: relative;
  overflow: hidden;
}

.stat-item:hover {
  transform: var(--transform-hover-lift, translateY(-4px)) var(--transform-hover-scale, scale(1.02));
  box-shadow: var(--shadow-elevated, 0 20px 25px rgba(0,0,0,0.1));
  border-color: var(--color-primary);
}

.stat-item::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg, transparent, var(--color-primary), transparent);
  opacity: 0;
  transition: opacity var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
  animation: rotate 4s linear infinite;
}

.stat-item:hover::before {
  opacity: 0.1;
}

.stat-value {
  font-size: var(--font-size-4xl, var(--font-size-2xl));
  font-weight: 700;
  color: var(--color-primary);
  display: block;
  margin-bottom: 0.5rem;
  position: relative;
  z-index: 1;
}

.stat-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  z-index: 1;
}

/* Enhanced Details Component */
.details-component {
  margin-bottom: var(--spacing-component-gap);
  background: var(--gradient-surface, var(--color-surface-elevated));
  padding: var(--spacing-card-padding);
  border-radius: var(--border-radius-medium, 12px);
  box-shadow: var(--shadow-medium, 0 4px 6px rgba(0,0,0,0.1));
  border: 1px solid var(--color-borders);
}

/* Enhanced Animation Keyframes */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

@keyframes sparkle {
  0% { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1.1) rotate(5deg); }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Floating elements animation */
.floating {
  animation: float 3s ease-in-out infinite;
}

.floating:nth-child(2) { animation-delay: 0.5s; }
.floating:nth-child(3) { animation-delay: 1s; }
.floating:nth-child(4) { animation-delay: 1.5s; }`;
  }

  /**
   * Generate layout-specific styles
   */
  generateLayoutCSS() {
    return `/* Layout Styles */
.layout-single-column {
  max-width: 800px;
  margin: 0 auto;
}

.layout-two-column {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--spacing-component-gap);
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-component-gap);
}

.layout-hero-focused {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-content {
  min-width: 0; /* Prevent grid overflow */
}

.sidebar {
  background: var(--gradient-surface, var(--color-surface-elevated));
  padding: var(--spacing-card-padding);
  border-radius: var(--border-radius-medium, 12px);
  height: fit-content;
  box-shadow: var(--shadow-medium, 0 4px 6px rgba(0,0,0,0.1));
  border: 1px solid var(--color-borders);
}`;
  }

  /**
   * Generate enhanced animation styles
   */
  generateAnimationCSS() {
    const animations = [];

    // Core animations
    animations.push(`
/* Core Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInFromLeft {
  from { opacity: 0; transform: translateX(-50px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInFromRight {
  from { opacity: 0; transform: translateX(50px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
  40%, 43% { transform: translateY(-20px); }
  70% { transform: translateY(-10px); }
  90% { transform: translateY(-4px); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px var(--color-primary); }
  50% { box-shadow: 0 0 20px var(--color-primary), 0 0 30px var(--color-primary); }
  100% { box-shadow: 0 0 5px var(--color-primary); }
}

@keyframes gradient-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Utility Animation Classes */
.animate-fade-in {
  animation: fadeIn var(--animation-duration-slow, 600ms) var(--animation-easing-default, ease) forwards;
}

.animate-slide-left {
  animation: slideInFromLeft var(--animation-duration-normal, 400ms) var(--animation-easing-default, ease) forwards;
}

.animate-slide-right {
  animation: slideInFromRight var(--animation-duration-normal, 400ms) var(--animation-easing-default, ease) forwards;
}

.animate-scale-in {
  animation: scaleIn var(--animation-duration-normal, 400ms) var(--animation-easing-bounce, ease) forwards;
}

.animate-bounce {
  animation: bounce 2s infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite alternate;
}

.animate-gradient-flow {
  background-size: 400% 400%;
  animation: gradient-flow 3s ease infinite;
}

/* Hover Animations */
.hover-lift {
  transition: all var(--animation-duration-fast, 200ms) var(--animation-easing-default, ease);
}

.hover-lift:hover {
  transform: var(--transform-hover-lift, translateY(-4px));
}

.hover-scale {
  transition: transform var(--animation-duration-fast, 200ms) var(--animation-easing-default, ease);
}

.hover-scale:hover {
  transform: var(--transform-hover-scale, scale(1.05));
}

.hover-glow {
  transition: box-shadow var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
}

.hover-glow:hover {
  box-shadow: var(--shadow-glow, 0 0 20px rgba(59, 130, 246, 0.25));
}

/* Staggered Animations */
.stagger-container > * {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeIn var(--animation-duration-slow, 600ms) var(--animation-easing-default, ease) forwards;
}

.stagger-container > *:nth-child(1) { animation-delay: 0ms; }
.stagger-container > *:nth-child(2) { animation-delay: 100ms; }
.stagger-container > *:nth-child(3) { animation-delay: 200ms; }
.stagger-container > *:nth-child(4) { animation-delay: 300ms; }
.stagger-container > *:nth-child(5) { animation-delay: 400ms; }
.stagger-container > *:nth-child(6) { animation-delay: 500ms; }

/* Magnetic Effect */
.magnetic {
  transition: transform var(--animation-duration-fast, 200ms) var(--animation-easing-default, ease);
}

.magnetic:hover {
  transform: translateZ(0) scale(1.05);
}

/* Parallax Effect */
.parallax {
  transform: translateZ(0);
  transition: transform var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
}

/* Glass Morphism */
.glass {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Modern Button Animations */
.btn-modern {
  position: relative;
  overflow: hidden;
  transition: all var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
}

.btn-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left var(--animation-duration-normal, 300ms) var(--animation-easing-default, ease);
}

.btn-modern:hover::before {
  left: 100%;
}

.btn-modern:hover {
  transform: var(--transform-button-hover, translateY(-2px) scale(1.05));
  box-shadow: var(--shadow-elevated, 0 20px 25px rgba(0,0,0,0.1));
}`);

    return `/* Enhanced Animations */\n${animations.join('\n')}`;
  }

  /**
   * Generate special effects for enhanced themes
   */
  generateSpecialEffectsCSS() {
    const effects = [];

    // Glitch effects for cyber themes
    if (this.config.animations?.effects?.glitchEffects) {
      effects.push(`
/* Glitch Effects */
@keyframes glitch {
  0%, 100% { transform: translate(0); }
  10% { transform: translate(-2px, -2px); }
  20% { transform: translate(2px, 2px); }
  30% { transform: translate(-2px, 2px); }
  40% { transform: translate(2px, -2px); }
  50% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  70% { transform: translate(-2px, 2px); }
  80% { transform: translate(2px, -2px); }
  90% { transform: translate(-2px, -2px); }
}

.glitch {
  animation: glitch var(--animation-duration-cyber, 1s) infinite;
}

.glitch-text {
  position: relative;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch-text::before {
  animation: glitch-1 0.5s infinite linear alternate-reverse;
  color: #ff0080;
  z-index: -1;
}

.glitch-text::after {
  animation: glitch-2 0.5s infinite linear alternate-reverse;
  color: #00d4ff;
  z-index: -2;
}

@keyframes glitch-1 {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
}

@keyframes glitch-2 {
  0% { transform: translate(0); }
  20% { transform: translate(2px, 2px); }
  40% { transform: translate(2px, -2px); }
  60% { transform: translate(-2px, 2px); }
  80% { transform: translate(-2px, -2px); }
  100% { transform: translate(0); }
}`);
    }

    // Hologram effects
    if (this.config.animations?.effects?.hologramEffects) {
      effects.push(`
/* Hologram Effects */
@keyframes hologram {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.hologram {
  animation: hologram 2s ease-in-out infinite;
  background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
  background-size: 200% 200%;
  animation: hologram-sweep 3s linear infinite;
}

@keyframes hologram-sweep {
  0% { background-position: -200% -200%; }
  100% { background-position: 200% 200%; }
}`);
    }

    // Matrix rain effect
    if (this.config.animations?.effects?.matrixRain) {
      effects.push(`
/* Matrix Rain Effect */
.matrix-rain {
  position: relative;
  overflow: hidden;
}

.matrix-rain::before {
  content: '';
  position: absolute;
  top: -100%;
  left: 0;
  width: 100%;
  height: 200%;
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      var(--color-accent, #00ff41) 2px,
      var(--color-accent, #00ff41) 4px
    );
  animation: matrix-fall 3s linear infinite;
  opacity: 0.1;
}

@keyframes matrix-fall {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}`);
    }

    // Liquid morphing animations
    if (this.config.animations?.effects?.liquidAnimations) {
      effects.push(`
/* Liquid Morphing */
@keyframes liquid-morph {
  0%, 100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  }
  50% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
  }
}

.liquid {
  animation: liquid-morph var(--animation-duration-cinematic, 1.5s) ease-in-out infinite;
}

.liquid-blob {
  filter: blur(1px);
  animation: liquid-morph 4s ease-in-out infinite;
}`);
    }

    // Vintage effects for elegant themes
    if (this.config.styling?.patterns?.vintage) {
      effects.push(`
/* Vintage Effects */
.vintage-overlay {
  position: relative;
}

.vintage-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%);
  pointer-events: none;
  opacity: 0.3;
}

.vintage-paper {
  background-color: var(--color-background);
  background-image: 
    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}`);
    }

    // Particle system
    if (this.config.features?.particleSystem) {
      effects.push(`
/* Particle System */
.particles {
  position: relative;
  overflow: hidden;
}

.particles::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(1px 1px at 20px 30px, var(--color-accent), transparent),
    radial-gradient(1px 1px at 40px 70px, var(--color-primary), transparent),
    radial-gradient(1px 1px at 90px 40px, var(--color-secondary), transparent);
  background-repeat: repeat;
  background-size: 100px 100px;
  animation: particles-float 20s linear infinite;
  opacity: 0.3;
  pointer-events: none;
}

@keyframes particles-float {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(120deg); }
  66% { transform: translate(-20px, 20px) rotate(240deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}`);
    }

    return effects.length > 0 ? `/* Special Effects */\n${effects.join('\n')}` : '';
  }

  /**
   * Generate responsive styles
   */
  generateResponsiveCSS() {
    const breakpoints = this.config.breakpoints || {
      mobile: '640px',
      tablet: '768px', 
      laptop: '1024px',
      desktop: '1280px'
    };

    return `/* Responsive Styles */
@media (max-width: ${breakpoints.mobile}) {
  .website-container {
    padding: ${this.config.spacing.responsive.mobile};
  }
  
  .layout-two-column {
    grid-template-columns: 1fr;
  }
  
  .stats-component {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .social-links {
    flex-direction: column;
    align-items: center;
  }
  
  .hero-component {
    padding: ${this.config.spacing.responsive.mobile};
  }

  .hero-profile-image {
    width: 120px;
    height: 120px;
  }

  h1 { font-size: var(--font-size-3xl, 2rem); }
  h2 { font-size: var(--font-size-2xl, 1.5rem); }
}

@media (min-width: ${breakpoints.mobile}) and (max-width: ${breakpoints.tablet}) {
  .website-container {
    padding: ${this.config.spacing.responsive.tablet};
  }

  .stats-component {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: ${breakpoints.tablet}) and (max-width: ${breakpoints.laptop}) {
  .stats-component {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: ${breakpoints.laptop}) {
  .website-container {
    padding: ${this.config.spacing.responsive.desktop};
  }

  .parallax {
    transform: translateZ(0) translateY(var(--parallax-offset, 0));
  }
}

/* High contrast and accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0f172a;
    --color-surface: #1e293b;
    --color-text-primary: #f8fafc;
    --color-text-secondary: #cbd5e1;
    --color-borders: #334155;
  }
}`;
  }

  /**
   * Get theme metadata
   */
  getMetadata() {
    return {
      themeName: this.config.name,
      version: this.config.version,
      colors: this.config.colors,
      features: {
        animations: this.config.animations.effects,
        responsive: true,
        darkMode: this.config.features?.darkModeSupport || false,
        accessibility: this.config.features?.accessibilityEnhanced || false,
        performance: this.config.features?.performanceOptimized || false
      }
    };
  }
}

module.exports = ThemeEngine;
