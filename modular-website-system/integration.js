/**
 * Modular Website System Integration
 * Replaces the existing vvebjs-generator with the new modular system
 * Updated with hero overlay white support
 */

const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');

// Initialize the modular generator
const modularGenerator = new ModularWebsiteGenerator();

/**
 * Generate website using the new modular system
 * This function replaces the old generateVvebJSWebsite function
 */
function generateModularWebsite(agentData, options = {}) {
  try {
    // Extract layout and theme preferences from options or use defaults
    const layoutPreset = options.layout || 'professional';
    const themeName = options.theme || 'modern-professional';
    const activationBanner = options.activationBanner || false;

    console.log('🎨 INTEGRATION: Received theme parameter:', options.theme, 'Resolved to:', themeName);
    console.log('🔍 INTEGRATION: Agent data properties:', {
      name: agentData.name,
      propertiesCount: agentData.properties?.length || 0,
      propertiesArray: agentData.properties ? agentData.properties.map(p => ({
        address: p.address,
        price: p.price,
        beds: p.beds || p.bedrooms,
        baths: p.baths || p.bathrooms,
        sqft: p.sqft || p.square_feet,
        description: p.description
      })) : 'no properties'
    });

    // Extract hero image configuration
    const heroImageOptions = {
      heroImageUrl: options.heroImageUrl,
      heroImageSource: options.heroImageSource || 'auto', // 'auto', 'property_first', 'property_featured', 'custom'
      heroOverlayOpacity: options.heroOverlayOpacity !== undefined ? options.heroOverlayOpacity : 0.4,
      heroBlur: options.heroBlur || 0,
      heroOverlayWhite: options.heroOverlayWhite || false,
      profileImageUrl: options.profileImageUrl || null
    };

    // Extract manual color options
    const manualColorOptions = {
      manualHeroTextColors: options.manualHeroTextColors || false,
      heroTextColor: options.heroTextColor || '#ffffff',
      heroTextSecondary: options.heroTextSecondary || '#cccccc',
      heroAccentColor: options.heroAccentColor || '#007bff'
    };

    // Generate the website using the modular system with hero image options
    const result = modularGenerator.generateWebsite(agentData, layoutPreset, themeName, { 
      activationBanner,
      ...heroImageOptions,
      ...manualColorOptions
    });

    if (result.success) {
      console.log(`✅ Generated modular website using layout: ${layoutPreset}, theme: ${themeName}, banner: ${activationBanner}, hero: ${heroImageOptions.heroImageSource}`);
      return result.html;
    } else {
      console.error('❌ Modular website generation failed:', result.error);
      // Return fallback website
      return result.fallback;
    }

  } catch (error) {
    console.error('❌ Modular website generation error:', error);
    
    // Fallback to simple generation
    return generateSimpleFallback(agentData);
  }
}

/**
 * Generate simple fallback website if modular system fails
 */
function generateSimpleFallback(agentData) {
  const name = agentData.name || 'Professional Realtor';
  const company = agentData.company || 'Real Estate Professional';
  const phone = agentData.phone || 'Contact for phone';
  const email = agentData.email || 'Contact for email';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - ${company}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem;
            line-height: 1.6;
        }
        h1 { color: #2563eb; margin-bottom: 0.5rem; }
        h2 { color: #64748b; margin-bottom: 1rem; }
        .contact { 
            background: #f8fafc; 
            padding: 1.5rem; 
            border-radius: 8px; 
            margin: 1rem 0; 
        }
        .contact p { margin: 0.5rem 0; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>${name}</h1>
    <h2>${company}</h2>
    
    <div class="contact">
        <h3>Contact Information</h3>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email.includes('@') ? `<a href="mailto:${email}">${email}</a>` : email}</p>
        ${agentData.website ? `<p><strong>Website:</strong> <a href="${agentData.website}" target="_blank">${agentData.website}</a></p>` : ''}
    </div>
    
    ${agentData.bio ? `
    <div>
        <h3>About</h3>
        <p>${agentData.bio}</p>
    </div>` : ''}
    
    ${agentData.properties && agentData.properties.length > 0 ? `
    <div>
        <h3>Properties (${agentData.properties.length})</h3>
        <p>Contact for current property listings and availability.</p>
    </div>` : ''}
</body>
</html>`;
}

/**
 * Get available layout options for UI
 */
function getAvailableLayouts() {
  try {
    return modularGenerator.getAvailableLayouts().map(layoutKey => {
      const info = modularGenerator.getLayoutInfo(layoutKey);
      return {
        key: layoutKey,
        name: info ? info.name : layoutKey,
        description: info ? info.description : 'No description available'
      };
    });
  } catch (error) {
    console.error('Error getting layouts:', error);
    return [
      { key: 'professional', name: 'Professional', description: 'Clean professional layout' },
      { key: 'minimal', name: 'Minimal', description: 'Simple minimal layout' }
    ];
  }
}

/**
 * Get available theme options for UI
 */
function getAvailableThemes() {
  try {
    return modularGenerator.getAvailableThemes().map(themeKey => {
      const info = modularGenerator.getThemeInfo(themeKey);
      return {
        key: themeKey,
        name: info ? info.name : themeKey,
        description: info ? info.description : 'No description available',
        colors: info ? info.colors : null
      };
    });
  } catch (error) {
    console.error('Error getting themes:', error);
    return [
      { key: 'modern-professional', name: 'Modern Professional', description: 'Clean modern design' },
      { key: 'minimal-clean', name: 'Minimal Clean', description: 'Ultra-clean minimal design' }
    ];
  }
}

/**
 * Backward compatibility function
 * This maintains the same interface as the old generateVvebJSWebsite function
 */
function generateVvebJSWebsite(agentData) {
  return generateModularWebsite(agentData, {
    layout: 'professional',
    theme: 'modern-professional'
  });
}

module.exports = {
  generateVvebJSWebsite,           // Backward compatibility
  generateModularWebsite,          // New modular function
  generateSimpleFallback,          // Fallback generator
  getAvailableLayouts,             // Get layout options
  getAvailableThemes,              // Get theme options
  modularGenerator                 // Direct access to generator
};
