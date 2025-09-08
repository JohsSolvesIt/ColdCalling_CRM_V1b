const axios = require('axios');

class UnifiedDatabaseManager {
  constructor() {
    this.chromeExtensionBaseUrl = 'http://localhost:5001';
    this.isConnected = false;
    this.lastConnectionTest = null;
    this.connectionStatus = {
      connected: false,
      lastPing: null,
      error: null
    };
    
    // Simple cache to avoid repeated requests
    this.cache = {
      agents: new Map(), // Cache for individual agents
      properties: new Map(), // Cache for agent properties
      lastClearTime: Date.now()
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
  }

  async initialize() {
    console.log('🔌 Initializing Chrome Extension connection...');
    try {
      await this.testChromeExtensionConnection();
      console.log('✅ Chrome Extension connection established');
      return { success: true, message: 'Chrome Extension connected' };
    } catch (error) {
      console.warn('⚠️ Chrome Extension not available:', error.message);
      return { success: false, message: 'Chrome Extension not available', error: error.message };
    }
  }

  async testChromeExtensionConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased timeout
      
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/health`, { 
        timeout: 5000,
        signal: controller.signal,
        retry: 3,
        retryDelay: 1000
      });
      
      clearTimeout(timeoutId);
      
      this.isConnected = response.status === 200;
      this.lastConnectionTest = new Date();
      this.connectionStatus = {
        connected: true,
        lastPing: new Date().toISOString(),
        error: null,
        responseTime: Date.now() - this.lastConnectionTest.getTime()
      };
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      this.connectionStatus = {
        connected: false,
        lastPing: new Date().toISOString(),
        error: error.message,
        errorCode: error.code,
        responseTime: null
      };
      
      // Don't throw on connection failures, just log and continue
      console.warn(`Chrome Extension connection failed: ${error.message}`);
      return false;
    }
  }

  getCurrentDatabase() {
    return {
      name: 'Chrome Extension Realtor Database',
      type: 'chrome_extension',
      isConnected: this.isConnected,
      baseUrl: this.chromeExtensionBaseUrl,
      lastPing: this.connectionStatus.lastPing
    };
  }

  async getAvailableDatabases() {
    return [{
      name: 'Chrome Extension Realtor Database',
      type: 'chrome_extension',
      isConnected: this.isConnected,
      description: 'PostgreSQL database containing agents, properties, and extraction logs',
      features: ['agents', 'properties', 'extraction_logs', 'agent_stats', 'recent_extractions']
    }];
  }

  async switchToChromeExtension() {
    await this.testChromeExtensionConnection();
    return this.isConnected;
  }

  // Ensure connection with retry logic
  async ensureConnection(maxRetries = 3) {
    if (this.isConnected) {
      return true;
    }
    
    console.log('🔄 Attempting to establish Chrome Extension connection...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.testChromeExtensionConnection();
        if (this.isConnected) {
          console.log(`✅ Chrome Extension connection established on attempt ${attempt}`);
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Connection attempt ${attempt}/${maxRetries} failed:`, error.message);
      }
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error('❌ Failed to establish Chrome Extension connection after all retries');
    return false;
  }

  // Get ALL agents with COMPLETE data including statistics and properties
  async getAgents(page = 1, limit = 1000, includeStats = true, includeProperties = false) {
    try {
      await this.ensureConnection();
      if (!this.isConnected) {
        const e = new Error('Chrome Extension API not connected');
        e.code = 'CE_UNAVAILABLE';
        throw e;
      }
      
      const offset = (page - 1) * limit;
      const endpoint = includeStats ? '/api/agents/detailed' : '/api/agents';
      
      const response = await axios.get(`${this.chromeExtensionBaseUrl}${endpoint}`, {
        params: { limit, offset },
        timeout: 10000
      });

      if (response.data.success) {
        const agents = response.data.agents.map(agent => this.transformAgentData(agent));
        
        // If includeProperties is true, fetch properties for each agent
        if (includeProperties) {
          console.log(`🔍 Fetching properties for ${agents.length} agents with aggressive rate limiting prevention...`);
          for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            try {
              // Significantly increase delay between requests to prevent 429 errors
              if (i > 0) {
                const delay = process.env.AGENT_REQUEST_DELAY || 1500; // Use configurable delay
                await new Promise(resolve => setTimeout(resolve, delay)); // Configurable delay between requests
              }
              
              const properties = await this.getPropertiesForAgent(agent.id);
              agent.properties = properties;
              agent.property_details = properties; // Also add as property_details for compatibility
              
              if (i % 5 === 4) { // Every 5 requests, log progress and add extra delay
                console.log(`📊 Processed ${i + 1}/${agents.length} agents`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Extra 2s delay every 5 requests
              }
            } catch (error) {
              console.warn(`Could not fetch properties for agent ${agent.id}:`, error.message);
              agent.properties = [];
              agent.property_details = [];
            }
          }
          console.log(`✅ Completed fetching properties for all ${agents.length} agents`);
        }
        
        return agents;
      }
      
      throw new Error(response.data.error || 'Failed to fetch agents');
    } catch (error) {
      console.error('Error fetching agents:', error.message);
      throw error;
    }
  }

  // Search agents with ALL available fields
  async searchAgents(searchTerm, page = 1, limit = 1000) {
    try {
      await this.ensureConnection();
      
      const offset = (page - 1) * limit;
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/agents/detailed`, {
        params: { search: searchTerm, limit, offset },
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.agents.map(agent => this.transformAgentData(agent));
      }
      
      throw new Error(response.data.error || 'Failed to search agents');
    } catch (error) {
      console.error('Error searching agents:', error.message);
      throw error;
    }
  }

  // Get a single agent by ID efficiently (without fetching all agents)
  async getAgentById(agentId, includeProperties = true) {
    try {
      await this.ensureConnection();
      if (!this.isConnected) {
        const e = new Error('Chrome Extension API not connected');
        e.code = 'CE_UNAVAILABLE';
        throw e;
      }
      
      // First try to get the agent directly from Chrome Extension
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/agents/${agentId}`, {
        timeout: 10000
      });

      if (response.data.success && response.data.agent) {
        const agent = this.transformAgentData(response.data.agent);
        
        // If includeProperties is true, fetch properties for this agent
        if (includeProperties) {
          try {
            const properties = await this.getPropertiesForAgent(agent.id);
            agent.properties = properties;
            agent.property_details = properties; // Also add as property_details for compatibility
          } catch (propError) {
            console.warn(`Failed to fetch properties for agent ${agentId}:`, propError.message);
            agent.properties = [];
            agent.property_details = [];
          }
        }
        
        return agent;
      }
      
      throw new Error(`Agent with ID ${agentId} not found`);
    } catch (error) {
      console.error(`Error fetching agent by ID ${agentId}:`, error.message);
      
      // If Chrome Extension fails, don't fall back to fetching all agents
      // Instead, return null to indicate the agent wasn't found
      return null;
    }
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    if (now - this.cache.lastClearTime > this.cacheTimeout) {
      this.cache.agents.clear();
      this.cache.properties.clear();
      this.cache.lastClearTime = now;
      console.log('🧹 Cleared expired cache entries');
    }
  }

  // Get properties for a specific agent with rate limiting, retry logic, and caching
  async getPropertiesForAgent(agentId, retryCount = 0) {
    this.clearExpiredCache();
    
    // Check cache first
    const cacheKey = `${agentId}_properties`;
    if (this.cache.properties.has(cacheKey)) {
      console.log(`📋 Using cached properties for agent ${agentId}`);
      return this.cache.properties.get(cacheKey);
    }
    
    try {
      await this.ensureConnection();
      
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/properties`, {
        params: { agent_id: agentId, limit: 50 }, // Reduced from 100 to 50 properties per agent
        timeout: 15000 // Increased timeout to 15 seconds
      });

      if (response.data.success) {
        const properties = response.data.properties.map(property => this.transformPropertyData(property));
        
        // Cache the results
        this.cache.properties.set(cacheKey, properties);
        console.log(`💾 Cached ${properties.length} properties for agent ${agentId}`);
        
        return properties;
      }
      
      return [];
    } catch (error) {
      // Handle 429 (Too Many Requests) errors with exponential backoff
      if (error.response && error.response.status === 429 && retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 3000; // Increased to 3s, 6s, 12s
        console.log(`⏳ Rate limited for agent ${agentId}, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.getPropertiesForAgent(agentId, retryCount + 1);
      }
      
      // For 429 errors that exceed retry attempts, return empty array instead of crashing
      if (error.response && error.response.status === 429) {
        console.warn(`⚠️ Rate limit exceeded for agent ${agentId} after 3 retries, skipping properties`);
        // Cache empty result to avoid retrying immediately
        this.cache.properties.set(cacheKey, []);
        return [];
      }
      
      console.error(`Error fetching properties for agent ${agentId}:`, error.message);
      return [];
    }
  }

  // Transform property data to include ALL available fields
  transformPropertyData(property) {
    return {
      // Core identification
      id: property.id,
      property_id: property.property_id,
      agent_id: property.agent_id,
      
      // Address information
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      zip_code: property.zip_code || '',
      
      // Pricing
      price: parseFloat(property.price) || 0,
      price_formatted: property.price_formatted || '',
      
      // Property details
      bedrooms: parseInt(property.bedrooms) || 0,
      bathrooms: parseFloat(property.bathrooms) || 0,
      square_feet: parseInt(property.square_feet) || 0,
      lot_size: property.lot_size || '',
      property_type: property.property_type || '',
      
      // Listing information
      listing_status: property.listing_status || '',
      listing_date: property.listing_date,
      days_on_market: parseInt(property.days_on_market) || 0,
      mls_number: property.mls_number || '',
      description: property.description || '',
      
      // Enhanced data
      features: property.features || [],
      image_urls: property.image_urls || [],
      property_url: property.property_url || '',
      coordinates: this.parseJsonField(property.coordinates) || {},
      
      // Timestamps
      created_at: property.created_at,
      updated_at: property.updated_at,
      
      // Source metadata
      source: 'chrome_extension',
      _dbType: 'chrome_extension'
    };
  }

  // Get ALL properties data across all agents or for specific agent
  async getProperties(agentId = null, page = 1, limit = 1000) {
    try {
      await this.ensureConnection();
      
      const offset = (page - 1) * limit;
      const params = { limit, offset };
      if (agentId) {
        params.agent_id = agentId;
      }
      
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/properties`, {
        params: params,
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.properties.map(property => {
          const transformed = this.transformPropertyData(property);
          // Add agent information if available
          if (property.agent_name) {
            transformed.agent_name = property.agent_name;
            transformed.agent_company = property.agent_company;
            transformed.agent_phone = property.agent_phone;
          }
          return transformed;
        });
      }
      
      throw new Error(response.data.error || 'Failed to fetch properties');
    } catch (error) {
      console.error('Error fetching properties:', error.message);
      throw error;
    }
  }

  // Get ALL extraction logs and monitoring data
  async getExtractionLogs(page = 1, limit = 50) {
    try {
      await this.ensureConnection();
      
      const offset = (page - 1) * limit;
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/extractions/recent`, {
        params: { limit, offset },
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.extractions;
      }
      
      throw new Error(response.data.error || 'Failed to fetch extraction logs');
    } catch (error) {
      console.error('Error fetching extraction logs:', error.message);
      throw error;
    }
  }

  // Get comprehensive statistics from ALL data stores
  async getComprehensiveStats() {
    try {
      await this.ensureConnection();
      
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/stats`, {
        timeout: 10000
      });

      if (response.data.success) {
        return {
          ...response.data.stats,
          timestamp: new Date().toISOString(),
          dataSource: 'chrome_extension',
          connectionStatus: this.connectionStatus
        };
      }
      
      throw new Error(response.data.error || 'Failed to fetch statistics');
    } catch (error) {
      console.error('Error fetching stats:', error.message);
      throw error;
    }
  }

  // Get total count of ALL realtors across ALL data stores
  async getTotalRealtorCount() {
    try {
      await this.ensureConnection();
      
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/realtors/count`, {
        timeout: 5000
      });

      if (response.data.success) {
        return response.data.count;
      }
      
      throw new Error(response.data.error || 'Failed to fetch count');
    } catch (error) {
      console.error('Error fetching realtor count:', error.message);
      return 0;
    }
  }

  // Update an agent in Chrome Extension database
  async updateAgent(id, agentData) {
    try {
      await this.ensureConnection();
      if (!this.isConnected) {
        const e = new Error('Chrome Extension API not connected');
        e.code = 'CE_UNAVAILABLE';
        throw e;
      }
      
      // Convert tags from comma-separated string to array for Chrome Extension backend
      const processedData = { ...agentData };
      if (processedData.tags && typeof processedData.tags === 'string') {
        processedData.tags = this.convertStringToTagsArray(processedData.tags);
      }
      
      console.log('🔄 UnifiedDatabaseManager.updateAgent called:', {
        id,
        fieldsBeingUpdated: Object.keys(agentData),
        originalData: agentData,
        processedData: processedData
      });
      
      const response = await axios.put(`${this.chromeExtensionBaseUrl}/api/agents/${id}`, processedData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      console.log('🔄 Chrome Extension response:', response.data);

      if (response.data.success) {
        const transformedAgent = this.transformAgentData(response.data.agent);
        console.log('🔄 Transformed agent data:', transformedAgent);
        return transformedAgent;
      }
      
      throw new Error(response.data.error || 'Failed to update agent');
    } catch (error) {
      console.error('❌ Error updating agent:', error.message);
      throw error;
    }
  }

  // Delete an agent from Chrome Extension database
  async deleteAgent(id) {
    try {
      await this.ensureConnection();
      if (!this.isConnected) {
        const e = new Error('Chrome Extension API not connected');
        e.code = 'CE_UNAVAILABLE';
        throw e;
      }
      
      const response = await axios.delete(`${this.chromeExtensionBaseUrl}/api/agents/${id}`, {
        timeout: 10000
      });

      if (response.data.success) {
        return {
          success: true,
          deletedAgent: response.data.deleted.agent,
          propertiesDeleted: response.data.deleted.propertiesDeleted
        };
      }
      
      throw new Error(response.data.error || 'Failed to delete agent');
    } catch (error) {
      console.error('Error deleting agent:', error.message);
      throw error;
    }
  }

  // Legacy compatibility method - maps to Chrome Extension data
  async getContacts(page = 1, limit = 1000) {
    const agents = await this.getAgents(page, limit, true);
    return agents.map(agent => this.transformAgentToContact(agent));
  }

  // Transform agent data to include ALL available fields
  transformAgentData(agent) {
    return {
      // Core identification
      id: agent.id,
      agent_id: agent.agent_id,
      
      // Basic info
      name: agent.name || '',
      title: agent.title || '',
      company: agent.company || '',
      
      // Contact information
      phone: agent.phone || '',
      email: agent.email || '',
      address: agent.address || '',
      website: agent.website || '',
      
      // Professional details
      bio: agent.bio || '',
      experience_years: agent.experience_years || 0,
      license_number: agent.license_number || '',
      license_state: agent.license_state || '',
      
      // Enhanced data arrays
      specializations: agent.specializations || [],
      languages: agent.languages || [],
      certifications: agent.certifications || [],
      service_areas: agent.service_areas || [],
      
      // Media and profile
      profile_image_url: agent.profile_image_url || '',
      profile_image: agent.profile_image || '',
      realtor_url: agent.realtor_url || '',
      available_photos: agent.available_photos || [],
      
      // JSON data objects
      social_media: this.parseJsonField(agent.social_media) || {},
      ratings: this.parseJsonField(agent.ratings) || {},
      
      // CRM fields (from Chrome Extension CRM integration)
      crm_notes: agent.crm_notes || '',
      crm_status: agent.crm_status || 'New',
      last_contacted: agent.last_contacted,
      follow_up_at: agent.follow_up_at,
      texts_sent: agent.texts_sent || 0,
      emails_sent: agent.emails_sent || 0,
      follow_up_priority: agent.follow_up_priority,
      crm_data: this.parseJsonField(agent.crm_data) || {},
      notes: agent.notes || '',
      status: agent.status || 'New',
      
      // User-defined tags - convert JSONB array to comma-separated string for CRM compatibility
      tags: this.convertTagsToString(agent.tags),
      
      // Website generator profile override settings
      override_profile_image: agent.override_profile_image || false,
      custom_profile_image_url: agent.custom_profile_image_url || '',
      
      // Property statistics (from detailed endpoint)
      total_properties: parseInt(agent.total_properties) || 0,
      avg_property_price: parseFloat(agent.avg_property_price) || 0,
      min_property_price: parseFloat(agent.min_property_price) || 0,
      max_property_price: parseFloat(agent.max_property_price) || 0,
      cities_served: parseInt(agent.cities_served) || 0,
      
      // Timestamps
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      last_scraped_at: agent.last_scraped_at,
      
      // Source metadata
      source: 'chrome_extension',
      _dbType: 'chrome_extension',
      _dbName: 'Chrome Extension Realtor Database'
    };
  }

  // Transform agent to legacy contact format for backwards compatibility
  transformAgentToContact(agent) {
    return {
      id: agent.id,
      name: agent.name,
      company: agent.company,
      phone: agent.phone,
      email: agent.email,
      address: agent.address,
      city: this.extractCityFromServiceAreas(agent.service_areas),
      state: agent.license_state || this.extractStateFromServiceAreas(agent.service_areas),
      zip_code: '',
      license: agent.license_number,
      url: agent.realtor_url,
      description: agent.bio,
      office_address: agent.address,
      office_phone: agent.phone,
      website: agent.website,
      
      // Enhanced fields
      title: agent.title,
      experience_years: agent.experience_years,
      specializations: agent.specializations,
      languages: agent.languages,
      certifications: agent.certifications,
      service_areas: agent.service_areas,
      social_media: agent.social_media,
      ratings: agent.ratings,
      profile_image_url: agent.profile_image_url,
      
      // Statistics
      total_properties: agent.total_properties,
      avg_property_price: agent.avg_property_price,
      cities_served: agent.cities_served,
      
      // CRM fields (map from Chrome Extension data)
      Notes: agent.crm_notes || '',
      Status: agent.crm_status || 'New',
      LastContacted: agent.last_contacted,
      FollowUpAt: agent.follow_up_at,
      TextsSent: agent.texts_sent || 0,
      EmailsSent: agent.emails_sent || 0,
      FollowUpPriority: agent.follow_up_priority || 'normal',
      tags: agent.tags || [],
      
      // Metadata
      source: 'chrome_extension',
      _dbType: 'chrome_extension',
      _dbName: 'Chrome Extension Realtor Database',
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      last_scraped_at: agent.last_scraped_at
    };
  }

  // Utility methods
  parseJsonField(field) {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return {};
      }
    }
    return field || {};
  }

  extractCityFromServiceAreas(serviceAreas) {
    if (!serviceAreas || !Array.isArray(serviceAreas) || serviceAreas.length === 0) {
      return '';
    }
    // Return first service area as city
    return serviceAreas[0] || '';
  }

  extractStateFromServiceAreas(serviceAreas) {
    if (!serviceAreas || !Array.isArray(serviceAreas)) {
      return '';
    }
    // Look for state abbreviations in service areas
    const statePattern = /\b[A-Z]{2}\b/;
    for (const area of serviceAreas) {
      const match = area.match(statePattern);
      if (match) {
        return match[0];
      }
    }
    return '';
  }

  async ensureConnection() {
    if (!this.isConnected || (this.lastConnectionTest && Date.now() - this.lastConnectionTest.getTime() > 60000)) {
      await this.testChromeExtensionConnection();
    }
    
    if (!this.isConnected) {
      throw new Error('Chrome Extension database is not available');
    }
  }

  // Health check method
  async healthCheck() {
    try {
      await this.testChromeExtensionConnection();
      const stats = await this.getComprehensiveStats();
      
      return {
        status: 'healthy',
        connection: this.connectionStatus,
        stats: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connection: this.connectionStatus,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Helper method to convert JSONB tags array to comma-separated string
  convertTagsToString(tags) {
    if (!tags) return '';
    
    try {
      // If it's already a string, return it
      if (typeof tags === 'string') {
        return tags;
      }
      
      // If it's an array, join with commas
      if (Array.isArray(tags)) {
        return tags.join(', ');
      }
      
      // If it's a JSON string, parse and join
      if (typeof tags === 'object') {
        return Array.isArray(tags) ? tags.join(', ') : '';
      }
      
      return '';
    } catch (error) {
      console.error('Error converting tags to string:', error);
      return '';
    }
  }

  // Helper method to convert comma-separated string to JSONB array
  convertStringToTagsArray(tagsString) {
    if (!tagsString || typeof tagsString !== 'string') {
      return [];
    }
    
    try {
      // Split by comma and clean up
      return tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } catch (error) {
      console.error('Error converting string to tags array:', error);
      return [];
    }
  }

  // SMS Template Management Methods
  async getSmsTemplates() {
    try {
      await this.ensureConnection();
      
      const response = await axios.get(`${this.chromeExtensionBaseUrl}/api/sms/templates`, {
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.templates || [];
      }
      
      throw new Error(response.data.error || 'Failed to fetch SMS templates');
    } catch (error) {
      console.error('Error fetching SMS templates:', error.message);
      throw error;
    }
  }

  async addSmsTemplate(templateData) {
    try {
      await this.ensureConnection();
      
      const response = await axios.post(`${this.chromeExtensionBaseUrl}/api/sms/templates`, templateData, {
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.template;
      }
      
      throw new Error(response.data.error || 'Failed to add SMS template');
    } catch (error) {
      console.error('Error adding SMS template:', error.message);
      throw error;
    }
  }

  async updateSmsTemplate(templateId, templateData) {
    try {
      await this.ensureConnection();
      
      const response = await axios.put(`${this.chromeExtensionBaseUrl}/api/sms/templates/${templateId}`, templateData, {
        timeout: 10000
      });

      if (response.data.success) {
        return response.data.template;
      }
      
      throw new Error(response.data.error || 'Failed to update SMS template');
    } catch (error) {
      console.error('Error updating SMS template:', error.message);
      throw error;
    }
  }

  async deleteSmsTemplate(templateId) {
    try {
      await this.ensureConnection();
      
      const response = await axios.delete(`${this.chromeExtensionBaseUrl}/api/sms/templates/${templateId}`, {
        timeout: 10000
      });

      if (response.data.success) {
        return { success: true };
      }
      
      throw new Error(response.data.error || 'Failed to delete SMS template');
    } catch (error) {
      console.error('Error deleting SMS template:', error.message);
      throw error;
    }
  }

  async initializeDefaultSmsTemplates() {
    try {
      const existingTemplates = await this.getSmsTemplates();
      
      if (existingTemplates.length === 0) {
        console.log('🔧 Initializing default SMS templates...');
        
        const defaultTemplates = [
          {
            name: "AI Video Offer",
            content: "Hey {firstName}, it's Joshua Willey. I help agents like you stand out with high-converting AI Listing Videos. Normally they're $500, but I'm offering your first one for just $100 to show you the value. Are you cool with AI doing your listing videos",
            category: "marketing",
            variables: ["firstName"]
          },
          {
            name: "Follow Up - General",
            content: "Hello {firstName}, I wanted to reach out about the opportunity we discussed. Are you still interested?",
            category: "follow_up",
            variables: ["firstName"]
          },
          {
            name: "Follow Up - Information",
            content: "Hi {firstName}, thanks for your time earlier. I have some additional information that might interest you.",
            category: "follow_up",
            variables: ["firstName"]
          },
          {
            name: "Check In - Questions",
            content: "Hello {firstName}, just checking in to see if you had any questions about our previous discussion.",
            category: "check_in",
            variables: ["firstName"]
          },
          {
            name: "General Greeting",
            content: "Hi {firstName}, I hope you're doing well. Do you have a few minutes to continue our conversation?",
            category: "general",
            variables: ["firstName"]
          }
        ];

        for (const template of defaultTemplates) {
          try {
            await this.addSmsTemplate(template);
            console.log(`✅ Added default template: ${template.name}`);
          } catch (error) {
            console.warn(`⚠️ Failed to add template ${template.name}:`, error.message);
          }
        }
        
        console.log('🎉 Default SMS templates initialized successfully');
      } else {
        console.log(`📱 Found ${existingTemplates.length} existing SMS templates`);
      }
    } catch (error) {
      console.error('Error initializing default SMS templates:', error.message);
      // Don't throw - this is initialization, we can continue without it
    }
  }
}

module.exports = UnifiedDatabaseManager;
