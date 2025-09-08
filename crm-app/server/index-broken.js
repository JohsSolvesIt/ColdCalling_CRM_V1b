require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const SMSService = require('./smsService');
const EmailService = require('./emailService');
const UnifiedDatabaseManager = require('./UnifiedDatabaseManager');
const ChromeExtensionAPI = require('./ChromeExtensionAPI');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Storage for file uploads
const upload = multer({ dest: 'uploads/' });

const unifiedDbManager = new UnifiedDatabaseManager();
const smsService = new SMSService(); // Remove SQLite dependency
const emailService = new EmailService();
const chromeExtensionAPI = new ChromeExtensionAPI();

// Initialize the unified database manager
unifiedDbManager.initialize().then(status => {
  console.log('Database initialization status:', status);
}).catch(err => {
  console.error('Database initialization error:', err);
});

// Initialize Chrome Extension API connection
chromeExtensionAPI.connect().then(connected => {
  if (connected) {
    console.log('✅ Chrome Extension API connected successfully');
  } else {
    console.log('⚠️ Chrome Extension API not available - extension features will be disabled');
  }
}).catch(err => {
  console.error('Chrome Extension API connection error:', err);
});

// Routes
app.get('/api/databases', async (req, res) => {
  try {
    const databases = await unifiedDbManager.getAvailableDatabases();
    res.json(databases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/database/switch', async (req, res) => {
  try {
    const { name, type = 'chrome_extension' } = req.body;
    
    // Only Chrome Extension is supported now
    await unifiedDbManager.switchToChromeExtension();
    
    res.json({ success: true, database: 'Realtor Database', type: 'chrome_extension' });
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

app.get('/api/contacts', async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const currentDb = unifiedDbManager.getCurrentDatabase();
    
    if (!currentDb.isConnected) {
      return res.status(400).json({ error: 'Chrome Extension API not connected' });
    }

    const contacts = await unifiedDbManager.getContacts(parseInt(page), parseInt(limit));
    
    // All contacts are now from Chrome Extension - transform to consistent format
    const transformedContacts = contacts.map(contact => {
      return {
        id: contact.id,
        name: contact.name,
        company: contact.company,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zip_code: contact.zip_code,
        license: contact.license,
        url: contact.url,
        description: contact.description,
        office_address: contact.office_address,
        office_phone: contact.office_phone,
        website: contact.website,
        Notes: contact.notes,
        Status: contact.status,
        LastContacted: contact.last_contacted,
        FollowUpAt: contact.follow_up_at,
        source: contact.source,
        _dbType: 'chrome_extension',
        _dbName: 'Realtor Database'
      };
    });
    
    res.json(transformedContacts);
  } catch (error) {
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

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Notes, Status, LastContacted, FollowUpAt } = req.body;
    
    // For now, just log the update - in a full implementation, you'd store updates separately
    console.log(`Contact update for ${id}:`, { Notes, Status, LastContacted, FollowUpAt });
    
    // Return success for UI compatibility
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    res.status(400).json({ 
      error: 'Cannot delete contacts from Chrome Extension database. This database is read-only.',
      type: 'unsupported_operation'
    });
  } catch (error) {
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

    // Ensure target database has metadata table
    await new Promise((resolve, reject) => {
      targetDb.serialize(() => {
        targetDb.run(`CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT
        )`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Ensure target database has SMS tables
    await new Promise((resolve, reject) => {
      targetDb.serialize(() => {
        targetDb.run(`CREATE TABLE IF NOT EXISTS sms_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    await new Promise((resolve, reject) => {
      targetDb.serialize(() => {
        targetDb.run(`CREATE TABLE IF NOT EXISTS sms_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone_number TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT NOT NULL,
          contact_data TEXT,
          device_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Transfer headers metadata from source to target database
    try {
      const sourceHeaders = await new Promise((resolve, reject) => {
        sourceDb.get('SELECT value FROM metadata WHERE key = ?', ['headers'], (err, row) => {
          if (err) reject(err);
          else resolve(row ? JSON.parse(row.value) : []);
        });
      });

      if (sourceHeaders.length > 0) {
        // Get existing headers from target database
        const targetHeaders = await new Promise((resolve, reject) => {
          targetDb.get('SELECT value FROM metadata WHERE key = ?', ['headers'], (err, row) => {
            if (err) reject(err);
            else resolve(row ? JSON.parse(row.value) : []);
          });
        });

        // Merge headers (combine unique headers from both databases)
        const mergedHeaders = [...new Set([...targetHeaders, ...sourceHeaders])];

        // Update target database headers
        await new Promise((resolve, reject) => {
          targetDb.run(
            'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
            ['headers', JSON.stringify(mergedHeaders)],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    } catch (error) {
      console.error('Failed to transfer headers metadata:', error);
      // Continue with contact transfer even if headers transfer fails
    }
    
    let movedCount = 0;
    const errors = [];
    
    // Move each contact
    for (const contactId of contactIds) {
      try {
        // Get contact data from source database
        const contactData = await new Promise((resolve, reject) => {
          sourceDb.get('SELECT * FROM contacts WHERE id = ?', [contactId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (!contactData) {
          console.log(`Contact ${contactId} not found in source database`);
          errors.push(`Contact ${contactId} not found`);
          continue;
        }
        
        // Insert into target database with proper data handling
        await new Promise((resolve, reject) => {
          targetDb.run(
            `INSERT OR REPLACE INTO contacts (id, data, notes, status, last_contacted, follow_up_at, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contactData.id,
              contactData.data || '{}', // Ensure data is not null
              contactData.notes || '',
              contactData.status || 'New',
              contactData.last_contacted || '',
              contactData.follow_up_at || '',
              contactData.created_at || new Date().toISOString(),
              new Date().toISOString() // Update the updated_at timestamp
            ],
            function(err) {
              if (err) {
                console.error(`Error inserting contact ${contactId}:`, err);
                reject(err);
              } else {
                resolve();
              }
            }
          );
        });
        
        // Delete from source database only after successful insert
        await new Promise((resolve, reject) => {
          sourceDb.run('DELETE FROM contacts WHERE id = ?', [contactId], (err) => {
            if (err) {
              console.error(`Error deleting contact ${contactId} from source:`, err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        movedCount++;
        
      } catch (error) {
        console.error(`Failed to move contact ${contactId}:`, error);
        errors.push(`Failed to move contact ${contactId}: ${error.message}`);
      }
    }
    
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

// SMS Routes
    
    db.run(
      `INSERT OR REPLACE INTO contacts (id, data, notes, status, last_contacted, follow_up_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        JSON.stringify(otherData),
        Notes || '',
        Status || 'New',
        LastContacted || '',
        FollowUpAt || '',
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ success: true, id });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/databases/:dbName/contacts/:id', async (req, res) => {
  try {
    const { dbName, id } = req.params;
    const db = await unifiedDbManager.sqliteManager.getDatabase(dbName);
    
    if (!db) {
      return res.status(404).json({ error: `Database "${dbName}" not found` });
    }

    const { Notes, Status, LastContacted, FollowUpAt, ...otherData } = req.body;
    
    db.run(
      `UPDATE contacts SET data = ?, notes = ?, status = ?, last_contacted = ?, follow_up_at = ?, updated_at = ? 
       WHERE id = ?`,
      [
        JSON.stringify(otherData),
        Notes || '',
        Status || 'New',
        LastContacted || '',
        FollowUpAt || '',
        new Date().toISOString(),
        id
      ],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          res.status(404).json({ error: 'Contact not found' });
          return;
        }
        res.json({ success: true, id });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/databases/:dbName/contacts/:id', async (req, res) => {
  try {
    const { dbName, id } = req.params;
    const db = await unifiedDbManager.sqliteManager.getDatabase(dbName);
    
    if (!db) {
      return res.status(404).json({ error: `Database "${dbName}" not found` });
    }

    db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Contact not found' });
        return;
      }
      res.json({ success: true, id });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH endpoint for partial updates (same as PUT for this application)
app.patch('/api/databases/:dbName/contacts/:id', async (req, res) => {
  try {
    const { dbName, id } = req.params;
    const db = await unifiedDbManager.sqliteManager.getDatabase(dbName);
    
    if (!db) {
      return res.status(404).json({ error: `Database "${dbName}" not found` });
    }

    const { Notes, Status, LastContacted, FollowUpAt, ...otherData } = req.body;
    
    db.run(
      `UPDATE contacts SET data = ?, notes = ?, status = ?, last_contacted = ?, follow_up_at = ?, updated_at = ? 
       WHERE id = ?`,
      [
        JSON.stringify(otherData),
        Notes || '',
        Status || 'New',
        LastContacted || '',
        FollowUpAt || '',
        new Date().toISOString(),
        id
      ],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          res.status(404).json({ error: 'Contact not found' });
          return;
        }
        res.json({ success: true, id });
      }
    );
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

app.get('/api/headers', async (req, res) => {
  try {
    // Return predefined headers for Chrome Extension data
    const headers = [
      'name', 'company', 'phone', 'email', 'address', 'city', 'state', 'zip_code',
      'license', 'url', 'description', 'office_address', 'office_phone', 'website'
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
    const connectedDevice = await smsService.connectDevice(deviceId);
    const deviceInfo = await smsService.getDeviceInfo();
    res.json({ 
      connected: true, 
      device: {
        id: connectedDevice,
        ...deviceInfo
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/send', async (req, res) => {
  try {
    const { phoneNumber, message, contactData } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await smsService.sendSMS(phoneNumber, message, contactData);
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
    console.error('Error getting SMS templates:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/templates', async (req, res) => {
  try {
    const { template } = req.body;
    
    if (!template) {
      return res.status(400).json({ error: 'Template text is required' });
    }

    const success = await smsService.addTemplate(template);
    if (success) {
      res.json({ success: true, message: 'Template added successfully' });
    } else {
      res.status(400).json({ error: 'Failed to add template (may already exist)' });
    }
  } catch (error) {
    console.error('Error adding SMS template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete SMS template
app.delete('/api/sms/templates', async (req, res) => {
  try {
    const { template } = req.body;
    
    if (!template) {
      return res.status(400).json({ error: 'Template text is required' });
    }
    
    const success = await smsService.deleteTemplate(template);
    if (success) {
      res.json({ success: true, message: 'Template deleted successfully' });
    } else {
      res.status(400).json({ error: 'Template not found' });
    }
  } catch (error) {
    console.error('Error deleting SMS template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update SMS template
app.put('/api/sms/templates', async (req, res) => {
  try {
    const { oldTemplate, newTemplate } = req.body;
    
    if (!oldTemplate || !newTemplate) {
      return res.status(400).json({ error: 'Both old and new template text are required' });
    }
    
    const success = await smsService.updateTemplate(oldTemplate, newTemplate);
    if (success) {
      res.json({ success: true, message: 'Template updated successfully' });
    } else {
      res.status(400).json({ error: 'Template not found or new template already exists' });
    }
  } catch (error) {
    console.error('Error updating SMS template:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sms/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await smsService.getSmsHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting SMS history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/validate-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const formatted = smsService.formatPhoneNumber(phoneNumber);
    const isValid = smsService.isValidPhoneNumber(phoneNumber);
    
    res.json({
      original: phoneNumber,
      formatted,
      isValid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sms/status', async (req, res) => {
  try {
    if (!smsService.isConnected) {
      return res.json({ connected: false });
    }
    
    const deviceInfo = await smsService.getDeviceInfo();
    res.json({ 
      connected: true, 
      deviceInfo 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/optimize-device', async (req, res) => {
  try {
    const result = await smsService.optimizeDeviceForAutoClick();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Device optimized for consistent auto-click behavior' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/preflight-check', async (req, res) => {
  try {
    const result = await smsService.preFlightCheck();
    
    res.json({ 
      success: result.success,
      message: result.success ? 'Pre-flight checks passed' : 'Pre-flight checks failed',
      error: result.error || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/test-autoclick', async (req, res) => {
  try {
    const result = await smsService.testAutoClick();
    
    res.json({ 
      success: result.success,
      compatible: result.compatible || false,
      message: result.success ? 'Auto-click test passed' : 'Auto-click test failed',
      error: result.error || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sms/disconnect', async (req, res) => {
  try {
    smsService.disconnect();
    res.json({ success: true, message: 'Disconnected from SMS device' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email Routes
app.get('/api/email/status', async (req, res) => {
  try {
    const isConfigured = emailService.isConfigured();
    res.json({ 
      configured: isConfigured,
      service: 'Brevo',
      sender: emailService.defaultSender
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/test', async (req, res) => {
  try {
    const { toEmail, subject, content } = req.body;
    
    if (!toEmail) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const result = await emailService.sendTestEmail(toEmail, subject, content);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/campaign', async (req, res) => {
  try {
    const { contact, template } = req.body;
    
    if (!contact) {
      return res.status(400).json({ error: 'Contact data is required' });
    }

    const result = await emailService.sendCampaignEmail(contact, template);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System Status Endpoint
app.get('/api/status', async (req, res) => {
  try {
    const currentDb = unifiedDbManager.getCurrentDatabase();
    const availableDbs = await unifiedDbManager.getAvailableDatabases();
    
    let contactCount = 0;
    try {
      const contacts = await unifiedDbManager.getContacts();
      contactCount = contacts.length;
    } catch (err) {
      console.warn('Could not get contact count:', err.message);
    }

    const status = {
      timestamp: new Date().toISOString(),
      database: {
        connected: currentDb.isConnected,
        currentDatabase: currentDb.name,
        currentDatabaseType: 'chrome_extension',
        availableDatabases: availableDbs,
        contactCount: contactCount,
        source: 'Chrome Extension'
      },
      sms: {
        connected: false,
        deviceInfo: null
      },
      adb: {
        connected: false,
        devices: []
      },
      chromeExtension: {
        connected: chromeExtensionAPI.isConnected,
        backendUrl: chromeExtensionAPI.baseURL,
        status: chromeExtensionAPI.isConnected ? 'Available' : 'Not Connected'
      }
    };

    // Get SQLite specific data only if in SQLite mode
    if (currentDb.type === 'sqlite' && currentDb.isConnected) {
      const db = unifiedDbManager.sqliteManager.getCurrentDb();
      if (db) {
        // Get import history from metadata
        await new Promise((resolve, reject) => {
          db.all('SELECT * FROM metadata WHERE key LIKE "import_%"', (err, rows) => {
            if (err) reject(err);
            else {
              status.database.importHistory = rows.map(row => {
                try {
                  const data = JSON.parse(row.value);
                  return {
                    timestamp: row.key.replace('import_', ''),
                    ...data
                  };
                } catch (e) {
                  return {
                    timestamp: row.key.replace('import_', ''),
                    error: 'Could not parse import data'
                  };
                }
              }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              
              status.database.lastImport = status.database.importHistory[0] || null;
              resolve();
            }
          });
        });
      }
    }

    // Get SMS status
    try {
      if (smsService.isConnected) {
        status.sms.connected = true;
        status.sms.deviceInfo = await smsService.getDeviceInfo();
      }
    } catch (error) {
      console.warn('Failed to get SMS status:', error);
    }

    // Get ADB status
    try {
      const devices = await smsService.getDevices();
      status.adb.devices = devices;
      status.adb.connected = devices.length > 0;
    } catch (error) {
      console.warn('Failed to get ADB status:', error);
    }

    res.json(status);
  } catch (error) {
    console.error('Status endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chrome Extension API Routes
app.get('/api/chrome-extension/status', async (req, res) => {
  try {
    const isConnected = await chromeExtensionAPI.connect();
    res.json({
      connected: isConnected,
      backendUrl: chromeExtensionAPI.baseURL,
      status: isConnected ? 'Available' : 'Not Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chrome Extension status error:', error);
    res.status(500).json({ 
      connected: false,
      error: error.message,
      status: 'Error' 
    });
  }
});

app.get('/api/chrome-extension/agents', async (req, res) => {
  try {
    if (!chromeExtensionAPI.isConnected) {
      const connected = await chromeExtensionAPI.connect();
      if (!connected) {
        return res.status(503).json({ 
          error: 'Chrome Extension backend not available',
          message: 'The Chrome Extension backend is not running or not connected.'
        });
      }
    }

    const { page = 1, limit = 100 } = req.query;
    const agents = await chromeExtensionAPI.getAgents({ page: parseInt(page), limit: parseInt(limit) });
    
    res.json({
      success: true,
      agents: agents,
      count: agents.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Chrome Extension agents error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.get('/api/chrome-extension/agents/:id', async (req, res) => {
  try {
    if (!chromeExtensionAPI.isConnected) {
      const connected = await chromeExtensionAPI.connect();
      if (!connected) {
        return res.status(503).json({ 
          error: 'Chrome Extension backend not available',
          message: 'The Chrome Extension backend is not running or not connected.'
        });
      }
    }

    const { id } = req.params;
    const agent = await chromeExtensionAPI.getAgentById(id);
    
    if (!agent) {
      return res.status(404).json({ 
        success: false,
        error: 'Agent not found' 
      });
    }
    
    res.json({
      success: true,
      agent: agent
    });
  } catch (error) {
    console.error('Chrome Extension agent by ID error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Website generation endpoint
app.post('/api/generate-realtor-website', async (req, res) => {
  try {
    const { contact, database } = req.body;
    
    if (!contact || !database) {
      return res.status(400).json({ 
        error: 'Contact and database are required' 
      });
    }

    // Import the enhanced generator
    const EnhancedRealtorGenerator = require('../../vvebjs/enhanced-realtor-generator.js');
    const generator = new EnhancedRealtorGenerator();
    await generator.init();

    // Generate website for specific contact
    const result = await generator.generateSingleRealtorWebsite(contact, database);
    
    res.json({
      success: true,
      websiteUrl: result.websiteUrl,
      editorUrl: result.editorUrl,
      filePath: result.filePath
    });
  } catch (error) {
    console.error('Website generation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Generate all websites endpoint
app.post('/api/generate-all-websites', async (req, res) => {
  try {
    const EnhancedRealtorGenerator = require('../../vvebjs/enhanced-realtor-generator.js');
    const generator = new EnhancedRealtorGenerator();
    await generator.init();

    const result = await generator.generateAllPages();
    
    res.json({
      success: true,
      totalGenerated: result.totalGenerated,
      sqliteCount: result.sqliteCount,
      chromeExtensionCount: result.chromeExtensionCount,
      indexUrl: result.indexUrl
    });
  } catch (error) {
    console.error('Website generation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser to: http://localhost:${PORT}`);
});
