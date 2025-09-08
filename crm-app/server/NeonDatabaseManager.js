const { Pool } = require('pg');

class NeonDatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectionStatus = {
      connected: false,
      lastPing: null,
      error: null
    };
    
    // Simple cache to avoid repeated requests
    this.cache = {
      agents: new Map(),
      properties: new Map(),
      lastClearTime: Date.now()
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
  }

  async initialize() {
    console.log('🔌 Initializing Neon PostgreSQL connection...');
    try {
      // Use Neon connection string or individual params
      const connectionConfig = process.env.DATABASE_URL ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        // Removed options: '-c search_path=public' - not supported with pooled connections in Neon
      } : {
        user: process.env.DB_USER || process.env.PGUSER || 'postgres',
        host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
        database: process.env.DB_NAME || process.env.PGDATABASE || 'realtor_data',
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
        port: process.env.DB_PORT || process.env.PGPORT || 5432,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        // Neon-optimized settings
        max: 10, // Limit concurrent connections
        idleTimeoutMillis: 10000, // Shorter idle timeout for serverless
        connectionTimeoutMillis: 5000, // Longer connection timeout for cold starts
      };

      this.pool = new Pool(connectionConfig);
      
      // Test connection with retry logic for cold starts
      await this.testConnection();
      // Ensure auxiliary tables exist
      await this.ensureTables();
      console.log('✅ Neon PostgreSQL connection established');
      return { success: true, message: 'Neon PostgreSQL connected' };
    } catch (error) {
      console.error('❌ Neon PostgreSQL connection failed:', error.message);
      return { success: false, message: 'Neon PostgreSQL connection failed', error: error.message };
    }
  }

  async ensureTables() {
    if (!this.isConnected) {
      await this.testConnection();
    }
    // Create a table for per-contact website generator settings
    const ddl = `
      CREATE TABLE IF NOT EXISTS public.contact_settings (
        contact_id uuid PRIMARY KEY,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
      
      ALTER TABLE public.agents 
      ADD COLUMN IF NOT EXISTS override_profile_image BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS custom_profile_image_url TEXT;
    `;
    await this.pool.query(ddl);
  }

  async testConnection(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        this.isConnected = true;
        this.connectionStatus = {
          connected: true,
          lastPing: new Date().toISOString(),
          error: null
        };
        return true;
      } catch (error) {
        console.warn(`Connection attempt ${i + 1}/${retries} failed:`, error.message);
        if (i === retries - 1) {
          this.isConnected = false;
          this.connectionStatus = {
            connected: false,
            lastPing: new Date().toISOString(),
            error: error.message
          };
          throw error;
        }
        // Wait before retry (important for Neon cold starts)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  getCurrentDatabase() {
    return {
      name: 'Neon PostgreSQL Database',
      type: 'postgresql',
      isConnected: this.isConnected,
      lastPing: this.connectionStatus.lastPing
    };
  }

  async getAvailableDatabases() {
    return [{
      name: 'Neon PostgreSQL Database',
      type: 'postgresql',
      isConnected: this.isConnected,
      description: 'Neon serverless PostgreSQL database',
      features: ['agents', 'properties', 'extraction_logs', 'agent_stats']
    }];
  }

  async getAgents(page = 1, limit = 1000, includeStats = true, includeProperties = false) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const offset = (page - 1) * limit;
      
      let query;
      if (includeStats) {
        // Join stats with base agent fields to include URLs and profile data
        query = `
          SELECT 
            s.*, 
            a.name,
            a.company,
            a.phone,
            a.email,
            a.address,
            a.realtor_url,
            a.website,
            a.profile_image_url,
            a.ratings,
            a.created_at,
            a.updated_at
          FROM public.agent_stats s
          JOIN public.agents a ON a.id = s.id
          ORDER BY a.name
          LIMIT $1 OFFSET $2
        `;
      } else {
        // Basic agents query
        query = `
          SELECT * FROM public.agents 
          ORDER BY name 
          LIMIT $1 OFFSET $2
        `;
      }
      
      const result = await this.pool.query(query, [limit, offset]);
      let agents = result.rows;

      // Add properties if requested
      if (includeProperties) {
        for (const agent of agents) {
          try {
            const properties = await this.getPropertiesForAgent(agent.id);
            agent.properties = properties;
            agent.property_count = properties.length;
          } catch (error) {
            console.warn(`Could not fetch properties for agent ${agent.id}:`, error.message);
            agent.properties = [];
            agent.property_count = 0;
          }
        }
      }

      return agents;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  async getAgentById(agentId) {
    if (!this.isConnected) {
      await this.testConnection();
    }
    const { rows } = await this.pool.query('SELECT * FROM public.agents WHERE id = $1', [agentId]);
    if (rows.length === 0) throw new Error('Agent not found');
    return rows[0];
  }

  async getRecommendationsForAgent(agentId) {
    if (!this.isConnected) {
      await this.testConnection();
    }
    const { rows } = await this.pool.query(
      'SELECT id, text, author, date_text, source, extraction_method, created_at FROM public.recommendations WHERE agent_id = $1 ORDER BY created_at DESC',
      [agentId]
    );
    return rows;
  }

  async createRecommendation(agentId, data) {
    if (!this.isConnected) {
      await this.testConnection();
    }
    try {
      const { text, author, date_text, source, extraction_method } = data;
      const q = `
        INSERT INTO public.recommendations (agent_id, text, author, date_text, source, extraction_method)
        VALUES ($1, $2, $3, $4, COALESCE($5, 'manual'), $6)
        RETURNING id, agent_id, text, author, date_text, source, extraction_method, created_at;
      `;
      const { rows } = await this.pool.query(q, [agentId, text, author || 'Anonymous', date_text || null, source || 'manual', extraction_method || null]);
      return rows[0];
    } catch (error) {
      console.error('Error creating recommendation:', error);
      throw error;
    }
  }

  async updateRecommendation(recId, data) {
    if (!this.isConnected) {
      await this.testConnection();
    }
    try {
      const allowed = ['text', 'author', 'date_text', 'source', 'extraction_method'];
      const cleaned = {};
      for (const k of allowed) {
        if (data[k] !== undefined) cleaned[k] = data[k];
      }
      if (Object.keys(cleaned).length === 0) {
        throw new Error('No valid recommendation fields to update');
      }
      const sets = [];
      const values = [recId];
      let i = 2;
      for (const [k, v] of Object.entries(cleaned)) {
        sets.push(`${k} = $${i++}`);
        values.push(v);
      }
      const q = `
        UPDATE public.recommendations
        SET ${sets.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, agent_id, text, author, date_text, source, extraction_method, created_at, updated_at;
      `;
      const { rows } = await this.pool.query(q, values);
      if (rows.length === 0) {
        const err = new Error('Recommendation not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return rows[0];
    } catch (error) {
      console.error(`Error updating recommendation ${recId}:`, error);
      throw error;
    }
  }

  async deleteRecommendation(recId) {
    if (!this.isConnected) {
      await this.testConnection();
    }
    try {
      const { rowCount } = await this.pool.query('DELETE FROM public.recommendations WHERE id = $1', [recId]);
      if (rowCount === 0) {
        const err = new Error('Recommendation not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return { success: true };
    } catch (error) {
      console.error(`Error deleting recommendation ${recId}:`, error);
      throw error;
    }
  }

  async searchAgents(searchTerm, page = 1, limit = 100) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const offset = (page - 1) * limit;
      const query = `
        SELECT * FROM public.agent_stats 
        WHERE name ILIKE $1 OR company ILIKE $1 OR email ILIKE $1
        ORDER BY name 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.pool.query(query, [`%${searchTerm}%`, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error searching agents:', error);
      throw error;
    }
  }

  async getPropertiesForAgent(agentId) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const query = 'SELECT * FROM public.properties WHERE agent_id = $1 ORDER BY created_at DESC';
      const result = await this.pool.query(query, [agentId]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching properties for agent ${agentId}:`, error);
      throw error;
    }
  }

  async createProperty(propertyData) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const fields = [
        'agent_id','address','city','state','zip_code','price','price_formatted','bedrooms','bathrooms','square_feet','lot_size','property_type','listing_status','listing_date','days_on_market','mls_number','description','features','image_urls','property_url','coordinates'
      ];
      const values = [];
      const placeholders = [];
      let idx = 1;
      for (const f of fields) {
        if (propertyData[f] !== undefined) {
          placeholders.push(`$${idx++}`);
          if (f === 'coordinates') {
            values.push(JSON.stringify(propertyData[f])); // JSONB column
          } else {
            // For TEXT[] columns (features, image_urls) pg will handle JS arrays
            values.push(propertyData[f]);
          }
        } else {
          placeholders.push('DEFAULT');
        }
      }

      const query = `
        INSERT INTO public.properties (
          agent_id,address,city,state,zip_code,price,price_formatted,bedrooms,bathrooms,square_feet,lot_size,property_type,listing_status,listing_date,days_on_market,mls_number,description,features,image_urls,property_url,coordinates
        ) VALUES (${placeholders.join(',')})
        RETURNING *;
      `;
      const { rows } = await this.pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  async updateProperty(propertyId, updateData) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const allowed = [
        'address','city','state','zip_code','price','price_formatted','bedrooms','bathrooms','square_feet','lot_size','property_type','listing_status','listing_date','days_on_market','mls_number','description','features','image_urls','property_url','coordinates'
      ];
      const cleaned = {};
      for (const k of allowed) {
        if (updateData[k] !== undefined) cleaned[k] = updateData[k];
      }
      if (Object.keys(cleaned).length === 0) {
        throw new Error('No valid property fields to update');
      }
      const sets = [];
      const values = [propertyId];
      let i = 2;
      for (const [k, v] of Object.entries(cleaned)) {
        if (k === 'coordinates') {
          sets.push(`${k} = $${i++}::jsonb`);
          values.push(JSON.stringify(v));
        } else {
          // For TEXT[] columns (features, image_urls), and other scalars
          sets.push(`${k} = $${i++}`);
          values.push(v);
        }
      }
      const query = `
        UPDATE public.properties
        SET ${sets.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      const { rows } = await this.pool.query(query, values);
      if (rows.length === 0) {
        const err = new Error('Property not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return rows[0];
    } catch (error) {
      console.error(`Error updating property ${propertyId}:`, error);
      throw error;
    }
  }

  async deleteProperty(propertyId) {
    if (!this.isConnected) {
      await this.testConnection();
    }
    try {
      const { rowCount } = await this.pool.query('DELETE FROM public.properties WHERE id = $1', [propertyId]);
      if (rowCount === 0) {
        const err = new Error('Property not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return { success: true };
    } catch (error) {
      console.error(`Error deleting property ${propertyId}:`, error);
      throw error;
    }
  }

  async updateAgent(agentId, updateData) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      // Filter out undefined values and invalid keys
      const cleanedData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== null && key && typeof key === 'string') {
          cleanedData[key] = updateData[key];
        }
      });

      if (Object.keys(cleanedData).length === 0) {
        throw new Error('No valid fields to update');
      }

      const setClause = Object.keys(cleanedData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE public.agents 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1 
        RETURNING *
      `;
      
      const values = [agentId, ...Object.values(cleanedData)];
      console.log('Update query:', query);
      console.log('Update values:', values);
      
      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Agent not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating agent ${agentId}:`, error);
      throw error;
    }
  }

  // Contact-specific settings helpers
  async getContactSettings(contactId) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const q = 'SELECT settings FROM public.contact_settings WHERE contact_id = $1';
      const { rows } = await this.pool.query(q, [contactId]);
      return rows[0]?.settings || {};
    } catch (error) {
      console.error(`Error fetching settings for contact ${contactId}:`, error);
      throw error;
    }
  }

  async saveContactSettings(contactId, settings) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const q = `
        INSERT INTO public.contact_settings (contact_id, settings)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (contact_id)
        DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
        RETURNING settings;
      `;
      const { rows } = await this.pool.query(q, [contactId, JSON.stringify(settings || {})]);
      return rows[0]?.settings || {};
    } catch (error) {
      console.error(`Error saving settings for contact ${contactId}:`, error);
      throw error;
    }
  }

  async clearContactSettings(contactId) {
    if (!this.isConnected) {
      await this.testConnection();
    }
    try {
      await this.pool.query('DELETE FROM public.contact_settings WHERE contact_id = $1', [contactId]);
      return { success: true };
    } catch (error) {
      console.error(`Error clearing settings for contact ${contactId}:`, error);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Neon PostgreSQL connection pool closed');
    }
  }
}

module.exports = NeonDatabaseManager;
