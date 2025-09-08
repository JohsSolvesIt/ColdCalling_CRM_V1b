const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'realtor_data',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection test successful');
      return result;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms: ${text}`);
      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      logger.error('Query:', text);
      logger.error('Params:', params);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Agent-related database operations
  async findAgentByUrl(url) {
    const agentId = this.extractAgentIdFromUrl(url);
    if (!agentId) return null;

    const query = 'SELECT * FROM agents WHERE agent_id = $1';
    const result = await this.query(query, [agentId]);
    return result.rows[0] || null;
  }

  async findAgentByName(name, company) {
    const query = `
      SELECT * FROM agents 
      WHERE LOWER(name) = LOWER($1) 
      AND ($2::text IS NULL OR LOWER(company) = LOWER($2))
    `;
    // Ensure company is null if undefined, empty, or falsy
    const normalizedCompany = company || null;
    const result = await this.query(query, [name, normalizedCompany]);
    return result.rows[0] || null;
  }

  async insertAgent(agentData) {
    const query = `
      INSERT INTO agents (
        agent_id, name, title, company, phone, email, address, 
        website, bio, specializations, languages, experience_years,
        license_number, license_state, profile_image_url, realtor_url,
        social_media, ratings, certifications, service_areas,
        crm_notes, crm_status, last_contacted, follow_up_at,
        texts_sent, emails_sent, follow_up_priority, crm_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28
      ) 
      ON CONFLICT (agent_id) 
      DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        website = EXCLUDED.website,
        bio = EXCLUDED.bio,
        specializations = EXCLUDED.specializations,
        languages = EXCLUDED.languages,
        experience_years = EXCLUDED.experience_years,
        license_number = EXCLUDED.license_number,
        license_state = EXCLUDED.license_state,
        profile_image_url = EXCLUDED.profile_image_url,
        realtor_url = EXCLUDED.realtor_url,
        social_media = EXCLUDED.social_media,
        ratings = EXCLUDED.ratings,
        certifications = EXCLUDED.certifications,
        service_areas = EXCLUDED.service_areas,
        -- Only update CRM fields if they are provided (not null)
        crm_notes = CASE WHEN EXCLUDED.crm_notes IS NOT NULL THEN EXCLUDED.crm_notes ELSE agents.crm_notes END,
        crm_status = CASE WHEN EXCLUDED.crm_status IS NOT NULL THEN EXCLUDED.crm_status ELSE agents.crm_status END,
        last_contacted = CASE WHEN EXCLUDED.last_contacted IS NOT NULL THEN EXCLUDED.last_contacted ELSE agents.last_contacted END,
        follow_up_at = CASE WHEN EXCLUDED.follow_up_at IS NOT NULL THEN EXCLUDED.follow_up_at ELSE agents.follow_up_at END,
        texts_sent = CASE WHEN EXCLUDED.texts_sent IS NOT NULL THEN EXCLUDED.texts_sent ELSE agents.texts_sent END,
        emails_sent = CASE WHEN EXCLUDED.emails_sent IS NOT NULL THEN EXCLUDED.emails_sent ELSE agents.emails_sent END,
        follow_up_priority = CASE WHEN EXCLUDED.follow_up_priority IS NOT NULL THEN EXCLUDED.follow_up_priority ELSE agents.follow_up_priority END,
        crm_data = CASE WHEN EXCLUDED.crm_data IS NOT NULL THEN EXCLUDED.crm_data ELSE agents.crm_data END,
        updated_at = NOW(),
        last_scraped_at = NOW()
      RETURNING *
    `;

    const values = [
      agentData.agent_id,
      agentData.name,
      agentData.title,
      agentData.company,
      agentData.phone,
      agentData.email,
      agentData.address,
      agentData.website,
      agentData.bio,
      agentData.specializations,
      agentData.languages,
      agentData.experience_years,
      agentData.license_number,
      agentData.license_state,
      agentData.profile_image_url,
      agentData.realtor_url,
      JSON.stringify(agentData.social_media),
      JSON.stringify(agentData.ratings),
      agentData.certifications,
      agentData.service_areas,
      // CRM fields
      agentData.crm_notes || '',
      agentData.crm_status || 'New',
      agentData.last_contacted,
      agentData.follow_up_at,
      agentData.texts_sent || 0,
      agentData.emails_sent || 0,
      agentData.follow_up_priority || 'normal',
      JSON.stringify(agentData.crm_data || {})
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async insertProperty(agentId, propertyData) {
    const query = `
      INSERT INTO properties (
        agent_id, property_id, address, city, state, zip_code,
        price, price_formatted, bedrooms, bathrooms, square_feet,
        lot_size, property_type, listing_status, listing_date,
        days_on_market, mls_number, description, features,
        image_urls, property_url, coordinates
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      ON CONFLICT (agent_id, property_id)
      DO UPDATE SET
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        price = EXCLUDED.price,
        price_formatted = EXCLUDED.price_formatted,
        bedrooms = EXCLUDED.bedrooms,
        bathrooms = EXCLUDED.bathrooms,
        square_feet = EXCLUDED.square_feet,
        lot_size = EXCLUDED.lot_size,
        property_type = EXCLUDED.property_type,
        listing_status = EXCLUDED.listing_status,
        listing_date = EXCLUDED.listing_date,
        days_on_market = EXCLUDED.days_on_market,
        mls_number = EXCLUDED.mls_number,
        description = EXCLUDED.description,
        features = EXCLUDED.features,
        image_urls = EXCLUDED.image_urls,
        property_url = EXCLUDED.property_url,
        coordinates = EXCLUDED.coordinates,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      agentId,
      propertyData.property_id,
      propertyData.address,
      propertyData.city,
      propertyData.state,
      propertyData.zip_code,
      propertyData.price,
      propertyData.price_formatted,
      propertyData.bedrooms,
      propertyData.bathrooms,
      propertyData.square_feet,
      propertyData.lot_size,
      propertyData.property_type,
      propertyData.listing_status,
      propertyData.listing_date,
      propertyData.days_on_market,
      propertyData.mls_number,
      propertyData.description,
      propertyData.features,
      propertyData.image_urls,
      propertyData.property_url,
      JSON.stringify(propertyData.coordinates)
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async logExtraction(logData) {
    const query = `
      INSERT INTO extraction_logs (
        url, page_type, extraction_status, agent_id, properties_found,
        error_message, extraction_data, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      logData.url,
      logData.page_type,
      logData.extraction_status,
      logData.agent_id,
      logData.properties_found,
      logData.error_message,
      JSON.stringify(logData.extraction_data),
      logData.user_agent,
      logData.ip_address
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Utility function to extract agent ID from Realtor.com URL
  extractAgentIdFromUrl(url) {
    const match = url.match(/realestateagents\/([a-f0-9]+)/i);
    return match ? match[1] : null;
  }

  // Get statistics
  async getStats() {
    const queries = {
      totalAgents: 'SELECT COUNT(*) as count FROM agents',
      totalProperties: 'SELECT COUNT(*) as count FROM properties',
      totalExtractions: 'SELECT COUNT(*) as count FROM extraction_logs',
      recentExtractions: 'SELECT COUNT(*) as count FROM extraction_logs WHERE created_at > NOW() - INTERVAL \'24 hours\'',
      avgPropertiesPerAgent: 'SELECT AVG(property_count) as avg FROM (SELECT COUNT(*) as property_count FROM properties GROUP BY agent_id) as counts'
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await this.query(query);
        results[key] = result.rows[0].count || result.rows[0].avg || 0;
      } catch (error) {
        logger.error(`Error getting ${key}:`, error);
        results[key] = 0;
      }
    }

    return results;
  }

  async insertRecommendations(agentId, recommendations) {
    if (!recommendations || !Array.isArray(recommendations)) {
      logger.warn('No recommendations to insert');
      return 0;
    }

    let insertedCount = 0;
    for (const rec of recommendations) {
      // Skip invalid recommendations (filter out navigation elements)
      if (!rec.text || rec.text.length < 20 || 
          rec.text.includes('Rating (high to low)') || 
          rec.text.includes('Buyer reviews Seller reviews') ||
          rec.text.includes('Add a testimonial')) {
        continue;
      }

      try {
        const query = `
          INSERT INTO recommendations (agent_id, text, author, date_text, source, extraction_method)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `;
        
        await this.query(query, [
          agentId,
          rec.text.trim(),
          rec.author || 'Client',
          rec.date || null,
          rec.source || 'structured',
          'chrome_extension'
        ]);
        
        insertedCount++;
      } catch (error) {
        logger.error('Error inserting recommendation:', error);
      }
    }

    logger.info(`Inserted ${insertedCount} recommendations for agent ${agentId}`);
    return insertedCount;
  }

  async close() {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

module.exports = new Database();
