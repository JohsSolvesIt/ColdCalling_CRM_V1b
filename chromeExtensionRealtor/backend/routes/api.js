const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const logger = require('../utils/logger');
const { validateExtraction } = require('../middleware/validation');

// Extract and save data endpoint
router.post('/extract', validateExtraction, async (req, res) => {
  try {
    const { url, pageType, agentData, properties, extractionData } = req.body;
    
    logger.info(`Processing extraction for URL: ${url}`);
    
    await db.transaction(async (client) => {
      let agent = null;
      let agentId = null;
      let propertiesInserted = 0;
      
      // Check if agent data exists
      if (agentData && agentData.name) {
        // First try to find by URL
        agent = await db.findAgentByUrl(url);
        
        // If not found by URL, try by name and company
        if (!agent) {
          agent = await db.findAgentByName(agentData.name, agentData.company);
        }
        
        // Prepare agent data for insertion/update
        const agentToInsert = {
          agent_id: db.extractAgentIdFromUrl(url) || agentData.agent_id,
          name: agentData.name,
          title: agentData.title,
          company: agentData.company,
          phone: agentData.phone,
          email: agentData.email,
          address: agentData.address,
          website: agentData.website,
          bio: agentData.bio,
          specializations: agentData.specializations || [],
          languages: agentData.languages || [],
          experience_years: agentData.experience_years,
          license_number: agentData.license_number,
          license_state: agentData.license_state,
          profile_image_url: agentData.profile_image_url,
          realtor_url: url,
          social_media: agentData.social_media || {},
          ratings: agentData.ratings || {},
          certifications: agentData.certifications || [],
          service_areas: agentData.service_areas || []
        };
        
        // Insert or update agent
        agent = await db.insertAgent(agentToInsert);
        agentId = agent.id;
        
        logger.info(`Agent processed: ${agent.name} (ID: ${agentId})`);
      }
      
      // Process properties if they exist
      if (properties && Array.isArray(properties) && agentId) {
        for (const property of properties) {
          try {
            const propertyToInsert = {
              property_id: property.property_id || property.id,
              address: property.address,
              city: property.city,
              state: property.state,
              zip_code: property.zip_code,
              price: property.price ? parseFloat(property.price.toString().replace(/[^0-9.]/g, '')) : null,
              price_formatted: property.price_formatted || property.price,
              bedrooms: property.bedrooms ? parseInt(property.bedrooms) : null,
              bathrooms: property.bathrooms ? parseFloat(property.bathrooms) : null,
              square_feet: property.square_feet ? parseInt(property.square_feet) : null,
              lot_size: property.lot_size,
              property_type: property.property_type,
              listing_status: property.listing_status,
              listing_date: property.listing_date,
              days_on_market: property.days_on_market ? parseInt(property.days_on_market) : null,
              mls_number: property.mls_number,
              description: property.description,
              features: property.features || [],
              image_urls: property.image_urls || [],
              property_url: property.property_url || property.url,
              coordinates: property.coordinates || {}
            };
            
            await db.insertProperty(agentId, propertyToInsert);
            propertiesInserted++;
            
          } catch (propertyError) {
            logger.error(`Error inserting property: ${propertyError.message}`);
            // Continue with other properties
          }
        }
        
        logger.info(`Properties processed: ${propertiesInserted}/${properties.length}`);
      }
      
      // Process recommendations if they exist
      let recommendationsInserted = 0;
      if (extractionData.reviews && extractionData.reviews.recommendations && agentId) {
        try {
          recommendationsInserted = await db.insertRecommendations(agentId, extractionData.reviews.recommendations);
          logger.info(`Recommendations processed: ${recommendationsInserted}`);
        } catch (recError) {
          logger.error(`Error processing recommendations: ${recError.message}`);
        }
      }
      
      // Log the extraction
      const logData = {
        url,
        page_type: pageType,
        extraction_status: 'success',
        agent_id: agentId,
        properties_found: propertiesInserted,
        error_message: null,
        extraction_data: extractionData,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      };
      
      await db.logExtraction(logData);
      
      res.json({
        success: true,
        message: 'Data extracted and saved successfully',
        data: {
          agent: agent ? {
            id: agent.id,
            name: agent.name,
            company: agent.company,
            isNew: !agent.updated_at || agent.created_at === agent.updated_at
          } : null,
          propertiesProcessed: propertiesInserted,
          totalProperties: properties ? properties.length : 0,
          recommendationsProcessed: recommendationsInserted
        }
      });
    });
    
  } catch (error) {
    logger.error('Extraction processing error:', error);
    
    // Log the failed extraction
    try {
      await db.logExtraction({
        url: req.body.url,
        page_type: req.body.pageType,
        extraction_status: 'error',
        agent_id: null,
        properties_found: 0,
        error_message: error.message,
        extraction_data: req.body.extractionData,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      });
    } catch (logError) {
      logger.error('Error logging failed extraction:', logError);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process extraction',
      message: error.message
    });
  }
});

// Check for duplicates endpoint
router.post('/check-duplicate', async (req, res) => {
  try {
    const { url, agentName, company } = req.body;
    
    let existingAgent = null;
    
    // Check by URL first
    if (url) {
      existingAgent = await db.findAgentByUrl(url);
    }
    
    // Check by name and company if not found by URL
    if (!existingAgent && agentName) {
      existingAgent = await db.findAgentByName(agentName, company);
    }
    
    res.json({
      success: true,
      isDuplicate: !!existingAgent,
      existingAgent: existingAgent ? {
        id: existingAgent.id,
        name: existingAgent.name,
        company: existingAgent.company,
        lastScraped: existingAgent.last_scraped_at,
        totalProperties: await db.query(
          'SELECT COUNT(*) as count FROM properties WHERE agent_id = $1',
          [existingAgent.id]
        ).then(result => result.rows[0].count)
      } : null
    });
    
  } catch (error) {
    logger.error('Duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for duplicates',
      message: error.message
    });
  }
});

// Check for property duplicates across all agents
router.post('/check-property-duplicate', async (req, res) => {
  try {
    const { property_id, mls_number, address, price, bedrooms, bathrooms, square_feet } = req.body;
    
    let query = 'SELECT p.id, p.property_id, p.address, p.price, p.agent_id, a.name as agent_name FROM properties p LEFT JOIN agents a ON a.id = p.agent_id WHERE ';
    let params = [];
    let conditions = [];
    
    // Check by property_id first (most reliable)
    if (property_id) {
      conditions.push('p.property_id = $' + (params.length + 1));
      params.push(property_id);
    } else if (mls_number) {
      // Check by MLS number (also very reliable)
      conditions.push('p.mls_number = $' + (params.length + 1));
      params.push(mls_number);
    } else if (address) {
      // Check by address (good fallback)
      conditions.push('LOWER(TRIM(p.address)) = LOWER(TRIM($' + (params.length + 1) + '))');
      params.push(address);
      
      // Also check price for additional validation
      if (price) {
        const numericPrice = parseFloat(price.toString().replace(/[^0-9.]/g, ''));
        if (!isNaN(numericPrice)) {
          conditions.push('p.price = $' + (params.length + 1));
          params.push(numericPrice);
        }
      }
    } else {
      // Fallback: Check by property characteristics
      if (address && price && bedrooms && bathrooms) {
        conditions.push('LOWER(TRIM(p.address)) = LOWER(TRIM($' + (params.length + 1) + '))');
        params.push(address);
        
        const numericPrice = parseFloat(price.toString().replace(/[^0-9.]/g, ''));
        if (!isNaN(numericPrice)) {
          conditions.push('p.price = $' + (params.length + 1));
          params.push(numericPrice);
        }
        
        if (bedrooms) {
          conditions.push('p.bedrooms = $' + (params.length + 1));
          params.push(parseInt(bedrooms));
        }
        
        if (bathrooms) {
          conditions.push('p.bathrooms = $' + (params.length + 1));
          params.push(parseFloat(bathrooms));
        }
      } else {
        // No sufficient criteria provided
        return res.json({
          success: true,
          isDuplicate: false,
          message: 'Insufficient criteria for duplicate detection'
        });
      }
    }
    
    if (conditions.length === 0) {
      return res.json({
        success: true,
        isDuplicate: false,
        message: 'No search criteria provided'
      });
    }
    
    query += conditions.join(' AND ');
    
    const result = await db.query(query, params);
    
    const isDuplicate = result.rows.length > 0;
    
    if (isDuplicate) {
      logger.info(`Property duplicate found: ${result.rows.length} existing properties match criteria`);
    }
    
    res.json({
      success: true,
      isDuplicate,
      existingProperties: result.rows.map(row => ({
        id: row.id,
        property_id: row.property_id,
        address: row.address,
        price: row.price,
        agent_id: row.agent_id,
        agent_name: row.agent_name
      })),
      count: result.rows.length
    });
    
  } catch (error) {
    logger.error('Property duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check property duplicate',
      message: error.message
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

// Get recent extractions
router.get('/extractions/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await db.query(
      'SELECT * FROM recent_extractions LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    res.json({
      success: true,
      extractions: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rowCount
      }
    });
    
  } catch (error) {
    logger.error('Recent extractions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent extractions',
      message: error.message
    });
  }
});

// Get agents with pagination and search
router.get('/agents', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    
    // Join agent_stats with agents table to get tags and profile override fields
    let query = `
      SELECT 
        s.*,
        a.tags,
        a.override_profile_image,
        a.custom_profile_image_url
      FROM agent_stats s
      LEFT JOIN agents a ON s.id = a.id
    `;
    let params = [];
    
    if (search) {
      query += ' WHERE s.name ILIKE $1 OR s.company ILIKE $1';
      params.push(`%${search}%`);
      query += ' ORDER BY s.name LIMIT $2 OFFSET $3';
      params.push(limit, offset);
    } else {
      query += ' ORDER BY s.name LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    }
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      agents: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rowCount
      }
    });
    
  } catch (error) {
    logger.error('Agents list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
      message: error.message
    });
  }
});

// Get detailed agent profiles with all data
router.get('/agents/detailed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    
    let query = `
      SELECT 
        a.*,
        COUNT(p.id) as total_properties,
        AVG(p.price) as avg_property_price,
        MIN(p.price) as min_property_price,
        MAX(p.price) as max_property_price,
        COUNT(DISTINCT p.city) as cities_served
      FROM agents a
      LEFT JOIN properties p ON a.id = p.agent_id
    `;
    let params = [];
    
    if (search) {
      query += ' WHERE a.name ILIKE $1 OR a.company ILIKE $1';
      params.push(`%${search}%`);
      query += ' GROUP BY a.id ORDER BY a.name LIMIT $2 OFFSET $3';
      params.push(limit, offset);
    } else {
      query += ' GROUP BY a.id ORDER BY a.name LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    }
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      agents: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rowCount
      }
    });
    
  } catch (error) {
    logger.error('Detailed agents list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get detailed agents',
      message: error.message
    });
  }
});

// Get individual agent by ID with all data including ratings - moved to main route below

// Get individual agent by ID with full details including properties
router.get('/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get agent data
    const agentQuery = `
      SELECT 
        a.*,
        COUNT(p.id) as total_properties,
        AVG(p.price) as avg_property_price,
        MIN(p.price) as min_property_price,
        MAX(p.price) as max_property_price,
        COUNT(DISTINCT p.city) as cities_served
      FROM agents a
      LEFT JOIN properties p ON a.id = p.agent_id
      WHERE a.id = $1
      GROUP BY a.id
    `;
    
    const agentResult = await db.query(agentQuery, [id]);
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    // Get properties for this agent
    const propertiesQuery = `
      SELECT * FROM properties 
      WHERE agent_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    
    const propertiesResult = await db.query(propertiesQuery, [id]);
    
    // 🔧 ADDED: Load real recommendations from database
    const recommendationsQuery = `
      SELECT text, author, date_text, source, extraction_method
      FROM recommendations 
      WHERE agent_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    const recommendationsResult = await db.query(recommendationsQuery, [id]);
    
    const agent = agentResult.rows[0];
    agent.properties = propertiesResult.rows;
    
    // 🔧 FIXED: Build reviews object with real data from database
    agent.reviews = {
      overall: agent.ratings || {},
      individual: [], // Individual reviews not implemented yet
      recommendations: recommendationsResult.rows.map((rec, index) => ({
        id: index + 1,
        text: rec.text,
        author: rec.author || 'Client',
        source: rec.source || 'scraped',
        extraction_method: rec.extraction_method,
        date: rec.date_text
      }))
    };
    
    // 🔧 FIXED: Only generate fake testimonials if no real reviews exist
    const hasRealRecommendations = agent.reviews.recommendations.length > 0;
    
    if (!hasRealRecommendations && agent.ratings && agent.ratings.count && parseInt(agent.ratings.count) > 0) {
      // Only generate fake testimonials if no real ones exist
      const { generateTestimonialsForAgent } = require('../testimonial-generator');
      const fakeReviews = generateTestimonialsForAgent(agent.ratings);
      agent.reviews.recommendations = fakeReviews.recommendations;
      logger.info(`Generated ${agent.reviews.recommendations.length} FALLBACK testimonials for ${agent.name} (no real reviews found)`);
    } else if (hasRealRecommendations) {
      logger.info(`Using ${agent.reviews.recommendations.length} REAL scraped recommendations for ${agent.name}`);
    } else {
      agent.reviews = null;
    }
    
    logger.info(`Agent ${agent.name} fetched with ${propertiesResult.rows.length} properties`);
    
    res.json({
      success: true,
      agent: agent
    });
    
  } catch (error) {
    logger.error('Individual agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent',
      message: error.message
    });
  }
});

// Get total count of realtors/agents
router.get('/realtors/count', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM agents');
    const count = parseInt(result.rows[0].count);
    
    logger.info(`Retrieved agent count: ${count}`);
    
    res.json({
      success: true,
      count: count
    });
    
  } catch (error) {
    logger.error('Count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get count',
      message: error.message,
      count: 0
    });
  }
});

// Get properties for a specific agent or all properties
router.get('/properties', async (req, res) => {
  try {
    const { agentId, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        p.*,
        a.name as agent_name,
        a.company as agent_company,
        a.phone as agent_phone,
        a.email as agent_email
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
    `;
    let params = [];
    
    if (agentId) {
      query += ' WHERE p.agent_id = $1';
      params.push(agentId);
      query += ' ORDER BY p.created_at DESC LIMIT $2 OFFSET $3';
      params.push(limit, offset);
    } else {
      query += ' ORDER BY p.created_at DESC LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    }
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      properties: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rowCount
      }
    });
    
  } catch (error) {
    logger.error('Properties list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get properties',
      message: error.message
    });
  }
});

// Get properties for a specific agent with full details
router.get('/agents/:agentId/properties', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const query = `
      SELECT 
        p.*,
        a.name as agent_name,
        a.company as agent_company,
        a.phone as agent_phone,
        a.email as agent_email
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE p.agent_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [agentId, limit, offset]);
    
    res.json({
      success: true,
      agentId: agentId,
      properties: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rowCount
      }
    });
    
  } catch (error) {
    logger.error('Agent properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent properties',
      message: error.message
    });
  }
});

// Update an agent
router.put('/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agentData = req.body;
    
    logger.info(`Updating agent ID: ${id}`);
    
    // Build update fields dynamically
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    // Map of allowed fields that can be updated
    const allowedFields = {
      name: 'name',
      title: 'title', 
      company: 'company',
      phone: 'phone',
      email: 'email',
      address: 'address',
      website: 'website',
      bio: 'bio',
      specializations: 'specializations',
      languages: 'languages',
      experience_years: 'experience_years',
      license_number: 'license_number',
      license_state: 'license_state',
      profile_image_url: 'profile_image_url',
      social_media: 'social_media',
      ratings: 'ratings',
      reviews: 'reviews',
      certifications: 'certifications',
      service_areas: 'service_areas',
      // CRM fields
      crm_notes: 'crm_notes',
      crm_status: 'crm_status',
      last_contacted: 'last_contacted',
      follow_up_at: 'follow_up_at',
      texts_sent: 'texts_sent',
      emails_sent: 'emails_sent',
      follow_up_priority: 'follow_up_priority',
      crm_data: 'crm_data',
      tags: 'tags',  // User-defined tags field
      // Website generator settings
      override_profile_image: 'override_profile_image',
      overrideProfileImage: 'override_profile_image', // Camel case variant
      custom_profile_image_url: 'custom_profile_image_url',
      customProfileImageUrl: 'custom_profile_image_url', // Camel case variant
      // Legacy field mappings for backward compatibility
      Status: 'crm_status',
      Notes: 'crm_notes',
      LastContacted: 'last_contacted',
      FollowUpAt: 'follow_up_at',
      TextsSent: 'texts_sent',
      EmailsSent: 'emails_sent',
      FollowUpPriority: 'follow_up_priority',
      // Additional fields that might appear in "All Fields"
      description: 'bio', // Map description to bio
      agent_id: 'agent_id',
      realtor_url: 'realtor_url'
    };

    // Build update query dynamically - process mapped fields first
    for (const [key, dbField] of Object.entries(allowedFields)) {
      if (agentData.hasOwnProperty(key)) {
        updateFields.push(`${dbField} = $${paramIndex}`);
        
        // Handle JSONB fields that need to be JSON stringified
        if (['tags', 'specializations', 'languages', 'social_media', 'ratings', 'certifications', 'service_areas', 'crm_data'].includes(dbField)) {
          values.push(JSON.stringify(agentData[key]));
        } else {
          values.push(agentData[key]);
        }
        
        paramIndex++;
      }
    }
    
    // For any remaining fields not in allowedFields but might be valid database columns,
    // attempt to update them directly (this allows for future extensibility)
    const processedKeys = Object.keys(allowedFields);
    const remainingFields = Object.keys(agentData).filter(key => 
      !processedKeys.includes(key) && 
      agentData[key] !== undefined &&
      key !== 'id' && // Don't allow updating the ID
      key !== 'created_at' && // Don't allow updating created_at
      !key.startsWith('_') // Don't allow internal fields
    );
    
    for (const field of remainingFields) {
      updateFields.push(`${field} = $${paramIndex}`);
      values.push(agentData[field]);
      paramIndex++;
    }
    
    // Debug logging for troubleshooting
    logger.info(`Update attempt for agent ${id}:`, {
      receivedData: agentData,
      receivedKeys: Object.keys(agentData),
      allowedKeys: Object.keys(allowedFields),
      remainingFields: remainingFields,
      totalFieldsToUpdate: updateFields.length,
      matchedFields: updateFields
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        debug: {
          receivedKeys: Object.keys(agentData),
          allowedKeys: Object.keys(allowedFields)
        }
      });
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // Add the ID parameter at the end
    values.push(id);
    const whereParamIndex = paramIndex; // Current paramIndex is correct for the WHERE clause
    
    const updateQuery = `
      UPDATE agents SET ${updateFields.join(', ')}
      WHERE id = $${whereParamIndex}
      RETURNING *
    `;
    
    logger.info(`Executing SQL query:`, {
      query: updateQuery,
      values: values,
      fieldCount: updateFields.length
    });
    
    const result = await db.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    logger.info(`Agent updated successfully: ${result.rows[0].name}`);
    
    res.json({
      success: true,
      message: 'Agent updated successfully',
      agent: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Update agent error:', {
      error: error.message,
      stack: error.stack,
      agentId: id,
      receivedData: Object.keys(agentData),
      sqlError: error.code || 'Unknown'
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update agent',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete an agent
router.delete('/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting agent ID: ${id}`);
    
    await db.transaction(async (client) => {
      // First, delete all properties associated with this agent
      const propertiesResult = await client.query(
        'DELETE FROM properties WHERE agent_id = $1',
        [id]
      );
      const propertiesDeleted = propertiesResult.rowCount || 0;
      
      // Then delete the agent
      const agentResult = await client.query(
        'DELETE FROM agents WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (agentResult.rows.length === 0) {
        throw new Error('Agent not found');
      }
      
      const deletedAgent = agentResult.rows[0];
      
      logger.info(`Agent deleted successfully: ${deletedAgent.name} (${propertiesDeleted} properties also deleted)`);
      
      res.json({
        success: true,
        message: 'Agent deleted successfully',
        deleted: {
          agent: deletedAgent,
          propertiesDeleted: propertiesDeleted
        }
      });
    });
    
  } catch (error) {
    logger.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent',
      message: error.message
    });
  }
});

// Clear all data from the database
router.delete('/clear', async (req, res) => {
  try {
    logger.info('Starting database clear operation...');
    
    await db.transaction(async (client) => {
      // Delete all properties first (due to foreign key constraints)
      const propertiesResult = await client.query('DELETE FROM properties');
      const propertiesDeleted = propertiesResult.rowCount || 0;
      
      // Delete all recommendations (due to foreign key constraints)
      const recommendationsResult = await client.query('DELETE FROM recommendations');
      const recommendationsDeleted = recommendationsResult.rowCount || 0;
      
      // Delete all agents
      const agentsResult = await client.query('DELETE FROM agents');
      const agentsDeleted = agentsResult.rowCount || 0;
      
      // Delete all extraction logs
      const logsResult = await client.query('DELETE FROM extraction_logs');
      const logsDeleted = logsResult.rowCount || 0;
      
      logger.info(`Database cleared successfully: ${agentsDeleted} agents, ${propertiesDeleted} properties, ${recommendationsDeleted} recommendations, ${logsDeleted} logs`);
      
      res.json({
        success: true,
        message: 'Database cleared successfully',
        deleted: {
          agents: agentsDeleted,
          properties: propertiesDeleted,
          recommendations: recommendationsDeleted,
          logs: logsDeleted
        }
      });
    });
    
  } catch (error) {
    logger.error('Clear database error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear database',
      message: error.message
    });
  }
});

// Clean duplicate properties for a specific agent and address
router.post('/clean-duplicates', async (req, res) => {
  try {
    const { agentId, address } = req.body;
    
    if (!agentId || !address) {
      return res.status(400).json({
        success: false,
        error: 'agentId and address are required'
      });
    }
    
    logger.info(`Cleaning duplicate properties for agent ${agentId}, address: ${address}`);
    
    // Delete all but the oldest property for this agent/address combination
    const query = `
      DELETE FROM properties 
      WHERE agent_id = $1 
      AND address = $2
      AND id != (
        SELECT id FROM properties 
        WHERE agent_id = $1 
        AND address = $2
        ORDER BY created_at ASC 
        LIMIT 1
      )
      RETURNING id, created_at;
    `;
    
    const result = await db.pool.query(query, [agentId, address]);
    const deletedCount = result.rowCount || 0;
    
    logger.info(`Deleted ${deletedCount} duplicate properties`);
    
    // Get updated counts
    const countQuery = `
      SELECT COUNT(*) as total_count,
             COUNT(CASE WHEN address = $2 THEN 1 END) as address_count
      FROM properties 
      WHERE agent_id = $1
    `;
    
    const countResult = await db.pool.query(countQuery, [agentId, address]);
    const counts = countResult.rows[0];
    
    res.json({
      success: true,
      message: `Cleaned ${deletedCount} duplicate properties`,
      deleted: result.rows,
      counts: {
        totalProperties: parseInt(counts.total_count),
        addressProperties: parseInt(counts.address_count)
      }
    });
    
  } catch (error) {
    logger.error('Clean duplicates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean duplicates',
      message: error.message
    });
  }
});

// ===========================
// RECOMMENDATION MANAGEMENT ENDPOINTS
// ===========================

// Get all recommendations for an agent
router.get('/agents/:agentId/recommendations', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const query = `
      SELECT r.*, a.name as agent_name
      FROM recommendations r
      JOIN agents a ON r.agent_id = a.id
      WHERE r.agent_id = $1
      ORDER BY r.created_at DESC
    `;
    
    const result = await db.query(query, [agentId]);
    
    res.json({
      success: true,
      recommendations: result.rows
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations',
      message: error.message
    });
  }
});

// Add a new recommendation
router.post('/agents/:agentId/recommendations', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { text, author, date_text, source = 'manual' } = req.body;
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation text must be at least 10 characters long'
      });
    }
    
    const insertQuery = `
      INSERT INTO recommendations (agent_id, text, author, date_text, source, extraction_method)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      agentId,
      text.trim(),
      author || 'Anonymous',
      date_text || new Date().toLocaleDateString(),
      source,
      'manual_entry'
    ]);
    
    logger.info(`New recommendation added for agent ${agentId}`);
    
    res.json({
      success: true,
      message: 'Recommendation added successfully',
      recommendation: result.rows[0]
    });
  } catch (error) {
    logger.error('Add recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add recommendation',
      message: error.message
    });
  }
});

// Update agent profile picture
router.post('/agent/update-profile-picture', async (req, res) => {
  try {
    const { agentName, agentUrl, company, phone, newProfilePictureUrl, oldProfilePictureUrl } = req.body;
    
    logger.info('🖼️ Profile picture update request:', {
      agentName,
      agentUrl,
      company,
      phone,
      oldUrl: oldProfilePictureUrl,
      newUrl: newProfilePictureUrl
    });
    
    if (!agentName || !newProfilePictureUrl) {
      return res.status(400).json({
        success: false,
        error: 'Agent name and new profile picture URL are required'
      });
    }
    
    // Find the agent by multiple criteria
    let agent = null;
    
    // Try to find by URL first
    if (agentUrl) {
      const urlQuery = `SELECT * FROM agents WHERE realtor_url = $1 LIMIT 1`;
      const urlResult = await db.query(urlQuery, [agentUrl]);
      if (urlResult.rows.length > 0) {
        agent = urlResult.rows[0];
      }
    }
    
    // If not found by URL, try by name and company
    if (!agent && company) {
      const nameCompanyQuery = `SELECT * FROM agents WHERE name ILIKE $1 AND company ILIKE $2 LIMIT 1`;
      const nameCompanyResult = await db.query(nameCompanyQuery, [agentName, company]);
      if (nameCompanyResult.rows.length > 0) {
        agent = nameCompanyResult.rows[0];
      }
    }
    
    // If still not found, try by name and phone
    if (!agent && phone) {
      const namePhoneQuery = `SELECT * FROM agents WHERE name ILIKE $1 AND phone = $2 LIMIT 1`;
      const namePhoneResult = await db.query(namePhoneQuery, [agentName, phone]);
      if (namePhoneResult.rows.length > 0) {
        agent = namePhoneResult.rows[0];
      }
    }
    
    // If still not found, try by name only
    if (!agent) {
      const nameQuery = `SELECT * FROM agents WHERE name ILIKE $1 LIMIT 1`;
      const nameResult = await db.query(nameQuery, [agentName]);
      if (nameResult.rows.length > 0) {
        agent = nameResult.rows[0];
      }
    }
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        message: `Could not find agent with name "${agentName}"`
      });
    }
    
    // Update the profile picture URL
    const updateQuery = `
      UPDATE agents 
      SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    
    const updateResult = await db.query(updateQuery, [newProfilePictureUrl, agent.id]);
    
    if (updateResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Update failed',
        message: 'Could not update agent profile picture'
      });
    }
    
    const updatedAgent = updateResult.rows[0];
    
    logger.info(`✅ Profile picture updated for agent ${agentName} (ID: ${agent.id})`);
    
    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        company: updatedAgent.company,
        oldProfileUrl: oldProfilePictureUrl,
        newProfileUrl: updatedAgent.profile_image_url
      }
    });
    
  } catch (error) {
    logger.error('Profile picture update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile picture',
      message: error.message
    });
  }
});

// Update a recommendation
router.put('/recommendations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author, date_text } = req.body;
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation text must be at least 10 characters long'
      });
    }
    
    const updateQuery = `
      UPDATE recommendations 
      SET text = $1, author = $2, date_text = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      text.trim(),
      author || 'Anonymous',
      date_text || new Date().toLocaleDateString(),
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }
    
    logger.info(`Recommendation ${id} updated`);
    
    res.json({
      success: true,
      message: 'Recommendation updated successfully',
      recommendation: result.rows[0]
    });
  } catch (error) {
    logger.error('Update recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recommendation',
      message: error.message
    });
  }
});

// Delete a recommendation
router.delete('/recommendations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteQuery = `
      DELETE FROM recommendations 
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }
    
    logger.info(`Recommendation ${id} deleted`);
    
    res.json({
      success: true,
      message: 'Recommendation deleted successfully',
      deleted: result.rows[0]
    });
  } catch (error) {
    logger.error('Delete recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recommendation',
      message: error.message
    });
  }
});

// Property CRUD Operations

// Create/Add a new property
router.post('/properties', async (req, res) => {
  try {
    const {
      agent_id,
      property_id,
      address,
      city,
      state,
      zip_code,
      price,
      price_formatted,
      bedrooms,
      bathrooms,
      square_feet,
      lot_size,
      property_type,
      listing_status,
      listing_date,
      days_on_market,
      mls_number,
      description,
      features,
      image_urls,
      property_url,
      coordinates
    } = req.body;
    
    if (!agent_id || !address) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID and address are required'
      });
    }
    
    const insertQuery = `
      INSERT INTO properties (
        agent_id, property_id, address, city, state, zip_code,
        price, price_formatted, bedrooms, bathrooms, square_feet,
        lot_size, property_type, listing_status, listing_date,
        days_on_market, mls_number, description, features,
        image_urls, property_url, coordinates
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING *
    `;
    
    const values = [
      agent_id,
      property_id || null,
      address,
      city || null,
      state || null,
      zip_code || null,
      price ? parseFloat(price.toString().replace(/[^0-9.]/g, '')) : null,
      price_formatted || null,
      bedrooms ? parseInt(bedrooms) : null,
      bathrooms ? parseFloat(bathrooms) : null,
      square_feet ? parseInt(square_feet) : null,
      lot_size || null,
      property_type || null,
      listing_status || null,
      listing_date || null,
      days_on_market ? parseInt(days_on_market) : null,
      mls_number || null,
      description || null,
      features ? Array.isArray(features) ? features : [] : [],
      image_urls ? Array.isArray(image_urls) ? image_urls : [] : [],
      property_url || null,
      coordinates ? JSON.stringify(coordinates) : null
    ];
    
    const result = await db.query(insertQuery, values);
    
    logger.info(`New property added for agent ${agent_id}: ${address}`);
    
    res.json({
      success: true,
      message: 'Property added successfully',
      property: result.rows[0]
    });
  } catch (error) {
    logger.error('Add property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add property',
      message: error.message
    });
  }
});

// Update a property
router.put('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      address,
      city,
      state,
      zip_code,
      price,
      price_formatted,
      bedrooms,
      bathrooms,
      square_feet,
      lot_size,
      property_type,
      listing_status,
      listing_date,
      days_on_market,
      mls_number,
      description,
      features,
      image_urls,
      property_url,
      coordinates
    } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }
    
    const updateQuery = `
      UPDATE properties 
      SET address = $1, city = $2, state = $3, zip_code = $4,
          price = $5, price_formatted = $6, bedrooms = $7, bathrooms = $8,
          square_feet = $9, lot_size = $10, property_type = $11, listing_status = $12,
          listing_date = $13, days_on_market = $14, mls_number = $15, description = $16,
          features = $17, image_urls = $18, property_url = $19, coordinates = $20,
          updated_at = NOW()
      WHERE id = $21
      RETURNING *
    `;
    
    const values = [
      address,
      city || null,
      state || null,
      zip_code || null,
      price ? parseFloat(price.toString().replace(/[^0-9.]/g, '')) : null,
      price_formatted || null,
      bedrooms ? parseInt(bedrooms) : null,
      bathrooms ? parseFloat(bathrooms) : null,
      square_feet ? parseInt(square_feet) : null,
      lot_size || null,
      property_type || null,
      listing_status || null,
      listing_date || null,
      days_on_market ? parseInt(days_on_market) : null,
      mls_number || null,
      description || null,
      features ? Array.isArray(features) ? features : [] : [],
      image_urls ? Array.isArray(image_urls) ? image_urls : [] : [],
      property_url || null,
      coordinates ? JSON.stringify(coordinates) : null,
      id
    ];
    
    const result = await db.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    logger.info(`Property ${id} updated: ${address}`);
    
    res.json({
      success: true,
      message: 'Property updated successfully',
      property: result.rows[0]
    });
  } catch (error) {
    logger.error('Update property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update property',
      message: error.message
    });
  }
});

// Delete a property
router.delete('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteQuery = `
      DELETE FROM properties 
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    logger.info(`Property ${id} deleted: ${result.rows[0].address}`);
    
    res.json({
      success: true,
      message: 'Property deleted successfully',
      deleted: result.rows[0]
    });
  } catch (error) {
    logger.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete property',
      message: error.message
    });
  }
});

// Get a single property by ID
router.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        p.*,
        a.name as agent_name,
        a.company as agent_company,
        a.phone as agent_phone,
        a.email as agent_email
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE p.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    res.json({
      success: true,
      property: result.rows[0]
    });
  } catch (error) {
    logger.error('Get property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get property',
      message: error.message
    });
  }
});

// ============================================================================
// TAGGING ENDPOINTS
// ============================================================================

// Add tags to an agent
router.post('/agents/tags', async (req, res) => {
  try {
    const { agentId, tags } = req.body;
    
    if (!agentId || !tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID and tags array are required'
      });
    }
    
    // Validate tags
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length === 0 || tag.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Each tag must be a non-empty string with max 50 characters'
        });
      }
      
      // Check for valid characters (letters, numbers, hyphens, underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
        return res.status(400).json({
          success: false,
          error: 'Tags can only contain letters, numbers, hyphens, and underscores'
        });
      }
    }
    
    // Check if agent exists
    const agentCheck = await db.query('SELECT id FROM agents WHERE id = $1', [agentId]);
    if (agentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    // Get existing tags
    const existingTagsResult = await db.query('SELECT tags FROM agents WHERE id = $1', [agentId]);
    const existingTags = existingTagsResult.rows[0].tags || [];
    
    // Merge new tags with existing ones (remove duplicates)
    const mergedTags = [...new Set([...existingTags, ...tags])];
    
    // Limit to maximum 20 tags per agent
    if (mergedTags.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Agent cannot have more than 20 tags'
      });
    }
    
    // Update agent with new tags
    await db.query(
      'UPDATE agents SET tags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(mergedTags), agentId]
    );
    
    logger.info(`Added tags to agent ${agentId}: ${tags.join(', ')}`);
    
    res.json({
      success: true,
      agentId,
      tagsAdded: tags,
      totalTags: mergedTags,
      message: `Successfully added ${tags.length} tag(s) to agent`
    });
    
  } catch (error) {
    logger.error('Add tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tags',
      message: error.message
    });
  }
});

// Get tags for an agent
router.get('/agents/:agentId/tags', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const result = await db.query('SELECT tags FROM agents WHERE id = $1', [agentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    const tags = result.rows[0].tags || [];
    
    res.json({
      success: true,
      agentId,
      tags,
      tagCount: tags.length
    });
    
  } catch (error) {
    logger.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tags',
      message: error.message
    });
  }
});

// Remove tags from an agent
router.delete('/agents/:agentId/tags', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'Tags array is required'
      });
    }
    
    // Get existing tags
    const existingTagsResult = await db.query('SELECT tags FROM agents WHERE id = $1', [agentId]);
    
    if (existingTagsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    const existingTags = existingTagsResult.rows[0].tags || [];
    
    // Remove specified tags
    const updatedTags = existingTags.filter(tag => !tags.includes(tag));
    
    // Update agent
    await db.query(
      'UPDATE agents SET tags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(updatedTags), agentId]
    );
    
    logger.info(`Removed tags from agent ${agentId}: ${tags.join(', ')}`);
    
    res.json({
      success: true,
      agentId,
      tagsRemoved: tags,
      remainingTags: updatedTags,
      message: `Successfully removed ${tags.length} tag(s) from agent`
    });
    
  } catch (error) {
    logger.error('Remove tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove tags',
      message: error.message
    });
  }
});

// Search agents by tags
router.get('/agents/search/tags', async (req, res) => {
  try {
    const { tags, operator = 'OR', page = 1, limit = 50 } = req.query;
    
    if (!tags) {
      return res.status(400).json({
        success: false,
        error: 'Tags parameter is required'
      });
    }
    
    const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    const offset = (page - 1) * limit;
    
    let whereClause;
    let queryParams;
    
    if (operator.toUpperCase() === 'AND') {
      // All tags must be present
      whereClause = 'WHERE tags @> $1';
      queryParams = [JSON.stringify(tagArray), limit, offset];
    } else {
      // Any tag can be present (OR operation)
      whereClause = 'WHERE tags && $1';
      queryParams = [JSON.stringify(tagArray), limit, offset];
    }
    
    const query = `
      SELECT 
        id, agent_id, name, title, company, phone, email, address,
        website, profile_image_url, realtor_url, tags,
        created_at, updated_at
      FROM agents
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, queryParams);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM agents
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, [JSON.stringify(tagArray)]);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      agents: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      searchCriteria: {
        tags: tagArray,
        operator: operator.toUpperCase()
      }
    });
    
  } catch (error) {
    logger.error('Search by tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search by tags',
      message: error.message
    });
  }
});

// Get all unique tags in the system
router.get('/tags/all', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT jsonb_array_elements_text(tags) as tag
      FROM agents
      WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
      ORDER BY tag
    `;
    
    const result = await db.query(query);
    const tags = result.rows.map(row => row.tag);
    
    // Get tag usage counts
    const tagCounts = {};
    for (const tag of tags) {
      const countQuery = `
        SELECT COUNT(*) as count
        FROM agents
        WHERE tags @> $1
      `;
      const countResult = await db.query(countQuery, [JSON.stringify([tag])]);
      tagCounts[tag] = parseInt(countResult.rows[0].count);
    }
    
    res.json({
      success: true,
      tags,
      tagCounts,
      totalUniqueTags: tags.length
    });
    
  } catch (error) {
    logger.error('Get all tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tags',
      message: error.message
    });
  }
});

// Bulk tag operations
router.post('/agents/tags/bulk', async (req, res) => {
  try {
    const { agentIds, tags, operation = 'add' } = req.body;
    
    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Agent IDs array is required'
      });
    }
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tags array is required'
      });
    }
    
    if (!['add', 'remove', 'replace'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: 'Operation must be "add", "remove", or "replace"'
      });
    }
    
    const results = [];
    
    await db.transaction(async (client) => {
      for (const agentId of agentIds) {
        try {
          // Get existing tags
          const existingResult = await client.query('SELECT tags FROM agents WHERE id = $1', [agentId]);
          
          if (existingResult.rows.length === 0) {
            results.push({ agentId, success: false, error: 'Agent not found' });
            continue;
          }
          
          let existingTags = existingResult.rows[0].tags || [];
          let updatedTags;
          
          switch (operation) {
            case 'add':
              updatedTags = [...new Set([...existingTags, ...tags])];
              break;
            case 'remove':
              updatedTags = existingTags.filter(tag => !tags.includes(tag));
              break;
            case 'replace':
              updatedTags = [...tags];
              break;
          }
          
          // Limit to maximum 20 tags per agent
          if (updatedTags.length > 20) {
            results.push({ agentId, success: false, error: 'Too many tags (max 20)' });
            continue;
          }
          
          // Update agent
          await client.query(
            'UPDATE agents SET tags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(updatedTags), agentId]
          );
          
          results.push({ 
            agentId, 
            success: true, 
            operation,
            tagsProcessed: tags,
            totalTags: updatedTags.length 
          });
          
        } catch (error) {
          results.push({ agentId, success: false, error: error.message });
        }
      }
    });
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info(`Bulk tag ${operation} completed: ${successful} successful, ${failed} failed`);
    
    res.json({
      success: true,
      operation,
      totalAgents: agentIds.length,
      successful,
      failed,
      results
    });
    
  } catch (error) {
    logger.error('Bulk tag operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk tag operation',
      message: error.message
    });
  }
});

module.exports = router;
