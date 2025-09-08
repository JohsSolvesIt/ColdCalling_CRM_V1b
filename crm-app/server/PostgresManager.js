const { Pool } = require('pg');

class PostgresManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect(config = {}) {
    const defaultConfig = {
      user: process.env.PG_USER || 'postgres',
      host: process.env.PG_HOST || 'localhost',
      database: process.env.PG_DATABASE || 'realtor_data',
      password: process.env.PG_PASSWORD || 'password',
      port: process.env.PG_PORT || 5432,
    };

    this.pool = new Pool({ ...defaultConfig, ...config });
    
    try {
      await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      console.log('Connected to PostgreSQL database');
      return true;
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      this.isConnected = false;
      return false;
    }
  }

  async ensureSchema() {
    if (!this.isConnected) {
      throw new Error('Not connected to PostgreSQL database');
    }

    try {
      // Enable UUID extension
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      // Create agents table (matching Chrome extension schema)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS agents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          agent_id VARCHAR(100) UNIQUE,
          name VARCHAR(255),
          title VARCHAR(255),
          company VARCHAR(255),
          phone VARCHAR(50),
          email VARCHAR(255),
          address TEXT,
          website VARCHAR(500),
          bio TEXT,
          specializations TEXT[],
          languages TEXT[],
          experience_years INTEGER,
          license_number VARCHAR(100),
          license_state VARCHAR(10),
          profile_image_url TEXT,
          realtor_url TEXT,
          social_media JSONB,
          ratings JSONB,
          certifications TEXT[],
          service_areas TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create properties table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS properties (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
          property_id VARCHAR(100),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(10),
          zip_code VARCHAR(20),
          price DECIMAL(12,2),
          price_formatted VARCHAR(50),
          bedrooms INTEGER,
          bathrooms DECIMAL(3,1),
          square_feet INTEGER,
          lot_size VARCHAR(50),
          property_type VARCHAR(100),
          listing_status VARCHAR(50),
          listing_date DATE,
          days_on_market INTEGER,
          mls_number VARCHAR(100),
          description TEXT,
          features TEXT[],
          image_urls TEXT[],
          property_url TEXT,
          coordinates JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(agent_id, property_id)
        )
      `);

      // Create extraction_logs table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS extraction_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          url TEXT NOT NULL,
          page_type VARCHAR(50),
          extraction_status VARCHAR(20) DEFAULT 'success',
          agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
          properties_found INTEGER DEFAULT 0,
          error_message TEXT,
          extraction_data JSONB,
          user_agent TEXT,
          ip_address INET,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create sms_templates table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS sms_templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          variables TEXT[] DEFAULT '{}',
          category VARCHAR(100) DEFAULT 'general',
          is_active BOOLEAN DEFAULT true,
          usage_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by VARCHAR(100) DEFAULT 'system'
        )
      `);

      // Create indexes
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
        CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
        CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company);
        CREATE INDEX IF NOT EXISTS idx_agents_last_scraped ON agents(last_scraped_at);
        CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
        CREATE INDEX IF NOT EXISTS idx_properties_property_id ON properties(property_id);
        CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
        CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
        CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON properties(listing_status);
        CREATE INDEX IF NOT EXISTS idx_extraction_logs_url ON extraction_logs(url);
        CREATE INDEX IF NOT EXISTS idx_extraction_logs_created_at ON extraction_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON extraction_logs(extraction_status);
        CREATE INDEX IF NOT EXISTS idx_sms_templates_name ON sms_templates(name);
        CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
        CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(is_active);
      `);

      console.log('PostgreSQL schema ensured (matching Chrome extension)');
    } catch (error) {
      console.error('Failed to ensure PostgreSQL schema:', error);
      throw error;
    }
  }

  async getAgents(limit = 1000, offset = 0) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM agents ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      console.error('Failed to get agents:', error);
      throw error;
    }
  }

  async getAgentById(id) {
    try {
      const result = await this.pool.query('SELECT * FROM agents WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get agent by ID:', error);
      throw error;
    }
  }

  async createAgent(agentData) {
    try {
      const {
        agent_id, name, title, company, phone, email, address, website, bio,
        specializations, languages, experience_years, license_number, license_state,
        profile_image_url, realtor_url, social_media, ratings, certifications, service_areas
      } = agentData;

      const result = await this.pool.query(`
        INSERT INTO agents (
          agent_id, name, title, company, phone, email, address, website, bio,
          specializations, languages, experience_years, license_number, license_state,
          profile_image_url, realtor_url, social_media, ratings, certifications, service_areas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
        agent_id, name, title, company, phone, email, address, website, bio,
        specializations, languages, experience_years, license_number, license_state,
        profile_image_url, realtor_url, social_media, ratings, certifications, service_areas
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }

  async updateAgent(id, agentData) {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // List of allowed fields for update
      const allowedFields = [
        'agent_id', 'name', 'title', 'company', 'phone', 'email', 'address', 
        'website', 'bio', 'specializations', 'languages', 'experience_years',
        'license_number', 'license_state', 'profile_image_url', 'realtor_url',
        'social_media', 'ratings', 'certifications', 'service_areas'
      ];

      Object.keys(agentData).forEach(key => {
        if (agentData[key] !== undefined && allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(agentData[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await this.pool.query(`
        UPDATE agents SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to update agent:', error);
      throw error;
    }
  }

  async deleteAgent(id) {
    try {
      const result = await this.pool.query('DELETE FROM agents WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to delete agent:', error);
      throw error;
    }
  }

  async searchAgents(searchTerm) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM agents 
        WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR office_name ILIKE $1
        ORDER BY created_at DESC
      `, [`%${searchTerm}%`]);
      
      return result.rows;
    } catch (error) {
      console.error('Failed to search agents:', error);
      throw error;
    }
  }

  async getAgentStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_agents,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_agents,
          COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as contacted_agents,
          COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as interested_agents,
          COUNT(*) FILTER (WHERE last_scraped_at < NOW() - INTERVAL '30 days') as not_interested_agents
        FROM agents
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get agent stats:', error);
      throw error;
    }
  }

  // SMS Templates methods
  async getSmsTemplates(limit = 100, offset = 0) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM sms_templates WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      console.error('Failed to get SMS templates:', error);
      throw error;
    }
  }

  async getSmsTemplate(id) {
    try {
      const result = await this.pool.query('SELECT * FROM sms_templates WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get SMS template:', error);
      throw error;
    }
  }

  async createSmsTemplate(templateData) {
    try {
      const { name, content, variables = [], category = 'general', created_by = 'system' } = templateData;
      
      const result = await this.pool.query(`
        INSERT INTO sms_templates (name, content, variables, category, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, content, variables, category, created_by]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create SMS template:', error);
      throw error;
    }
  }

  async updateSmsTemplate(id, templateData) {
    try {
      const { name, content, variables, category, is_active } = templateData;
      
      const result = await this.pool.query(`
        UPDATE sms_templates 
        SET name = COALESCE($2, name),
            content = COALESCE($3, content),
            variables = COALESCE($4, variables),
            category = COALESCE($5, category),
            is_active = COALESCE($6, is_active),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id, name, content, variables, category, is_active]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Failed to update SMS template:', error);
      throw error;
    }
  }

  async deleteSmsTemplate(id) {
    try {
      const result = await this.pool.query('DELETE FROM sms_templates WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to delete SMS template:', error);
      throw error;
    }
  }

  async incrementTemplateUsage(id) {
    try {
      const result = await this.pool.query(`
        UPDATE sms_templates 
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Failed to increment template usage:', error);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('PostgreSQL connection closed');
    }
  }
}

module.exports = PostgresManager;
