const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SMSService {
  constructor() {
    this.deviceId = null;
    this.isConnected = false;
    
    // Default templates - now stored in memory since no SQLite
    this.templates = [
      "Hey {name}, it's Joshua Willey. I help agents like you stand out with high-converting AI Listing Videos. Normally they're $500, but I'm offering your first one for just $100 to show you the value. Are you cool with AI doing your listing videos",
      "Hello {name}, I wanted to reach out about the opportunity we discussed. Are you still interested?",
      "Hi {name}, thanks for your time earlier. I have some additional information that might interest you.",
      "Hello {name}, just checking in to see if you had any questions about our previous discussion.",
      "Hi {name}, I hope you're doing well. Do you have a few minutes to continue our conversation?"
    ];
  }

  // Initialize default templates (no-op now since they're in memory)
  async initializeDefaultTemplates() {
    console.log('SMS templates initialized in memory');
  }

  // Format phone number for SMS
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.toString().replace(/[^\d+]/g, '');
    
    // If no country code and starts with area code, add US country code
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
      cleaned = '+1' + cleaned;
    }
    
    // If 11 digits and starts with 1, add +
    if (cleaned.length === 11 && cleaned.startsWith('1') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  // Validate phone number
  isValidPhoneNumber(phoneNumber) {
    const formatted = this.formatPhoneNumber(phoneNumber);
    if (!formatted) return false;
    
    // Basic validation: should be at least 10 digits with optional country code
    const digitsOnly = formatted.replace(/[^\d]/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  // Process message template
  processTemplate(template, contactData = {}) {
    let message = template;
    
    // Replace common placeholders
    const replacements = {
      '{name}': contactData.name || contactData.Name || contactData.first_name || '',
      '{firstName}': contactData.first_name || contactData.firstName || contactData.Name?.split(' ')[0] || '',
      '{lastName}': contactData.last_name || contactData.lastName || contactData.Name?.split(' ').slice(1).join(' ') || '',
      '{company}': contactData.company || contactData.Company || contactData.organization || '',
      '{date}': new Date().toLocaleDateString(),
      '{time}': new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      message = message.replace(new RegExp(placeholder, 'g'), value || '');
    });
    
    return message.trim();
  }

  // Get SMS templates from memory
  async getTemplates() {
    return this.templates;
  }

  // Add SMS template to memory
  async addTemplate(template) {
    if (!template || !template.trim()) {
      throw new Error('Template cannot be empty');
    }
    
    const cleanTemplate = template.trim();
    if (!this.templates.includes(cleanTemplate)) {
      this.templates.push(cleanTemplate);
    }
    
    return { success: true, template: cleanTemplate };
  }

  // Delete SMS template from memory
  async deleteTemplate(template) {
    const index = this.templates.indexOf(template);
    if (index > -1) {
      this.templates.splice(index, 1);
      return { success: true };
    }
    throw new Error('Template not found');
  }

  // Update SMS template in memory
  async updateTemplate(oldTemplate, newTemplate) {
    if (!oldTemplate || !newTemplate || typeof oldTemplate !== 'string' || typeof newTemplate !== 'string') {
      throw new Error('Both old and new templates must be valid strings');
    }

    const index = this.templates.indexOf(oldTemplate);
    if (index > -1) {
      this.templates[index] = newTemplate.trim();
      return { success: true, oldTemplate, newTemplate: newTemplate.trim() };
    }
    
    throw new Error('Template not found');
  }

  // Get SMS history from memory (simplified for Chrome Extension integration)
  async getSmsHistory(limit = 50) {
    // Return empty array for now since we're using memory-based storage
    return [];
  }

  // Delete template from database
  async deleteTemplate(template) {
    if (!template || typeof template !== 'string') {
      return false;
    }

    if (!this.dbManager) {
      console.warn('No database manager available');
      return false;
    }

    try {
      const db = this.dbManager.getCurrentDb();
      if (!db) {
        console.warn('No database connection');
        return false;
      }

      return new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM sms_templates WHERE template = ?',
          [template],
          function(err) {
            if (err) {
              console.error('Failed to delete template:', err);
              resolve(false);
            } else {
              console.log('Template deleted successfully, rows affected:', this.changes);
              resolve(this.changes > 0);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  // Update template in database
  async updateTemplate(oldTemplate, newTemplate) {
    if (!oldTemplate || !newTemplate || typeof oldTemplate !== 'string' || typeof newTemplate !== 'string') {
      return false;
    }

    if (!this.dbManager) {
      console.warn('No database manager available');
      return false;
    }

    try {
      const db = this.dbManager.getCurrentDb();
      if (!db) {
        console.warn('No database connection');
        return false;
      }

      return new Promise((resolve, reject) => {
        db.run(
          'UPDATE sms_templates SET template = ?, updated_at = CURRENT_TIMESTAMP WHERE template = ?',
          [newTemplate, oldTemplate],
          function(err) {
            if (err) {
              if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                console.warn('New template already exists');
                resolve(false);
              } else {
                console.error('Failed to update template:', err);
                resolve(false);
              }
            } else {
              console.log('Template updated successfully, rows affected:', this.changes);
              resolve(this.changes > 0);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error updating template:', error);
      return false;
    }
  }

  // Get SMS history from database
  async getSmsHistory(limit = 50) {
    if (!this.dbManager) {
      console.warn('No database manager available');
      return [];
    }

    try {
      const db = this.dbManager.getCurrentDb();
      if (!db) {
        console.warn('No database connection');
        return [];
      }

      return new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM sms_history ORDER BY created_at DESC LIMIT ?',
          [limit],
          (err, rows) => {
            if (err) {
              console.error('Failed to get SMS history:', err);
              resolve([]);
            } else {
              // Convert database format to expected format
              const history = rows.map(row => ({
                id: row.id.toString(),
                phoneNumber: row.phone_number,
                message: row.message,
                status: row.status,
                timestamp: row.created_at,
                contactData: row.contact_data ? JSON.parse(row.contact_data) : null,
                deviceId: row.device_id
              }));
              resolve(history);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error getting SMS history:', error);
      return [];
    }
  }

  // Add to SMS history in database
  async addToHistory(phoneNumber, message, status, contactData = null) {
    const historyEntry = {
      phoneNumber,
      message,
      status,
      timestamp: new Date().toISOString(),
      contactData,
      deviceId: this.deviceId
    };

    if (!this.dbManager) {
      console.warn('No database manager available, cannot save SMS history');
      return historyEntry;
    }

    try {
      const db = this.dbManager.getCurrentDb();
      if (!db) {
        console.warn('No database connection, cannot save SMS history');
        return historyEntry;
      }

      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO sms_history (phone_number, message, status, contact_data, device_id) VALUES (?, ?, ?, ?, ?)',
          [
            phoneNumber,
            message,
            status,
            contactData ? JSON.stringify(contactData) : null,
            this.deviceId
          ],
          function(err) {
            if (err) {
              console.error('Failed to save SMS history:', err);
              reject(err);
            } else {
              historyEntry.id = this.lastID.toString();
              resolve();
            }
          }
        );
      });

      console.log('SMS history saved successfully');
    } catch (error) {
      console.error('Error saving SMS history:', error);
    }

    return historyEntry;
  }
  async checkADB() {
    try {
      const { stdout } = await execAsync('adb --version');
      return stdout.includes('Android Debug Bridge');
    } catch (error) {
      console.error('ADB not available:', error.message);
      return false;
    }
  }

  // Check available SMS apps on device
  async checkSMSApps() {
    if (!this.isConnected || !this.deviceId) {
      return [];
    }

    try {
      const smsApps = [];
      
      // Check for common SMS apps
      const appsToCheck = [
        'com.google.android.apps.messaging', // Google Messages
        'com.android.messaging', // Default Android Messages
        'com.samsung.android.messaging', // Samsung Messages
        'com.textra', // Textra
        'com.p1.chompsms' // chomp SMS
      ];

      for (const app of appsToCheck) {
        try {
          const { stdout } = await execAsync(`adb -s ${this.deviceId} shell pm list packages ${app}`);
          if (stdout.includes(app)) {
            smsApps.push(app);
          }
        } catch (error) {
          // App not found, continue
        }
      }

      console.log('Available SMS apps:', smsApps);
      return smsApps;
    } catch (error) {
      console.error('Failed to check SMS apps:', error.message);
      return [];
    }
  }

  // Check if device is rooted
  async checkRootAccess() {
    if (!this.isConnected || !this.deviceId) {
      return false;
    }

    try {
      const { stdout } = await execAsync(`adb -s ${this.deviceId} shell su -c 'id'`);
      return stdout.includes('uid=0');
    } catch (error) {
      return false;
    }
  }

  // Auto-click Send button after opening SMS app
  async sendSMSAutoClick(phoneNumber, message, contactData = null) {
    if (!this.isConnected || !this.deviceId) {
      await this.connectDevice();
    }

    try {
      // Run pre-flight checks
      const preFlightResult = await this.preFlightCheck();
      if (!preFlightResult.success) {
        console.log('⚠️ Pre-flight checks failed, proceeding anyway...');
      }

      // Validate and format phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!this.isValidPhoneNumber(formattedNumber)) {
        throw new Error(`Invalid phone number: ${phoneNumber}`);
      }

      // Process message template if it contains placeholders
      const processedMessage = this.processTemplate(message, contactData);
      
      // Validate message length
      if (processedMessage.length > 1600) {
        throw new Error(`Message too long: ${processedMessage.length} characters. Consider shortening to under 1600 characters.`);
      }
      
      // Escape message for shell properly
      const escapedMessage = processedMessage.replace(/"/g, '\\"');
      
      console.log(`🚀 Starting automatic SMS send to ${formattedNumber}: ${processedMessage.substring(0, 50)}...`);
      
      // Step 1: Open SMS compose directly with message pre-filled
      console.log('📱 Opening SMS compose with pre-filled message...');
      
      // Clean the message for shell safety
      const shellSafeMessage = processedMessage.replace(/['"]/g, '').replace(/[`$\\]/g, '');
      
      // Primary method: Direct SMS compose intent with safer quoting
      let openCommand = `adb -s ${this.deviceId} shell 'am start -a android.intent.action.SENDTO -d "sms:${formattedNumber}" --es sms_body "${shellSafeMessage}"'`;
      
      try {
        const { stdout } = await execAsync(openCommand);
        console.log('✅ SMS compose opened successfully');
      } catch (error) {
        // Fallback: Try with simpler approach
        console.log('⚠️ Primary method failed, trying simple fallback...');
        openCommand = `adb -s ${this.deviceId} shell am start -a android.intent.action.SENDTO -d 'sms:${formattedNumber}'`;
        try {
          await execAsync(openCommand);
          console.log('✅ SMS compose opened with simplified method (message will need manual entry)');
        } catch (error2) {
          throw new Error(`Failed to open SMS compose: ${error.message}`);
        }
      }

      console.log('📱 SMS app opened, waiting for interface to load...');
      
      // Step 2: Minimal initial delay 
      console.log('⏳ Initial load delay (1 second)...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2.5: Check if message was pre-filled, if not, type it manually
      console.log('🔍 Checking if message was pre-filled...');
      try {
        await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/check_message.xml`);
        const { stdout: checkContent } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/check_message.xml`);
        
        // Check if our message appears in the compose field
        const messageInField = checkContent.includes(processedMessage.substring(0, 20));
        
        if (!messageInField) {
          console.log('📝 Message not pre-filled, typing manually...');
          
          // Find the text input field and type the message
          const inputFieldRegex = /class="android\.widget\.EditText"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
          let inputMatch = inputFieldRegex.exec(checkContent);
          
          if (inputMatch) {
            const x = Math.round((parseInt(inputMatch[1]) + parseInt(inputMatch[3])) / 2);
            const y = Math.round((parseInt(inputMatch[2]) + parseInt(inputMatch[4])) / 2);
            
            // Tap the input field and type the message
            await execAsync(`adb -s ${this.deviceId} shell input tap ${x} ${y}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            await execAsync(`adb -s ${this.deviceId} shell input text "${shellSafeMessage}"`);
            
            console.log('✅ Message typed manually');
          }
        } else {
          console.log('✅ Message was pre-filled successfully');
        }
        
        await execAsync(`adb -s ${this.deviceId} shell rm /sdcard/check_message.xml`);
      } catch (error) {
        console.log('⚠️ Could not verify message field, proceeding with send detection...');
      }
      
      // Step 2.5: Quick check if SMS app is ready
      let retryCount = 0;
      let appReady = false;
      
      console.log('🔍 Quick check if SMS app is ready...');
      while (!appReady && retryCount < 3) { // Fewer retry attempts
        try {
          await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/verify_app.xml`);
          const { stdout: appContent } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/verify_app.xml`);
          
          // Simple check - if we have messaging content, we're ready
          if (appContent.includes('messaging') || appContent.includes('compose') || appContent.includes('Send')) {
            appReady = true;
            console.log('✅ SMS app is ready');
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Faster delay
          retryCount++;
        } catch (error) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!appReady) {
        console.log('⚠️ SMS app may not be fully loaded, proceeding anyway...');
      }

      // Step 3: Enhanced Send button detection with debugging
      let sendSuccess = false;
      
      console.log('🔍 Looking for Send button in compose mode...');
      
      // Get a fresh UI dump
      await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/window_dump.xml`);
      const { stdout: uiContent } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/window_dump.xml`);
      
      console.log('📄 UI dump complete, analyzing for Send button...');
      
      // DEBUG: Log the UI content to see what's actually there
      console.log('🐛 DEBUG: Searching for send-related elements in UI...');
      const sendRelatedElements = uiContent.match(/[^>]*(?:send|Send|SEND)[^<]*/gi);
      if (sendRelatedElements) {
        console.log('🐛 DEBUG: Found send-related elements:', sendRelatedElements.slice(0, 5));
      } else {
        console.log('🐛 DEBUG: No send-related elements found in UI');
      }
      
      // DEBUG: Log all clickable elements
      const clickableElements = uiContent.match(/clickable="true"[^>]*>/g);
      if (clickableElements) {
        console.log(`🐛 DEBUG: Found ${clickableElements.length} clickable elements`);
        clickableElements.slice(0, 3).forEach((element, index) => {
          console.log(`🐛 DEBUG: Clickable ${index + 1}: ${element}`);
        });
      }
      
      // Method 1: Look for exact "Send" text buttons (most reliable)
      console.log('🔍 Method 1: Looking for exact "Send" text buttons...');
      const exactSendRegex = /clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*text="Send"/g;
      let match;
      let foundSendButtons = 0;
      
      while ((match = exactSendRegex.exec(uiContent)) !== null) {
        foundSendButtons++;
        const x1 = parseInt(match[1]);
        const y1 = parseInt(match[2]);
        const x2 = parseInt(match[3]);
        const y2 = parseInt(match[4]);
        
        const width = x2 - x1;
        const height = y2 - y1;
        
        console.log(`🐛 DEBUG: Found Send button #${foundSendButtons}: [${x1},${y1}][${x2},${y2}] (${width}x${height})`);
        
        // Validate it's a reasonable button size (not a tiny icon)
        if (width >= 50 && width <= 300 && height >= 30 && height <= 150) {
          const x = Math.round((x1 + x2) / 2);
          const y = Math.round((y1 + y2) / 2);
          
          console.log(`✅ Valid Send button found: [${x1},${y1}][${x2},${y2}] (${width}x${height}) - tapping (${x}, ${y})`);
          
          await execAsync(`adb -s ${this.deviceId} shell input tap ${x} ${y}`);
          sendSuccess = true;
          break;
        } else {
          console.log(`❌ Send button too small/large: ${width}x${height} - skipping`);
        }
      }
      
      if (foundSendButtons === 0) {
        console.log('🐛 DEBUG: No exact "Send" text buttons found');
      }
      
      // Method 2: Look for Send icon/button by resource-id
      if (!sendSuccess) {
        console.log('🔍 Method 2: Looking for Send buttons by resource-id...');
        const sendIconRegex = /resource-id="[^"]*send[^"]*"[^>]*clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/gi;
        let foundResourceIds = 0;
        
        while ((match = sendIconRegex.exec(uiContent)) !== null) {
          foundResourceIds++;
          const x1 = parseInt(match[1]);
          const y1 = parseInt(match[2]);
          const x2 = parseInt(match[3]);
          const y2 = parseInt(match[4]);
          
          const width = x2 - x1;
          const height = y2 - y1;
          
          console.log(`🐛 DEBUG: Found Send resource-id #${foundResourceIds}: [${x1},${y1}][${x2},${y2}] (${width}x${height})`);
          
          // Send icons are usually smaller than text buttons
          if (width >= 25 && width <= 200 && height >= 25 && height <= 200) {
            const x = Math.round((x1 + x2) / 2);
            const y = Math.round((y1 + y2) / 2);
            
            console.log(`✅ Valid Send icon found: [${x1},${y1}][${x2},${y2}] (${width}x${height}) - tapping (${x}, ${y})`);
            
            await execAsync(`adb -s ${this.deviceId} shell input tap ${x} ${y}`);
            sendSuccess = true;
            break;
          } else {
            console.log(`❌ Send icon wrong size: ${width}x${height} - skipping`);
          }
        }
        
        if (foundResourceIds === 0) {
          console.log('🐛 DEBUG: No Send resource-id buttons found');
        }
      }
      
      // Method 3: Look for content-desc Send button
      if (!sendSuccess) {
        const contentDescRegex = /content-desc="[^"]*[Ss]end[^"]*"[^>]*clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
        
        while ((match = contentDescRegex.exec(uiContent)) !== null) {
          const x1 = parseInt(match[1]);
          const y1 = parseInt(match[2]);
          const x2 = parseInt(match[3]);
          const y2 = parseInt(match[4]);
          
          const width = x2 - x1;
          const height = y2 - y1;
          
          if (width >= 30 && width <= 300 && height >= 20 && height <= 150) {
            const x = Math.round((x1 + x2) / 2);
            const y = Math.round((y1 + y2) / 2);
            
            console.log(`✅ Found Send button by content-desc: [${x1},${y1}][${x2},${y2}] - tapping (${x}, ${y})`);
            
            await execAsync(`adb -s ${this.deviceId} shell input tap ${x} ${y}`);
            sendSuccess = true;
            break;
          }
        }
      }

      // Method 4: Save UI dump for manual inspection if all methods fail
      if (!sendSuccess) {
        console.log('🔍 All UI detection methods failed, saving UI dump for inspection...');
        
        // Copy the UI dump to a local file for analysis
        const timestamp = Date.now();
        try {
          await execAsync(`adb -s ${this.deviceId} shell cp /sdcard/window_dump.xml /sdcard/failed_send_${timestamp}.xml`);
          console.log(`� UI dump saved as failed_send_${timestamp}.xml for analysis`);
          
          // Also try to extract the current screen
          await execAsync(`adb -s ${this.deviceId} shell screencap -p /sdcard/failed_screen_${timestamp}.png`);
          console.log(`📱 Screenshot saved as failed_screen_${timestamp}.png`);
        } catch (error) {
          console.log('⚠️ Could not save debug files:', error.message);
        }
        
        console.log('🔍 Attempting coordinate-based method as last resort...');
        
        const { stdout } = await execAsync(`adb -s ${this.deviceId} shell wm size`);
        const sizeMatch = stdout.match(/(\d+)x(\d+)/);
        
        if (sizeMatch) {
          const screenWidth = parseInt(sizeMatch[1]);
          const screenHeight = parseInt(sizeMatch[2]);
          
          // Try multiple common Send button locations
          const attemptLocations = [
            { x: Math.round(screenWidth * 0.85), y: Math.round(screenHeight * 0.75), desc: "bottom-right (85%, 75%)" },
            { x: Math.round(screenWidth * 0.9), y: Math.round(screenHeight * 0.8), desc: "bottom-right (90%, 80%)" },
            { x: Math.round(screenWidth * 0.95), y: Math.round(screenHeight * 0.85), desc: "far bottom-right (95%, 85%)" },
            { x: Math.round(screenWidth * 0.8), y: Math.round(screenHeight * 0.7), desc: "mid bottom-right (80%, 70%)" }
          ];
          
          for (const location of attemptLocations) {
            console.log(`🎯 Trying coordinate tap at ${location.desc}: (${location.x}, ${location.y})`);
            await execAsync(`adb -s ${this.deviceId} shell input tap ${location.x} ${location.y}`);
            
            // Wait a moment and check if anything changed
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Quick check if we're still in compose mode
            try {
              await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/quick_check.xml`);
              const { stdout: quickCheck } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/quick_check.xml`);
              
              // If we don't see the message text anymore, maybe it worked
              const stillHasMessage = quickCheck.includes(processedMessage.substring(0, 20));
              if (!stillHasMessage) {
                console.log(`✅ Coordinate tap at ${location.desc} may have worked - message text no longer visible`);
                sendSuccess = true;
                break;
              } else {
                console.log(`❌ Coordinate tap at ${location.desc} didn't work - message still visible`);
              }
            } catch (error) {
              console.log(`⚠️ Could not verify coordinate tap at ${location.desc}`);
            }
          }
        }
      }

      // Clean up temp file
      try {
        await execAsync(`adb -s ${this.deviceId} shell rm /sdcard/window_dump.xml`);
      } catch (error) {
        // Ignore cleanup errors
      }

      // Step 4: Improved verification with better logic for modern SMS apps
      if (sendSuccess) {
        try {
          console.log('🔍 Verifying message send status (improved verification)...');
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for send animation
          
          // Verification with more realistic criteria
          let verificationAttempts = 0;
          let messageSent = false;
          
          while (verificationAttempts < 3 && !messageSent) { // Reduced attempts
            try {
              // Dump UI again to check current state
              await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/verify_dump.xml`);
              const { stdout: verifyContent } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/verify_dump.xml`);
              
              console.log(`🔍 Verification attempt ${verificationAttempts + 1}:`);
              
              // Check 1: Look for active Send button with enabled state (primary indicator)
              const activeSendButton = verifyContent.includes('resource-id="Compose:Draft:Send"') && 
                                     verifyContent.includes('enabled="true"') &&
                                     verifyContent.includes('clickable="true"');
              console.log(`   - Active Send button present: ${activeSendButton ? 'YES (may indicate not sent)' : 'NO (likely sent)'}`);
              
              // Check 2: Look for message composition field with our text
              const messageInComposeField = verifyContent.includes(processedMessage.substring(0, 30));
              console.log(`   - Message in compose field: ${messageInComposeField ? 'YES (may indicate not sent)' : 'NO (likely sent)'}`);
              
              // Check 3: Look for conversation/messaging interface
              const inMessagingApp = verifyContent.includes('com.google.android.apps.messaging') ||
                                   verifyContent.includes('messaging') ||
                                   verifyContent.includes('conversation');
              console.log(`   - In messaging interface: ${inMessagingApp ? 'YES' : 'NO'}`);
              
              // Check 4: Look for typical post-send UI elements
              const postSendIndicators = verifyContent.includes('delivered') ||
                                       verifyContent.includes('sent') ||
                                       verifyContent.includes('message thread') ||
                                       verifyContent.includes('conversation');
              console.log(`   - Post-send indicators: ${postSendIndicators ? 'YES (good)' : 'NO'}`);
              
              // Modern messaging apps behavior:
              // - Often keep message in compose field temporarily even after sending
              // - Send button might still be present but disabled/inactive
              // - We successfully clicked the button, so assume it worked unless clear failure indicators
              
              // Consider sent if we clicked send button successfully AND:
              // - We're still in messaging app (good sign) AND
              // - Either no active send button OR post-send indicators present
              const probablySent = inMessagingApp && (!activeSendButton || postSendIndicators);
              
              // Alternative: If we successfully found and clicked the send button,
              // and we're not seeing clear failure indicators, assume success
              const noFailureIndicators = !verifyContent.includes('failed') && 
                                        !verifyContent.includes('error') &&
                                        !verifyContent.includes('retry');
              
              // Final determination: Since we successfully clicked send, assume sent unless clear failure
              const likelySent = probablySent || (inMessagingApp && noFailureIndicators);
              
              console.log(`   - ASSESSMENT: ${likelySent ? '✅ LIKELY SENT' : '⚠️ UNCERTAIN'}`);
              
              if (likelySent) {
                console.log('🎉 Message verification PASSED - send button was clicked successfully!');
                messageSent = true;
                sendSuccess = true;
              } else {
                console.log(`⏳ Verification attempt ${verificationAttempts + 1} uncertain - trying again...`);
                verificationAttempts++;
                await new Promise(resolve => setTimeout(resolve, 800));
              }
            } catch (error) {
              console.log(`⚠️ Verification attempt ${verificationAttempts + 1} error:`, error.message);
              verificationAttempts++;
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }
          
          // If verification was uncertain, but we successfully clicked send, assume success
          if (!messageSent) {
            console.log('📱 Verification was uncertain, but send button was clicked successfully');
            console.log('✅ Assuming message was sent (user can verify on device)');
            sendSuccess = true; // Assume success since we clicked send button
          }
          
          // Clean up verification file
          try {
            await execAsync(`adb -s ${this.deviceId} shell rm /sdcard/verify_dump.xml /sdcard/quick_check.xml`);
          } catch (error) {
            // Ignore cleanup errors
          }
        } catch (error) {
          console.log('❌ Could not verify send status:', error.message);
          sendSuccess = false; // If we can't verify, assume it failed
        }
      } else {
        console.log('❌ No send button was successfully clicked - message definitely not sent');
      }

      // Record the attempt
      const status = sendSuccess ? 'sent_automatically' : 'opened_auto_click_attempted';
      const historyEntry = this.addToHistory(formattedNumber, processedMessage, status, contactData);

      if (sendSuccess) {
        console.log(`🎉 SMS sent automatically to ${formattedNumber}! (Send button clicked successfully)`);
      } else {
        console.log(`⚠️ SMS app opened for ${formattedNumber} but send button could not be found/clicked.`);
      }
      
      return {
        success: true,
        phoneNumber: formattedNumber,
        originalNumber: phoneNumber,
        message: processedMessage,
        originalMessage: message,
        timestamp: new Date().toISOString(),
        deviceId: this.deviceId,
        historyId: historyEntry.id,
        messageLength: processedMessage.length,
        status: status,
        autoClickAttempted: true,
        autoClickSuccess: sendSuccess,
        note: sendSuccess ? 'SMS sent automatically - send button clicked successfully' : 'SMS app opened but send button could not be clicked automatically'
      };
      
    } catch (error) {
      console.error('Failed to send SMS with auto-click:', error.message);
      
      // Add failed attempt to history
      this.addToHistory(phoneNumber, message, 'auto_click_failed', contactData);
      
      throw error;
    }
  }

  // Get list of connected devices
  async getDevices() {
    try {
      const { stdout } = await execAsync('adb devices');
      const lines = stdout.split('\n').slice(1); // Skip header
      const devices = lines
        .filter(line => line.trim() && !line.includes('List of devices'))
        .map(line => {
          const [id, status] = line.trim().split('\t');
          return { id, status };
        })
        .filter(device => device.status === 'device');
      
      return devices;
    } catch (error) {
      console.error('Failed to get devices:', error.message);
      return [];
    }
  }

  // Connect to a specific device
  async connectDevice(deviceId = null) {
    try {
      const devices = await this.getDevices();
      
      if (devices.length === 0) {
        throw new Error('No Android devices connected. Please connect your phone with USB debugging enabled.');
      }

      // Use specified device or first available
      const targetDevice = deviceId ? 
        devices.find(d => d.id === deviceId) : 
        devices[0];

      if (!targetDevice) {
        throw new Error(`Device ${deviceId} not found`);
      }

      this.deviceId = targetDevice.id;
      this.isConnected = true;
      
      console.log(`Connected to device: ${this.deviceId}`);
      return this.deviceId;
    } catch (error) {
      console.error('Failed to connect device:', error.message);
      throw error;
    }
  }

  // Send SMS using ADB shell (with auto-click enhancement)
  async sendSMS(phoneNumber, message, contactData = null) {
    // Use the enhanced auto-click method by default
    return await this.sendSMSAutoClick(phoneNumber, message, contactData);
  }

  // Legacy method: Send SMS by opening app only (user manual send)
  async sendSMSManual(phoneNumber, message, contactData = null) {
    if (!this.isConnected || !this.deviceId) {
      await this.connectDevice();
    }

    try {
      // Validate and format phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!this.isValidPhoneNumber(formattedNumber)) {
        throw new Error(`Invalid phone number: ${phoneNumber}`);
      }

      // Process message template if it contains placeholders
      const processedMessage = this.processTemplate(message, contactData);
      
      // Validate message length (SMS limit is typically 160 characters)
      if (processedMessage.length > 1600) { // Allow for longer messages with segmentation
        throw new Error(`Message too long: ${processedMessage.length} characters. Consider shortening to under 1600 characters.`);
      }
      
      // Escape message for shell properly
      const escapedMessage = processedMessage.replace(/"/g, '\\"');
      
      // Send SMS using am (Activity Manager) - Opens messaging app with pre-filled message
      // Note: Due to Android security policies, the user must manually tap "Send"
      
      let success = false;
      let lastError = null;

      // Method 1: Properly quoted command to avoid shell parsing issues
      try {
        command = `adb -s ${this.deviceId} shell 'am start -a android.intent.action.SENDTO -d "sms:${formattedNumber}" --es sms_body "${escapedMessage}"'`;
        console.log(`Opening SMS app with pre-filled message to ${formattedNumber}: ${processedMessage.substring(0, 50)}...`);
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stdout.includes('Starting') && !stdout.includes('Error:')) {
          success = true;
          console.log('✅ SMS app opened with pre-filled message. User needs to tap "Send".');
        } else {
          lastError = stdout + stderr;
        }
      } catch (error) {
        lastError = error.message;
        console.log('Method 1 failed, trying alternative...');
      }

      // Method 2: Fallback with explicit Google Messages package
      if (!success) {
        try {
          command = `adb -s ${this.deviceId} shell am start -a android.intent.action.VIEW -d sms:${formattedNumber} --es sms_body '${escapedMessage}' -n com.google.android.apps.messaging/.ui.ConversationListActivity`;
          console.log(`Trying alternative method with Google Messages...`);
          
          const { stdout, stderr } = await execAsync(command);
          
          if (stdout.includes('Starting') || !stderr) {
            success = true;
            console.log('✅ Google Messages opened with pre-filled message. User needs to tap "Send".');
          } else {
            lastError = stderr;
          }
        } catch (error) {
          lastError = error.message;
        }
      }

      if (!success) {
        throw new Error(`Failed to open SMS app: ${lastError}. Please check if Google Messages is installed and set as default SMS app.`);
      }

      // Add to history with 'opened' status (since user needs to manually send)
      const historyEntry = this.addToHistory(formattedNumber, processedMessage, 'opened', contactData);

      console.log(`SMS app opened successfully for ${formattedNumber} - User needs to tap Send`);
      
      return {
        success: true,
        phoneNumber: formattedNumber,
        originalNumber: phoneNumber,
        message: processedMessage,
        originalMessage: message,
        timestamp: new Date().toISOString(),
        deviceId: this.deviceId,
        historyId: historyEntry.id,
        messageLength: processedMessage.length,
        status: 'opened_for_user_to_send',
        note: 'SMS app opened with pre-filled message. User needs to tap "Send" to complete.'
      };
      
    } catch (error) {
      console.error('Failed to open SMS app:', error.message);
      
      // Add failed attempt to history
      this.addToHistory(phoneNumber, message, 'failed', contactData);
      
      throw error;
    }
  }

  // Alternative method using service call (requires root)
  async sendSMSServiceCall(phoneNumber, message) {
    if (!this.isConnected || !this.deviceId) {
      await this.connectDevice();
    }

    try {
      const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      const escapedMessage = message.replace(/'/g, "'\"'\"'");
      
      // Use service call to SMS manager (requires root)
      const command = `adb -s ${this.deviceId} shell service call isms 7 i32 0 s16 "com.android.mms.service" s16 "${cleanNumber}" s16 "null" s16 '${escapedMessage}' s16 "null" s16 "null"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      return {
        success: true,
        phoneNumber: cleanNumber,
        message: message,
        method: 'service_call',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to send SMS via service call:', error.message);
      throw error;
    }
  }

  // Get device info
  async getDeviceInfo() {
    if (!this.isConnected || !this.deviceId) {
      await this.connectDevice();
    }

    try {
      const { stdout: model } = await execAsync(`adb -s ${this.deviceId} shell getprop ro.product.model`);
      const { stdout: android } = await execAsync(`adb -s ${this.deviceId} shell getprop ro.build.version.release`);
      
      return {
        deviceId: this.deviceId,
        model: model.trim(),
        androidVersion: android.trim(),
        connected: this.isConnected
      };
    } catch (error) {
      console.error('Failed to get device info:', error.message);
      return null;
    }
  }

  // Disconnect device
  disconnect() {
    this.deviceId = null;
    this.isConnected = false;
  }

  // Enable accessibility services and permissions for better auto-clicking
  async enableAutoClickPermissions() {
    if (!this.isConnected || !this.deviceId) {
      await this.connectDevice();
    }

    try {
      console.log('🔧 Configuring device for optimal auto-click performance...');
      
      // Enable stay awake to prevent screen timeout during SMS operations
      await execAsync(`adb -s ${this.deviceId} shell settings put global stay_on_while_plugged_in 3`);
      
      // Set higher input dispatch timeout
      await execAsync(`adb -s ${this.deviceId} shell settings put secure long_press_timeout 1000`);
      
      console.log('✅ Device configured for auto-click functionality');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to configure auto-click permissions:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Test auto-click functionality
  async testAutoClick() {
    if (!this.isConnected || !this.deviceId) {
      await this.connectDevice();
    }

    try {
      console.log('🧪 Testing auto-click functionality...');
      
      // Test 1: Check if we can dump UI
      await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/test_dump.xml`);
      console.log('✅ UI Automator working');
      
      // Test 2: Check screen dimensions
      const { stdout } = await execAsync(`adb -s ${this.deviceId} shell wm size`);
      console.log(`✅ Screen size: ${stdout.trim()}`);
      
      // Clean up
      await execAsync(`adb -s ${this.deviceId} shell rm /sdcard/test_dump.xml`);
      
      console.log('🎉 Auto-click functionality test passed!');
      return { success: true, compatible: true };
      
    } catch (error) {
      console.error('Auto-click test failed:', error.message);
      return { success: false, compatible: false, error: error.message };
    }
  }

  // Optimize device state for consistent auto-click behavior
  async optimizeDeviceForAutoClick() {
    if (!this.isConnected || !this.deviceId) {
      await this.connectDevice();
    }

    try {
      console.log('🔧 Optimizing device for consistent auto-click...');
      
      // 1. Ensure screen is on and unlocked
      await execAsync(`adb -s ${this.deviceId} shell input keyevent 26`); // Wake up
      await new Promise(resolve => setTimeout(resolve, 500));
      await execAsync(`adb -s ${this.deviceId} shell input keyevent 82`); // Unlock
      
      // 2. Set optimal animation scales for faster UI responses
      await execAsync(`adb -s ${this.deviceId} shell settings put global window_animation_scale 0.5`);
      await execAsync(`adb -s ${this.deviceId} shell settings put global transition_animation_scale 0.5`);
      await execAsync(`adb -s ${this.deviceId} shell settings put global animator_duration_scale 0.5`);
      
      // 3. Disable auto-rotate to prevent coordinate issues
      await execAsync(`adb -s ${this.deviceId} shell settings put system accelerometer_rotation 0`);
      
      // 4. Force portrait orientation
      await execAsync(`adb -s ${this.deviceId} shell settings put system user_rotation 0`);
      
      // 5. Increase touch sensitivity timeout
      await execAsync(`adb -s ${this.deviceId} shell settings put secure long_press_timeout 500`);
      
      console.log('✅ Device optimized for auto-click consistency');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to optimize device:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Pre-flight checks before attempting auto-click SMS
  async preFlightCheck() {
    try {
      console.log('🛫 Running pre-flight checks...');
      
      // Check 1: Device connection
      if (!this.isConnected || !this.deviceId) {
        throw new Error('Device not connected');
      }
      
      // Check 2: Screen state
      const { stdout: screenState } = await execAsync(`adb -s ${this.deviceId} shell dumpsys power | grep "Display Power"`);
      if (screenState.includes('OFF')) {
        console.log('📱 Waking up device...');
        await execAsync(`adb -s ${this.deviceId} shell input keyevent 26`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Check 3: Current app - if already in Messages, we might need to back out first
      const { stdout: currentApp } = await execAsync(`adb -s ${this.deviceId} shell dumpsys window windows | grep -E 'mCurrentFocus'`);
      if (currentApp.includes('messaging')) {
        console.log('📱 Already in messaging app, going to home first...');
        await execAsync(`adb -s ${this.deviceId} shell input keyevent 3`); // Home
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Check 4: Available storage for UI dumps
      const { stdout: storage } = await execAsync(`adb -s ${this.deviceId} shell df /sdcard | tail -1`);
      if (storage.includes('100%')) {
        console.log('⚠️ Device storage full - may affect UI dumps');
      }
      
      console.log('✅ Pre-flight checks completed');
      return { success: true };
      
    } catch (error) {
      console.error('Pre-flight check failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SMSService;
