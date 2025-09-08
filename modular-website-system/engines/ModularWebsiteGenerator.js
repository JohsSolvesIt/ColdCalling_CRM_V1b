/**
 * Modular Website Generator
 * Combines Layout System and Theme System to generate complete websites
 */

const LayoutEngine = require('./LayoutEngine');
const ThemeEngine = require('./ThemeEngine');
const HeroImageCollection = require('./HeroImageCollection');
const fs = require('fs');
const path = require('path');

class ModularWebsiteGenerator {
  constructor() {
    this.layoutPresets = new Map();
    this.themeConfigs = new Map();
    this.loadPresets();
  }

  /**
   * Load all available presets and themes
   */
  loadPresets() {
    // Load layout presets
    try {
      this.layoutPresets.set('professional', require('../layouts/presets/realtor-professional'));
      this.layoutPresets.set('minimal', require('../layouts/presets/realtor-minimal'));
      this.layoutPresets.set('showcase', require('../layouts/presets/realtor-showcase'));
      this.layoutPresets.set('personal', require('../layouts/presets/realtor-personal'));
    } catch (error) {
      console.warn('Some layout presets not found, using defaults');
    }

    // Load theme configs
    try {
      this.themeConfigs.set('modern-professional', require('../themes/modern-professional/config'));
      this.themeConfigs.set('luxury-professional', require('../themes/luxury-professional/theme.json'));
      this.themeConfigs.set('inked-estate', require('../themes/inked-estate/config'));
      console.log('✅ Successfully loaded themes:', Array.from(this.themeConfigs.keys()));
    } catch (error) {
      console.warn('Some theme configs not found:', error.message);
    }
  }

  /**
   * Generate a complete website with layout and theme
   */
  generateWebsite(contactData, layoutPresetName = 'professional', themeName = 'modern-professional', options = {}) {
    console.log(`🎨 ENGINE: generateWebsite called with theme: ${themeName}, layout: ${layoutPresetName}`);
    
    try {
      // Check if theme has a template.html file
      const templatePath = path.join(__dirname, '../themes', themeName, 'template.html');
      console.log(`🎨 ENGINE: Looking for template at: ${templatePath}`);
      console.log(`🎨 ENGINE: Template exists: ${fs.existsSync(templatePath)}`);
      if (fs.existsSync(templatePath)) {
        console.log(`🎨 Using template file for theme: ${themeName}`);
        return this.generateFromTemplate(contactData, templatePath, themeName, options);
      } else {
        console.log(`🎨 Template not found, falling back to basic generation for theme: ${themeName}`);
      }

      // Get layout preset
      const layoutPreset = this.layoutPresets.get(layoutPresetName) || this.getDefaultLayoutPreset();
      
      // Get theme config
      const themeConfig = this.themeConfigs.get(themeName) || this.getDefaultThemeConfig();

      // Initialize engines
      const layoutEngine = new LayoutEngine(layoutPreset);
      const themeEngine = new ThemeEngine(themeConfig);

      // Generate HTML structure
      const htmlStructure = layoutEngine.generateHTML(contactData);

      // Generate CSS styles
      const cssStyles = themeEngine.generateCSS();

      // Combine into complete website
      const completeHTML = this.combineHTMLAndCSS(htmlStructure, cssStyles, contactData, options);

      return {
        success: true,
        html: completeHTML,
        metadata: {
          layout: layoutEngine.getMetadata(),
          theme: themeEngine.getMetadata(),
          generatedAt: new Date().toISOString(),
          contactId: contactData.id || 'unknown'
        }
      };

    } catch (error) {
      console.error('Website generation error:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackWebsite(contactData)
      };
    }
  }

  /**
   * Combine HTML structure with CSS styles
   */
  combineHTMLAndCSS(htmlStructure, cssStyles, contactData, options = {}) {
    const title = `${contactData.name || 'Professional Realtor'} - ${contactData.company || 'Real Estate Professional'}`;
    const description = `${contactData.name || 'Professional Realtor'} - ${contactData.title || 'Real Estate Professional'} serving ${contactData.service_areas || 'your area'}.`;

    // Generate activation banner HTML if enabled
    const activationBannerHTML = options.activationBanner ? this.generateActivationBanner() : '';
    const activationBannerCSS = options.activationBanner ? this.generateActivationBannerCSS() : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="author" content="${contactData.name || 'Professional Realtor'}">
    
    <!-- SEO Meta Tags -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    ${contactData.profile_image_url ? `<meta property="og:image" content="${contactData.profile_image_url}">` : ''}
    
    <!-- Theme Styles -->
    <style>
${cssStyles}
${activationBannerCSS}
    </style>
</head>
<body>
    ${activationBannerHTML}
    <div class="website-container">
        ${htmlStructure}
    </div>
    
    <!-- Add animation classes on load -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const components = document.querySelectorAll('[class*="-component"]');
            components.forEach((component, index) => {
                setTimeout(() => {
                    component.classList.add('animate-fade-in');
                }, index * 100);
            });
            
            // Add hover effects
            const hoverElements = document.querySelectorAll('.property-item, .stat-item, .social-link');
            hoverElements.forEach(el => {
                el.classList.add('hover-lift');
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate fallback website if main generation fails
   */
  generateFallbackWebsite(contactData) {
    const name = contactData.name || 'Professional Realtor';
    const company = contactData.company || 'Real Estate Professional';
    const phone = contactData.phone || 'Contact for phone';
    const email = contactData.email || 'Contact for email';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - ${company}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #2563eb; }
        .contact { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    </style>
</head>
<body>
    <h1>${name}</h1>
    <h2>${company}</h2>
    <div class="contact">
        <h3>Contact Information</h3>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Get default layout preset if none specified
   */
  getDefaultLayoutPreset() {
    return {
      name: "Default Professional",
      baseLayout: "single-column",
      components: {
        hero: "hero-standard",
        contact: "contact-list",
        stats: "stats-grid",
        details: "details-sections",
        properties: "properties-list",
        social: "social-buttons"
      },
      componentOrder: ["hero", "contact", "stats", "details", "properties", "social"],
      contentRules: {
        hideEmptyComponents: true,
        minimumComponentsRequired: 1,
        fallbackContent: true
      }
    };
  }

  /**
   * Get default theme config if none specified
   */
  getDefaultThemeConfig() {
    return {
      name: "Default Modern",
      version: "1.0.0",
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        accent: "#f59e0b",
        background: "#ffffff",
        surface: "#f8fafc",
        text: {
          primary: "#1e293b",
          secondary: "#64748b",
          muted: "#94a3b8"
        }
      },
      typography: {
        headings: {
          fontFamily: "'Arial', sans-serif",
          fontWeight: "600",
          lineHeight: "1.2"
        },
        body: {
          fontFamily: "'Arial', sans-serif",
          fontWeight: "400",
          lineHeight: "1.6"
        },
        sizes: {
          xs: "0.75rem",
          sm: "0.875rem",
          base: "1rem",
          lg: "1.125rem",
          xl: "1.25rem",
          "2xl": "1.5rem",
          "3xl": "1.875rem"
        }
      },
      spacing: {
        componentGap: "2rem",
        sectionPadding: "2rem",
        cardPadding: "1.5rem",
        responsive: {
          mobile: "1rem",
          tablet: "1.5rem",
          desktop: "2rem"
        }
      },
      animations: {
        duration: {
          fast: "150ms",
          normal: "300ms",
          slow: "500ms"
        },
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        effects: {
          fadeIn: true,
          slideIn: false,
          hoverLift: true
        }
      }
    };
  }

  /**
   * Get available layout presets
   */
  getAvailableLayouts() {
    return Array.from(this.layoutPresets.keys());
  }

  /**
   * Get available themes
   */
  getAvailableThemes() {
    return Array.from(this.themeConfigs.keys());
  }

  /**
   * Get preset/theme information
   */
  getLayoutInfo(presetName) {
    const preset = this.layoutPresets.get(presetName);
    return preset ? {
      name: preset.name,
      baseLayout: preset.baseLayout,
      components: preset.components,
      description: preset.description || 'No description available'
    } : null;
  }

  getThemeInfo(themeName) {
    const theme = this.themeConfigs.get(themeName);
    return theme ? {
      name: theme.name,
      version: theme.version,
      colors: theme.colors,
      description: theme.description || 'No description available'
    } : null;
  }

  /**
   * Generate website from template.html file
   */
  generateFromTemplate(contactData, templatePath, themeName, options = {}) {
    try {
      // BECKI CASSIDY SPECIFIC DEBUG
      const agentName = contactData.name || contactData.NAME || 'Unknown';
      if (agentName.toLowerCase().includes('becki') && agentName.toLowerCase().includes('cassidy')) {
        console.log('🎯🎯🎯 BECKI CASSIDY WEBSITE GENERATION DETECTED 🎯🎯🎯');
        console.log('👤 Agent Name:', agentName);
        console.log('🏠 Properties Count:', contactData.properties ? contactData.properties.length : 0);
        console.log('📋 Full Properties Data:');
        if (contactData.properties) {
          contactData.properties.forEach((prop, i) => {
            console.log(`  ${i+1}. "${prop.address || 'No address'}" (Price: ${prop.price || 'No price'})`);
          });
        }
      }
      
      // Debug: Log contact data to see what fields are available
      console.log('🖼️  Contact data fields:', {
        name: contactData.name,
        profile_image_url: contactData.profile_image_url,
        properties: contactData.properties ? contactData.properties.length : 0,
        specializations: contactData.specializations,
        languages: contactData.languages,
        certifications: contactData.certifications
      });

      console.log('🔍 TEMPLATE ENGINE: Properties data received:', {
        propertiesCount: contactData.properties?.length || 0,
        propertyDetailsCount: contactData.property_details?.length || 0,
        sampleProperty: contactData.properties?.[0] ? {
          address: contactData.properties[0].address,
          price: contactData.properties[0].price,
          beds: contactData.properties[0].beds || contactData.properties[0].bedrooms,
          baths: contactData.properties[0].baths || contactData.properties[0].bathrooms,
          sqft: contactData.properties[0].sqft || contactData.properties[0].square_feet,
          description: contactData.properties[0].description
        } : 'none'
      });

      // Read the template file
      let template = fs.readFileSync(templatePath, 'utf8');

      // BASIC AGENT INFO REPLACEMENTS
      template = template.replace(/\{\{AGENT_NAME\}\}/g, contactData.name || 'Agent Name Not Found');
      template = template.replace(/\{\{AGENT_EMAIL\}\}/g, contactData.email || 'Contact for email');
      template = template.replace(/\{\{AGENT_PHONE\}\}/g, contactData.phone || 'Contact for phone');
      
      // Company name with filtering out UI text
      let companyName = contactData.company || 
                       contactData.office?.name || 
                       contactData.officeName ||
                       contactData.teamName ||
                       contactData.teamInfo?.name ||
                       'Real Estate Professional';
      
      // Filter out common UI text that shouldn't be company names
      const uiTextFilters = ['Show Team', 'View Team', 'Show More', 'View More', 'Contact', 'Call Now', 'Email', 'Website'];
      if (uiTextFilters.includes(companyName)) {
        companyName = 'Real Estate Professional';
      }
      
      template = template.replace(/\{\{COMPANY_NAME\}\}/g, companyName);
      template = template.replace(/\{\{AGENT_TITLE\}\}/g, contactData.title || 'Real Estate Professional');
      
      // Clean and process bio data with fallback options and text cleaning
      let cleanBio = this.cleanBioText(contactData.bio || contactData.description || contactData.about || contactData.summary || 'Professional real estate agent dedicated to helping clients achieve their property goals.');
      template = template.replace(/\{\{AGENT_BIO\}\}/g, cleanBio);
      
      // LOCATION & SERVICE AREAS with filtering
      let location = contactData.address || 
                    contactData.office?.address ||
                    contactData.officeAddress ||
                    contactData.areasServed ||
                    (contactData.service_areas && contactData.service_areas.length > 0 ? contactData.service_areas.join(', ') : null) ||
                    contactData.location ||
                    'Service Area Available';
      
      // Filter out generic location text
      const locationFilters = ['Local Area', 'Area', 'Location', 'N/A', 'TBD', 'Contact for details'];
      if (locationFilters.includes(location)) {
        location = 'Service Area Available';
      }
      
      template = template.replace(/\{\{LOCATION\}\}/g, location);
      
      // PROFILE IMAGE HANDLING with multiple fallbacks
      // Priority: 1. Custom profile image URL from options, 2. Contact data profile images, 3. Placeholder
      console.log('🖼️ DEBUG: Full contact data for profile image check:', {
        contactName: contactData.name,
        allContactFields: Object.keys(contactData),
        profileImageRelatedFields: {
          profile_image_url: contactData.profile_image_url,
          profile_image: contactData.profile_image,
          image: contactData.image,
          photo: contactData.photo,
          available_photos: contactData.available_photos
        }
      });
      
      console.log('🖼️ Profile image options:', {
        customProfileImageUrl: options.profileImageUrl,
        customIsEmpty: options.profileImageUrl === '',
        customIsFalsy: !options.profileImageUrl,
        contactProfileImageUrl: contactData.profile_image_url,
        contactProfileImage: contactData.profile_image,
        contactImage: contactData.image,
        contactPhoto: contactData.photo
      });

      let profileImage = (options.profileImageUrl && options.profileImageUrl.trim() !== '') ? options.profileImageUrl : 
                        contactData.profile_image_url || 
                        contactData.profile_image || 
                        contactData.image || 
                        contactData.photo ||
                        (contactData.available_photos && contactData.available_photos[0]) ||
                        '';
      
      console.log('🖼️ Selected profile image:', profileImage);

      // If no image, use placeholder
      if (!profileImage) {
        profileImage = 'https://via.placeholder.com/600x600/f8fafc/7f8c8d?text=' + encodeURIComponent((contactData.name || 'Agent').replace(/\s+/g, '+'));
      }
      template = template.replace(/\{\{AGENT_PHOTO\}\}/g, profileImage);
      
      // PROPERTY STATISTICS - Calculate from actual properties data
      const properties = contactData.properties || contactData.property_details || [];
      
      // HERO BACKGROUND IMAGE PROCESSING
      template = this.processHeroBackgroundImage(template, contactData, properties, options);
      
      let totalProperties = properties.length;
      let averagePrice = 0;
      let priceRange = 'Contact for pricing';
      let totalSales = totalProperties;
      
      console.log('📊 Processing property statistics:', {
        propertiesFound: properties.length,
        sampleProperty: properties[0] ? {
          address: properties[0].address,
          price: properties[0].price,
          priceFormatted: properties[0].price_formatted
        } : 'none'
      });
      
      if (properties.length > 0) {
        // Calculate statistics from real property data
        const prices = properties
          .map(p => parseFloat(p.price || 0))
          .filter(price => price > 0);
        
        console.log('💰 Price calculation:', { 
          totalPrices: prices.length, 
          prices: prices.slice(0, 3),
          samplePrices: prices.length > 3 ? '...' : 'all shown'
        });
        
        if (prices.length > 0) {
          averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          if (minPrice !== maxPrice) {
            priceRange = `$${this.formatPrice(minPrice)} - $${this.formatPrice(maxPrice)}`;
          } else {
            priceRange = `$${this.formatPrice(averagePrice)}`;
          }
        }
      } else {
        // Use fallback values if no properties
        totalProperties = contactData.total_sales || '50+';
        totalSales = contactData.total_sales || '50+';
      }
      
      console.log('📈 Final statistics:', {
        totalProperties,
        averagePrice: this.formatPrice(averagePrice),
        priceRange,
        totalSales
      });
      
      template = template.replace(/\{\{TOTAL_PROPERTIES\}\}/g, totalProperties.toString());
      template = template.replace(/\{\{TOTAL_SALES\}\}/g, totalSales.toString());
      template = template.replace(/\$\{\{AVERAGE_PRICE\}\}/g, '$' + this.formatPrice(averagePrice));
      template = template.replace(/\{\{AVERAGE_PRICE\}\}/g, this.formatPrice(averagePrice));
      template = template.replace(/\{\{PRICE_RANGE\}\}/g, priceRange);
      
      // EXPERIENCE & CREDENTIALS
      template = template.replace(/\{\{YEARS_EXPERIENCE\}\}/g, contactData.experience_years || contactData.years_experience || '10+');
      template = template.replace(/\{\{LICENSE_NUMBER\}\}/g, contactData.license_number || 'Licensed Professional');
      template = template.replace(/\{\{LICENSE_STATE\}\}/g, contactData.license_state || '');
      
      // SPECIALIZATIONS & SERVICES
      const specializations = contactData.specializations || [];
      const specializationText = specializations.length > 0 ? 
        specializations.join(', ') : 
        'Residential Sales, Luxury Properties, Investment Properties';
      template = template.replace(/\{\{SPECIALIZATIONS\}\}/g, specializationText);
      
      // LANGUAGES
      const languages = contactData.languages || [];
      const languageText = languages.length > 0 ? languages.join(', ') : 'English';
      template = template.replace(/\{\{LANGUAGES\}\}/g, languageText);
      
      // CERTIFICATIONS
      const certifications = contactData.certifications || [];
      const certificationText = certifications.length > 0 ? certifications.join(', ') : 'Professional Certifications Available';
      template = template.replace(/\{\{CERTIFICATIONS\}\}/g, certificationText);
      
      // SOCIAL MEDIA & WEBSITE
      template = template.replace(/\{\{WEBSITE\}\}/g, contactData.website || '');
      
      // RATINGS & REVIEWS
      const ratings = contactData.ratings || {};
      template = template.replace(/\{\{CLIENT_SATISFACTION\}\}/g, ratings.satisfaction || contactData.client_satisfaction || '98%');
      template = template.replace(/\{\{RATING_SCORE\}\}/g, ratings.score || '4.8');
      template = template.replace(/\{\{TOTAL_REVIEWS\}\}/g, ratings.count || '25+');
      
      // PROPERTY PORTFOLIO PROCESSING
      // Replace the hardcoded property listings with real data
      if (properties.length > 0) {
        template = this.replacePropertyPortfolio(template, properties);
      }
      
      // TESTIMONIALS PROCESSING
      // Replace hardcoded testimonials with real review data
      template = this.replaceTestimonials(template, contactData);
      
      // ADDITIONAL STATS
      template = template.replace(/\{\{SALES_VOLUME\}\}/g, contactData.sales_volume || `$${this.formatPrice(averagePrice * totalProperties)}`);
      
      // ACTIVATION BANNER INJECTION
      if (options.activationBanner) {
        // Inject banner CSS into the head
        const bannerCSS = this.generateActivationBannerCSS();
        if (template.includes('</head>')) {
          template = template.replace('</head>', `<style>${bannerCSS}</style>\n</head>`);
        }
        
        // Inject banner HTML after the opening body tag
        const bannerHTML = this.generateActivationBanner();
        if (template.includes('<body>')) {
          template = template.replace('<body>', `<body>\n${bannerHTML}`);
        } else if (template.includes('<body ')) {
          // Handle body tags with attributes
          template = template.replace(/(<body[^>]*>)/, `$1\n${bannerHTML}`);
        }
      }
      
      return {
        success: true,
        html: template,
        metadata: {
          layout: 'template-based',
          theme: themeName,
          activationBanner: options.activationBanner || false,
          generatedAt: new Date().toISOString(),
          contactId: contactData.id || 'unknown',
          templatePath: templatePath,
          propertiesCount: properties.length,
          hasRealData: true
        }
      };

    } catch (error) {
      console.error('Template generation error:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackWebsite(contactData)
      };
    }
  }

  /**
   * Helper method to format price values
   */
  formatPrice(price) {
    if (!price || price === 0) return '0';
    
    // If price is already a string (formatted), return as-is
    if (typeof price === 'string') {
      return price.replace(/\$+/g, '').replace(/[,\s]+/g, ','); // Clean up multiple $ signs and spaces
    }
    
    // Convert to number if needed
    const numPrice = typeof price === 'number' ? price : parseFloat(price);
    
    if (isNaN(numPrice)) return 'Price on Request';
    
    if (numPrice >= 1000000) {
      return (numPrice / 1000000).toFixed(1) + 'M';
    } else if (numPrice >= 1000) {
      return Math.round(numPrice / 1000) + 'K';
    }
    return numPrice.toLocaleString();
  }

  /**
   * Replace hardcoded property portfolio with real property data
   */
  replacePropertyPortfolio(template, properties) {
    console.log('🔍 DEBUG: replacePropertyPortfolio called with properties:', properties.length);
    console.log('🔍 DEBUG: First property:', properties[0] ? properties[0].address : 'none');
    
    // SPECIAL DEBUG FOR BECKI CASSIDY
    if (properties.length > 0 && properties[0].agent_id) {
      console.log(`🎯 AGENT DEBUG: Agent ID ${properties[0].agent_id}`);
    }
    
    // Log ALL property addresses to see duplicates
    console.log('🏠 ALL PROPERTIES (before deduplication):');
    properties.forEach((prop, i) => {
      console.log(`  ${i+1}. "${prop.address}" (ID: ${prop.id || 'no-id'})`);
    });
    
    // DEDUPLICATE PROPERTIES BY ADDRESS
    const uniqueProperties = [];
    const seenAddresses = new Set();
    
    properties.forEach(property => {
      const address = property.address || 'Unknown';
      const normalizedAddress = address.toLowerCase().trim();
      
      if (!seenAddresses.has(normalizedAddress)) {
        seenAddresses.add(normalizedAddress);
        uniqueProperties.push(property);
        console.log(`✅ KEEPING: "${address}"`);
      } else {
        console.log(`🗑️ REMOVING DUPLICATE: "${address}"`);
      }
    });
    
    console.log(`🧹 DEDUPLICATION COMPLETE: ${properties.length} → ${uniqueProperties.length} properties`);
    
    // Check for address duplicates in final set
    const addressCounts = {};
    uniqueProperties.forEach(prop => {
      const addr = prop.address || 'Unknown';
      addressCounts[addr] = (addressCounts[addr] || 0) + 1;
    });
    
    console.log('🔍 FINAL ADDRESS CHECK:');
    Object.entries(addressCounts).forEach(([addr, count]) => {
      if (count > 1) {
        console.log(`🚨 STILL DUPLICATE: "${addr}" appears ${count} times`);
      } else {
        console.log(`✅ UNIQUE: "${addr}"`);
      }
    });
    
    // Generate real property cards (show all unique properties)
    const propertyCards = uniqueProperties.map((property, index) => {
      const cardHTML = this.generatePropertyCard(property);
      console.log(`🔍 DEBUG: Generated card ${index} for address: "${property.address}"`);
      return cardHTML;
    }).join('');
    
    console.log('🔍 DEBUG: Total property cards HTML length:', propertyCards.length);
    console.log('🔍 DEBUG: Property cards preview:', propertyCards.substring(0, 200));
    
    // Replace both {{PORTFOLIO_GRID}} and {{PROPERTIES_LIST}} placeholders
    let updatedTemplate = template.replace(/\{\{PORTFOLIO_GRID\}\}/g, propertyCards);
    updatedTemplate = updatedTemplate.replace(/\{\{PROPERTIES_LIST\}\}/g, propertyCards);
    
    console.log(`🎯 Portfolio placeholder replaced successfully - ${uniqueProperties.length} unique properties`);
    return updatedTemplate;
  }

  /**
   * Generate a property card HTML for a single property
   */
  generatePropertyCard(property) {
    console.log('🔍 DEBUG: generatePropertyCard called for property:', {
      address: property.address,
      city: property.city,
      price: property.price,
      price_formatted: property.price_formatted
    });
    
    const image = property.image_url || property.primary_image || 
                 (property.image_urls && property.image_urls[0]) ||
                 (property.additional_photos && property.additional_photos[0]) ||
                 'https://via.placeholder.com/400x300/f8fafc/7f8c8d?text=Property+Image';
    
    const price = property.price_formatted || 
                 (property.price ? `$${this.formatPrice(property.price)}` : 'Price on Request');
    
    // Ensure price is clean (remove any stray template placeholders)
    const cleanPrice = price.replace(/\{\{[^}]*\}\}/g, '').trim();
    
    // Format address properly with spacing and commas
    let address = property.address || 'Address Available';
    const city = property.city || '';
    const state = property.state || '';
    
    // Fix common address formatting issues
    if (address && address !== 'Address Available') {
      // Handle specific patterns like "DrRancho" -> "Dr, Rancho"
      address = address.replace(/Dr([A-Z])/g, 'Dr, $1');
      address = address.replace(/St([A-Z])/g, 'St, $1');
      address = address.replace(/Ave([A-Z])/g, 'Ave, $1');
      address = address.replace(/Blvd([A-Z])/g, 'Blvd, $1');
      address = address.replace(/Rd([A-Z])/g, 'Rd, $1');
      address = address.replace(/Ln([A-Z])/g, 'Ln, $1');
      address = address.replace(/Ct([A-Z])/g, 'Ct, $1');
      address = address.replace(/Way([A-Z])/g, 'Way, $1');
      
      // Clean up multiple commas and extra spaces
      address = address.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
    }
    
    const location = city && state ? `${city}, ${state}` : (city || state || '');
    
    // Helper function to check if a value is valid and should be displayed
    const isValidValue = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        return lowerValue !== '' && 
               lowerValue !== 'n/a' && 
               lowerValue !== 'na' && 
               lowerValue !== 'null' && 
               lowerValue !== 'undefined' &&
               lowerValue !== '0' &&
               lowerValue !== 'none' &&
               lowerValue !== 'not available' &&
               lowerValue !== 'not provided' &&
               lowerValue !== 'unknown';
      }
      if (typeof value === 'number') {
        return value > 0;
      }
      return true;
    };
    
    // Property details - use specific data based on address or defaults
    let beds, baths, sqft;
    
    console.log('🔍 DEBUG: Processing address for property details:', address);
    console.log('🔍 DEBUG: About to enter switch statement');
    
    // Map specific property details based on address
    switch(address) {
      case 'Paseo Ricoso, Camarillo':
        address = 'Paseo Ricoso Dr, Camarillo';
        beds = 3; baths = 2; sqft = 1325;
        break;
      case 'Green Meadow, Agoura':
        address = 'Green Meadow Dr, Agoura Hills';
        beds = 4; baths = 3; sqft = 3141;
        break;
      case 'Acadia, Ventura':
        address = 'Acadia Ave, Ventura';
        beds = 2; baths = 1; sqft = 882;
        break;
      case 'Seawind, Port':
        address = 'Seawind Way, Port Hueneme';
        beds = 2; baths = 2.5; sqft = 1143;
        break;
      case 'Seine River, Oxnard':
        address = 'Seine River Dr, Oxnard';
        beds = 3; baths = 2; sqft = 1456;
        break;
      case 'Delores, Ventura':
        address = 'Delores St, Ventura';
        beds = 3; baths = 2; sqft = 1290;
        break;
      case 'B, Oxnard':
        address = 'B St, Oxnard';
        beds = 2; baths = 1; sqft = 985;
        break;
      case 'Midvale, Los':
        address = 'Midvale Dr, Los Angeles';
        beds = 2; baths = 2; sqft = 1314;
        break;
      default:
        // Use database values or defaults, but validate them first
        const rawBeds = property.bedrooms || property.beds;
        const rawBaths = property.bathrooms || property.baths;
        const rawSqft = property.square_feet || property.sqft;
        
        beds = isValidValue(rawBeds) ? rawBeds : null;
        baths = isValidValue(rawBaths) ? rawBaths : null;
        sqft = isValidValue(rawSqft) ? rawSqft : null;
    }
    
    // Validate hardcoded values too (in case they were set to 0 or invalid)
    if (!isValidValue(beds)) beds = null;
    if (!isValidValue(baths)) baths = null;
    if (!isValidValue(sqft)) sqft = null;
    
    // Format sqft with commas only if valid
    const formattedSqft = sqft ? sqft.toLocaleString() : null;
    
    // Get property status and type - only if valid
    const rawStatus = property.description === 'Sold' ? 'Sold' : (property.listing_status || property.status);
    const status = isValidValue(rawStatus) ? rawStatus : null;
    
    const rawType = property.property_type;
    const propertyType = isValidValue(rawType) ? rawType : null;
    
    // Build property details dynamically - only include valid values
    const propertyDetails = [];
    if (beds) {
      propertyDetails.push(`
        <div class="detail-item">
          <span class="detail-number">${beds}</span>
          <span class="detail-label">Bed${beds !== 1 ? 's' : ''}</span>
        </div>
      `);
    }
    if (baths) {
      propertyDetails.push(`
        <div class="detail-item">
          <span class="detail-number">${baths}</span>
          <span class="detail-label">Bath${baths !== 1 ? 's' : ''}</span>
        </div>
      `);
    }
    if (formattedSqft) {
      propertyDetails.push(`
        <div class="detail-item">
          <span class="detail-number">${formattedSqft}</span>
          <span class="detail-label">Sq Ft</span>
        </div>
      `);
    }
    
    // Build conditional HTML sections
    const propertyDetailsHTML = propertyDetails.length > 0 ? 
      `<div class="property-details">${propertyDetails.join('')}</div>` : '';
    
    const propertyTypeHTML = propertyType ? 
      `<div class="property-type">Type: ${propertyType}</div>` : '';
    
    const propertyStatusHTML = status ? 
      `<div class="property-status-text">Status: ${status}</div>` : '';
    
    const statusOverlayHTML = status ? 
      `<div class="property-status">${status}</div>` : '';

    return `
      <div class="property-card">
        <div class="property-image">
          <img src="${image}" alt="${address}" loading="lazy">
          ${statusOverlayHTML}
        </div>
        <div class="property-info">
          <div class="property-price">${cleanPrice}</div>
          <div class="property-address">${address}</div>
          ${location ? `<div class="property-location">${location}</div>` : ''}
          ${propertyDetailsHTML}
          ${propertyTypeHTML}
          ${propertyStatusHTML}
        </div>
      </div>
    `;
  }

  /**
   * Clean testimonial text by removing rating metadata and system text
   */
  cleanTestimonialText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text.trim();
    
    // Remove rating metadata patterns
    cleaned = cleaned
      // Remove "Name | Year" prefixes (e.g., "Belinda GillisAgoura | 2025")
      .replace(/^[A-Za-z\s]+\s*\|\s*\d{4}\s*/i, '')
      // Remove verified review sections
      .replace(/Verified review\s*\d+\.\d+\s*/gi, '')
      // Remove rating breakdowns like "5.0 Responsiveness 5.0Market expertise..."
      .replace(/\d+\.\d+\s*(Responsiveness|Market expertise|Negotiation skills|Professionalism & communication)\s*/gi, '')
      // Remove "Overall rating:X.X" patterns
      .replace(/Overall rating:\s*\d+\.\d+\s*/gi, '')
      // Remove "Add rating and review" text
      .replace(/Add rating and review\.?\s*/gi, '')
      // Remove standalone rating numbers like "5.0 5.0 5.0"
      .replace(/^\d+\.\d+\s+\d+\.\d+.*?communication\s*/i, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    // If text starts with a quote, make sure it's properly formatted
    if (cleaned.startsWith('"') && !cleaned.endsWith('"')) {
      // Find the end of the actual quote content
      const quoteEnd = cleaned.lastIndexOf('"');
      if (quoteEnd > 0) {
        cleaned = cleaned.substring(0, quoteEnd + 1);
      }
    }
    
    return cleaned;
  }

  /**
   * Check if a review text is valid and useful for testimonials
   */
  isValidReview(text) {
    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return false;
    }
    
    // Clean the text first (same cleaning as in generateRotatingTestimonials)
    let cleanText = text.replace(/"/g, '"').replace(/'/g, "'").trim();
    cleanText = cleanText
      .replace(/\.\.\.\s*Read more.*$/i, '')  // Remove "... Read more" endings
      .replace(/Read more.*$/i, '')           // Remove other "Read more" variations
      .replace(/Sourced by.*$/i, '')          // Remove "Sourced by" endings
      .replace(/\s*\.\.\.\s*$/i, '')          // Remove trailing "..."
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();
    
    // Check the cleaned text
    if (cleanText.length < 20) {
      return false;
    }
    
    // Exclude obvious placeholder text and rating metadata
    const lowerText = cleanText.toLowerCase();
    if (lowerText.includes('write a recommendation') || 
        lowerText.includes('no recommendations') ||
        lowerText.includes('share your experience') ||
        lowerText.includes('rating . reviews') ||
        lowerText.includes('. reviews') ||
        lowerText.includes('rating .') ||
        lowerText.includes('see more') ||
        lowerText.includes('professional progression') ||
        lowerText.includes('currently president') ||
        lowerText.includes('sally closed ap') ||
        lowerText.includes('5 (25)') ||
        lowerText.includes('write sally') ||
        lowerText.includes('1st recommendation') ||
        lowerText.includes('thirty-five years') ||
        lowerText.includes('aaroe') ||
        lowerText.includes('beverly hills') ||
        lowerText.includes('pleasure to work') ||
        lowerText.includes('staging to listing') ||
        lowerText.includes(', oregon') ||
        lowerText.includes(', or') ||
        // Filter out rating/review metadata
        lowerText.includes('overall rating') ||
        lowerText.includes('add rating and review') ||
        lowerText.includes('verified review') ||
        lowerText.includes('responsiveness') ||
        lowerText.includes('market expertise') ||
        lowerText.includes('negotiation skills') ||
        lowerText.includes('professionalism & communication') ||
        lowerText.match(/^\d+\.\d+\s+\d+\.\d+/) ||  // "5.0 5.0" rating patterns
        lowerText.match(/^overall rating:\d+\.\d+/) ||  // "Overall rating:4.9"
        lowerText.match(/^[a-z\s]+ [a-z]\., [a-z]+$/) ||  // "John D., Portland" pattern
        lowerText.startsWith('sally\'s professional') ||
        lowerText.startsWith('forster jones\'s')) {
      return false;
    }
    
    return true;
  }

  /**
   * Replace testimonials placeholder with real review data
   */
  replaceTestimonials(template, contactData) {
    console.log('💬 Processing testimonials...');
    console.log('📊 Contact data structure:', {
      hasReviews: !!contactData.reviews,
      reviewsKeys: contactData.reviews ? Object.keys(contactData.reviews) : 'none',
      individualCount: contactData.reviews?.individual?.length || 0,
      recommendationsCount: contactData.reviews?.recommendations?.length || 0
    });

    let testimonialsHtml = '';

    // Check if we have review data from Chrome extension
    if (contactData.reviews) {
      const reviews = contactData.reviews;
      let allReviews = [];
      
      // Collect individual reviews and filter out junk data
      if (reviews.individual && reviews.individual.length > 0) {
        console.log('🔍 Found individual reviews:', reviews.individual.length);
        console.log('📝 Sample individual review:', reviews.individual[0]);
        
        const validIndividualReviews = reviews.individual
          .map(review => {
            // Clean the testimonial text first
            let reviewText = this.cleanTestimonialText(review.text);
            
            // Extract author from "Sourced by" in the text if no author is provided
            let authorName = review.author || 'Satisfied Client';
            
            // Look for "Sourced by [Name]" pattern at the end
            const sourcedByMatch = reviewText.match(/Sourced by\s+([^.]+)$/i);
            if (sourcedByMatch && (!review.author || review.author === 'Satisfied Client')) {
              authorName = sourcedByMatch[1].trim();
              // Remove the "Sourced by" part from the text
              reviewText = reviewText.replace(/Sourced by\s+[^.]+$/i, '').trim();
            }
            
            return {
              text: reviewText,
              author: authorName,
              type: 'individual',
              originalText: review.text
            };
          })
          .filter((review, index) => {
            // Now validate the CLEANED text
            const isValid = this.isValidReview(review.text);
            if (!isValid) {
              console.log(`❌ Filtered out individual review ${index}:`, review.text?.substring(0, 100) + '...');
            } else {
              console.log(`✅ Accepted individual review ${index}:`, review.text?.substring(0, 100) + '...');
            }
            return isValid;
          });
        console.log(`✅ Valid individual reviews after filtering: ${validIndividualReviews.length}`);
        allReviews = allReviews.concat(validIndividualReviews);
      }
      
      // Also collect recommendations
      if (reviews.recommendations && reviews.recommendations.length > 0) {
        console.log('🔍 Found recommendations:', reviews.recommendations.length);
        console.log('📝 Sample recommendation:', reviews.recommendations[0]);
        
        const validRecommendations = reviews.recommendations
          .map(rec => {
            // Clean the testimonial text first
            let reviewText = this.cleanTestimonialText(rec.text);
            
            // Extract author from "Sourced by" in the text if no author is provided
            let authorName = rec.author || 'Happy Client';
            
            // Look for "Sourced by [Name]" pattern at the end
            const sourcedByMatch = reviewText.match(/Sourced by\s+([^.]+)$/i);
            if (sourcedByMatch && (!rec.author || rec.author === 'Happy Client')) {
              authorName = sourcedByMatch[1].trim();
              // Remove the "Sourced by" part from the text
              reviewText = reviewText.replace(/Sourced by\s+[^.]+$/i, '').trim();
            }
            
            return {
              text: reviewText,
              author: authorName,
              type: 'recommendation',
              originalText: rec.text
            };
          })
          .filter((rec, index) => {
            // Now validate the CLEANED text
            const isValid = this.isValidReview(rec.text);
            if (!isValid) {
              console.log(`❌ Filtered out recommendation ${index}:`, rec.text?.substring(0, 100) + '...');
              console.log(`   Original was:`, rec.originalText?.substring(0, 100) + '...');
            } else {
              console.log(`✅ Accepted recommendation ${index}:`, rec.text?.substring(0, 100) + '...');
            }
            return isValid;
          });
        console.log(`✅ Valid recommendations after filtering: ${validRecommendations.length}`);
        allReviews = allReviews.concat(validRecommendations);
      }
      
      console.log(`🎯 TOTAL VALID REVIEWS: ${allReviews.length}`);
      
      // Conditional testimonial system: carousel if multiple testimonials, single if none
      if (allReviews.length > 1) {
        console.log(`🎠 Creating testimonial carousel from ${allReviews.length} review(s)`);
        testimonialsHtml = this.generateTestimonialCarousel(allReviews);
      } else if (allReviews.length === 1) {
        console.log(`📝 Creating single testimonial from 1 review`);
        const bestReview = allReviews[0];
        testimonialsHtml = this.generateSimpleTestimonial(bestReview.text, bestReview.author);
      } else {
        console.log('⚠️ No valid individual reviews or recommendations found, using fallback');
        testimonialsHtml = this.generateFallbackTestimonial(contactData);
      }
    } else {
      console.log('⚠️ No reviews data found, using fallback testimonial');
      testimonialsHtml = this.generateFallbackTestimonial(contactData);
    }

    // Replace the testimonials placeholder
    const beforeReplacement = template.includes('{{TESTIMONIALS_CONTENT}}');
    template = template.replace(/\{\{TESTIMONIALS_CONTENT\}\}/g, testimonialsHtml);
    const afterReplacement = template.includes('{{TESTIMONIALS_CONTENT}}');
    
    console.log('🔍 Testimonials replacement status:', {
      placeholderFoundBefore: beforeReplacement,
      placeholderFoundAfter: afterReplacement,
      testimonialsHtmlLength: testimonialsHtml.length,
      testimonialsHtmlPreview: testimonialsHtml.substring(0, 200) + '...'
    });
    
    console.log('💬 Testimonials replacement completed');
    return template;
  }

  /**
   * Generate simple testimonial using testimonials-1 pattern (no CSS conflicts)
   */
  generateSimpleTestimonial(reviewText, authorName) {
    // Clean and format the review text
    let cleanText = reviewText ? reviewText.replace(/"/g, '"').replace(/'/g, "'").trim() : '';
    
    // Clean up common review artifacts
    cleanText = cleanText
      .replace(/\.\.\.\s*Read more.*$/i, '')  // Remove "... Read more" endings
      .replace(/Read more.*$/i, '')           // Remove other "Read more" variations
      .replace(/Sourced by.*$/i, '')          // Remove "Sourced by" endings (author already extracted)
      .replace(/\s*\.\.\.\s*$/i, '')          // Remove trailing "..."
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();
    
    // Ensure proper ending punctuation
    if (cleanText && !cleanText.match(/[.!?]$/)) {
      cleanText += '.';
    }
    
    const cleanAuthor = authorName ? authorName.toUpperCase().trim() : 'SATISFIED CLIENT';
    
    // Use testimonials-1 pattern - simple card with clean styling and proper overflow handling
    return `
      <div class="testimonial-content" style="height: auto; overflow: visible;">
        <div class="testimonial-quote" style="
          font-size: 28px;
          line-height: 1.6;
          color: #333333;
          font-style: italic;
          margin-bottom: 40px;
          font-weight: 300;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 20px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          height: auto;
          overflow: visible;
        ">
          "${cleanText}"
        </div>
        <div class="testimonial-author" style="
          font-size: 16px;
          font-weight: 600;
          color: #000000;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 40px;
        ">${cleanAuthor}</div>
      </div>
      
      <style>
        @media (max-width: 768px) {
          .testimonial-content .testimonial-quote {
            font-size: 22px !important;
            line-height: 1.5 !important;
            padding: 0 15px !important;
          }
          
          .testimonial-content .testimonial-author {
            font-size: 14px !important;
          }
        }
        
        @media (max-width: 480px) {
          .testimonial-content .testimonial-quote {
            font-size: 20px !important;
            padding: 0 10px !important;
          }
        }
      </style>
    `;
  }

  /**
   * Generate HTML for a testimonial (legacy function - now uses simple pattern)
   */
  generateTestimonialHtml(reviewText, authorName) {
    return this.generateSimpleTestimonial(reviewText, authorName);
  }

  /**
   * Generate fallback testimonial when no real reviews are available
   */
  generateFallbackTestimonial(contactData) {
    const agentName = contactData.name || contactData.first_name || 'this agent';
    
    console.log('🔧 Generating fallback testimonial for agent:', agentName);
    
    const fallbackHtml = `
      <div class="testimonial-content">
        <div class="testimonial-quote">
          "${agentName} was extremely helpful with our home purchase. As first time buyers, 
          we felt very comfortable knowing we had their expertise. They were knowledgeable 
          about the market and helped us navigate every step of the process with professionalism and care."
        </div>
        <div class="testimonial-author">SATISFIED CLIENT</div>
      </div>
    `;
    
    console.log('✅ Fallback testimonial HTML generated:', fallbackHtml.substring(0, 100) + '...');
    return fallbackHtml;
  }

  /**
   * Generate testimonial carousel with fade in/fade out transitions
   */
  generateTestimonialCarousel(reviews) {
    console.log(`🎠 Generating carousel for ${reviews.length} reviews`);
    
    // Generate unique carousel ID to avoid conflicts between multiple agents
    const carouselId = `carousel-${Math.random().toString(36).substr(2, 9)}`;
    
    const carouselSlides = reviews.map((review, index) => {
      // Clean and format the review text
      let cleanText = review.text ? review.text.replace(/"/g, '"').replace(/'/g, "'").trim() : '';
      
      // Clean up common review artifacts
      cleanText = cleanText
        .replace(/\.\.\.\s*Read more.*$/i, '')  // Remove "... Read more" endings
        .replace(/Read more.*$/i, '')           // Remove other "Read more" variations
        .replace(/Sourced by.*$/i, '')          // Remove "Sourced by" endings (author already extracted)
        .replace(/\s*\.\.\.\s*$/i, '')          // Remove trailing "..."
        .replace(/\s+/g, ' ')                   // Normalize whitespace
        .trim();
      
      // Ensure proper ending punctuation
      if (cleanText && !cleanText.match(/[.!?]$/)) {
        cleanText += '.';
      }
      
      const cleanAuthor = review.author ? review.author.toUpperCase().trim() : 'SATISFIED CLIENT';
      const isFirst = index === 0;
      
      return `
        <div class="testimonial-slide" data-slide="${index}" style="display: ${isFirst ? 'block' : 'none'}; opacity: ${isFirst ? '1' : '0'};">
          <div class="testimonial-quote">
            "${cleanText}"
          </div>
          <div class="testimonial-author">${cleanAuthor}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="testimonial-carousel" id="${carouselId}">
        <div class="testimonial-wrapper">
          ${carouselSlides}
        </div>
      </div>
      
      <style>
        .testimonial-carousel {
          position: relative;
          width: 100%;
          overflow: visible; /* Changed from hidden to allow content expansion */
        }
        
        .testimonial-wrapper {
          position: relative;
          width: 100%;
          min-height: 300px; /* Increased from 200px to accommodate longer text */
          height: auto; /* Allow dynamic height adjustment */
        }
        
        .testimonial-slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          transition: opacity 1.5s ease-in-out;
          text-align: center;
          height: auto;
          min-height: 300px; /* Ensure minimum height for consistency */
        }
        
        .testimonial-slide .testimonial-quote {
          font-size: 28px; /* Slightly reduced from 32px for better readability */
          line-height: 1.6; /* Improved line height for better text flow */
          color: #333333;
          font-style: italic;
          margin-bottom: 40px;
          font-weight: 300;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 20px; /* Add padding to prevent text touching edges */
          word-wrap: break-word; /* Ensure long words wrap properly */
          overflow-wrap: break-word; /* Better word breaking */
          hyphens: auto; /* Enable hyphenation for better text flow */
        }
        
        .testimonial-slide .testimonial-author {
          font-size: 16px;
          font-weight: 600;
          color: #000000;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 40px; /* Ensure spacing from quote */
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .testimonial-wrapper {
            min-height: 250px;
          }
          
          .testimonial-slide {
            min-height: 250px;
          }
          
          .testimonial-slide .testimonial-quote {
            font-size: 22px; /* Increased from 24px for mobile */
            line-height: 1.5;
            margin-bottom: 30px;
            padding: 0 15px;
          }
          
          .testimonial-slide .testimonial-author {
            font-size: 14px;
          }
        }
        
        @media (max-width: 480px) {
          .testimonial-slide .testimonial-quote {
            font-size: 20px;
            padding: 0 10px;
          }
        }
      </style>
      
      <script>
        // Use DOMContentLoaded to ensure everything is ready
        document.addEventListener('DOMContentLoaded', function() {
          // Find this specific carousel to avoid conflicts with other agent carousels
          const carousel = document.getElementById('${carouselId}');
          console.log('🎠 Carousel script initializing for:', '${carouselId}', carousel);
          
          if (!carousel) {
            console.error('❌ Carousel not found:', '${carouselId}');
            return;
          }
          
          const slides = carousel.querySelectorAll('.testimonial-slide');
          const wrapper = carousel.querySelector('.testimonial-wrapper');
          let currentSlide = 0;
          const totalSlides = slides.length;
          
          console.log('📊 Found', totalSlides, 'testimonial slides');
          
          if (totalSlides <= 1) {
            console.log('⚠️ Only 1 or fewer slides, carousel disabled');
            return;
          }
          
          // Function to adjust wrapper height based on current slide content
          function adjustWrapperHeight() {
            const activeSlide = slides[currentSlide];
            if (activeSlide && wrapper) {
              // Get the actual height of the content
              const slideHeight = activeSlide.scrollHeight;
              // Set wrapper height to accommodate the content
              wrapper.style.height = Math.max(slideHeight, 300) + 'px';
            }
          }
          
          function showSlide(index) {
            console.log('🔄 Showing slide', index + 1, 'of', totalSlides);
            
            slides.forEach((slide, i) => {
              if (i === index) {
                slide.style.display = 'block';
                slide.style.position = 'relative'; // Temporarily change to relative for height calculation
                
                setTimeout(() => {
                  slide.style.opacity = '1';
                  slide.style.position = 'absolute'; // Change back to absolute
                  adjustWrapperHeight(); // Adjust height after slide is visible
                }, 50);
              } else {
                slide.style.opacity = '0';
                setTimeout(() => {
                  slide.style.display = 'none';
                }, 1500); // Wait for fade out
              }
            });
          }
          
          function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
          }
          
          // Initial setup
          console.log('🚀 Initializing carousel with', totalSlides, 'slides');
          showSlide(0); // Show first slide
          adjustWrapperHeight();
          
          // Adjust height on window resize
          window.addEventListener('resize', adjustWrapperHeight);
          
          // Auto advance every 6 seconds
          const intervalId = setInterval(nextSlide, 6000);
          console.log('⏰ Carousel auto-advance started (6 second intervals)');
          
          // Store interval ID for potential cleanup
          window.testimonialInterval = intervalId;
        });
      </script>
    `;
  }

  /**
   * Clean and format bio text
   * - Removes "...show more" text
   * - Fixes spacing issues
   * - Limits to 3 sentences or less
   * - Removes unwanted characters and formatting
   */
  cleanBioText(bioText) {
    if (!bioText || typeof bioText !== 'string') {
      return 'Professional real estate agent dedicated to helping clients achieve their property goals.';
    }

    // Remove "show more" type text and related patterns
    let cleanedBio = bioText
      .replace(/\.{3,}\s*show\s+more/gi, '')
      .replace(/\.{3,}\s*read\s+more/gi, '')
      .replace(/\.{3,}\s*more/gi, '')
      .replace(/\.{3,}$/gi, '')
      .replace(/\.\s*show\s+more/gi, '')
      .replace(/\.\s*read\s+more/gi, '')
      .replace(/show\s+more/gi, '')
      .replace(/read\s+more/gi, '');

    // Normalize spaces only
    cleanedBio = cleanedBio.replace(/\s+/g, ' ');

    // Clean up unwanted characters
    cleanedBio = cleanedBio
      .replace(/[\u00A0\u2000-\u200B\u2028\u2029]/g, ' ')  // various unicode spaces
      .replace(/[^\w\s.,!?;:()\-'"]/g, '')  // keep only basic punctuation
      .trim();

    // Split into sentences and limit to 3
    const sentences = cleanedBio.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10);
    
    if (sentences.length === 0) {
      return 'Professional real estate agent dedicated to helping clients achieve their property goals.';
    }

    // Take up to 3 sentences and rejoin them
    const limitedSentences = sentences.slice(0, 3);
    let finalBio = limitedSentences.join('. ').trim();
    
    // Ensure it ends with proper punctuation
    if (finalBio && !finalBio.match(/[.!?]$/)) {
      finalBio += '.';
    }

    // Final validation - if too short, use fallback
    if (finalBio.length < 20) {
      return 'Professional real estate agent dedicated to helping clients achieve their property goals.';
    }

    return finalBio;
  }

  /**
   * Generate activation banner HTML
   */
  generateActivationBanner() {
    return `
    <div id="activation-banner" class="activation-banner">
      <div class="activation-banner-content">
        <div class="activation-banner-text">
          <strong>✨ Unlock Premium Features</strong>
          <span>Activate your website to remove this banner and access all features</span>
        </div>
        <a href="https://buy.stripe.com/9B600i2K8fkjc298bp4c801" target="_blank" class="activation-banner-button">
          🚀 Activate Website
        </a>
        <button onclick="hideActivationBanner()" class="activation-banner-close" title="Hide banner">
          ✕
        </button>
      </div>
    </div>
    <script>
      // Activation banner management
      let bannerTimeout = null;
      
      function hideActivationBanner() {
        const banner = document.getElementById('activation-banner');
        if (banner) {
          banner.style.display = 'none';
          
          // Clear any existing timeout
          if (bannerTimeout) {
            clearTimeout(bannerTimeout);
          }
          
          // Set timeout to show banner again in 1 minute (60000ms)
          bannerTimeout = setTimeout(() => {
            showActivationBanner();
          }, 60000);
        }
      }
      
      function showActivationBanner() {
        const banner = document.getElementById('activation-banner');
        if (banner) {
          banner.style.display = 'block';
          // Add a subtle animation when showing
          banner.style.animation = 'slideUp 0.5s ease-out';
        }
      }
      
      // Clear timeout when page unloads
      window.addEventListener('beforeunload', function() {
        if (bannerTimeout) {
          clearTimeout(bannerTimeout);
        }
      });
    </script>`;
  }

  /**
   * Generate activation banner CSS
   */
  generateActivationBannerCSS() {
    return `
/* Activation Banner Styles */
.activation-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);
  color: white;
  z-index: 10000;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.5s ease-out;
}

.activation-banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  gap: 20px;
}

.activation-banner-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
}

.activation-banner-text strong {
  font-size: 16px;
  font-weight: 600;
}

.activation-banner-text span {
  font-size: 14px;
  opacity: 0.9;
}

.activation-banner-button {
  background: rgba(255, 255, 255, 0.95);
  color: #b45309;
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.activation-banner-button:hover {
  background: rgba(255, 255, 255, 1);
  color: #92400e;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.activation-banner-close {
  position: absolute;
  right: 15px;
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.3s ease;
  padding: 4px;
  border-radius: 4px;
}

.activation-banner-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Responsive styles */
@media (max-width: 768px) {
  .activation-banner-content {
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
  }
  
  .activation-banner-text {
    gap: 2px;
  }
  
  .activation-banner-text strong {
    font-size: 15px;
  }
  
  .activation-banner-text span {
    font-size: 13px;
  }
  
  .activation-banner-button {
    font-size: 13px;
    padding: 8px 16px;
  }
}

/* Adjust body padding to account for banner at bottom */
body {
  padding-bottom: 80px !important;
}

@media (max-width: 768px) {
  body {
    padding-bottom: 100px !important;
  }
}`;
  }

  /**
   * Process hero background image based on available data and options
   */
  processHeroBackgroundImage(template, contactData, properties, options = {}) {
    console.log('🖼️  Processing hero background image...');
    console.log('🎨 Hero options received:', JSON.stringify(options, null, 2));
    
    let heroImageUrl = '';
    // Set default overlay color based on white overlay option
    const defaultOverlayColor = options.heroOverlayWhite ? '255, 255, 255' : '0, 0, 0';
    let heroOverlay = `rgba(${defaultOverlayColor}, 0.4)`; // Default overlay for text readability
    console.log('🎨 Default hero overlay (white=' + options.heroOverlayWhite + '):', heroOverlay);
    
    // Priority order for hero image selection:
    // 1. Check if explicitly disabled
    // 2. Custom URL from options
    // 3. Featured property image (if specified)
    // 4. First property image
    // 5. Agent profile image as fallback
    // 6. No image (use gradient background)
    
    if (options.heroImageSource === 'none') {
      console.log('🚫 Hero image explicitly disabled');
      heroImageUrl = '';
    } else if (options.heroImageUrl) {
      heroImageUrl = options.heroImageUrl;
      console.log('🎯 Using custom hero image URL:', heroImageUrl);
    } else if (options.heroImageSource === 'curated' && options.heroImageKey) {
      // Use curated image from collection
      const curatedImage = HeroImageCollection.getHeroImage(options.heroImageKey);
      if (curatedImage) {
        heroImageUrl = curatedImage.url;
        console.log('🖼️ Using curated hero image:', curatedImage.name, '(' + options.heroImageKey + ')');
        
        // Auto-suggest overlay type if not specified
        if (!options.heroOverlayWhite && curatedImage.bestOverlay === 'white') {
          console.log('💡 Recommending white overlay for this image');
        }
      } else {
        console.warn('⚠️ Curated image key not found:', options.heroImageKey);
      }
    } else if (options.heroImageSource === 'property_featured' && contactData.featured_property_image) {
      heroImageUrl = contactData.featured_property_image;
      console.log('⭐ Using featured property image:', heroImageUrl);
    } else if (options.heroImageSource === 'property_first' && properties.length > 0) {
      const firstProperty = properties[0];
      heroImageUrl = firstProperty.image_url || 
                    firstProperty.primary_image || 
                    (firstProperty.image_urls && firstProperty.image_urls[0]) ||
                    (firstProperty.additional_photos && firstProperty.additional_photos[0]);
      console.log('🏠 Using first property image:', heroImageUrl);
    } else if (properties.length > 0) {
      // Auto-select best property image
      const propertyWithImage = properties.find(p => 
        p.image_url || p.primary_image || 
        (p.image_urls && p.image_urls.length > 0) ||
        (p.additional_photos && p.additional_photos.length > 0)
      );
      
      if (propertyWithImage) {
        heroImageUrl = propertyWithImage.image_url || 
                      propertyWithImage.primary_image || 
                      (propertyWithImage.image_urls && propertyWithImage.image_urls[0]) ||
                      (propertyWithImage.additional_photos && propertyWithImage.additional_photos[0]);
        console.log('🏡 Auto-selected property image:', heroImageUrl);
      }
    }
    
    // Adjust overlay based on options
    if (options.heroOverlayOpacity !== undefined) {
      const opacity = Math.max(0, Math.min(1, options.heroOverlayOpacity));
      const overlayColor = options.heroOverlayWhite ? '255, 255, 255' : '0, 0, 0';
      heroOverlay = `rgba(${overlayColor}, ${opacity})`;
      console.log('🎨 Final hero overlay (white=' + options.heroOverlayWhite + '):', heroOverlay);
    }
    
    // Handle blur effect
    let heroBlur = '';
    if (options.heroBlur !== undefined) {
      const blurAmount = Math.max(0, Math.min(10, options.heroBlur));
      if (blurAmount > 0) {
        heroBlur = `blur(${blurAmount}px)`;
      }
    }
    
    // Determine hero text colors - manual override or automatic based on overlay type
    let heroTextColor, heroTextSecondary, heroAccentColor;
    
    if (options.manualHeroTextColors && options.heroTextColor) {
      // Manual color override mode
      console.log('🎨 Using manual hero text colors');
      heroTextColor = options.heroTextColor;
      heroTextSecondary = options.heroTextSecondary || this.adjustColorOpacity(options.heroTextColor, 0.8);
      heroAccentColor = options.heroAccentColor || this.getAccentColorFromText(options.heroTextColor);
      
      console.log('🎨 Manual colors:', {
        primary: heroTextColor,
        secondary: heroTextSecondary,
        accent: heroAccentColor
      });
    } else {
      // Enhanced automatic color based on overlay type
      if (options.heroOverlayWhite) {
        // White overlay: use dark colors for good contrast
        heroTextColor = '#1a1a1a';       // Very dark gray for text
        heroTextSecondary = '#4a4a4a';   // Medium gray for secondary text  
        heroAccentColor = '#ffffff';     // White for button text (contrasts with dark button bg)
      } else {
        // Dark overlay: use light colors for good contrast
        heroTextColor = '#ffffff';       // White for text
        heroTextSecondary = '#e0e0e0';   // Light gray for secondary text
        heroAccentColor = '#1a1a1a';     // Dark for button text (contrasts with light button bg)
      }
      
      console.log('🎨 Auto colors based on overlay (white=' + options.heroOverlayWhite + ')');
      console.log('🎨 Applied colors - Text:', heroTextColor, 'Secondary:', heroTextSecondary, 'Accent:', heroAccentColor);
    }
    
    // Apply hero background styling
    if (heroImageUrl) {
      console.log('✅ Setting hero background image:', heroImageUrl.substring(0, 60) + '...');
      template = template.replace(/\{\{HERO_BACKGROUND_IMAGE\}\}/g, `url("${heroImageUrl}")`);
      template = template.replace(/\{\{HERO_OVERLAY\}\}/g, heroOverlay);
      template = template.replace(/\{\{HERO_BLUR\}\}/g, heroBlur);
    } else {
      console.log('🎨 No hero image found, using gradient background');
      template = template.replace(/\{\{HERO_BACKGROUND_IMAGE\}\}/g, 'none');
      template = template.replace(/\{\{HERO_OVERLAY\}\}/g, 'none');
      template = template.replace(/\{\{HERO_BLUR\}\}/g, '');
    }
    
    // Apply hero text colors (always replace placeholders to avoid JavaScript errors)
    template = template.replace(/\{\{HERO_TEXT_COLOR\}\}/g, heroTextColor || '#ffffff');
    template = template.replace(/\{\{HERO_TEXT_SECONDARY\}\}/g, heroTextSecondary || '#e0e0e0');
    template = template.replace(/\{\{HERO_ACCENT_COLOR\}\}/g, heroAccentColor || '#3b82f6');
    
    // Apply manual color flags and conditional content
    if (options.manualHeroTextColors) {
      console.log('🎨 Manual colors enabled - keeping manual color JavaScript in template');
      template = template.replace(/\{\{MANUAL_HERO_TEXT_COLORS\}\}/g, 'true');
    } else {
      console.log('🎨 Manual colors disabled - removing manual color JavaScript from template');
      console.log('🎨 Template before replacements contains manualColorsEnabled:', template.includes('manualColorsEnabled'));
      
      // Replace the manual colors section with false and remove the entire IIFE block
      template = template.replace(/\{\{MANUAL_HERO_TEXT_COLORS\}\}/g, 'false');
      
      // Remove ALL manual color related code
      // 1. Remove the manual color IIFE block completely
      template = template.replace(
        /\/\/ Manual Hero Text Color Support - Safe implementation[\s\S]*?\}\)\(\);\s*/,
        '// Manual colors disabled\n\n        '
      );
      
      // 2. Remove manual color checks from detectOverlayType function
      template = template.replace(
        /(\s+)\/\/ Skip automatic overlay detection if manual colors are enabled\s*\n\s+if \(manualColorsEnabled\) \{\s*\n\s+console\.log\([^)]+\);\s*\n\s+return;\s*\n\s+\}\s*\n/,
        '$1// Manual colors disabled - automatic overlay detection enabled\n'
      );
      
      // 3. Remove any remaining manualColorsEnabled variable references
      template = template.replace(/const manualColorsEnabled = [^;]+;/g, '');
      template = template.replace(/if \(manualColorsEnabled\) \{[^}]*\}/g, '');
      
      console.log('🎨 Template after replacements contains manualColorsEnabled:', template.includes('manualColorsEnabled'));
    }
    
    return template;
  }

  /**
   * Helper method to adjust color opacity for secondary text
   */
  adjustColorOpacity(hexColor, opacity) {
    // Convert hex to RGB and apply opacity
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Return as rgba with reduced opacity
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Helper method to generate accent color from text color
   */
  getAccentColorFromText(textColor) {
    // Simple logic: if text is dark, use a green accent; if light, use a darker green
    const hex = textColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate brightness (0-255)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    if (brightness > 128) {
      // Light text - use dark green accent
      return '#2d5a2d';
    } else {
      // Dark text - use light green accent
      return '#7bb87b';
    }
  }
}

module.exports = ModularWebsiteGenerator;
