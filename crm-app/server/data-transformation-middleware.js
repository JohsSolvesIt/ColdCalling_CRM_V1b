// Data Transformation Middleware
// Transforms new Chrome extension data structure to legacy CRM format

class DataTransformationMiddleware {
  constructor() {
    this.version = '1.0.0';
    console.log('🔄 Data Transformation Middleware initialized');
  }

  // Main transformation function - converts new format to legacy format
  transformExtractedData(newFormatData) {
    console.log('🔄 Transforming data from new Chrome extension format to CRM legacy format');
    console.log('📥 Input data keys:', Object.keys(newFormatData));

    try {
      // Handle both direct data and wrapped response format
      const data = newFormatData.data || newFormatData;
      
      // Transform to legacy flat structure that CRM expects
      const transformedData = {
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
        
        // Properties - transform to flat structure
        properties: this.transformProperties(data.listings),
        property_details: this.transformProperties(data.listings), // Duplicate for compatibility
        
        // Metadata
        url: data.url || '',
        extractedAt: data.extractedAt || new Date().toISOString(),
        pageType: data.pageType || 'agent'
      };

      console.log('✅ Data transformation completed');
      console.log('📤 Output data keys:', Object.keys(transformedData));
      console.log('🏠 Properties transformed:', transformedData.properties?.length || 0);

      return transformedData;

    } catch (error) {
      console.error('❌ Data transformation failed:', error);
      
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
        extractedAt: new Date().toISOString()
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
    activeListings.forEach(listing => {
      allProperties.push(this.transformSingleProperty(listing, 'active'));
    });

    // Transform sold listings
    soldListings.forEach(listing => {
      allProperties.push(this.transformSingleProperty(listing, 'sold'));
    });

    console.log(`🔄 Transformed ${allProperties.length} properties (${activeListings.length} active, ${soldListings.length} sold)`);
    
    return allProperties;
  }

  // Transform a single property to legacy format
  transformSingleProperty(property, status = 'active') {
    return {
      // Basic property info
      id: property.id || `property_${Date.now()}_${Math.random()}`,
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
      
      // Images - flatten from new structure
      image: property.image || '', // Main image
      images: property.photos || [], // All images array
      photo_count: (property.photos && property.photos.length) || (property.image ? 1 : 0),
      
      // Additional details
      lot_size: property.lotSize || '',
      year_built: property.yearBuilt || null,
      hoa: property.hoa || '',
      mls: property.mls || '',
      
      // URL
      url: property.url || '',
      
      // Legacy compatibility fields
      propertyMainPhoto: property.image || '',
      propertyPhotos: Array.isArray(property.photos) ? property.photos.join('; ') : (property.image || ''),
      propertyPhotoCount: (property.photos && property.photos.length) || (property.image ? 1 : 0)
    };
  }

  // Transform for batch processing - handle arrays of agents
  transformBatchData(batchData) {
    if (!Array.isArray(batchData)) {
      return [this.transformExtractedData(batchData)];
    }

    return batchData.map(agentData => this.transformExtractedData(agentData));
  }

  // Validate transformed data meets CRM requirements
  validateTransformedData(transformedData) {
    const required = ['name', 'properties'];
    const missing = required.filter(field => !transformedData[field]);
    
    if (missing.length > 0) {
      console.warn('⚠️ Missing required fields:', missing);
      return false;
    }

    return true;
  }

  // Create middleware function for Express
  createExpressMiddleware() {
    return (req, res, next) => {
      // Only transform if request contains Chrome extension data AND hasn't been transformed yet
      if (req.body && (req.body.agent || req.body.data) && !req.body._transformed) {
        console.log('🔄 Applying server-side data transformation middleware to untransformed request');
        
        // Transform the data
        const transformedData = this.transformExtractedData(req.body);
        
        // Replace request body with transformed data
        req.body = transformedData;
        
        // Add metadata about transformation
        req.dataTransformed = true;
        req.transformationVersion = this.version;
        req.transformationLocation = 'server';
        
        console.log('✅ Server-side request data transformed successfully');
      } else if (req.body && req.body._transformed) {
        console.log('✅ Data already transformed by client, skipping server transformation');
        req.dataTransformed = false;
        req.transformationLocation = 'client';
      }
      
      next();
    };
  }
}

module.exports = DataTransformationMiddleware;
