const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import your existing server modules
const SMSService = require('../../server/smsService');
const EmailService = require('../../server/emailService');
const NeonDatabaseManager = require('../../server/NeonDatabaseManager');
const DataTransformationMiddleware = require('../../server/data-transformation-middleware');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Initialize services
const dataTransformer = new DataTransformationMiddleware();
const neonDbManager = new NeonDatabaseManager();
const smsService = new SMSService(neonDbManager);
const emailService = new EmailService();

// Initialize database connection
let dbInitialized = false;
const initializeDb = async () => {
  if (!dbInitialized) {
    try {
      console.log('🔌 Initializing database connection...');
      await neonDbManager.initialize();
      dbInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }
};

// Apply middleware
app.use('/api/agents', dataTransformer.createExpressMiddleware());
app.use('/api/batch', dataTransformer.createExpressMiddleware());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to check environment
app.get('/api/debug', async (req, res) => {
  try {
    await initializeDb();
    const current = neonDbManager.getCurrentDatabase();
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT_SET',
      connectionStatus: current,
      connectionError: neonDbManager.connectionStatus?.error || null
    });
  } catch (error) {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT_SET',
      initError: error.message
    });
  }
});

// Quick debug for counts per agent
app.get('/api/debug/agent/:id/counts', async (req, res) => {
  try {
    await initializeDb();
    const { id } = req.params;
    const [props, recs] = await Promise.all([
      neonDbManager.getPropertiesForAgent(id).catch(() => []),
      neonDbManager.getRecommendationsForAgent(id).catch(() => [])
    ]);
    res.json({ success: true, properties: props.length, recommendations: recs.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Database endpoints
app.get('/api/databases', async (req, res) => {
  try {
    await initializeDb();
    const databases = await neonDbManager.getAvailableDatabases();
    const current = neonDbManager.getCurrentDatabase();
    
    res.json({
      databases: databases,
      current: current.isConnected ? current : null,
      postgresql: databases
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/database/status', async (req, res) => {
  try {
    await initializeDb();
    const databases = await neonDbManager.getAvailableDatabases();
    const current = neonDbManager.getCurrentDatabase();
    
    res.json({
      success: true,
      databases: databases,
      current: current.isConnected ? current : null,
      postgresql: databases
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contact-specific website generator settings
app.get('/api/contacts/:id/settings', async (req, res) => {
  try {
    await initializeDb();
    const { id } = req.params;
    const settings = await neonDbManager.getContactSettings(id);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/contacts/:id/settings', async (req, res) => {
  try {
    await initializeDb();
    const { id } = req.params;
    const settings = req.body || {};
    const saved = await neonDbManager.saveContactSettings(id, settings);
    res.json({ success: true, settings: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contacts/:id/settings', async (req, res) => {
  try {
    await initializeDb();
    const { id } = req.params;
    const out = await neonDbManager.clearContactSettings(id);
    res.json({ success: true, cleared: out.success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS endpoints
app.get('/api/sms/devices', (req, res) => {
  // Return empty array for now - SMS functionality not implemented in serverless
  res.json([]);
});

app.get('/api/sms/templates', (req, res) => {
  // Return default templates
  res.json([
    {
      id: 1,
      name: 'Introduction',
      content: 'Hi {name}, I hope this message finds you well. I wanted to reach out regarding your real estate business.'
    },
    {
      id: 2,
      name: 'Follow Up',
      content: 'Hi {name}, following up on our previous conversation. Would love to discuss how we can help grow your business.'
    }
  ]);
});

app.get('/api/sms/status', (req, res) => {
  res.json({ connected: false, device: null });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: 'connected'
  });
});

// Headers endpoint - return default CRM headers
app.get('/api/headers', (req, res) => {
  res.json([
    'id', 'name', 'email', 'phone', 'company', 'address', 'status', 'notes', 'created_at', 'updated_at'
  ]);
});

// Additional SMS endpoints
app.post('/api/sms/connect', (req, res) => {
  res.json({ success: false, message: 'SMS functionality not available in serverless mode' });
});

app.post('/api/sms/disconnect', (req, res) => {
  res.json({ success: true, message: 'Disconnected' });
});

app.post('/api/sms/templates', (req, res) => {
  res.json({ success: false, message: 'Template creation not available in serverless mode' });
});

app.delete('/api/sms/templates/:id', (req, res) => {
  res.json({ success: false, message: 'Template deletion not available in serverless mode' });
});

app.put('/api/sms/templates/:id', (req, res) => {
  res.json({ success: false, message: 'Template update not available in serverless mode' });
});

// Upload CSV endpoint
app.post('/api/upload-csv', (req, res) => {
  res.json({ success: false, message: 'CSV upload not available in serverless mode' });
});

// Database operations
app.post('/api/database/switch', (req, res) => {
  res.json({ success: false, message: 'Database switching not available - using Neon PostgreSQL' });
});

app.post('/api/database/create', (req, res) => {
  res.json({ success: false, message: 'Database creation not available in serverless mode' });
});

app.put('/api/database/rename', (req, res) => {
  res.json({ success: false, message: 'Database renaming not available in serverless mode' });
});

app.delete('/api/database/delete', (req, res) => {
  res.json({ success: false, message: 'Database deletion not available in serverless mode' });
});

// Contacts API
app.get('/api/contacts', async (req, res) => {
  try {
    await initializeDb();
    
  const { page = 1, limit = 1000, search = '', includeStats = 'true', includeProperties = 'false', includeReviews = 'false' } = req.query;
    const currentDb = neonDbManager.getCurrentDatabase();
    
    if (!currentDb.isConnected) {
      return res.status(400).json({ error: 'Database not connected' });
    }

    let contacts;
    if (search && search.trim()) {
      contacts = await neonDbManager.searchAgents(search.trim(), parseInt(page), parseInt(limit));
    } else {
      contacts = await neonDbManager.getAgents(
        parseInt(page), 
        parseInt(limit), 
        includeStats === 'true',
        includeProperties === 'true'
      );
    }
    
    // Transform to CRM contact format
    const transformedContacts = contacts.map(agent => ({
      id: agent.id,
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      company: agent.company || '',
      address: agent.address || '',
      notes: agent.bio || agent.crm_notes || '',
      status: agent.crm_status || 'New',
      realtor_url: agent.realtor_url || '',
      website: agent.website || '',
      profile_image_url: agent.profile_image_url || '',
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      // Include all agent data
      ...agent
    }));

    // Optionally include properties/reviews in list (lightweight only)
    if (includeProperties === 'true' || includeReviews === 'true') {
      for (const a of transformedContacts) {
        if (includeProperties === 'true') {
          try { a.properties = await neonDbManager.getPropertiesForAgent(a.id); } catch { a.properties = []; }
        }
        if (includeReviews === 'true') {
          try { a.reviews = await neonDbManager.getRecommendationsForAgent(a.id); } catch { a.reviews = []; }
        }
      }
    }

    res.json(transformedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update contact
app.put('/api/contacts/:id', async (req, res) => {
  try {
    await initializeDb();
    
    const { id } = req.params;
    const updateData = req.body;
    
    // Map CRM fields to agent fields
    const agentUpdateData = {
      name: updateData.name,
      email: updateData.email,
      phone: updateData.phone,
      company: updateData.company,
      address: updateData.address,
      crm_notes: updateData.notes,
      crm_status: updateData.status
    };

    // Handle profile image settings
    if (updateData.profileImageUrl !== undefined) {
      agentUpdateData.profile_image_url = updateData.profileImageUrl;
    }
    
    // Remove undefined values
    Object.keys(agentUpdateData).forEach(key => {
      if (agentUpdateData[key] === undefined) {
        delete agentUpdateData[key];
      }
    });

    // If only profile settings were sent (overrideProfileImage, profileImageUrl), 
    // and no other valid fields, return success without database update
    if (Object.keys(agentUpdateData).length === 0) {
      return res.json({ 
        success: true, 
        message: 'Profile settings saved locally',
        id: id
      });
    }
    
    const result = await neonDbManager.updateAgent(id, agentUpdateData);
    res.json(result);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// SMS and Email routes (simplified versions)
app.post('/api/sms/send', async (req, res) => {
  try {
    const { contactId, message, templateId } = req.body;
    const result = await smsService.sendSMS(contactId, message, templateId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/send', async (req, res) => {
  try {
    const { contactId, subject, body, templateId } = req.body;
    const result = await emailService.sendEmail(contactId, subject, body, templateId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get individual contact
app.get('/api/contacts/:id', async (req, res) => {
  try {
    await initializeDb();
    const { id } = req.params;
    const { includeProperties = 'true', includeReviews = 'true' } = req.query;

    const agent = await neonDbManager.getAgentById(id);
    const out = {
      id: agent.id,
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      company: agent.company || '',
      address: agent.address || '',
      notes: agent.bio || agent.crm_notes || '',
      status: agent.crm_status || 'New',
      realtor_url: agent.realtor_url || '',
      website: agent.website || '',
      profile_image_url: agent.profile_image_url || '',
      override_profile_image: agent.override_profile_image || false,
      custom_profile_image_url: agent.custom_profile_image_url || null,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      raw: agent
    };

    if (includeProperties === 'true') {
      try { out.properties = await neonDbManager.getPropertiesForAgent(id); } catch { out.properties = []; }
    }
    if (includeReviews === 'true') {
      try { out.reviews = await neonDbManager.getRecommendationsForAgent(id); } catch { out.reviews = []; }
    }

    res.json(out);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Alias: Agents API (for existing frontend calls)
app.get('/api/agents/:id', async (req, res) => {
  try {
    await initializeDb();
    const { id } = req.params;
    const agent = await neonDbManager.getAgentById(id);
    const details = {
      id: agent.id,
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      company: agent.company || '',
      address: agent.address || '',
      realtor_url: agent.realtor_url || '',
      website: agent.website || '',
      profile_image_url: agent.profile_image_url || '',
      override_profile_image: agent.override_profile_image || false,
      custom_profile_image_url: agent.custom_profile_image_url || null
    };
    // Include related data to match expectations
    try { details.properties = await neonDbManager.getPropertiesForAgent(id); } catch { details.properties = []; }
    try { details.reviews = await neonDbManager.getRecommendationsForAgent(id); } catch { details.reviews = []; }
    res.json({ success: true, agent: details });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(404).json({ success: false, error: 'Agent not found' });
  }
});

// Properties for agent (alias path)
app.get('/api/agents/:id/properties', async (req, res) => {
  try {
    await initializeDb();
    const { id } = req.params;
    const properties = await neonDbManager.getPropertiesForAgent(id);
    res.json({ success: true, properties });
  } catch (error) {
    if (error.message && /not found/i.test(error.message)) {
      return res.status(404).json({ success: false, error: 'No properties found for this agent' });
    }
    console.error('Error fetching properties:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch properties' });
  }
});

// Properties CRUD
app.post('/api/properties', async (req, res) => {
  try {
    await initializeDb();
    const created = await neonDbManager.createProperty(req.body || {});
    res.json({ success: true, message: 'Property created successfully', property: created });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create property' });
  }
});

app.put('/api/properties/:id', async (req, res) => {
  try {
    await initializeDb();
    const updated = await neonDbManager.updateProperty(req.params.id, req.body || {});
    res.json({ success: true, message: 'Property updated successfully', property: updated });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    console.error('Error updating property:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update property' });
  }
});

app.delete('/api/properties/:id', async (req, res) => {
  try {
    await initializeDb();
    await neonDbManager.deleteProperty(req.params.id);
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    console.error('Error deleting property:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete property' });
  }
});

// Recommendations for agent (alias path expected by UI as "recommendations")
app.get('/api/agents/:id/recommendations', async (req, res) => {
  try {
    console.log(`📋 Fetching recommendations for agent ${req.params.id}`);
    
    // Ensure response is always JSON
    res.setHeader('Content-Type', 'application/json');
    
    await initializeDb();
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Agent ID is required' });
    }
    
    const recommendations = await neonDbManager.getRecommendationsForAgent(id);
    console.log(`📋 Found ${recommendations?.length || 0} recommendations for agent ${id}`);
    
    res.json({ success: true, recommendations: recommendations || [] });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ success: false, error: 'Failed to fetch recommendations', details: error.message });
  }
});

// Recommendation CRUD to support modal actions
app.post('/api/agents/:id/recommendations', async (req, res) => {
  try {
    await initializeDb();
    const created = await neonDbManager.createRecommendation(req.params.id, req.body || {});
    res.json({ success: true, recommendation: created });
  } catch (error) {
    console.error('Error creating recommendation:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create recommendation' });
  }
});

app.put('/api/recommendations/:id', async (req, res) => {
  try {
    await initializeDb();
    const updated = await neonDbManager.updateRecommendation(req.params.id, req.body || {});
    res.json({ success: true, recommendation: updated });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    console.error('Error updating recommendation:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update recommendation' });
  }
});

app.delete('/api/recommendations/:id', async (req, res) => {
  try {
    await initializeDb();
    await neonDbManager.deleteRecommendation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    console.error('Error deleting recommendation:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete recommendation' });
  }
});

// Website endpoints
app.get('/api/website/existing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Return empty for new contacts
    res.json({ exists: false });
  } catch (error) {
    console.error('Error fetching existing website:', error);
    res.status(500).json({ error: 'Failed to fetch existing website' });
  }
});

app.get('/api/website/layouts', (req, res) => {
  try {
    // Return basic layout options
    res.json({
      layouts: [
        { id: 'modern', name: 'Modern', description: 'Clean and professional' },
        { id: 'classic', name: 'Classic', description: 'Traditional real estate design' },
        { id: 'minimal', name: 'Minimal', description: 'Simple and elegant' }
      ]
    });
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

app.post('/api/website/preview', async (req, res) => {
  try {
    console.log('🎨 Website preview request received');
    const { theme, layout, content, contact } = req.body;
    
    // Set proper headers for JSON response
    res.setHeader('Content-Type', 'application/json');
    
    // In Netlify environment, we'll generate preview HTML directly and return it
    // rather than trying to save files and serve them from a separate server
    
    const ModularWebsiteGenerator = require('../../modular-website-system/engines/ModularWebsiteGenerator');
    const generator = new ModularWebsiteGenerator();
    
    // Generate the website HTML
    const result = generator.generateWebsite(
      contact || content || { name: 'Sample Agent', email: 'agent@example.com' },
      layout || 'professional',
      theme || 'modern-professional',
      req.body
    );
    
    if (result.success) {
      // Return the preview HTML directly in the response
      res.json({
        success: true,
        previewHtml: result.websiteHTML,
        websiteUrl: `/preview/${Date.now()}.html`, // Placeholder URL for compatibility
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate preview'
      });
    }
  } catch (error) {
    console.error('Error generating preview:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate preview',
      details: error.message 
    });
  }
});

// Website themes endpoint
app.get('/api/website/themes', (req, res) => {
  try {
    const themes = [
      // Professional themes - Only the 3 main themes
      { 
        key: 'modern-professional', 
        name: 'Modern Professional', 
        description: 'Shannon Lavin inspired luxury real estate theme with sophisticated typography, full-screen hero design, and professional aesthetic perfect for high-end real estate professionals', 
        category: 'professional' 
      },
      { 
        key: 'luxury-professional', 
        name: 'Luxury Professional', 
        description: 'Premium luxury real estate theme with full-screen hero, elegant typography, and sophisticated design', 
        category: 'luxury' 
      },
      { 
        key: 'inked-estate', 
        name: 'Inked Estate', 
        description: 'Professional real estate theme inspired by InkedRealEstate.com featuring blue branding with green action elements', 
        category: 'professional' 
      }
    ];
    
    res.json({ 
      success: true, 
      themes: themes,
      default: 'modern-professional'
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// Netlify configuration endpoint
app.get('/api/website/netlify-config', (req, res) => {
  try {
    const config = {
      success: true,
      netlify: {
        siteId: process.env.NETLIFY_SITE_ID || 'bucolic-squirrel-52371e',
        deployUrl: 'https://bucolic-squirrel-52371e.netlify.app',
        buildCommand: 'npm run build',
        publishDir: 'build',
        functionDirectory: 'netlify/functions'
      },
      domains: {
        primary: 'bucolic-squirrel-52371e.netlify.app',
        custom: []
      }
    };
    res.json(config);
  } catch (error) {
    console.error('Error fetching netlify config:', error);
    res.status(500).json({ error: 'Failed to fetch netlify config' });
  }
});

// Available images endpoint
app.get('/api/website/available-images', (req, res) => {
  try {
    const categories = {
      professional: [
        { id: 'prof-1', name: 'Modern Office', url: '/images/professional/modern-office.jpg', description: 'Clean modern office space' },
        { id: 'prof-2', name: 'Business Team', url: '/images/professional/business-team.jpg', description: 'Professional team photo' },
        { id: 'prof-3', name: 'Corporate Building', url: '/images/professional/corporate-building.jpg', description: 'Modern corporate architecture' }
      ],
      real_estate: [
        { id: 're-1', name: 'Luxury Home', url: '/images/real-estate/luxury-home.jpg', description: 'Beautiful luxury property' },
        { id: 're-2', name: 'Modern Interior', url: '/images/real-estate/modern-interior.jpg', description: 'Stylish home interior' },
        { id: 're-3', name: 'City Skyline', url: '/images/real-estate/city-skyline.jpg', description: 'Urban cityscape view' }
      ],
      abstract: [
        { id: 'abs-1', name: 'Geometric Patterns', url: '/images/abstract/geometric.jpg', description: 'Modern geometric design' },
        { id: 'abs-2', name: 'Color Gradients', url: '/images/abstract/gradients.jpg', description: 'Smooth color transitions' },
        { id: 'abs-3', name: 'Minimalist Shapes', url: '/images/abstract/minimal.jpg', description: 'Clean minimal design' }
      ]
    };
    const imagesFlat = Object.values(categories).flat();
    const sources = Object.keys(categories);
    res.json({ success: true, categories, images: imagesFlat, sources, total: imagesFlat.length });
  } catch (error) {
    console.error('Error fetching available images:', error);
    res.status(500).json({ error: 'Failed to fetch available images' });
  }
});

// Export as serverless function
module.exports.handler = serverless(app);
