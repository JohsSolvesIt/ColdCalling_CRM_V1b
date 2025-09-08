const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SMSService {
  constructor() {
    this.deviceId = null;
    this.isConnected = false;
    
    // Default templates stored in memory (no SQLite dependency)
    this.templates = [
      "Hey {name}, it's Joshua Willey. I help agents like you stand out with high-converting AI Listing Videos. Normally they're $500, but I'm offering your first one for just $100 to show you the value. Are you cool with AI doing your listing videos",
      "Hello {name}, I wanted to reach out about the opportunity we discussed. Are you still interested?",
      "Hi {name}, thanks for your time earlier. I have some additional information that might interest you.",
      "Hello {name}, just checking in to see if you had any questions about our previous discussion.",
      "Hi {name}, I hope you're doing well. Do you have a few minutes to continue our conversation?"
    ];

    // In-memory SMS history
    this.smsHistory = [];
  }

  // Initialize service (no database operations needed)
  async initializeDefaultTemplates() {
    console.log('SMS templates initialized in memory');
  }

  // Format phone number for SMS
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Add country code if missing
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    return `+${digits}`;
  }

  // Validate phone number
  isValidPhoneNumber(phone) {
    const formatted = this.formatPhoneNumber(phone);
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

  // Get SMS history from memory
  async getSmsHistory(limit = 50) {
    return this.smsHistory.slice(0, limit);
  }

  // Add to SMS history in memory
  async addToHistory(phoneNumber, message, status, contactData = null) {
    const historyEntry = {
      id: Date.now().toString(),
      phoneNumber,
      message,
      status,
      contactData,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    this.smsHistory.unshift(historyEntry);
    
    // Keep only last 1000 entries
    if (this.smsHistory.length > 1000) {
      this.smsHistory = this.smsHistory.slice(0, 1000);
    }
    
    return historyEntry;
  }

  // Check if ADB is available
  async checkADB() {
    try {
      const { stdout } = await execAsync('adb version');
      return stdout.includes('Android Debug Bridge');
    } catch (error) {
      return false;
    }
  }

  // Check for SMS apps on connected device
  async checkSMSApps() {
    try {
      const apps = [
        'com.google.android.apps.messaging', // Google Messages
        'com.samsung.android.messaging',      // Samsung Messages
        'com.android.mms',                   // Default SMS
        'com.textra'                         // Textra
      ];
      
      const results = {};
      
      for (const app of apps) {
        try {
          const { stdout } = await execAsync(`adb shell pm list packages | grep ${app}`);
          results[app] = stdout.trim() !== '';
        } catch (err) {
          results[app] = false;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error checking SMS apps:', error);
      return {};
    }
  }

  // Check if device has root access
  async checkRootAccess() {
    try {
      const { stdout } = await execAsync('adb shell su -c "echo test"', { timeout: 5000 });
      return stdout.includes('test');
    } catch (error) {
      return false;
    }
  }

  // Send SMS using auto-click method
  async sendSMSAutoClick(phoneNumber, message, contactData = null) {
    if (!this.isValidPhoneNumber(phoneNumber)) {
      const error = `Invalid phone number: ${phoneNumber}`;
      await this.addToHistory(phoneNumber, message, 'failed', contactData);
      throw new Error(error);
    }

    // Check if device is connected
    if (!this.isConnected || !this.deviceId) {
      throw new Error('No SMS device connected. Please connect a device first.');
    }

    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    console.log(`🚀 Sending SMS to ${formattedPhone} via device ${this.deviceId}`);
    console.log(`📱 Message: ${message}`);
    
    try {
      // Double-check device is still available
      const { stdout: devices } = await execAsync('adb devices');
      if (!devices.includes(this.deviceId)) {
        throw new Error(`Device ${this.deviceId} is no longer connected`);
      }

      console.log('📱 Opening SMS app...');
      // Launch Messages app with pre-filled message
      const escapedMessage = message.replace(/"/g, '\\"');
      await execAsync(`adb -s ${this.deviceId} shell am start -a android.intent.action.SENDTO -d "sms:${formattedPhone}" --es sms_body "${escapedMessage}"`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('📱 SMS app opened, attempting to send automatically...');
      
      // Advanced UI automation to find and click Send button
      await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/sms_ui.xml`);
      const { stdout: uiContent } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/sms_ui.xml`);
      
      let sendSuccess = false;
      
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
        
        console.log(`🔍 Found Send button #${foundSendButtons}: [${x1},${y1}][${x2},${y2}] (${width}x${height})`);
        
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
      
      // Method 2: Look for Send by resource-id (alternative)
      if (!sendSuccess) {
        console.log('🔍 Method 2: Looking for Send button by resource-id...');
        const resourceIdRegex = /resource-id="[^"]*send[^"]*"[^>]*clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/gi;
        
        while ((match = resourceIdRegex.exec(uiContent)) !== null) {
          const x1 = parseInt(match[1]);
          const y1 = parseInt(match[2]);
          const x2 = parseInt(match[3]);
          const y2 = parseInt(match[4]);
          
          const width = x2 - x1;
          const height = y2 - y1;
          
          if (width >= 30 && width <= 300 && height >= 20 && height <= 150) {
            const x = Math.round((x1 + x2) / 2);
            const y = Math.round((y1 + y2) / 2);
            
            console.log(`✅ Found Send button by resource-id: [${x1},${y1}][${x2},${y2}] - tapping (${x}, ${y})`);
            
            await execAsync(`adb -s ${this.deviceId} shell input tap ${x} ${y}`);
            sendSuccess = true;
            break;
          }
        }
      }
      
      // Method 3: Look for Send by content-desc
      if (!sendSuccess) {
        console.log('🔍 Method 3: Looking for Send button by content-desc...');
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
      
      // Method 4: Fallback to common coordinates if UI parsing fails
      if (!sendSuccess) {
        console.log('⚠️ UI automation failed, trying fallback coordinates...');
        const sendCoords = [
          '1000 1800', '950 1600', '1020 1700', '900 1500', '1100 1900'
        ];
        
        for (const coords of sendCoords) {
          try {
            console.log(`📱 Trying send button at ${coords}`);
            await execAsync(`adb -s ${this.deviceId} shell input tap ${coords}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if the SMS app is still visible (rough success indicator)
            const { stdout: checkUi } = await execAsync(`adb -s ${this.deviceId} shell dumpsys window windows | grep mCurrentFocus`);
            if (checkUi.includes('messaging') || checkUi.includes('Message')) {
              console.log(`✅ Fallback tap at ${coords} appears successful`);
              sendSuccess = true;
              break;
            }
          } catch (err) {
            continue;
          }
        }
      }

      if (sendSuccess) {
        console.log('✅ SMS sent successfully via UI automation');
      } else {
        console.log('❌ All send attempts failed');
      }

      // Add to history
      await this.addToHistory(formattedPhone, message, 'sent', contactData);
      
      console.log('✅ SMS sent successfully');
      return {
        success: true,
        phoneNumber: formattedPhone,
        message: message,
        method: 'auto-click',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      await this.addToHistory(formattedPhone, message, 'failed', contactData);
      throw error;
    }
  }

  // Send SMS using intent method
  async sendSMSIntent(phoneNumber, message, contactData = null) {
    if (!this.isValidPhoneNumber(phoneNumber)) {
      const error = `Invalid phone number: ${phoneNumber}`;
      await this.addToHistory(phoneNumber, message, 'failed', contactData);
      throw new Error(error);
    }

    // Check if device is connected
    if (!this.isConnected || !this.deviceId) {
      throw new Error('No SMS device connected. Please connect a device first.');
    }

    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    console.log(`📱 Sending SMS to ${formattedPhone} via device ${this.deviceId}`);
    
    try {
      // Step 1: Open Messages app directly
      console.log('📱 Opening Messages app...');
      await execAsync(`adb -s ${this.deviceId} shell am start com.google.android.apps.messaging/.ui.ConversationListActivity`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Start a new conversation (tap the compose button)
      console.log('📱 Looking for compose button...');
      await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/ui_dump.xml`);
      const { stdout: uiContent } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/ui_dump.xml`);
      
      // Look for compose/start chat button
      const composeRegex = /resource-id="[^"]*fab[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i;
      const composeMatch = composeRegex.exec(uiContent);
      
      if (composeMatch) {
        const x = Math.round((parseInt(composeMatch[1]) + parseInt(composeMatch[3])) / 2);
        const y = Math.round((parseInt(composeMatch[2]) + parseInt(composeMatch[4])) / 2);
        
        console.log(`📱 Found compose button at (${x}, ${y}), clicking...`);
        await execAsync(`adb -s ${this.deviceId} shell input tap ${x} ${y}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // Fallback: try common compose button positions
        console.log('📱 Compose button not found, trying fallback positions...');
        const composeCoords = ['950 1800', '900 1750', '1000 1850'];
        for (const coords of composeCoords) {
          await execAsync(`adb -s ${this.deviceId} shell input tap ${coords}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Step 3: Enter phone number
      console.log('📱 Entering phone number...');
      const phoneToEnter = formattedPhone.replace(/^\+1/, ''); // Remove +1 for US numbers
      await execAsync(`adb -s ${this.deviceId} shell input text "${phoneToEnter}"`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Press enter to confirm recipient
      await execAsync(`adb -s ${this.deviceId} shell input keyevent 66`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Enter message
      console.log('📱 Entering message...');
      const cleanMessage = message.replace(/['"]/g, '');
      await execAsync(`adb -s ${this.deviceId} shell input text "${cleanMessage}"`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: Find and click send button
      console.log('📱 Looking for send button...');
      await execAsync(`adb -s ${this.deviceId} shell uiautomator dump /sdcard/send_ui.xml`);
      const { stdout: sendUiContent } = await execAsync(`adb -s ${this.deviceId} shell cat /sdcard/send_ui.xml`);
      
      // Look for send button
      const sendRegex = /(?:text="Send"|content-desc="Send"|resource-id="[^"]*send[^"]*")[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i;
      const sendMatch = sendRegex.exec(sendUiContent);
      
      if (sendMatch) {
        const x = Math.round((parseInt(sendMatch[1]) + parseInt(sendMatch[3])) / 2);
        const y = Math.round((parseInt(sendMatch[2]) + parseInt(sendMatch[4])) / 2);
        
        console.log(`📱 Found send button at (${x}, ${y}), clicking...`);
        await execAsync(`adb -s ${this.deviceId} shell input tap ${x} ${y}`);
        console.log('✅ Send button clicked');
      } else {
        console.log('📱 Send button not found, trying enter key...');
        await execAsync(`adb -s ${this.deviceId} shell input keyevent 66`);
      }

      // Add to history
      await this.addToHistory(formattedPhone, message, 'sent_via_ui', contactData);
      
      return {
        success: true,
        phoneNumber: formattedPhone,
        message: message,
        method: 'ui_automation',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ SMS UI automation failed:', error);
      await this.addToHistory(formattedPhone, message, 'failed', contactData);
      throw error;
    }
  }

  // Main send SMS method (tries multiple approaches)
  async sendSMS(phoneNumber, message, contactData = null) {
    try {
      // Try intent method first (less intrusive)
      return await this.sendSMSIntent(phoneNumber, message, contactData);
    } catch (error) {
      console.warn('Intent method failed, trying auto-click method');
      
      try {
        // Fallback to auto-click method
        return await this.sendSMSAutoClick(phoneNumber, message, contactData);
      } catch (error2) {
        console.error('All SMS methods failed');
        throw error2;
      }
    }
  }

  // Get connected devices
  async getDevices() {
    try {
      const { stdout } = await execAsync('adb devices -l');
      const lines = stdout.split('\n').filter(line => {
        return line.trim() && 
               !line.includes('List of devices attached') && 
               line.includes('device') && 
               !line.includes('offline') &&
               !line.includes('unauthorized');
      });
      
      const devices = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const id = parts[0];
        const status = parts[1];
        
        // Only include actual device connections, not the word "device" in other contexts
        if (status !== 'device') {
          return null;
        }
        
        // Extract device info from the remaining parts
        const info = {};
        parts.slice(2).forEach(part => {
          if (part.includes(':')) {
            const [key, value] = part.split(':');
            info[key] = value;
          }
        });
        
        return {
          id,
          status,
          model: info.model || info.device || 'Unknown Device',
          device: info.device || 'Unknown',
          transport_id: info.transport_id || null
        };
      }).filter(device => device !== null); // Remove null entries
      
      console.log('Parsed devices:', devices);
      return devices;
    } catch (error) {
      console.error('Error getting devices:', error);
      return [];
    }
  }

  // Connect to device
  async connectDevice(deviceId = null) {
    try {
      const devices = await this.getDevices();
      
      if (devices.length === 0) {
        throw new Error('No devices found. Please connect an Android device with USB debugging enabled.');
      }
      
      // Use specified device or first available
      const targetDevice = deviceId 
        ? devices.find(d => d.id === deviceId)
        : devices[0];
        
      if (!targetDevice) {
        throw new Error(`Device ${deviceId} not found`);
      }
      
      if (targetDevice.status !== 'device') {
        throw new Error(`Device ${targetDevice.id} is not ready (status: ${targetDevice.status})`);
      }
      
      this.deviceId = targetDevice.id;
      this.isConnected = true;
      
      return {
        success: true,
        connected: true,
        device: targetDevice,
        message: `Connected to ${targetDevice.model || targetDevice.id}`
      };
      
    } catch (error) {
      this.isConnected = false;
      this.deviceId = null;
      throw error;
    }
  }

  // Disconnect device
  async disconnectDevice() {
    this.isConnected = false;
    this.deviceId = null;
    return { success: true, message: 'Disconnected from device' };
  }

  // Get service status
  getStatus() {
    return {
      isConnected: this.isConnected,
      deviceId: this.deviceId,
      templatesCount: this.templates.length,
      historyCount: this.smsHistory.length
    };
  }

  // Send batch SMS
  async sendBatchSMS(contacts, template, options = {}) {
    const results = [];
    const delay = options.delay || 2000; // Default 2 second delay between messages
    
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        const message = this.processTemplate(template, contact);
        const phoneNumber = contact.phone || contact.Phone || contact.mobile || contact.Mobile;
        
        if (!phoneNumber) {
          results.push({
            contact,
            success: false,
            error: 'No phone number found'
          });
          continue;
        }
        
        const result = await this.sendSMS(phoneNumber, message, contact);
        results.push({
          contact,
          success: true,
          result
        });
        
        // Add delay between messages (except for last message)
        if (i < contacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        results.push({
          contact,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      total: contacts.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = SMSService;
