/**
 * Layout Engine - System 1
 * Handles structure and arrangement of content components
 * Smart content detection and adaptive layouts
 */

class LayoutEngine {
  constructor(layoutPreset) {
    this.preset = layoutPreset;
    this.components = new Map();
    this.loadComponents();
  }

  /**
   * Load all available components
   */
  loadComponents() {
    // Component registry - will be populated by component files
    this.componentRegistry = {
      hero: require('../layouts/components/hero'),
      contact: require('../layouts/components/contact'),
      stats: require('../layouts/components/stats'),
      details: require('../layouts/components/details'),
      properties: require('../layouts/components/properties'),
      social: require('../layouts/components/social')
    };
  }

  /**
   * Generate HTML structure based on contact data and layout preset
   */
  generateHTML(contactData) {
    const availableComponents = this.analyzeAvailableContent(contactData);
    const orderedComponents = this.applyComponentOrder(availableComponents);
    const htmlStructure = this.renderComponents(orderedComponents, contactData);
    
    return this.wrapInBaseLayout(htmlStructure, contactData);
  }

  /**
   * Analyze contact data to determine which components should be shown
   */
  analyzeAvailableContent(contactData) {
    const available = new Map();

    // Hero Component - always available if name exists
    if (contactData.name) {
      available.set('hero', {
        component: 'hero',
        variant: this.preset.components.hero,
        priority: 1,
        data: {
          name: contactData.name,
          title: contactData.title,
          company: contactData.company,
          profile_image: contactData.profile_image_url,
          ratings: contactData.ratings
        }
      });
    }

    // Contact Component - available if any contact method exists
    const contactMethods = [contactData.phone, contactData.email, contactData.address, contactData.website];
    if (contactMethods.some(method => method)) {
      available.set('contact', {
        component: 'contact',
        variant: this.preset.components.contact,
        priority: 2,
        data: {
          phone: contactData.phone,
          email: contactData.email,
          address: contactData.address,
          website: contactData.website,
          license_number: contactData.license_number,
          license_state: contactData.license_state
        }
      });
    }

    // Stats Component - available if any stats exist
    const hasStats = contactData.total_properties || 
                    contactData.experience_years || 
                    (contactData.properties && contactData.properties.length > 0) ||
                    contactData.cities_served;
    
    if (hasStats) {
      available.set('stats', {
        component: 'stats',
        variant: this.preset.components.stats,
        priority: 3,
        data: {
          total_properties: contactData.total_properties || (contactData.properties ? contactData.properties.length : 0),
          experience_years: contactData.experience_years,
          cities_served: contactData.cities_served,
          avg_price: this.calculateAveragePrice(contactData.properties),
          min_price: contactData.min_property_price,
          max_price: contactData.max_property_price
        }
      });
    }

    // Details Component - available if professional details exist
    const hasDetails = contactData.specializations || 
                      contactData.languages || 
                      contactData.certifications || 
                      contactData.service_areas;
    
    if (hasDetails) {
      available.set('details', {
        component: 'details',
        variant: this.preset.components.details,
        priority: 4,
        data: {
          specializations: contactData.specializations,
          languages: contactData.languages,
          certifications: contactData.certifications,
          service_areas: contactData.service_areas,
          bio: contactData.bio || contactData.description
        }
      });
    }

    // Properties Component - available if properties exist
    if (contactData.properties && contactData.properties.length > 0) {
      available.set('properties', {
        component: 'properties',
        variant: this.preset.components.properties,
        priority: 5,
        data: {
          properties: contactData.properties
        }
      });
    }

    // Social Component - available if any social media links exist
    const hasSocial = contactData.social_media && Object.values(contactData.social_media).some(url => url);
    if (hasSocial) {
      available.set('social', {
        component: 'social',
        variant: this.preset.components.social,
        priority: 6,
        data: contactData.social_media
      });
    }

    return available;
  }

  /**
   * Apply component ordering based on preset configuration
   */
  applyComponentOrder(availableComponents) {
    const ordered = [];
    
    // Use preset component order, but only include available components
    for (const componentName of this.preset.componentOrder) {
      if (availableComponents.has(componentName)) {
        ordered.push(availableComponents.get(componentName));
      }
    }

    return ordered;
  }

  /**
   * Render all components to HTML
   */
  renderComponents(orderedComponents, contactData) {
    const renderedComponents = [];

    for (const componentConfig of orderedComponents) {
      try {
        const componentRenderer = this.componentRegistry[componentConfig.component];
        const componentHTML = componentRenderer.render(componentConfig.variant, componentConfig.data);
        
        renderedComponents.push({
          name: componentConfig.component,
          html: componentHTML,
          priority: componentConfig.priority
        });
      } catch (error) {
        console.error(`Error rendering component ${componentConfig.component}:`, error);
        // Continue with other components
      }
    }

    return renderedComponents;
  }

  /**
   * Wrap components in base layout structure
   */
  wrapInBaseLayout(components, contactData) {
    const baseLayoutRenderer = require(`../layouts/base-layouts/${this.preset.baseLayout}`);
    return baseLayoutRenderer.render(components, contactData, this.preset);
  }

  /**
   * Calculate average price from properties array
   */
  calculateAveragePrice(properties) {
    if (!properties || properties.length === 0) return null;
    
    const prices = properties
      .map(prop => parseFloat(prop.price || 0))
      .filter(price => price > 0);
    
    if (prices.length === 0) return null;
    
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return Math.round(avg);
  }

  /**
   * Get layout metadata
   */
  getMetadata() {
    return {
      layoutName: this.preset.name,
      baseLayout: this.preset.baseLayout,
      components: this.preset.components,
      version: this.preset.version || '1.0.0'
    };
  }
}

module.exports = LayoutEngine;
