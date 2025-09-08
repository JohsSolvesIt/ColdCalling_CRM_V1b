import axios from "axios";

/**
 * API Service for CRM Application
 * Handles all HTTP requests to the backend
 */
export const api = {
  // General HTTP methods
  async get(url) {
    const response = await axios.get(url);
    return response.data;
  },

  async post(url, data) {
    const response = await axios.post(url, data);
    return response.data;
  },

  async put(url, data) {
    const response = await axios.put(url, data);
    return response.data;
  },

  async delete(url) {
    const response = await axios.delete(url);
    return response.data;
  },

  // Database operations
  async getDatabases() {
    const response = await axios.get('/api/databases');
    const data = response.data;
    
    // Handle new response format from server
    if (data.databases && data.current !== undefined) {
      // New format: server returns { databases: [...], current: {...} }
      return {
        databases: data.databases || [],
        current: data.current
      };
    }
    
    // Fallback: handle old format for backwards compatibility
    const allDatabases = [];
    if (data.sqlite) {
      allDatabases.push(...data.sqlite.map(name => ({ name, type: 'sqlite' })));
    }
    if (data.chrome_extension) {
      allDatabases.push(...data.chrome_extension.map(name => ({ name, type: 'chrome_extension' })));
    }
    
    // Try to get current database from contacts endpoint (which includes _dbName)
    let current = null;
    try {
      const contactsResponse = await axios.get('/api/contacts');
      if (contactsResponse.data && contactsResponse.data._dbName) {
        current = {
          name: contactsResponse.data._dbName,
          type: contactsResponse.data._dbType || 'sqlite'
        };
      }
    } catch (error) {
      console.warn('Could not determine current database:', error);
    }
    
    return {
      databases: allDatabases,
      current: current
    };
  },

  async switchDatabase(name, type = 'sqlite') {
    const response = await axios.post('/api/database/switch', { name, type });
    return response.data;
  },

  async createDatabase(name) {
    const response = await axios.post('/api/database/create', { name });
    return response.data;
  },

  async renameDatabase(oldName, newName) {
    const response = await axios.put('/api/database/rename', { oldName, newName });
    return response.data;
  },

  async deleteDatabase(name) {
    const response = await axios.delete('/api/database/delete', { data: { name } });
    return response.data;
  },

  // Contact operations
  async getContacts() {
    const response = await axios.get('/api/contacts');
    return response.data;
  },

  async saveContact(contact) {
    const response = await axios.put(`/api/contacts/${contact.id}`, contact);
    return response.data;
  },

  async deleteContact(id) {
    const response = await axios.delete(`/api/contacts/${id}`);
    return response.data;
  },

  async moveContacts(contactIds, targetDatabase) {
    const response = await axios.post('/api/contacts/move', { contactIds, targetDatabase });
    return response.data;
  },

  async uploadCSV(file) {
    const formData = new FormData();
    formData.append('csv', file);
    const response = await axios.post('/api/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async getHeaders() {
    const response = await axios.get('/api/headers');
    return response.data;
  },

  // SMS operations
  async getSmsDevices() {
    const response = await axios.get('/api/sms/devices');
    return response.data;
  },

  async connectSmsDevice(deviceId) {
    const response = await axios.post('/api/sms/connect', { deviceId });
    return response.data;
  },

  async sendSms(phoneNumber, message, contactData) {
    const response = await axios.post('/api/sms/send', { phoneNumber, message, contactData });
    return response.data;
  },

  async getSmsStatus() {
    const response = await axios.get('/api/sms/status');
    return response.data;
  },

  async disconnectSms() {
    const response = await axios.post('/api/sms/disconnect');
    return response.data;
  },

  async getSmsTemplates() {
    const response = await axios.get('/api/sms/templates');
    return response.data;
  },

  async addSmsTemplate(template) {
    // Handle both string templates (backward compatibility) and object templates
    let templateData;
    if (typeof template === 'string') {
      // Extract variables from template content
      const variables = this.extractVariables(template);
      templateData = {
        name: this.generateTemplateName(template),
        content: template,
        category: 'custom',
        variables: variables
      };
    } else {
      templateData = template;
    }
    
    const response = await axios.post('/api/sms/templates', templateData);
    return response.data;
  },

  async deleteSmsTemplate(template) {
    // Handle both string templates and template objects
    let templateId;
    if (typeof template === 'string') {
      // For backward compatibility, we need to find the template by content
      const templates = await this.getSmsTemplates();
      const foundTemplate = templates.find(t => t.content === template);
      if (!foundTemplate) {
        throw new Error('Template not found');
      }
      templateId = foundTemplate.id;
    } else {
      templateId = template.id || template;
    }
    
    const response = await axios.delete(`/api/sms/templates/${templateId}`);
    return response.data;
  },

  async updateSmsTemplate(oldTemplate, newTemplate) {
    // Handle both string templates and template objects
    let templateId;
    let updateData;
    
    // Determine the template ID
    if (typeof oldTemplate === 'string') {
      // For backward compatibility, find template by content
      const templates = await this.getSmsTemplates();
      const foundTemplate = templates.find(t => t.content === oldTemplate);
      if (!foundTemplate) {
        throw new Error('Template not found');
      }
      templateId = foundTemplate.id;
    } else if (oldTemplate && oldTemplate.id) {
      // Template object with ID
      templateId = oldTemplate.id;
    } else {
      throw new Error('Invalid template reference');
    }
    
    // Prepare update data
    if (typeof newTemplate === 'string') {
      const variables = this.extractVariables(newTemplate);
      updateData = {
        content: newTemplate,
        variables: variables,
        name: (oldTemplate && oldTemplate.name) || this.generateTemplateName(newTemplate)
      };
    } else {
      updateData = newTemplate;
    }
    
    const response = await axios.put(`/api/sms/templates/${templateId}`, updateData);
    return response.data;
  },

  // Helper method to extract variables from template content
  extractVariables(content) {
    const variablePattern = /\{(\w+)\}/g;
    const variables = [];
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  },

  // Helper method to generate a template name from content
  generateTemplateName(content) {
    // Take first 30 characters and clean them up
    let name = content.substring(0, 30).trim();
    
    // Remove variable placeholders for cleaner name
    name = name.replace(/\{[^}]+\}/g, '...');
    
    // Add ellipsis if truncated
    if (content.length > 30) {
      name += '...';
    }

    return name || 'Custom Template';
  },

  async getSmsHistory(limit) {
    const response = await axios.get(`/api/sms/history?limit=${limit || 50}`);
    return response.data;
  },

  async validatePhone(phoneNumber) {
    const response = await axios.post('/api/sms/validate-phone', { phoneNumber });
    return response.data;
  },

  // System operations
  async getStatus() {
    const response = await axios.get('/api/status');
    return response.data;
  }
};
