require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const SMSService = require('./smsService');
const EmailService = require('./emailService');
const UnifiedDatabaseManager = require('./UnifiedDatabaseManager');
const { generateVvebJSWebsite, generateModularWebsite, getAvailableLayouts, getAvailableThemes } = require('../../modular-website-system/integration');
const DataTransformationMiddleware = require('./data-transformation-middleware');

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  ENABLE_PROPERTY_FETCHING: process.env.ENABLE_PROPERTY_FETCHING !== 'false', // Can be disabled via env var
  MAX_AGENTS_FOR_IMAGES: parseInt(process.env.MAX_AGENTS_FOR_IMAGES) || 15, // Reduced default
  AGENT_REQUEST_DELAY: parseInt(process.env.AGENT_REQUEST_DELAY) || 1500, // 1.5s between requests
  PROPERTY_SCANNING_ENABLED: false // Disabled by default to prevent rate limiting
};

console.log('🔧 Rate limiting configuration:', RATE_LIMIT_CONFIG);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize data transformation middleware
const dataTransformer = new DataTransformationMiddleware();

// Middleware
app.use(cors());
// Increase JSON body size limit to reduce likelihood of request aborts on large bios/notes
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Apply data transformation middleware to relevant routes
app.use('/api/agents', dataTransformer.createExpressMiddleware());
app.use('/api/batch', dataTransformer.createExpressMiddleware());

// Storage for file uploads (not used with Chrome Extension but kept for compatibility)
const upload = multer({ dest: 'uploads/' });

const unifiedDbManager = new UnifiedDatabaseManager();
const smsService = new SMSService(unifiedDbManager);
const emailService = new EmailService();

// Initialize the unified database manager
unifiedDbManager.initialize().then(async (status) => {
  console.log('Database initialization status:', status);
  
  // Set database manager on SMS service and initialize templates
  smsService.setDatabaseManager(unifiedDbManager);
  
  // Initialize default SMS templates
  try {
    await smsService.initializeDefaultTemplates();
  } catch (error) {
    console.error('Failed to initialize SMS templates:', error);
  }
}).catch(err => {
  console.error('Database initialization error:', err);
});

// Utility: normalize and strictly sanitize agent update payloads before forwarding
const buildSanitizedAgentUpdate = (raw) => {
  if (!raw || typeof raw !== 'object') return {};

  // Fields that are safe to forward to Chrome Extension backend
  const allowedKeys = new Set([
    'name','title','company','phone','email','address','website','bio',
    'specializations','languages','experience_years','license_number','license_state',
    'profile_image_url','social_media','ratings','reviews','certifications','service_areas',
    'crm_notes','crm_status','last_contacted','follow_up_at','texts_sent','emails_sent','follow_up_priority','crm_data',
    'tags','override_profile_image','overrideProfileImage','custom_profile_image_url','customProfileImageUrl',
    'Status','Notes','LastContacted','FollowUpAt','TextsSent','EmailsSent','FollowUpPriority',
    'description','agent_id','realtor_url'
  ]);

  // Fields to explicitly drop if present
  const dropKeys = new Set([
    'properties','property_details','property_summary','price_range','available_photos',
    'profile_image', 'total_properties','avg_property_price','min_property_price','max_property_price','cities_served',
    'source','_dbType','_dbName','created_at','updated_at','last_scraped_at','property_count'
  ]);

  // Start by mapping known CRM keys to backend keys
  const mapped = {
    name: raw.name,
    title: raw.title,
    company: raw.company,
    phone: raw.phone,
    email: raw.email,
    address: raw.address,
    website: raw.website,
    bio: raw.description ?? raw.bio,
    experience_years: raw.experience_years,
    license_number: raw.license ?? raw.license_number,
    license_state: raw.state ?? raw.license_state,
    // CRM fields
    crm_notes: raw.Notes ?? raw.crm_notes,
    crm_status: raw.Status ?? raw.crm_status,
    last_contacted: raw.LastContacted ?? raw.last_contacted,
    follow_up_at: raw.FollowUpAt ?? raw.follow_up_at,
    texts_sent: raw.TextsSent ?? raw.texts_sent,
    emails_sent: raw.EmailsSent ?? raw.emails_sent,
    follow_up_priority: raw.FollowUpPriority ?? raw.follow_up_priority,
    crm_data: raw.crm_data,
    tags: raw.tags,
    // Images and misc
    override_profile_image: raw.overrideProfileImage ?? raw.override_profile_image,
    custom_profile_image_url: raw.customProfileImageUrl ?? raw.custom_profile_image_url,
    realtor_url: raw.realtor_url,
    agent_id: raw.agent_id,
    description: raw.description,
    // Pass-throughs that may be valid JSON
    social_media: raw.social_media,
    ratings: raw.ratings,
    specializations: raw.specializations,
    languages: raw.languages,
    certifications: raw.certifications,
    service_areas: raw.service_areas,
    profile_image_url: raw.profile_image_url
  };

  // Merge in any keys from raw that are explicitly allowed
  Object.keys(raw).forEach((k) => {
    if (allowedKeys.has(k) && !dropKeys.has(k) && raw[k] !== undefined) {
      mapped[k] = raw[k];
    }
  });

  // Type coercions and null normalizations
  const toNumber = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
  const toNullIfEmpty = (v) => (v === '' ? null : v);

  if (mapped.texts_sent !== undefined) mapped.texts_sent = toNumber(mapped.texts_sent);
  if (mapped.emails_sent !== undefined) mapped.emails_sent = toNumber(mapped.emails_sent);
  if (mapped.experience_years !== undefined) mapped.experience_years = toNumber(mapped.experience_years);
  if (mapped.last_contacted !== undefined) mapped.last_contacted = toNullIfEmpty(mapped.last_contacted);
  if (mapped.follow_up_at !== undefined) mapped.follow_up_at = toNullIfEmpty(mapped.follow_up_at);

  // Remove any disallowed keys or undefined values
  Object.keys(mapped).forEach((key) => {
    const val = mapped[key];
    if (!allowedKeys.has(key) || val === undefined) {
      delete mapped[key];
    }
  });

  // Guard against accidentally sending huge payloads: drop any strings > 20k chars
  Object.keys(mapped).forEach((key) => {
    const val = mapped[key];
    if (typeof val === 'string' && val.length > 20000) {
      delete mapped[key];
    }
  });

  // Only keep known JSON objects for structured fields; drop unexpected nested objects/arrays
  const jsonAllowed = new Set(['crm_data','ratings','social_media','service_areas','specializations','languages','certifications']);
  Object.keys(mapped).forEach((key) => {
    const val = mapped[key];
    if (val && typeof val === 'object') {
      const isArray = Array.isArray(val);
      if (!jsonAllowed.has(key)) {
        delete mapped[key];
      } else if (isArray && ['service_areas','specializations','languages','certifications'].includes(key)) {
        // keep arrays for these keys
      } else if (!isArray && (key === 'social_media' || key === 'ratings' || key === 'crm_data')) {
        // keep plain objects
      } else {
        delete mapped[key];
      }
    }
  });

  // Drop legacy alias fields after mapping to canonical fields to avoid confusing CE backend
  const legacyAliases = [
    'Notes','Status','LastContacted','FollowUpAt','TextsSent','EmailsSent','FollowUpPriority',
    'overrideProfileImage','customProfileImageUrl'
  ];
  legacyAliases.forEach(k => { if (k in mapped) delete mapped[k]; });

  return mapped;
};

// Routes
app.get('/api/databases', async (req, res) => {
  try {
    const databases = await unifiedDbManager.getAvailableDatabases();
    const current = unifiedDbManager.getCurrentDatabase();
    
    // Auto-connect to Chrome Extension if possible
    if (!current.isConnected) {
      await unifiedDbManager.testChromeExtensionConnection();
    }
    
    const updatedCurrent = unifiedDbManager.getCurrentDatabase();
    
    res.json({
      databases: databases,
      current: updatedCurrent.isConnected ? updatedCurrent : null,
      chrome_extension: databases,
      sqlite: [] // No SQLite databases in this setup
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/database/switch', async (req, res) => {
  try {
    const { name, type = 'chrome_extension' } = req.body;
    
    // Only Chrome Extension is supported now
    await unifiedDbManager.switchToChromeExtension();
    
    res.json({ success: true, database: 'Chrome Extension Realtor Database', type: 'chrome_extension' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/database/create', async (req, res) => {
  try {
    res.status(400).json({ error: 'Creating new databases is not supported with Chrome Extension data source' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/database/rename', async (req, res) => {
  try {
    res.status(400).json({ error: 'Renaming databases is not supported with Chrome Extension data source' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/database/delete', async (req, res) => {
  try {
    res.status(400).json({ error: 'Deleting databases is not supported with Chrome Extension data source' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced contacts endpoint that gets ALL data from Chrome Extension
app.get('/api/contacts', async (req, res) => {
  try {
    // Default includeProperties to 'false' to prevent rate limiting issues
  const { page = 1, limit = 1000, search = '', includeStats = 'true', includeProperties = 'false' } = req.query;
    const currentDb = unifiedDbManager.getCurrentDatabase();
    
    if (!currentDb.isConnected) {
      return res.status(400).json({ error: 'Chrome Extension API not connected' });
    }

    let contacts;
    if (search && search.trim()) {
      // Use search functionality to get filtered results
      contacts = await unifiedDbManager.searchAgents(search.trim(), parseInt(page), parseInt(limit));
      
      // Add properties if requested
      if (includeProperties === 'true') {
        console.log(`🔍 Fetching properties for ${contacts.length} search results with rate limiting...`);
        for (let i = 0; i < contacts.length; i++) {
          const contact = contacts[i];
          try {
            // Add delay between requests to prevent 429 errors (rate limiting)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between requests
            }
            
            const properties = await unifiedDbManager.getPropertiesForAgent(contact.id);
            contact.properties = properties;
            contact.property_count = properties.length;
            contact.property_details = properties; // For compatibility
          } catch (error) {
            console.warn(`Could not fetch properties for contact ${contact.id}:`, error.message);
            contact.properties = [];
            contact.property_count = 0;
            contact.property_details = [];
          }
        }
        console.log(`✅ Completed fetching properties for ${contacts.length} search results`);
      }
    } else {
      // Get all agents with complete data (properties only if requested)
      contacts = await unifiedDbManager.getAgents(
        parseInt(page), 
        parseInt(limit), 
        includeStats === 'true',
        includeProperties === 'true'
      );
    }
    
    // Transform to CRM contact format but preserve ALL Chrome Extension data
    const transformedContacts = contacts.map(agent => {
      return {
        // Standard CRM fields
        id: agent.id,
        name: agent.name || 'Unknown',
        company: agent.company || '',
        phone: agent.phone || '',
        email: agent.email || '',
        address: agent.address || '',
        city: unifiedDbManager.extractCityFromServiceAreas(agent.service_areas),
        state: agent.license_state || '',
        zip_code: '',
        license: agent.license_number || '',
        url: agent.realtor_url || '',
        description: agent.bio || '',
        office_address: agent.address || '',
        office_phone: agent.phone || '',
        website: agent.website || '',
        
        // Enhanced Chrome Extension fields
        agent_id: agent.agent_id,
        title: agent.title,
        experience_years: agent.experience_years,
        specializations: agent.specializations || [],
        languages: agent.languages || [],
        certifications: agent.certifications || [],
        service_areas: agent.service_areas || [],
        social_media: agent.social_media || {},
        ratings: agent.ratings || {},
        profile_image_url: agent.profile_image_url,
        profile_image: agent.profile_image,
        available_photos: agent.available_photos || [],
        
        // Profile override fields
        override_profile_image: agent.override_profile_image || false,
        custom_profile_image_url: agent.custom_profile_image_url || '',
        
        // CRM integration fields
        crm_notes: agent.crm_notes || '',
        crm_status: agent.crm_status || 'New',
        last_contacted: agent.last_contacted,
        follow_up_at: agent.follow_up_at,
        texts_sent: agent.texts_sent || 0,
        emails_sent: agent.emails_sent || 0,
        follow_up_priority: agent.follow_up_priority,
        crm_data: agent.crm_data || {},
        
        // User-defined tags for categorization
        tags: agent.tags || '',
        
        // Property statistics
        total_properties: agent.total_properties || 0,
        avg_property_price: agent.avg_property_price || 0,
        min_property_price: agent.min_property_price || 0,
        max_property_price: agent.max_property_price || 0,
        cities_served: agent.cities_served || 0,
        
        // Individual properties data
        properties: agent.properties || [],
        property_details: agent.property_details || agent.properties || [],
        property_count: (agent.properties || []).length,
        
        // Property summary fields for table display
        property_summary: agent.properties ? 
          `${agent.properties.length} properties (${agent.properties.filter(p => p.listing_status === 'Active').length} active)` : 
          `${agent.total_properties || 0} properties`,
        price_range: agent.properties && agent.properties.length > 0 ? 
          `$${Math.min(...agent.properties.map(p => p.price || 0)).toLocaleString()} - $${Math.max(...agent.properties.map(p => p.price || 0)).toLocaleString()}` :
          agent.avg_property_price ? `Avg: $${parseFloat(agent.avg_property_price).toLocaleString()}` : 'N/A',
        
        // Legacy CRM workflow fields (for compatibility)
        Notes: agent.crm_notes || agent.notes || '',
        Status: agent.crm_status || agent.status || 'New',
        LastContacted: agent.last_contacted,
        FollowUpAt: agent.follow_up_at,
        
        // Timestamps
        created_at: agent.created_at,
        updated_at: agent.updated_at,
        last_scraped_at: agent.last_scraped_at,
        
        // Metadata
        source: 'chrome_extension',
        _dbType: 'chrome_extension',
        _dbName: 'Chrome Extension Realtor Database'
      };
    });
    
    res.json(transformedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced contacts endpoint with ALL available fields
app.get('/api/contacts/detailed', async (req, res) => {
  try {
    const { page = 1, limit = 1000, search = '' } = req.query;
    const currentDb = unifiedDbManager.getCurrentDatabase();
    
    if (!currentDb.isConnected) {
      return res.status(400).json({ error: 'Chrome Extension API not connected' });
    }

    let agents;
    if (search && search.trim()) {
      agents = await unifiedDbManager.searchAgents(search.trim(), parseInt(page), parseInt(limit));
    } else {
      agents = await unifiedDbManager.getAgents(parseInt(page), parseInt(limit), true);
    }
    
    // Return complete agent data with ALL fields
    res.json({
      success: true,
      agents: agents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: agents.length
      },
      metadata: {
        source: 'chrome_extension',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching detailed contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Properties endpoint to access ALL property data
app.get('/api/properties', async (req, res) => {
  try {
    const { agentId = null, page = 1, limit = 1000 } = req.query;
    const currentDb = unifiedDbManager.getCurrentDatabase();
    
    if (!currentDb.isConnected) {
      return res.status(400).json({ error: 'Chrome Extension API not connected' });
    }

    const properties = await unifiedDbManager.getProperties(agentId, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      properties: properties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: properties.length
      },
      metadata: {
        source: 'chrome_extension',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extraction logs endpoint to monitor ALL data extraction activities
app.get('/api/extraction-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const currentDb = unifiedDbManager.getCurrentDatabase();
    
    if (!currentDb.isConnected) {
      return res.status(400).json({ error: 'Chrome Extension API not connected' });
    }

    const logs = await unifiedDbManager.getExtractionLogs(parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      logs: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length
      },
      metadata: {
        source: 'chrome_extension',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching extraction logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch processing recent logs endpoint
app.get('/api/batch/recent-logs', async (req, res) => {
  try {
    // Get the most recent batch log file
    const chromeExtensionLogsDir = path.join(__dirname, '../../chromeExtensionRealtor/logs');
    
    if (!fs.existsSync(chromeExtensionLogsDir)) {
      return res.json({ lastRealtor: null });
    }
    
    const logFiles = fs.readdirSync(chromeExtensionLogsDir)
      .filter(file => file.startsWith('simple_batch_') && file.endsWith('.log'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(chromeExtensionLogsDir, a)).mtime;
        const bTime = fs.statSync(path.join(chromeExtensionLogsDir, b)).mtime;
        return bTime - aTime; // Most recent first
      });
    
    if (logFiles.length === 0) {
      return res.json({ lastRealtor: null });
    }
    
    // Read the most recent log file
    const mostRecentLog = path.join(chromeExtensionLogsDir, logFiles[0]);
    const logContent = fs.readFileSync(mostRecentLog, 'utf8');
    const lines = logContent.split('\n').reverse(); // Start from end
    
    // Look for the most recent successful extraction
    for (const line of lines) {
      if (line.includes('SUCCESS! Data extracted') || 
          line.includes('SUCCESS! Data re-extracted')) {
        const nameMatch = line.match(/SUCCESS.*?-\s*(.+)/) || 
                         line.match(/Data (?:re-)?extracted.*?-\s*(.+)/);
        if (nameMatch) {
          const realtorName = nameMatch[1].trim().replace(/"/g, '');
          const timestampMatch = line.match(/\[([^\]]+)\]/);
          return res.json({
            lastRealtor: {
              name: realtorName,
              timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
              success: true,
              url: null // We could extract this too if needed
            }
          });
        }
      }
      
      // Also check for the summary pattern
      if (line.includes('Last Realtor:')) {
        const nameMatch = line.match(/Last Realtor:\s*(.+)/);
        if (nameMatch) {
          const realtorName = nameMatch[1].trim().replace(/"/g, '');
          return res.json({
            lastRealtor: {
              name: realtorName,
              timestamp: new Date().toISOString(),
              success: true,
              url: null
            }
          });
        }
      }
    }
    
    res.json({ lastRealtor: null });
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    res.json({ lastRealtor: null });
  }
});

// Comprehensive statistics endpoint accessing ALL data stores
app.get('/api/statistics/comprehensive', async (req, res) => {
  try {
    const currentDb = unifiedDbManager.getCurrentDatabase();
    
    if (!currentDb.isConnected) {
      return res.status(400).json({ error: 'Chrome Extension API not connected' });
    }

    const stats = await unifiedDbManager.getComprehensiveStats();
    
    res.json({
      success: true,
      statistics: stats,
      metadata: {
        source: 'chrome_extension',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Total realtor count across ALL data stores
app.get('/api/realtors/count', async (req, res) => {
  try {
    const count = await unifiedDbManager.getTotalRealtorCount();
    
    res.json({
      success: true,
      count: count,
      source: 'chrome_extension',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching realtor count:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    res.status(400).json({ error: 'Creating contacts is not supported with Chrome Extension data source. Contacts are managed through the browser extension.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contacts', async (req, res) => {
  try {
    const contact = req.body;
    
  console.log(`Saving contact (raw keys):`, Object.keys(contact || {}));
    
    // Check if this is an update (has ID) or new contact
    if (contact.id) {
      const merged = buildSanitizedAgentUpdate(contact);
      if (!merged || Object.keys(merged).length === 0) {
        console.warn('No valid updatable fields after sanitization (PUT /api/contacts)');
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update',
          hint: 'Only specific fields are updatable (e.g., name, phone, email, crm_notes, crm_status, tags, etc.)'
        });
      }
  console.log('🧹 Filtered agentData (PUT /api/contacts):', Object.keys(merged));
      
      const updatedAgent = await unifiedDbManager.updateAgent(contact.id, merged);
      // Include legacy CRM aliases to keep UI fields (e.g., Notes) populated after save
      const crmAgent = {
        ...updatedAgent,
        Notes: updatedAgent.crm_notes || '',
        Status: updatedAgent.crm_status || 'New',
        LastContacted: updatedAgent.last_contacted || null,
        FollowUpAt: updatedAgent.follow_up_at || null,
        TextsSent: updatedAgent.texts_sent || 0,
        EmailsSent: updatedAgent.emails_sent || 0,
        FollowUpPriority: updatedAgent.follow_up_priority || null
      };
      
      res.json({ 
        success: true, 
        agent: crmAgent,
        message: 'Contact updated successfully'
      });
    } else {
      // Creating new contacts is not supported
      res.status(400).json({ 
        error: 'Creating new contacts is not supported with Chrome Extension data source.',
        message: 'Contacts are managed through the browser extension.'
      });
    }
  } catch (error) {
  const status = error?.code === 'CE_UNAVAILABLE' ? 503 : (error?.response?.status || 500);
  const payload = error?.response?.data || { error: error.message };
  if (error?.code === 'ECONNREFUSED') {
    payload.error = 'Chrome Extension API connection refused (localhost:5001)';
  }
  if (payload?.error && /socket hang up/i.test(payload.error)) {
    payload.hint = 'Upstream service aborted connection. Try again shortly or check CE backend logs.';
  }
  console.error('Error saving contact:', payload);
    res.status(status).json(payload);
  }
});

// Get individual contact by ID
app.get('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Getting contact with ID: ${id}`);
    
    const agent = await unifiedDbManager.getAgentById(id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Error getting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
  console.log(`Updating contact ${id} with data keys:`, Object.keys(updateData || {}));
    const merged = buildSanitizedAgentUpdate(updateData);
    if (!merged || Object.keys(merged).length === 0) {
      console.warn(`No valid updatable fields after sanitization for ${id} (PUT /api/contacts/:id)`);
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        hint: 'Only specific fields are updatable (e.g., name, phone, email, crm_notes, crm_status, tags, etc.)'
      });
    }
  console.log(`Final filtered agentData keys:`, Object.keys(merged));
    
    const updatedAgent = await unifiedDbManager.updateAgent(id, merged);
    // Include legacy CRM aliases to keep UI fields (e.g., Notes) populated after save
    const crmAgent = {
      ...updatedAgent,
      Notes: updatedAgent.crm_notes || '',
      Status: updatedAgent.crm_status || 'New',
      LastContacted: updatedAgent.last_contacted || null,
      FollowUpAt: updatedAgent.follow_up_at || null,
      TextsSent: updatedAgent.texts_sent || 0,
      EmailsSent: updatedAgent.emails_sent || 0,
      FollowUpPriority: updatedAgent.follow_up_priority || null
    };
    
    console.log(`Agent updated successfully:`, crmAgent);
    
    res.json({ 
      success: true, 
      agent: crmAgent,
      message: 'Contact updated successfully'
    });
  } catch (error) {
  const status = error?.code === 'CE_UNAVAILABLE' ? 503 : (error?.response?.status || 500);
  const payload = error?.response?.data || { error: error.message };
  if (error?.code === 'ECONNREFUSED') {
    payload.error = 'Chrome Extension API connection refused (localhost:5001)';
  }
  if (payload?.error && /socket hang up/i.test(payload.error)) {
    payload.hint = 'Upstream service aborted connection. Try again shortly or check CE backend logs.';
  }
  console.error('Error updating contact:', payload);
  res.status(status).json(payload);
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Deleting contact with ID: ${id}`);
    
    const result = await unifiedDbManager.deleteAgent(id);
    
    res.json({
      success: true,
      message: 'Contact deleted successfully',
      deleted: result
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts/move', async (req, res) => {
  try {
    res.status(400).json({ error: 'Moving contacts between databases is not supported with Chrome Extension data source' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database-specific contact endpoints are no longer supported
app.get('/api/databases/:dbName/contacts', async (req, res) => {
  try {
    res.status(400).json({ error: 'Database-specific endpoints are not supported with Chrome Extension data source' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/databases/:dbName/contacts', async (req, res) => {
  try {
    res.status(400).json({ error: 'Database-specific endpoints are not supported with Chrome Extension data source' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-csv', upload.single('csv'), async (req, res) => {
  try {
    res.status(400).json({ error: 'CSV import is not supported with Chrome Extension data source. Data comes from browser extension.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recommendation Management Endpoints (proxying to Chrome Extension API)
// Database server URL (Chrome Extension backend)
const DB_SERVER_URL = 'http://localhost:5001/api';

app.get('/api/recommendations/:agentId', async (req, res) => {
  try {
    const agentId = req.params.agentId;
    
    // Try to get recommendations from the database server
    const response = await axios.get(`${DB_SERVER_URL}/agents/${agentId}/recommendations`);
    
    res.json({ 
      success: true,
      recommendations: response.data.recommendations || response.data || []
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error.message);
    
    // Fallback to empty array if database server is not available
    res.json({ 
      success: true,
      recommendations: []
    });
  }
});

app.post('/api/recommendations/:agentId', async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const { text, author, date_text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false,
        error: 'Review text is required' 
      });
    }
    
    // Send to database server
    const response = await axios.post(`${DB_SERVER_URL}/agents/${agentId}/recommendations`, {
      text,
      author: author || null,
      date_text: date_text || null
    });
    
    res.json({ 
      success: true,
      recommendation: response.data.recommendation || response.data
    });
  } catch (error) {
    console.error('Error creating recommendation:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.put('/api/recommendations/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { text, author, date_text } = req.body;
    
    if (!text) {
      return res.status(400).json({ 
        success: false,
        error: 'Review text is required' 
      });
    }
    
    // Send to database server
    const response = await axios.put(`${DB_SERVER_URL}/recommendations/${reviewId}`, {
      text,
      author: author || null,
      date_text: date_text || null
    });
    
    res.json({ 
      success: true,
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Error updating recommendation:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.delete('/api/recommendations/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    // Send to database server
    const response = await axios.delete(`${DB_SERVER_URL}/recommendations/${reviewId}`);
    
    res.json({ 
      success: true,
      message: 'Review deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting recommendation:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.get('/api/headers', async (req, res) => {
  try {
    // Return ALL available headers from Chrome Extension data
    const headers = [
      // Basic fields
      'name', 'title', 'company', 'phone', 'email', 'address', 'website',
      
      // Professional fields
      'bio', 'experience_years', 'license_number', 'license_state',
      
      // Enhanced arrays
      'specializations', 'languages', 'certifications', 'service_areas',
      
      // Social and ratings
      'social_media', 'ratings', 'profile_image_url', 'realtor_url',
      
      // Property statistics
      'total_properties', 'avg_property_price', 'min_property_price', 
      'max_property_price', 'cities_served',
      
      // Timestamps
      'created_at', 'updated_at', 'last_scraped_at'
    ];
    res.json(headers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS Routes
app.get('/api/sms/devices', async (req, res) => {
  try {
    const devices = await smsService.getDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/connect', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const result = await smsService.connectDevice(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/disconnect', async (req, res) => {
  try {
    const result = await smsService.disconnectDevice();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sms/templates', async (req, res) => {
  try {
    const templates = await smsService.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/templates', async (req, res) => {
  try {
    const { template } = req.body;
    
    // Handle both old format (string) and new format (object)
    let result;
    if (typeof template === 'string') {
      // Old format: template is a string
      result = await smsService.addTemplate(template);
    } else if (typeof template === 'object' && template !== null) {
      // New format: template is an object
      result = await smsService.addTemplateObject(template);
    } else {
      // Handle direct object in body (new frontend format)
      result = await smsService.addTemplateObject(req.body);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sms/templates/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    const updateData = req.body;
    
    const result = await smsService.updateTemplateById(templateId, updateData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sms/templates/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    
    const result = await smsService.deleteTemplateById(templateId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/send', async (req, res) => {
  try {
    const { phoneNumber, message, contactData } = req.body;
    const result = await smsService.sendSMS(phoneNumber, message, contactData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/send-batch', async (req, res) => {
  try {
    const { contacts, template, options } = req.body;
    const result = await smsService.sendBatchSMS(contacts, template, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sms/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await smsService.getSmsHistory(parseInt(limit));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sms/status', async (req, res) => {
  try {
    const status = smsService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Modular Website System Routes
app.get('/api/website/layouts', async (req, res) => {
  try {
    const layouts = getAvailableLayouts();
    res.json({ 
      success: true, 
      layouts,
      default: 'professional'
    });
  } catch (error) {
    console.error('Error getting layouts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      layouts: [
        { key: 'professional', name: 'Professional', description: 'Clean professional layout' }
      ]
    });
  }
});

app.get('/api/website/themes', async (req, res) => {
  try {
    const themes = getAvailableThemes();
    res.json({ 
      success: true, 
      themes,
      default: 'modern-professional'
    });
  } catch (error) {
    console.error('Error getting themes:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      themes: [
        { key: 'modern-professional', name: 'Modern Professional', description: 'Clean modern design' }
      ]
    });
  }
});

app.get('/api/website/available-images', async (req, res) => {
  try {
    console.log('�️ EFFICIENT IMAGE SCAN: Fetching curated image collection...');
    
    const availableImages = [];
    const imageUrlSet = new Set(); // Track duplicates
    
    // Helper function to add image if it's valid and unique
    const addImage = (url, source, contactId, contactName, description, type, extra = {}) => {
      if (url && typeof url === 'string') {
        let cleanUrl = url.trim();
        
        // Handle relative URLs
        if (cleanUrl.startsWith('/')) {
          cleanUrl = `http://localhost:5000${cleanUrl}`;
        }
        
        // Validate URL format (more permissive)
        if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || 
            cleanUrl.includes('unsplash.com') || 
            cleanUrl.includes('cloudinary.com') ||
            cleanUrl.includes('amazonaws.com') ||
            cleanUrl.includes('images.') ||
            cleanUrl.includes('photos.') ||
            cleanUrl.match(/https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)/i)) {
          
          if (!imageUrlSet.has(cleanUrl)) {
            imageUrlSet.add(cleanUrl);
            availableImages.push({
              url: cleanUrl,
              source,
              contactId,
              contactName,
              description,
              type,
              uniqueId: `${source}-${type}-${Date.now()}-${availableImages.length}`,
              ...extra
            });
          }
        }
      }
    };

    // CONFIGURABLE APPROACH: Use rate limiting configuration
    console.log('🔍 Fetching agents for image gallery with rate limiting protection...');
    const agentsResponse = await unifiedDbManager.getAgents(1, RATE_LIMIT_CONFIG.MAX_AGENTS_FOR_IMAGES, true, RATE_LIMIT_CONFIG.ENABLE_PROPERTY_FETCHING);
    const agents = agentsResponse.agents || [];
    
    console.log(`🔎 Processing ${agents.length} agents with comprehensive field scanning...`);
    
    // MASSIVE agent field scanning
    agents.forEach((agent, agentIndex) => {
      const agentName = agent.name || `Contact ${agent.id || agentIndex + 1}`;
      
      // Scan EVERY possible field that could contain images
      const allPossibleImageFields = [
        'available_photos', 'profile_image_url', 'profile_image', 'profile_pic', 'avatar',
        'photo', 'image', 'picture', 'headshot', 'portrait', 'profile_photo',
        'social_image', 'linkedin_photo', 'facebook_photo', 'twitter_photo', 'instagram_photo',
        'company_logo', 'agency_logo', 'team_photo', 'office_photo', 'business_photo',
        'listing_agent_photo', 'bio_photo', 'contact_photo', 'agent_image',
        'professional_headshot', 'marketing_photo', 'signature_photo',
        'website_photo', 'banner_image', 'hero_image', 'background_image',
        'photo_gallery', 'image_gallery', 'photos', 'images', 'gallery'
      ];
      
      allPossibleImageFields.forEach(field => {
        if (agent[field]) {
          if (Array.isArray(agent[field])) {
            agent[field].forEach((photoUrl, photoIndex) => {
              addImage(photoUrl, 'contact', agent.id, agentName, 
                `${field} #${photoIndex + 1} from ${agentName}`, 'agent');
            });
          } else if (typeof agent[field] === 'string') {
            addImage(agent[field], 'contact', agent.id, agentName, 
              `${field} from ${agentName}`, 'agent');
          }
        }
      });
      
      // Scan ALL object properties for nested images
      Object.keys(agent).forEach(key => {
        if (agent[key] && typeof agent[key] === 'object' && !Array.isArray(agent[key])) {
          Object.keys(agent[key]).forEach(nestedKey => {
            if (nestedKey.toLowerCase().includes('image') || 
                nestedKey.toLowerCase().includes('photo') || 
                nestedKey.toLowerCase().includes('picture')) {
              addImage(agent[key][nestedKey], 'contact', agent.id, agentName,
                `${key}.${nestedKey} from ${agentName}`, 'agent');
            }
          });
        }
      });
      
      // Extract URLs from text fields
      Object.keys(agent).forEach(key => {
        if (typeof agent[key] === 'string' && agent[key].includes('http')) {
          const urlMatches = agent[key].match(/https?:\/\/[^\s,;]+\.(jpg|jpeg|png|gif|webp|svg)/gi);
          if (urlMatches) {
            urlMatches.forEach((url, urlIndex) => {
              addImage(url, 'contact', agent.id, agentName,
                `Extracted URL from ${key} field of ${agentName}`, 'agent');
            });
          }
        }
      });
    });

    // Initialize totalPropertiesScanned before conditional blocks
    let totalPropertiesScanned = 0;

    // CONDITIONAL PROPERTY SCANNING based on configuration
    if (RATE_LIMIT_CONFIG.PROPERTY_SCANNING_ENABLED) {
      console.log('🏠 Property scanning enabled - scanning sample property fields for images...');
      
      try {
        // Process only the first few agents for properties (ultra-conservative approach)
        for (const agent of agents.slice(0, 5)) { // Reduced to only 5 agents instead of 10
          // Get only the first few properties per agent to save time
          const properties = agent.properties ? agent.properties.slice(0, 3) : []; // Reduced to only 3 properties per agent
          
          // Rest of property scanning code would go here...
        }
      } catch (propError) {
        console.warn('⚠️ Error during property image scanning:', propError.message);
      }
    } else {
      console.log('🏠 Property scanning DISABLED to prevent rate limiting - using agent images only');
    }
    
    /*
    // PROPERTY SCANNING CODE (DISABLED BY DEFAULT TO PREVENT RATE LIMITING)
    console.log('🏠 Skipping property image scanning to prevent rate limiting...');
    console.log('✅ Image gallery built with agent images only (no property images)');
    
    // PROPERTY SCANNING DISABLED TO PREVENT RATE LIMITING
    // This section is commented out to avoid 429 errors
    try {
      // Process only the first few agents for properties (ultra-conservative approach)
      for (const agent of agents.slice(0, 5)) { // Reduced to only 5 agents instead of 10
        // Get only the first few properties per agent to save time
        const properties = agent.properties ? agent.properties.slice(0, 3) : []; // Reduced to only 3 properties per agent
        
        if (properties && Array.isArray(properties)) {
          properties.forEach((property, propIndex) => {
            totalPropertiesScanned++;
            const propertyDesc = property.address || property.title || property.description || `Property ${propIndex + 1}`;
            
            // FOCUSED property image field scanning (only most common fields)
            const propertyImageFields = [
              'image_url', 'photo_url', 'main_image', 'featured_image', 'primary_image',
              'images', 'photos', 'gallery', 'listing_photos', 'property_photos'
            ];
            
            propertyImageFields.forEach(field => {
              if (property[field]) {
                if (Array.isArray(property[field])) {
                  // Only take first 3 images from arrays to prevent overload
                  property[field].slice(0, 3).forEach((imgUrl, imgIndex) => {
                    addImage(imgUrl, 'property', agent.id, agent.name,
                      `${propertyDesc} - ${field} #${imgIndex + 1}`, 'property');
                  });
                } else if (typeof property[field] === 'string') {
                  addImage(property[field], 'property', agent.id, agent.name,
                    `${propertyDesc} - ${field}`, 'property');
                }
              }
            });
            
            // Scan ALL property object fields for nested images
            Object.keys(property).forEach(key => {
              if (property[key] && typeof property[key] === 'object' && !Array.isArray(property[key])) {
                Object.keys(property[key]).forEach(nestedKey => {
                  if (nestedKey.toLowerCase().includes('image') || 
                      nestedKey.toLowerCase().includes('photo') || 
                      nestedKey.toLowerCase().includes('picture')) {
                    addImage(property[key][nestedKey], 'property', agent.id, agent.name,
                      `${propertyDesc} - ${key}.${nestedKey}`, 'property');
                  }
                });
              }
            });
          });
        }
      }
    } catch (propError) {
      console.warn('⚠️ Error during property image scanning:', propError.message);
    }
    */

    // Add more comprehensive default project images
    const projectImages = [
      {
        url: '/images/sample-agent.jpg',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Sample Agent Photo',
        type: 'sample',
        uniqueId: 'project_sample_agent'
      },
      {
        url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Modern House - Sample',
        type: 'sample',
        uniqueId: 'project_modern_house'
      },
      {
        url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Luxury Home - Sample',
        type: 'sample',
        uniqueId: 'project_luxury_home'
      },
      {
        url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Real Estate - Sample',
        type: 'sample',
        uniqueId: 'project_real_estate'
      },
      {
        url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Contemporary Home - Sample',
        type: 'sample',
        uniqueId: 'project_contemporary'
      },
      {
        url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Beautiful House - Sample',
        type: 'sample',
        uniqueId: 'project_beautiful_house'
      },
      {
        url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Modern Kitchen - Sample',
        type: 'sample',
        uniqueId: 'project_modern_kitchen'
      },
      {
        url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        source: 'project',
        contactId: null,
        contactName: null,
        description: 'Living Room - Sample',
        type: 'sample',
        uniqueId: 'project_living_room'
      }
    ];
    
    availableImages.push(...projectImages);
    
    // Remove duplicates based on URL
    const uniqueImages = availableImages.filter((image, index, self) => 
      index === self.findIndex(i => i.url === image.url)
    );
    
    // Sort by source and type for better organization
    uniqueImages.sort((a, b) => {
      if (a.source !== b.source) {
        const sourceOrder = { 'project': 0, 'contact': 1, 'property': 2 };
        return sourceOrder[a.source] - sourceOrder[b.source];
      }
      return (a.contactName || '').localeCompare(b.contactName || '');
    });
    
    console.log(`Found ${uniqueImages.length} unique images across all sources (processed ${totalPropertiesScanned} properties)`);
    
    res.json({
      success: true,
      images: uniqueImages,
      total: uniqueImages.length,
      sources: {
        contact: uniqueImages.filter(i => i.source === 'contact').length,
        property: uniqueImages.filter(i => i.source === 'property').length,
        project: uniqueImages.filter(i => i.source === 'project').length
      },
      debug: {
        agentsProcessed: agents.length,
        propertiesProcessed: totalPropertiesScanned
      }
    });
    
  } catch (error) {
    console.error('Error fetching available images:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      images: [],
      total: 0
    });
  }
});

app.post('/api/website/generate', async (req, res) => {
  try {
    const { 
      contactId, 
      layout = 'professional', 
      theme = 'modern-professional', 
      activationBanner = false,
      heroImageSource = 'auto',
      heroImageUrl = null,
      heroOverlayOpacity = 0.4,
      heroBlur = 0,
      heroOverlayWhite = false,
      profileImageUrl = null,
      manualHeroTextColors = false,
      heroTextColor = null,
      heroTextSecondary = null,
      heroAccentColor = null
    } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Contact ID is required' 
      });
    }

    // Get contact data with reviews from Chrome Extension backend
    let agent = null;
    
    console.log(`🔍 Attempting to fetch agent data for ID: ${contactId}`);
    
    try {
      // First try to get detailed agent data with reviews from Chrome Extension backend
      const chromeExtensionUrl = `http://localhost:5001/api/agents/${contactId}`;
      console.log(`📡 Fetching from Chrome Extension: ${chromeExtensionUrl}`);
      
      const chromeExtensionResponse = await fetch(chromeExtensionUrl);
      console.log(`📡 Chrome Extension response status: ${chromeExtensionResponse.status}`);
      
      if (chromeExtensionResponse.ok) {
        const chromeData = await chromeExtensionResponse.json();
        console.log(`📡 Chrome Extension response:`, JSON.stringify(chromeData, null, 2));
        
        if (chromeData.success && chromeData.agent) {
          agent = chromeData.agent;
          console.log('✅ Got agent data with reviews from Chrome Extension backend');
          console.log(`📊 Agent has reviews:`, !!agent.reviews);
          if (agent.reviews) {
            console.log(`📊 Reviews structure:`, {
              hasIndividual: !!(agent.reviews.individual && agent.reviews.individual.length),
              individualCount: agent.reviews.individual ? agent.reviews.individual.length : 0,
              hasRecommendations: !!(agent.reviews.recommendations && agent.reviews.recommendations.length),
              recommendationsCount: agent.reviews.recommendations ? agent.reviews.recommendations.length : 0
            });
          }
        } else {
          console.log('⚠️ Chrome Extension response invalid format:', chromeData);
        }
      } else {
        console.log(`⚠️ Chrome Extension request failed with status ${chromeExtensionResponse.status}`);
      }
    } catch (error) {
      console.log('⚠️ Chrome Extension backend not available:', error.message);
    }
    
    // If Chrome Extension data not available, fall back to CRM data
    if (!agent) {
      console.log('📊 Falling back to CRM database for agent data');
      const agentsResponse = await unifiedDbManager.getAgents(1, 1000);
      const agents = agentsResponse.data || agentsResponse;
      agent = agents.find(a => a.id == contactId);
      console.log(`📊 Found agent in CRM database:`, !!agent);
    }
    
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }

    // Generate website with selected layout and theme
    const websiteHTML = generateModularWebsite(agent, { 
      layout, 
      theme, 
      activationBanner,
      heroImageSource,
      heroImageUrl,
      heroOverlayOpacity,
      heroBlur,
      heroOverlayWhite,
      profileImageUrl,
      manualHeroTextColors,
      heroTextColor,
      heroTextSecondary,
      heroAccentColor
    });
    
    // Create human-readable contact-specific directory structure
    const contactName = (agent.name || agent.email || 'unknown-agent')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    
    const contactDirName = `contact-${contactName}-${agent.id}`;
    const contactDir = path.join(__dirname, '../../vvebjs/generated-realtors/contacts', contactDirName);
    const websiteFileName = 'index.html'; // Standard web convention
    const websiteFilePath = path.join(contactDir, websiteFileName);
    const backupFilePath = path.join(contactDir, 'index.html.bak');
    
    // Ensure contact directory exists
    if (!fs.existsSync(contactDir)) {
      fs.mkdirSync(contactDir, { recursive: true });
    }
    
    // Backup existing website if it exists, then overwrite
    if (fs.existsSync(websiteFilePath)) {
      console.log(`📦 Backing up existing website to: ${backupFilePath}`);
      fs.copyFileSync(websiteFilePath, backupFilePath);
    }
    
    // Write new website (always overwrites existing)
    fs.writeFileSync(websiteFilePath, websiteHTML);
    console.log(`✅ Generated/Updated website: ${websiteFilePath}`);
    
    // Clean up any old preview files that might exist
    try {
      const files = fs.readdirSync(contactDir);
      files.forEach(file => {
        if (file.startsWith('preview-') && file.endsWith('.html')) {
          const oldPreviewPath = path.join(contactDir, file);
          fs.unlinkSync(oldPreviewPath);
          console.log(`🧹 Cleaned up old preview file: ${file}`);
        }
      });
    } catch (cleanupError) {
      console.warn('Preview cleanup warning:', cleanupError.message);
    }
    
    const websiteUrl = `/generated-realtors/contacts/${contactDirName}/${websiteFileName}`;
    
    console.log(`✅ Generated modular website: ${websiteFilePath} (Layout: ${layout}, Theme: ${theme})`);
    console.log(`🎯 VvebJS will edit: ${websiteUrl}`);
    
    res.json({
      success: true,
      message: `Website generated successfully with ${layout} layout and ${theme} theme`,
      websiteUrl,
      fileName: websiteFileName,
      filePath: websiteFilePath,
      contactDir,
      contactDirName,
      layout,
      theme
    });

  } catch (error) {
    console.error('Website generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Netlify deployment endpoint
app.post('/api/website/deploy-netlify', async (req, res) => {
  try {
    const { filePath, contactData, siteName, siteId, isUpdate } = req.body;
    
    console.log('🚀 Netlify deployment request received:', { 
      filePath, 
      siteName, 
      siteId, 
      isUpdate: !!isUpdate 
    });
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required for deployment'
      });
    }

    // Import and initialize Netlify deployer with better error handling
    let NetlifyDeployer;
    try {
      NetlifyDeployer = require('./netlify-deployer');
    } catch (importError) {
      console.error('❌ Failed to import netlify-deployer:', importError);
      return res.status(500).json({
        success: false,
        error: 'Failed to load Netlify deployer module: ' + importError.message
      });
    }

    let deployer;
    try {
      deployer = new NetlifyDeployer();
    } catch (initError) {
      console.error('❌ Failed to initialize netlify-deployer:', initError);
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize Netlify deployer: ' + initError.message
      });
    }

    let deploymentResult;

    if (isUpdate && siteId) {
      // Update existing site
      console.log(`🔄 Updating existing Netlify site: ${siteId}`);
      deploymentResult = await deployer.updateExistingSite(filePath, siteId, contactData);
    } else {
      // Create new site
      const finalSiteName = siteName || deployer.generateSiteName(contactData || {});
      console.log(`✨ Creating new Netlify site: ${finalSiteName}`);
      deploymentResult = await deployer.deployWebsite(filePath, finalSiteName, contactData);
    }

    console.log(`✅ Netlify deployment successful!`);
    console.log(`🌐 Live URL: ${deploymentResult.siteUrl}`);

    res.json({
      success: true,
      message: isUpdate ? 'Website updated on Netlify successfully' : 'Website deployed to Netlify successfully',
      deployment: {
        siteUrl: deploymentResult.siteUrl,
        deployUrl: deploymentResult.deployUrl,
        siteName: deploymentResult.siteName,
        siteId: deploymentResult.siteId,
        deployId: deploymentResult.deployId,
        adminUrl: deploymentResult.adminUrl,
        state: deploymentResult.state,
        createdAt: deploymentResult.createdAt,
        isUpdate: !!isUpdate
      }
    });

  } catch (error) {
    console.error('❌ Netlify deployment error:', error);
    
    // Check if it's a configuration error
    if (error.message.includes('access token')) {
      return res.status(400).json({
        success: false,
        error: 'Netlify access token not configured. Please add NETLIFY_ACCESS_TOKEN to your environment variables.',
        configRequired: true
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deploy to Netlify'
    });
  }
});

// Check Netlify configuration endpoint
app.get('/api/website/netlify-config', (req, res) => {
  const hasToken = !!process.env.NETLIFY_ACCESS_TOKEN;
  
  res.json({
    success: true,
    configured: hasToken,
    message: hasToken 
      ? 'Netlify is configured and ready for deployment'
      : 'Netlify access token not found. Add NETLIFY_ACCESS_TOKEN to environment variables.'
  });
});

// Check for existing website for a contact
app.get('/api/website/existing/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    
    if (!contactId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Contact ID is required' 
      });
    }

    // Get contact data to generate the filename pattern
    let agent = null;
    
    try {
      // Try Chrome Extension backend first
      const chromeExtensionUrl = `http://localhost:5001/api/agents/${contactId}`;
      const chromeExtensionResponse = await fetch(chromeExtensionUrl);
      
      if (chromeExtensionResponse.ok) {
        const chromeData = await chromeExtensionResponse.json();
        if (chromeData.success && chromeData.agent) {
          agent = chromeData.agent;
        }
      }
    } catch (error) {
      console.log('Chrome Extension backend not available for existing website check');
    }
    
    // Fall back to CRM data
    if (!agent) {
      const agentsResponse = await unifiedDbManager.getAgents(1, 1000);
      const agents = agentsResponse.data || agentsResponse;
      agent = agents.find(a => a.id == contactId);
    }
    
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }

    // Check for existing website in contact-specific directory
    const contactsBaseDir = path.join(__dirname, '../../vvebjs/generated-realtors/contacts');
    const contactName = (agent.name || agent.email || 'unknown-agent')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    
    const expectedContactDirName = `contact-${contactName}-${contactId}`;
    let contactDir = path.join(contactsBaseDir, expectedContactDirName);
    let actualContactDirName = expectedContactDirName;
    
    // If the expected directory doesn't exist, search for any directory containing the contact ID
    if (!fs.existsSync(contactDir) && fs.existsSync(contactsBaseDir)) {
      const allContactDirs = fs.readdirSync(contactsBaseDir);
      const matchingDir = allContactDirs.find(dir => dir.endsWith(`-${contactId}`));
      
      if (matchingDir) {
        contactDir = path.join(contactsBaseDir, matchingDir);
        actualContactDirName = matchingDir;
        console.log(`📁 Found existing directory: ${matchingDir} for contact ${contactId}`);
      }
    }
    
    const websiteFilePath = path.join(contactDir, 'index.html');
    const backupFilePath = path.join(contactDir, 'index.html.bak');
    
    let existingWebsite = null;
    let hasBackup = false;
    
    if (fs.existsSync(websiteFilePath)) {
      const stats = fs.statSync(websiteFilePath);
      hasBackup = fs.existsSync(backupFilePath);
      
      existingWebsite = {
        fileName: 'index.html',
        websiteUrl: `/generated-realtors/contacts/${actualContactDirName}/index.html`,
        filePath: websiteFilePath,
        contactDir,
        contactDirName: actualContactDirName,
        generatedAt: stats.mtime.toISOString(),
        hasBackup,
        backupPath: hasBackup ? backupFilePath : null,
        layout: 'professional', // Default values since we can't determine from filename
        theme: 'modern-professional'
      };
    }
    
    if (existingWebsite) {
      res.json({
        success: true,
        website: existingWebsite
      });
    } else {
      res.json({
        success: true,
        website: null,
        message: 'No existing website found for this contact'
      });
    }

  } catch (error) {
    console.error('Error checking for existing website:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Website Preview Endpoint - Generate temporary preview for modal
app.post('/api/website/preview', async (req, res) => {
  try {
    console.log('🚀 PREVIEW ENDPOINT CALLED - NEW VERSION WITH CHROME EXTENSION FETCH');
    const { 
      contactId, 
      contactData, 
      layout = 'professional', 
      theme = 'modern-professional', 
      activationBanner = false,
      heroImageSource = 'auto',
      heroImageUrl = null,
      heroOverlayOpacity = 0.4,
      heroBlur = 0,
      heroOverlayWhite = false,
      profileImageUrl = null,
      manualHeroTextColors = false,
      heroTextColor = null,
      heroTextSecondary = null,
      heroAccentColor = null
    } = req.body;
    console.log(`🎯 Preview requested for contactId: ${contactId}`);
    let agent;
    let foundReviews = false;
    
    // Always try to fetch reviews from Chrome Extension first if we have a contactId
    if (contactId && contactId !== 'preview-sample') {
      console.log(`🔍 Preview: Attempting to fetch agent data for ID: ${contactId}`);
      
      try {
        // First try to get detailed agent data with reviews from Chrome Extension backend
        const chromeExtensionUrl = `http://localhost:5001/api/agents/${contactId}`;
        console.log(`📡 Preview: Fetching from Chrome Extension: ${chromeExtensionUrl}`);
        
        const chromeExtensionResponse = await fetch(chromeExtensionUrl);
        console.log(`📡 Preview: Chrome Extension response status: ${chromeExtensionResponse.status}`);
        
        if (chromeExtensionResponse.ok) {
          const chromeData = await chromeExtensionResponse.json();
          console.log(`📡 Preview: Chrome Extension response received`);
          
          if (chromeData.success && chromeData.agent) {
            agent = chromeData.agent;
            foundReviews = true;
            console.log('✅ Preview: Got agent data with reviews from Chrome Extension backend');
            console.log(`📊 Preview: Agent has reviews:`, !!agent.reviews);
            if (agent.reviews) {
              console.log(`📊 Preview: Reviews structure:`, {
                hasIndividual: !!(agent.reviews.individual && agent.reviews.individual.length),
                individualCount: agent.reviews.individual ? agent.reviews.individual.length : 0,
                hasRecommendations: !!(agent.reviews.recommendations && agent.reviews.recommendations.length),
                recommendationsCount: agent.reviews.recommendations ? agent.reviews.recommendations.length : 0
              });
            }
          } else {
            console.log('⚠️ Preview: Chrome Extension response invalid format:', chromeData);
          }
        } else {
          console.log(`⚠️ Preview: Chrome Extension request failed with status ${chromeExtensionResponse.status}`);
        }
      } catch (error) {
        console.log('⚠️ Preview: Chrome Extension backend not available:', error.message);
      }
      
      // If we couldn't get reviews but have contactData, merge them
      if (!foundReviews && contactData) {
        console.log('📊 Preview: Using provided contactData and merging with any available agent data');
        if (agent && agent.reviews) {
          // Keep reviews from Chrome Extension, but use other data from contactData
          agent = { ...contactData, reviews: agent.reviews };
        } else {
          // No reviews found, just use contactData
          agent = contactData;
        }
      }
      
      // If still no agent found, fall back to CRM data using efficient single agent lookup
      if (!agent) {
        console.log('📊 Preview: Falling back to CRM database for single agent lookup');
        agent = await unifiedDbManager.getAgentById(contactId, true); // Include properties
        console.log(`📊 Preview: Found agent in CRM database:`, !!agent);
      }
      
      if (!agent) {
        return res.status(404).json({ 
          success: false, 
          error: 'Contact not found' 
        });
      }
    }
    // Use contactData as fallback if no contactId provided
    else if (contactData) {
      agent = contactData;
    }
    // Fallback to sample data for preview
    else {
      agent = {
        id: 'preview-sample',
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        company: 'Premium Real Estate',
        location: 'Boston, MA',
        specialization: 'Luxury Properties',
        experience: '10+ Years',
        about: 'Professional real estate agent specializing in luxury properties in the greater Boston area.',
        agentPhoto: '/images/sample-agent.jpg'
      };
    }

    console.log(`🎨 Generating preview with layout: ${layout}, theme: ${theme} for agent: ${agent.name || agent.email}`);
    
    // Generate website HTML with modular system
    const websiteHTML = generateModularWebsite(agent, { 
      layout, 
      theme, 
      activationBanner,
      heroImageSource,
      heroImageUrl,
      heroOverlayOpacity,
      heroBlur,
      heroOverlayWhite,
      profileImageUrl,
      manualHeroTextColors,
      heroTextColor,
      heroTextSecondary,
      heroAccentColor
    });
    
    // Create preview in contact-specific directory
    const agentId = agent.id || 'sample';
    const contactName = (agent.name || agent.email || 'unknown-agent')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    
    const contactDirName = `contact-${contactName}-${agentId}`;
    const contactsBaseDir = path.join(__dirname, '../../vvebjs/generated-realtors/contacts');
    let contactDir = path.join(contactsBaseDir, contactDirName);
    
    // If the expected directory doesn't exist, search for any directory containing the agent ID
    if (!fs.existsSync(contactDir) && fs.existsSync(contactsBaseDir)) {
      const allContactDirs = fs.readdirSync(contactsBaseDir);
      const matchingDir = allContactDirs.find(dir => dir.endsWith(`-${agentId}`));
      
      if (matchingDir) {
        contactDir = path.join(contactsBaseDir, matchingDir);
        console.log(`📁 Using existing directory: ${matchingDir} for preview of contact ${agentId}`);
      }
    }
    
    // Ensure contact directory exists
    if (!fs.existsSync(contactDir)) {
      fs.mkdirSync(contactDir, { recursive: true });
    }
    
    // Clean up any old preview files before updating main file
    try {
      const files = fs.readdirSync(contactDir);
      files.forEach(file => {
        if (file.startsWith('preview-') && file.endsWith('.html')) {
          const oldPreviewPath = path.join(contactDir, file);
          fs.unlinkSync(oldPreviewPath);
          console.log(`🧹 Cleaned up old preview file: ${file}`);
        }
      });
    } catch (cleanupError) {
      console.warn('Preview cleanup warning:', cleanupError.message);
    }
    
    // SIMPLIFIED: Just update the main index.html file directly (no separate preview files)
    const mainIndexPath = path.join(contactDir, 'index.html');
    const backupPath = path.join(contactDir, 'index.html.bak');
    
    // Backup existing index.html if it exists
    if (fs.existsSync(mainIndexPath)) {
      fs.copyFileSync(mainIndexPath, backupPath);
      console.log(`📦 Backed up existing index.html`);
    }
    
    // Update main index.html with new content (this is what VvebJS will edit)
    fs.writeFileSync(mainIndexPath, websiteHTML);
    console.log(`🔄 Updated index.html with new theme: ${layout}-${theme}`);
    
    // Return the main file URL (not a preview)
    const actualContactDirName = path.basename(contactDir);
    const websiteUrl = `/generated-realtors/contacts/${actualContactDirName}/index.html`;
    
    console.log(`✅ Website updated: index.html (ready for VvebJS editing)`);
    
    res.json({
      success: true,
      message: `Preview generated with ${layout} layout and ${theme} theme`,
      websiteUrl,
      fileName: 'index.html',
      filePath: mainIndexPath,
      contactDir,
      layout,
      theme,
      isPreview: true,
      agentName: agent.name || agent.email || 'Sample Agent'
    });

  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Email Routes
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, content, contactData } = req.body;
    const result = await emailService.sendEmail(to, subject, content, contactData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/send-batch', async (req, res) => {
  try {
    const { contacts, subject, template } = req.body;
    const result = await emailService.sendBatchEmail(contacts, subject, template);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced System Status Endpoint with ALL data store information
app.get('/api/status', async (req, res) => {
  try {
    const currentDb = unifiedDbManager.getCurrentDatabase();
    const availableDbs = await unifiedDbManager.getAvailableDatabases();
    
    // Get comprehensive health check
    let healthCheck = null;
    try {
      healthCheck = await unifiedDbManager.healthCheck();
    } catch (healthErr) {
      console.warn('Health check failed:', healthErr.message);
      healthCheck = { status: 'error', message: healthErr.message };
    }
    
    let contactCount = 0;
    let comprehensiveStats = null;
    try {
      contactCount = await unifiedDbManager.getTotalRealtorCount();
      comprehensiveStats = await unifiedDbManager.getComprehensiveStats();
    } catch (err) {
      console.warn('Could not get comprehensive data:', err.message);
    }

    const status = {
      timestamp: new Date().toISOString(),
      database: {
        connected: currentDb ? currentDb.isConnected : false,
        currentDatabase: currentDb ? currentDb.name : null,
        currentDatabaseType: 'chrome_extension',
        availableDatabases: Array.isArray(availableDbs) ? availableDbs : [],
        contactCount: contactCount,
        source: 'Chrome Extension',
        baseUrl: currentDb ? currentDb.baseUrl : null,
        lastPing: currentDb ? currentDb.lastPing : null
      },
      sms: await smsService.getStatus(),
      adb: {
        connected: false,
        devices: []
      },
      chromeExtension: {
        connected: currentDb ? currentDb.isConnected : false,
        lastPing: currentDb ? currentDb.lastPing : null,
        healthCheck: healthCheck
      },
      comprehensiveStats: comprehensiveStats
    };

    // Get ADB status
    try {
      const adbAvailable = await smsService.checkADB();
      if (adbAvailable) {
        const devices = await smsService.getDevices();
        status.adb = {
          connected: Array.isArray(devices) && devices.length > 0,
          devices: Array.isArray(devices) ? devices : []
        };
      }
    } catch (err) {
      console.warn('Could not check ADB status:', err.message);
      status.adb = {
        connected: false,
        devices: [],
        error: err.message
      };
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VVebjs integration endpoints
app.post('/api/generate-websites', async (req, res) => {
  try {
    const { contacts, template = 'realtor' } = req.body;
    
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Contacts array is required' });
    }

    const results = [];
    
    for (const contact of contacts) {
      try {
        // Get COMPLETE Chrome Extension data including ALL properties for this agent
        let fullAgentData = contact;
        
        // If we have an agent ID, fetch complete data from Chrome Extension
        if (contact.id) {
          try {
            // Get properties for this specific agent from Chrome Extension
            const agentProperties = await unifiedDbManager.getPropertiesForAgent(contact.id);
            fullAgentData.properties = agentProperties;
            fullAgentData.property_details = agentProperties;
          } catch (error) {
            console.warn(`Could not fetch properties for agent ${contact.id}:`, error.message);
            fullAgentData.properties = [];
            fullAgentData.property_details = [];
          }
        }
        
        // Generate website using ALL Chrome Extension data including properties
        const websiteData = {
          // Basic info
          name: fullAgentData.name || 'Unknown',
          title: fullAgentData.title || '',
          company: fullAgentData.company || '',
          phone: fullAgentData.phone || '',
          email: fullAgentData.email || '',
          address: fullAgentData.address || '',
          website: fullAgentData.website || '',
          
          // Professional details
          bio: fullAgentData.bio || fullAgentData.description || '',
          experience_years: fullAgentData.experience_years || 0,
          license_number: fullAgentData.license_number || fullAgentData.license || '',
          license_state: fullAgentData.license_state || fullAgentData.state || '',
          
          // Enhanced data
          specializations: fullAgentData.specializations || [],
          languages: fullAgentData.languages || [],
          certifications: fullAgentData.certifications || [],
          service_areas: fullAgentData.service_areas || [],
          social_media: fullAgentData.social_media || {},
          ratings: fullAgentData.ratings || {},
          profile_image_url: fullAgentData.profile_image_url || '',
          
          // Property statistics
          total_properties: fullAgentData.total_properties || fullAgentData.properties?.length || 0,
          avg_property_price: fullAgentData.avg_property_price || 0,
          cities_served: fullAgentData.cities_served || 0,
          
          // COMPLETE PROPERTY DATA - ALL properties with prices, descriptions, photos, etc.
          properties: fullAgentData.properties || fullAgentData.property_details || [],
          
          // Calculate property insights from actual data
          property_price_range: fullAgentData.properties?.length > 0 ? {
            min: Math.min(...fullAgentData.properties.map(p => parseFloat(p.price || 0))),
            max: Math.max(...fullAgentData.properties.map(p => parseFloat(p.price || 0))),
            average: fullAgentData.properties.reduce((sum, p) => sum + parseFloat(p.price || 0), 0) / fullAgentData.properties.length
          } : null,
          
          // Property types and locations
          property_locations: fullAgentData.properties?.map(p => ({
            address: p.address,
            city: p.city,
            state: p.state,
            zip_code: p.zip_code
          })) || [],
          
          // URLs
          realtor_url: fullAgentData.realtor_url || fullAgentData.url || '',
          
          template: template
        };
        
        // Generate comprehensive website with ALL Chrome Extension data and save to VvebJS directory
        let actualWebsiteUrl = `/generated/${fullAgentData.id}.html`; // fallback
        let actualFileName = '';
        
        try {
          const fs = require('fs');
          const path = require('path');
          
          // Function to generate the same slug as VvebJS does
          const generateVvebJSSlug = (contact) => {
            let name = contact.name || 'unknown-agent';
            
            // Handle placeholder names (same logic as VvebJS)
            if (!name || name === 'Agent Name Not Found' || name === 'Unknown') {
              const companyName = (contact.company || '')
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-');
              if (companyName) {
                name = `agent-at-${companyName}`;
              } else {
                name = `unknown-agent`;
              }
            }
            
            const cleanName = name
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim();
            
            return cleanName;
          };
          
          // Use the contact's actual ID - no hash generation needed
          const uniqueId = fullAgentData.id || '0000000';
          
          const baseSlug = generateVvebJSSlug(fullAgentData);
          actualFileName = `${baseSlug}-${uniqueId}.html`;
          actualWebsiteUrl = `/generated-realtors/realtor-database/${actualFileName}`;
          
          // Generate website using clean VvebJS template
          const comprehensiveHTML = generateVvebJSWebsite(fullAgentData);
          
          // Save to VvebJS directory structure
          const vvebJSDir = path.join(__dirname, '../../vvebjs/generated-realtors/realtor-database');
          const filePath = path.join(vvebJSDir, actualFileName);
          
          // Ensure directory exists
          if (!fs.existsSync(vvebJSDir)) {
            fs.mkdirSync(vvebJSDir, { recursive: true });
          }
          
          // Write the comprehensive website
          fs.writeFileSync(filePath, comprehensiveHTML);
          console.log(`✅ Generated comprehensive website: ${filePath}`);
          
        } catch (fileGenerationError) {
          console.warn('Could not generate comprehensive website file:', fileGenerationError.message);
        }
        
        console.log(`Generating COMPREHENSIVE website for: ${websiteData.name}`);
        console.log(`  - Properties included: ${websiteData.properties?.length || 0}`);
        console.log(`  - Price range: $${websiteData.property_price_range?.min || 0} - $${websiteData.property_price_range?.max || 0}`);
        console.log(`  - Property locations: ${websiteData.property_locations?.length || 0} addresses`);
        console.log(`  - Total fields available: ${Object.keys(websiteData).length}`);
        console.log(`  - Website URL: ${actualWebsiteUrl}`);
        
        results.push({
          contactId: fullAgentData.id,
          name: fullAgentData.name,
          success: true,
          websiteUrl: actualWebsiteUrl,
          fileName: actualFileName,
          dataSource: 'chrome_extension_complete',
          propertiesIncluded: websiteData.properties?.length || 0,
          propertyPriceRange: websiteData.property_price_range,
          fieldsUsed: Object.keys(websiteData).filter(key => {
            const value = websiteData[key];
            return value && value !== '' && value !== 0 && 
                   !(Array.isArray(value) && value.length === 0) &&
                   !(typeof value === 'object' && Object.keys(value).length === 0);
          }),
          totalDataFields: Object.keys(websiteData).length
        });
        
      } catch (error) {
        console.error(`Error generating website for ${contact.name}:`, error.message);
        results.push({
          contactId: contact.id,
          name: contact.name,
          success: false,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const totalProperties = results.reduce((sum, r) => sum + (r.propertiesIncluded || 0), 0);
    const avgPropertiesPerAgent = successful > 0 ? Math.round(totalProperties / successful) : 0;
    
    res.json({
      success: true,
      totalGenerated: successful,
      chromeExtensionCount: successful,
      results: results,
      propertyDataSummary: {
        totalPropertiesIncluded: totalProperties,
        averagePropertiesPerAgent: avgPropertiesPerAgent,
        agentsWithProperties: results.filter(r => r.propertiesIncluded > 0).length
      },
      metadata: {
        dataSource: 'chrome_extension_complete_with_properties',
        timestamp: new Date().toISOString(),
        comprehensiveDataUsed: true
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single realtor website generation endpoint
app.post('/api/generate-realtor-website', async (req, res) => {
  try {
    const { contact, database } = req.body;
    
    if (!contact) {
      return res.status(400).json({ error: 'Contact is required' });
    }

    // Get COMPLETE Chrome Extension data including ALL properties for this agent
    let fullAgentData = contact;
    
    // If we have an agent ID, fetch complete data from Chrome Extension
    if (contact.id) {
      try {
        // Get properties for this specific agent from Chrome Extension
        const agentProperties = await unifiedDbManager.getPropertiesForAgent(contact.id);
        fullAgentData.properties = agentProperties;
        fullAgentData.property_details = agentProperties;
      } catch (error) {
        console.warn(`Could not fetch properties for agent ${contact.id}:`, error.message);
        fullAgentData.properties = [];
        fullAgentData.property_details = [];
      }
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // Function to generate the same slug as VvebJS does
    const generateVvebJSSlug = (contact) => {
      let name = contact.name || contact.NAME || 'unknown-agent';
      
      // Handle placeholder names (same logic as VvebJS)
      if (!name || name === 'Agent Name Not Found' || name === 'Unknown') {
        const companyName = (contact.company || contact.Company || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
        if (companyName) {
          name = `agent-at-${companyName}`;
        } else {
          name = `unknown-agent`;
        }
      }
      
      const cleanName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      return cleanName;
    };
    
    // Use the contact's actual ID - no hash generation needed
    const uniqueId = fullAgentData.id || '0000000';
    
    // NEW UNIFIED APPROACH: Use contacts directory structure for EVERYTHING
    const contactName = (fullAgentData.name || fullAgentData.NAME || 'unknown-agent')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    
    const contactDirName = `contact-${contactName}-${uniqueId}`;
    const contactDir = path.join(__dirname, '../../vvebjs/generated-realtors/contacts', contactDirName);
    const websiteFileName = 'index.html'; // Standard web convention  
    const filePath = path.join(contactDir, websiteFileName);
    
    // Ensure contact directory exists
    if (!fs.existsSync(contactDir)) {
      fs.mkdirSync(contactDir, { recursive: true });
    }
    
    // VvebJS URLs now point to contacts directory
    const websiteUrl = `http://localhost:3030/generated-realtors/contacts/${contactDirName}/${websiteFileName}`;
    const editorUrl = `http://localhost:3030/editor.html?page=generated-realtors/contacts/${contactDirName}/${websiteFileName}`;
    
    console.log(`🎯 Using unified file path: ${filePath}`);
    
    // Check if website file already exists
    const websiteExists = fs.existsSync(filePath);
    
    if (websiteExists) {
      // File exists - open it for editing
      console.log(`📁 Website exists, opening for editing: ${filePath}`);
      
      res.json({
        success: true,
        message: 'Opening existing website for editing',
        websiteUrl: websiteUrl,
        editorUrl: editorUrl,
        filePath: filePath,
        fileName: websiteFileName,
        realtorData: {
          name: fullAgentData.name || fullAgentData.NAME,
          propertiesIncluded: (fullAgentData.properties || []).length,
          id: uniqueId
        },
        existing: true,
        preservedEdits: true
      });
      return;
    }
    
    // Clean up any preview files first
    try {
      const files = fs.readdirSync(contactDir);
      files.forEach(file => {
        if (file.includes('preview') && file.endsWith('.html')) {
          const previewPath = path.join(contactDir, file);
          fs.unlinkSync(previewPath);
          console.log(`🧹 Cleaned up preview file: ${file}`);
        }
      });
    } catch (cleanupError) {
      console.warn('Preview cleanup warning:', cleanupError.message);
    }
    
    // No website exists - generate a new one using the modular system
    console.log(`🆕 No website found, generating new one: ${filePath}`);
    
    // Generate website using modular system with testimonials support
    const comprehensiveHTML = await generateModularWebsite(fullAgentData);
    
    // Write the file
    fs.writeFileSync(filePath, comprehensiveHTML);
    console.log(`✅ Generated NEW website: ${filePath}`);
    
    res.json({
      success: true,
      message: 'Website generated successfully',
      websiteUrl: websiteUrl,
      editorUrl: editorUrl,
      filePath: filePath,
      fileName: websiteFileName,
      realtorData: {
        name: fullAgentData.name || fullAgentData.NAME,
        propertiesIncluded: (fullAgentData.properties || []).length,
        id: uniqueId
      },
      existing: false,
      preservedEdits: false
    });
  } catch (error) {
    console.error('Single realtor website generation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Force regenerate realtor website (overwrite existing edits with fresh data)
app.post('/api/regenerate-realtor-website', async (req, res) => {
  try {
    const { contact, database, force = true } = req.body;
    
    if (!contact) {
      return res.status(400).json({ error: 'Contact is required' });
    }

    console.log(`🔄 FORCE regenerating website for: ${contact.name || contact.NAME} (will overwrite edits)`);

    // Get COMPLETE Chrome Extension data including ALL properties for this agent
    let fullAgentData = contact;
    
    // If we have an agent ID, fetch complete data from Chrome Extension
    if (contact.id) {
      try {
        // Get properties for this specific agent from Chrome Extension
        const agentProperties = await unifiedDbManager.getPropertiesForAgent(contact.id);
        fullAgentData.properties = agentProperties;
        fullAgentData.property_details = agentProperties;
      } catch (error) {
        console.warn(`Could not fetch properties for agent ${contact.id}:`, error.message);
        fullAgentData.properties = [];
        fullAgentData.property_details = [];
      }
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // Function to generate the same slug as VvebJS does
    const generateVvebJSSlug = (contact) => {
      let name = contact.name || contact.NAME || 'unknown-agent';
      
      // Handle placeholder names (same logic as VvebJS)
      if (!name || name === 'Agent Name Not Found' || name === 'Unknown') {
        const companyName = (contact.company || contact.Company || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
        if (companyName) {
          name = `agent-at-${companyName}`;
        } else {
          name = `unknown-agent`;
        }
      }
      
      const cleanName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      return cleanName;
    };
    
    // Use the contact's actual ID - no hash generation needed
    const uniqueId = fullAgentData.id || '0000000';
    
    // NEW UNIFIED APPROACH: Use contacts directory structure for EVERYTHING
    const contactName = (fullAgentData.name || fullAgentData.NAME || 'unknown-agent')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    
    const contactDirName = `contact-${contactName}-${uniqueId}`;
    const contactDir = path.join(__dirname, '../../vvebjs/generated-realtors/contacts', contactDirName);
    const websiteFileName = 'index.html'; // Standard web convention  
    const filePath = path.join(contactDir, websiteFileName);
    const backupPath = path.join(contactDir, 'index.html.bak');
    
    // Ensure contact directory exists
    if (!fs.existsSync(contactDir)) {
      fs.mkdirSync(contactDir, { recursive: true });
    }
    
    // Clean up any preview files first
    try {
      const files = fs.readdirSync(contactDir);
      files.forEach(file => {
        if (file.includes('preview') && file.endsWith('.html')) {
          const previewPath = path.join(contactDir, file);
          fs.unlinkSync(previewPath);
          console.log(`🧹 Cleaned up preview file: ${file}`);
        }
      });
    } catch (cleanupError) {
      console.warn('Preview cleanup warning:', cleanupError.message);
    }
    
    // VvebJS URLs now point to contacts directory
    const websiteUrl = `http://localhost:3030/generated-realtors/contacts/${contactDirName}/${websiteFileName}`;
    const editorUrl = `http://localhost:3030/editor.html?page=generated-realtors/contacts/${contactDirName}/${websiteFileName}`;
    
    // Generate comprehensive HTML with ALL property data
    const properties = fullAgentData.properties || [];
    
    // Generate website using modular system with property details
    const comprehensiveHTML = generateModularWebsite(fullAgentData);
    
    // Create backup if website already exists
    if (fs.existsSync(filePath)) {
      try {
        const existingContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(backupPath, existingContent);
        console.log(`💾 Created backup: ${backupPath}`);
      } catch (backupError) {
        console.warn('Backup creation warning:', backupError.message);
      }
    }
    
    // FORCE overwrite the file (even if it exists)
    fs.writeFileSync(filePath, comprehensiveHTML);
    console.log(`✅ FORCE regenerated website (overwrote existing): ${filePath}`);
    
    console.log(`Regenerated COMPREHENSIVE website for: ${fullAgentData.name || fullAgentData.NAME}`);
    console.log(`  - Properties included: ${properties.length}`);
    console.log(`  - Price range: $${properties.length > 0 ? Math.min(...properties.map(p => p.price || 0)) + ' - $' + Math.max(...properties.map(p => p.price || 0)) : '0'}`);
    console.log(`  - Property locations: ${properties.length} addresses`);
    console.log(`  - Total fields available: ${Object.keys(fullAgentData).length}`);
    console.log(`  - Website URL: ${websiteUrl}`);
    
    res.json({
      success: true,
      websiteUrl: websiteUrl,
      editorUrl: editorUrl,
      filePath: filePath,
      fileName: websiteFileName,
      regenerated: true,
      realtorData: {
        name: fullAgentData.name || fullAgentData.NAME,
        propertiesIncluded: properties.length,
        id: uniqueId
      }
    });
    
  } catch (error) {
    console.error('Force regeneration error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Health check endpoint with comprehensive Chrome Extension data
app.get('/api/health', async (req, res) => {
  try {
    const healthCheck = await unifiedDbManager.healthCheck();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: healthCheck,
      services: {
        sms: smsService.getStatus(),
        email: 'ready',
        unifiedDatabase: 'ready',
        chromeExtension: healthCheck
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// VvebJS Website Save Endpoint - Backup save handler
app.post('/api/vvebjs/save', express.urlencoded({ extended: true, limit: '50mb' }), (req, res) => {
  try {
    console.log('🔄 VvebJS save request received (backup handler)');
    
    // Handle both JSON and form data
    let file, content;
    
    if (req.headers['content-type']?.includes('application/json')) {
      // JSON format
      file = req.body.file;
      content = req.body.content || req.body.html;
    } else {
      // Form data format (from VvebJS)
      file = req.body.file;
      content = req.body.html; // VvebJS sends HTML content as 'html' field
    }
    
    if (!file || !content) {
      console.warn('❌ Save failed: Missing file or content parameter');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing file or content parameter',
        received: Object.keys(req.body)
      });
    }

    // Ensure the file path is within our VvebJS directory
    const vvebJSBaseDir = path.resolve(__dirname, '../../vvebjs');
    const filePath = path.resolve(vvebJSBaseDir, file.startsWith('/') ? file.substring(1) : file);
    
    if (!filePath.startsWith(vvebJSBaseDir)) {
      console.warn('❌ Save failed: Invalid file path outside VvebJS directory');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid file path - must be within VvebJS directory' 
      });
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }

    // Write the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ VvebJS file saved: ${file} (unified contacts directory)`);
    
    res.json({ 
      success: true, 
      message: `File ${file} saved successfully`,
      timestamp: new Date().toISOString(),
      unifiedSystem: true
    });
    
  } catch (error) {
    console.error('❌ VvebJS save error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint with comprehensive Chrome Extension data
app.get('/api/health-detailed', async (req, res) => {
  try {
    const healthCheck = await unifiedDbManager.healthCheck();
    
    res.json({
      status: healthCheck.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        type: 'chrome_extension',
        connected: unifiedDbManager.getCurrentDatabase().isConnected,
        healthCheck: healthCheck
      },
      dataStores: {
        agents: { accessible: true, description: 'Real estate agent profiles with complete professional data' },
        properties: { accessible: true, description: 'Property listings associated with agents' },
        extraction_logs: { accessible: true, description: 'Data extraction monitoring and logging' },
        agent_stats: { accessible: true, description: 'Computed statistics and analytics for agents' },
        recent_extractions: { accessible: true, description: 'Recent data extraction activities' }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 CRM Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 Chrome Extension Support: ${unifiedDbManager.getCurrentDatabase().isConnected ? 'Connected' : 'Disconnected'}`);
  console.log(`📈 Comprehensive Data Access: ALL Chrome Extension data stores accessible`);
  console.log(`🗃️  Available Data Stores: agents, properties, extraction_logs, agent_stats, recent_extractions`);
});

// Comprehensive error handling and graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Give time for logs to write
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack:', reason?.stack);
  // Don't exit on unhandled rejections, just log them
});

// Memory monitoring
const memoryCheckInterval = setInterval(() => {
  const usage = process.memoryUsage();
  const mbUsed = Math.round(usage.heapUsed / 1024 / 1024);
  const mbTotal = Math.round(usage.heapTotal / 1024 / 1024);
  
  // Log if memory usage is high
  if (mbUsed > 500) {
    console.warn(`⚠️ High memory usage: ${mbUsed}MB / ${mbTotal}MB`);
  }
  
  // Force garbage collection if memory is very high
  if (mbUsed > 1000) {
    console.warn('🧹 Forcing garbage collection due to high memory usage');
    if (global.gc) {
      global.gc();
    }
  }
}, 30000); // Check every 30 seconds

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  // Clear intervals
  clearInterval(memoryCheckInterval);
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections if needed
    if (unifiedDbManager && typeof unifiedDbManager.close === 'function') {
      unifiedDbManager.close();
    }
    
    console.log('Process terminated gracefully');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
