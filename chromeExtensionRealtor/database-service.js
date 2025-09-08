// Database service for Chrome extension
class DatabaseService {
  constructor() {
    this.baseUrl = 'http://localhost:5001/api';
    this.isConnected = false;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await fetch('http://localhost:5001/health');
      this.isConnected = response.ok;
      // Database service connection status available
      return this.isConnected;
    } catch (error) {
      console.warn('Database service not available:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async saveExtractedData(url, pageType, agentData, properties = [], extractionData = {}) {
    try {
      // Check connection first
      if (!this.isConnected) {
        const connected = await this.checkConnection();
        if (!connected) {
          throw new Error('Database service is not available');
        }
      }

      const payload = {
        url,
        pageType,
        agentData,
        properties,
        extractionData: {
          ...extractionData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          extensionVersion: chrome.runtime.getManifest().version
        }
      };

      // Saving data to database...

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save data');
      }

      // Data saved to database successfully
      return result;

    } catch (error) {
      console.error('❌ Database save error:', error);
      throw error;
    }
  }

  async checkForDuplicate(url, agentName, company) {
    try {
      if (!this.isConnected) {
        await this.checkConnection();
      }

      const response = await fetch(`${this.baseUrl}/check-duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, agentName, company })
      });

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Duplicate check error:', error);
      return { success: false, isDuplicate: false, error: error.message };
    }
  }

  async getStats() {
    try {
      if (!this.isConnected) {
        await this.checkConnection();
      }

      const response = await fetch(`${this.baseUrl}/stats`);
      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Stats error:', error);
      return { success: false, error: error.message };
    }
  }

  async getRecentExtractions(limit = 10) {
    try {
      if (!this.isConnected) {
        await this.checkConnection();
      }

      const response = await fetch(`${this.baseUrl}/extractions/recent?limit=${limit}`);
      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Recent extractions error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAgentProfilePicture(agentData, newProfilePictureUrl) {
    try {
      if (!this.isConnected) {
        await this.checkConnection();
      }

      console.log('🖼️ Updating agent profile picture:', {
        agentName: agentData.name,
        agentUrl: agentData.url,
        oldUrl: agentData.profile_image_url,
        newUrl: newProfilePictureUrl
      });

      const response = await fetch(`${this.baseUrl}/agent/update-profile-picture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentName: agentData.name,
          agentUrl: agentData.url,
          company: agentData.company || agentData.office_name,
          phone: agentData.phone,
          newProfilePictureUrl: newProfilePictureUrl,
          oldProfilePictureUrl: agentData.profile_image_url
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Profile picture updated successfully:', result);
      } else {
        console.error('❌ Profile picture update failed:', result);
      }
      
      return result;

    } catch (error) {
      console.error('Profile picture update error:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper method to clean and prepare agent data for database
  prepareAgentData(rawAgentData, url) {
    console.log('🖼️ Agent image debug:', {
      name: rawAgentData.name,
      has_profile_image_url: !!rawAgentData.profile_image_url,
      profile_image_url: rawAgentData.profile_image_url,
      has_images: !!rawAgentData.images,
      images_agentPhoto: rawAgentData.images?.agentPhoto
    });

    const cleanData = {
      agent_id: this.extractAgentIdFromUrl(url),
      name: this.cleanString(rawAgentData.name),
      title: this.cleanString(rawAgentData.title),
      company: this.cleanString(rawAgentData.company),
      phone: this.cleanPhone(rawAgentData.phone),
      email: this.cleanEmail(rawAgentData.email),
      address: this.cleanString(rawAgentData.address),
      website: this.cleanUrl(rawAgentData.website),
      bio: rawAgentData.bio, // DON'T double-clean, bio is already cleaned in content.js
      specializations: this.cleanArray(rawAgentData.specializations),
      languages: this.cleanArray(rawAgentData.languages),
      experience_years: this.cleanNumber(rawAgentData.experience_years),
      license_number: this.cleanString(rawAgentData.license_number),
      license_state: this.cleanString(rawAgentData.license_state),
      profile_image_url: this.cleanUrl(
        rawAgentData.profile_image_url || 
        rawAgentData.images?.agentPhoto
      ),
      social_media: rawAgentData.social_media || {},
      ratings: rawAgentData.ratings || {},
      certifications: this.cleanArray(rawAgentData.certifications),
      service_areas: this.cleanArray(rawAgentData.service_areas)
    };

    // Remove null/undefined values
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === null || cleanData[key] === undefined || cleanData[key] === '') {
        delete cleanData[key];
      }
    });

    return cleanData;
  }

  // Helper method to clean and prepare property data
  preparePropertyData(properties) {
    if (!Array.isArray(properties)) return [];

    return properties.map(prop => {
      console.log('🖼️ Property image debug:', {
        property_id: prop.property_id || prop.id,
        address: prop.address,
        has_image_urls: !!prop.image_urls,
        image_urls_length: prop.image_urls ? prop.image_urls.length : 0,
        has_images: !!prop.images,
        images_length: prop.images ? prop.images.length : 0,
        has_final_images: !!prop.final_images,
        final_images_length: prop.final_images ? prop.final_images.length : 0,
        has_image: !!prop.image,
        has_photos: !!prop.photos,
        photos_length: prop.photos ? prop.photos.length : 0,
        images_sample: prop.images ? prop.images.slice(0, 2) : null,
        final_images_sample: prop.final_images ? prop.final_images.slice(0, 2) : null
      });

      const cleanProp = {
        property_id: this.cleanString(prop.property_id || prop.id),
        address: this.cleanString(prop.address),
        city: this.cleanString(prop.city),
        state: this.cleanString(prop.state),
        zip_code: this.cleanString(prop.zip_code),
        price: this.cleanPrice(prop.price),
        price_formatted: this.cleanString(prop.price_formatted || prop.price),
        bedrooms: this.cleanNumber(prop.bedrooms),
        bathrooms: this.cleanNumber(prop.bathrooms),
        square_feet: this.cleanNumber(prop.square_feet),
        lot_size: this.cleanString(prop.lot_size),
        property_type: this.cleanString(prop.property_type),
        listing_status: this.cleanString(prop.listing_status),
        listing_date: this.cleanDate(prop.listing_date),
        days_on_market: this.cleanNumber(prop.days_on_market),
        mls_number: this.cleanString(prop.mls_number),
        description: this.cleanString(prop.description),
        features: this.cleanArray(prop.features),
        image_urls: this.cleanArray(
          prop.image_urls || 
          prop.images ||  // Standard images array
          prop.final_images ||  // Transformer output
          (prop.image ? [prop.image] : []) ||  // Single image fallback
          (Array.isArray(prop.photos) ? prop.photos : []) ||  // Photos array fallback
          []
        ),
        property_url: this.cleanUrl(prop.property_url || prop.url),
        coordinates: prop.coordinates || {}
      };

      console.log('🖼️ After processing:', {
        property_id: cleanProp.property_id,
        final_image_urls: cleanProp.image_urls,
        final_image_count: cleanProp.image_urls ? cleanProp.image_urls.length : 0
      });

      // Remove null/undefined values
      Object.keys(cleanProp).forEach(key => {
        if (cleanProp[key] === null || cleanProp[key] === undefined || cleanProp[key] === '') {
          delete cleanProp[key];
        }
      });

      return cleanProp;
    }).filter(prop => prop.property_id || prop.address); // Only keep properties with ID or address
  }

  // Utility methods for data cleaning
  extractAgentIdFromUrl(url) {
    const match = url.match(/realestateagents\/([a-f0-9]+)/i);
    return match ? match[1] : null;
  }

  cleanString(value) {
    if (!value) return null;
    return value.toString().trim().replace(/\s+/g, ' ') || null;
  }

  cleanPhone(value) {
    if (!value) return null;
    return value.toString().replace(/[^\d\+\-\(\)\s]/g, '').trim() || null;
  }

  cleanEmail(value) {
    if (!value) return null;
    const email = value.toString().trim().toLowerCase();
    return email.includes('@') ? email : null;
  }

  cleanUrl(value) {
    if (!value) return null;
    let url = value.toString().trim();
    
    // If URL doesn't start with protocol, add https://
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return url;
  }

  cleanNumber(value) {
    if (!value && value !== 0) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  cleanPrice(value) {
    if (!value) return "0";
    const price = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    return isNaN(price) ? "0" : price.toString();
  }

  cleanDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  cleanArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && item.toString().trim()).map(item => item.toString().trim());
  }
}

// Make DatabaseService available globally (only in browser environment)
if (typeof window !== 'undefined') {
  window.DatabaseService = DatabaseService;
  // DatabaseService loaded and attached to window
}

// Signal that DatabaseService is ready (only in browser environment)
if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
  window.dispatchEvent(new CustomEvent('DatabaseServiceReady'));
}
