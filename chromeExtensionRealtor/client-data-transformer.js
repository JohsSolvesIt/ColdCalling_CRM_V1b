// Client-side Data Transformation for Chrome Extension
// Transforms new extraction format to legacy CRM format immediately after scraping

class ClientDataTransformer {
  constructor() {
    this.version = '1.0.0';
    console.log('🔄 Client Data Transformer initialized');
  }

  // Transform extracted data immediately after scraping
  transformToLegacyFormat(extractedData) {
    console.log('🔄 Transforming scraped data to legacy CRM format');
    console.log('📥 Input data structure:', this.getDataStructure(extractedData));

    try {
      const data = extractedData.data || extractedData;
      
      // Create legacy flat structure
      const legacyData = {
        // Basic agent info - flatten from nested structure
        name: data.agent?.name || 'Unknown',
        title: data.agent?.title || '',
        company: data.office?.name || data.agent?.company || '',
        phone: data.contact?.phone || data.agent?.phone || '',
        email: data.contact?.email || data.agent?.email || '',
        address: data.office?.address || data.contact?.address || '',
        website: data.contact?.website || data.agent?.website || '',
        
        // Bio and description
        bio: data.agent?.bio || data.agent?.description || '',
        description: data.agent?.description || data.agent?.bio || '',
        
        // Professional info
        experience_years: data.agent?.experience_years || 0,
        license_number: data.credentials?.license_number || data.agent?.license || '',
        license: data.credentials?.license_number || data.agent?.license || '',
        license_state: data.credentials?.license_state || data.agent?.state || '',
        state: data.credentials?.license_state || data.agent?.state || '',
        
        // Media and images
        profile_image_url: data.images?.agentPhoto || '',
        agentPhoto: data.images?.agentPhoto || '', // Duplicate for compatibility
        
        // Arrays and complex data
        specializations: data.specializations || [],
        languages: data.agent?.languages || [],
        certifications: data.credentials?.certifications || [],
        service_areas: data.areasServed || [],
        
        // Social media
        social_media: data.socialMedia || {},
        
        // Reviews and ratings - flatten structure
        ratings: data.reviews?.overall?.rating || 0,
        review_count: data.reviews?.overall?.count || 0,
        reviews: data.reviews || {},
        
        // Properties - transform to flat structure
        properties: this.transformProperties(data.listings),
        property_details: this.transformProperties(data.listings), // Duplicate for compatibility
        
        // Keep listings in new format as well for transition period
        listings: data.listings || { active: [], sold: [] },
        
        // Images - keep both formats
        images: data.images || {},
        
        // Metadata
        url: data.url || window.location.href,
        extractedAt: data.extractedAt || new Date().toISOString(),
        pageType: data.pageType || 'agent',
        
        // Transformation metadata
        _transformed: true,
        _transformationVersion: this.version,
        _originalFormat: 'chrome_extension_v2'
      };

      console.log('✅ Data transformed to legacy format');
      console.log('📤 Output data structure:', this.getDataStructure(legacyData));
      console.log('🏠 Properties transformed:', legacyData.properties?.length || 0);

      return legacyData;

    } catch (error) {
      console.error('❌ Client data transformation failed:', error);
      
      // Return minimal valid structure to prevent crashes
      return {
        name: 'Unknown',
        title: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        website: '',
        bio: '',
        properties: [],
        property_details: [],
        listings: { active: [], sold: [] },
        images: {},
        extractedAt: new Date().toISOString(),
        _transformed: true,
        _transformationError: error.message
      };
    }
  }

  // Transform properties from new nested format to flat legacy format
  transformProperties(listings) {
    if (!listings) return [];

    const allProperties = [];
    
    // Combine active and sold listings
    const activeListings = listings.active || [];
    const soldListings = listings.sold || [];
    
    // Transform active listings
    activeListings.forEach((listing, index) => {
      allProperties.push(this.transformSingleProperty(listing, 'active', index));
    });

    // Transform sold listings  
    soldListings.forEach((listing, index) => {
      allProperties.push(this.transformSingleProperty(listing, 'sold', index + activeListings.length));
    });

    console.log(`🔄 Transformed ${allProperties.length} properties (${activeListings.length} active, ${soldListings.length} sold)`);
    
    return allProperties;
  }

  // Transform a single property to legacy format
  transformSingleProperty(property, status = 'active', index = 0) {
    // 🖼️ DEBUG: Log image data structure for each property
    console.log('🖼️ TRANSFORMER DEBUG - Property image data:', {
      property_id: property.id,
      address: property.address,
      has_image: !!property.image,
      has_images: !!property.images,
      has_photos: !!property.photos,
      image_value: property.image,
      images_value: property.images,
      photos_value: property.photos,
      images_length: property.images ? property.images.length : 0,
      photos_length: property.photos ? property.photos.length : 0
    });

    const transformed = {
      // Basic property info
      id: property.id || `property_${Date.now()}_${index}`,
      address: property.address || '',
      price: property.price || '',
      
      // Property details
      beds: property.beds || null,
      baths: property.baths || null,
      sqft: property.sqft || null,
      
      // Property characteristics
      property_type: property.propertyType || property.type || '',
      status: property.status || status,
      listing_type: property.listingType || '',
      
      // Dates and timing
      date_info: property.dateInfo || '',
      days_on_market: property.daysOnMarket || null,
      
      // Description and details
      description: property.description || '',
      
      // Images - handle both new format (photos array) and old format (image)
      image: property.image || (property.photos && property.photos[0]) || '', 
      images: property.photos || (property.image ? [property.image] : []),
      photo_count: (property.photos && property.photos.length) || (property.image ? 1 : 0),
      
      // Legacy compatibility fields
      propertyMainPhoto: property.image || (property.photos && property.photos[0]) || '',
      propertyPhotos: Array.isArray(property.photos) ? property.photos.join('; ') : (property.image || ''),
      propertyPhotoCount: (property.photos && property.photos.length) || (property.image ? 1 : 0),
      
      // Additional details
      lot_size: property.lotSize || '',
      year_built: property.yearBuilt || null,
      hoa: property.hoa || '',
      mls: property.mls || '',
      
      // URL
      url: property.url || ''
    };

    // 🖼️ DEBUG: Log transformed image data
    console.log('🖼️ TRANSFORMER DEBUG - After transformation:', {
      property_id: transformed.id,
      address: transformed.address,
      final_image: transformed.image,
      final_images: transformed.images,
      final_images_length: transformed.images ? transformed.images.length : 0,
      photo_count: transformed.photo_count
    });

    return transformed;
  }

  // Helper to analyze data structure
  getDataStructure(data) {
    if (!data || typeof data !== 'object') return 'invalid';
    
    const keys = Object.keys(data);
    const structure = {
      totalKeys: keys.length,
      hasAgent: 'agent' in data,
      hasOffice: 'office' in data, 
      hasContact: 'contact' in data,
      hasListings: 'listings' in data,
      hasProperties: 'properties' in data,
      hasImages: 'images' in data,
      isTransformed: data._transformed || false
    };
    
    if (data.listings) {
      structure.listingsStructure = {
        active: Array.isArray(data.listings.active) ? data.listings.active.length : 0,
        sold: Array.isArray(data.listings.sold) ? data.listings.sold.length : 0
      };
    }
    
    if (data.properties) {
      structure.propertiesCount = Array.isArray(data.properties) ? data.properties.length : 0;
    }
    
    return structure;
  }

  // Transform for multiple agents (batch processing)
  transformBatch(agentsArray) {
    if (!Array.isArray(agentsArray)) {
      return [this.transformToLegacyFormat(agentsArray)];
    }

    return agentsArray.map(agentData => this.transformToLegacyFormat(agentData));
  }
}

// Make available globally for use in content.js
window.ClientDataTransformer = ClientDataTransformer;
