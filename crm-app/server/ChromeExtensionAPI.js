const axios = require('axios');

class ChromeExtensionAPI {
  constructor() {
    this.baseURL = 'http://localhost:5001';
    this.isConnected = false;
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async connect() {
    try {
      const response = await this.axiosInstance.get('/health');
      this.isConnected = response.status === 200;
      console.log('Connected to Chrome Extension Backend API');
      return true;
    } catch (error) {
      console.error('Failed to connect to Chrome Extension Backend API:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async getAgents(options = {}) {
    try {
      const { page = 1, limit = 1000 } = options;
      const response = await this.axiosInstance.get(`/api/agents`, {
        params: { page, limit }
      });
      
      // Handle the API response format: {"success": true, "agents": [...]}
      if (response.data && response.data.success && Array.isArray(response.data.agents)) {
        return response.data.agents;
      } else {
        console.warn('Unexpected response format from Chrome Extension API:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching agents from Chrome Extension:', error.message);
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }
  }

  async getAgentById(id) {
    try {
      const response = await axios.get(`${this.baseURL}/agents/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get agent by ID:', error);
      throw error;
    }
  }

  async getAgentProperties(agentId) {
    try {
      const response = await axios.get(`${this.baseURL}/agents/${agentId}/properties`);
      return response.data;
    } catch (error) {
      console.error('Failed to get agent properties:', error);
      throw error;
    }
  }

  async searchAgents(searchTerm) {
    try {
      const response = await this.axiosInstance.get(`/api/agents/search`, {
        params: { q: searchTerm }
      });
      
      // Handle the API response format
      if (response.data && response.data.success && Array.isArray(response.data.agents)) {
        return response.data.agents;
      } else {
        console.warn('Unexpected search response format from Chrome Extension API:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error searching agents in Chrome Extension:', error.message);
      throw new Error(`Failed to search agents: ${error.message}`);
    }
  }

  async getAgentStats() {
    try {
      const response = await this.axiosInstance.get('/api/stats');
      
      // Handle the API response format
      if (response.data && response.data.success) {
        return response.data.stats || response.data;
      } else {
        console.warn('Unexpected stats response format from Chrome Extension API:', response.data);
        return { total_agents: 0 };
      }
    } catch (error) {
      console.error('Error fetching stats from Chrome Extension:', error.message);
      return { total_agents: 0 };
    }
  }

  async getExtractionLogs(limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/extractions`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get extraction logs:', error);
      throw error;
    }
  }

  async extractData(url) {
    try {
      const response = await axios.post(`${this.baseURL}/extract`, { url });
      return response.data;
    } catch (error) {
      console.error('Failed to extract data:', error);
      throw error;
    }
  }

  async getRecentExtractions(limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/extractions/recent`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get recent extractions:', error);
      throw error;
    }
  }

  async getAgentPerformanceData(agentId) {
    try {
      const response = await axios.get(`${this.baseURL}/agents/${agentId}/performance`);
      return response.data;
    } catch (error) {
      console.error('Failed to get agent performance data:', error);
      throw error;
    }
  }

  async getAgentReviews(agentId) {
    try {
      const response = await axios.get(`${this.baseURL}/agents/${agentId}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Failed to get agent reviews:', error);
      throw error;
    }
  }
}

module.exports = ChromeExtensionAPI;
