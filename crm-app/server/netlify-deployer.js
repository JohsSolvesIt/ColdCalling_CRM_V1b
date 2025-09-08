const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

class NetlifyDeployer {
  constructor() {
    // You'll need to set these environment variables
    this.accessToken = process.env.NETLIFY_ACCESS_TOKEN;
    this.apiBase = 'https://api.netlify.com/api/v1';
  }

  /**
   * Deploy a single HTML file to Netlify
   * @param {string} filePath - Path to the HTML file to deploy
   * @param {string} siteName - Name for the Netlify site
   * @param {object} contactData - Contact data for metadata
   * @returns {Promise<object>} Deployment result with URL
   */
  async deployWebsite(filePath, siteName, contactData = {}) {
    try {
      if (!this.accessToken) {
        throw new Error('Netlify access token not configured. Please set NETLIFY_ACCESS_TOKEN environment variable.');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`Website file not found: ${filePath}`);
      }

      console.log(`🚀 Starting Netlify deployment for: ${siteName}`);

      // Create a temporary directory for the site (outside of watched directories)
      const tempDir = path.join('/tmp', 'netlify-deploy', uuidv4());
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        // Copy the HTML file to index.html in temp directory
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(path.join(tempDir, 'index.html'), htmlContent);

        // Create a simple _redirects file for SPA behavior (optional)
        fs.writeFileSync(path.join(tempDir, '_redirects'), '/*    /index.html   200');

        // Create a package.json for metadata (optional)
        const packageJson = {
          name: siteName,
          version: '1.0.0',
          description: `Real estate website for ${contactData.name || 'Agent'}`,
          private: true
        };
        fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

        // Create zip file
        const zipPath = path.join(tempDir, 'site.zip');
        await this.createZipFile(tempDir, zipPath, ['site.zip']);

        // Deploy to Netlify
        const deploymentResult = await this.deployToNetlify(zipPath, siteName, contactData);

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        return deploymentResult;

      } catch (error) {
        // Clean up temp directory on error
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
      }

    } catch (error) {
      console.error('❌ Netlify deployment error:', error);
      throw error;
    }
  }

  /**
   * Update an existing Netlify site with new content
   * @param {string} filePath - Path to the HTML file to deploy
   * @param {string} siteId - Existing Netlify site ID
   * @param {object} contactData - Contact data for metadata
   * @returns {Promise<object>} Deployment result with URL
   */
  async updateExistingSite(filePath, siteId, contactData = {}) {
    try {
      if (!this.accessToken) {
        throw new Error('Netlify access token not configured. Please set NETLIFY_ACCESS_TOKEN environment variable.');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`Website file not found: ${filePath}`);
      }

      if (!siteId) {
        throw new Error('Site ID is required for updating existing site');
      }

      console.log(`🔄 Updating existing Netlify site: ${siteId}`);

      // First, get the existing site info
      const siteInfo = await this.getSiteInfo(siteId);
      console.log(`📋 Retrieved site info: ${siteInfo.name}`);

      // Create a temporary directory for the site (outside of watched directories)
      const tempDir = path.join('/tmp', 'netlify-deploy', uuidv4());
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        // Copy the HTML file to index.html in temp directory
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(path.join(tempDir, 'index.html'), htmlContent);

        // Create a simple _redirects file for SPA behavior (optional)
        fs.writeFileSync(path.join(tempDir, '_redirects'), '/*    /index.html   200');

        // Create a package.json for metadata (optional)
        const packageJson = {
          name: siteInfo.name,
          version: '1.0.0',
          description: `Real estate website for ${contactData.name || 'Agent'} (Updated)`,
          private: true
        };
        fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

        // Create zip file
        const zipPath = path.join(tempDir, 'site.zip');
        await this.createZipFile(tempDir, zipPath, ['site.zip']);

        // Deploy to existing site
        const deploymentResult = await this.deployToExistingSite(zipPath, siteId, siteInfo);

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        return deploymentResult;

      } catch (error) {
        // Clean up temp directory on error
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
      }

    } catch (error) {
      console.error('❌ Netlify site update error:', error);
      throw error;
    }
  }

  /**
   * Deploy zip file to existing Netlify site
   */
  async deployToExistingSite(zipPath, siteId, siteInfo) {
    try {
      // Deploy the zip file to existing site
      const zipBuffer = fs.readFileSync(zipPath);
      
      const deployResponse = await fetch(`${this.apiBase}/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/zip',
        },
        body: zipBuffer
      });

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Netlify deployment failed: ${deployResponse.status} - ${errorText}`);
      }

      const deployResult = await deployResponse.json();

      console.log(`✅ Site update successful!`);
      console.log(`🌐 Site URL: ${deployResult.ssl_url || deployResult.url}`);
      console.log(`📱 Deploy URL: ${deployResult.deploy_ssl_url || deployResult.deploy_url}`);

      return {
        success: true,
        siteId: siteId,
        siteName: siteInfo.name,
        siteUrl: siteInfo.ssl_url || siteInfo.url,
        deployId: deployResult.id,
        deployUrl: deployResult.deploy_ssl_url || deployResult.deploy_url,
        adminUrl: siteInfo.admin_url,
        state: deployResult.state,
        createdAt: deployResult.created_at
      };

    } catch (error) {
      console.error('❌ Netlify API error during update:', error);
      throw error;
    }
  }

  /**
   * Get information about an existing Netlify site
   */
  async getSiteInfo(siteId) {
    try {
      const response = await fetch(`${this.apiBase}/sites/${siteId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get site info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting site info:', error);
      throw error;
    }
  }

  /**
   * Create a zip file from directory contents
   */
  async createZipFile(sourceDir, outputPath, excludeFiles = []) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`📦 Created zip file: ${archive.pointer()} total bytes`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add files from source directory
      const files = fs.readdirSync(sourceDir);
      files.forEach(file => {
        if (!excludeFiles.includes(file)) {
          const filePath = path.join(sourceDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isFile()) {
            archive.file(filePath, { name: file });
          }
        }
      });

      archive.finalize();
    });
  }

  /**
   * Deploy zip file to Netlify
   */
  async deployToNetlify(zipPath, siteName, contactData) {
    try {
      // First, try to create a new site
      const siteResult = await this.createNetlifySite(siteName, contactData);
      const siteId = siteResult.id;

      console.log(`🌐 Created Netlify site: ${siteResult.name} (${siteId})`);

      // Deploy the zip file
      const zipBuffer = fs.readFileSync(zipPath);
      
      const deployResponse = await fetch(`${this.apiBase}/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/zip',
        },
        body: zipBuffer
      });

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Netlify deployment failed: ${deployResponse.status} - ${errorText}`);
      }

      const deployResult = await deployResponse.json();

      console.log(`✅ Deployment successful!`);
      console.log(`🌐 Site URL: ${deployResult.ssl_url || deployResult.url}`);
      console.log(`📱 Deploy URL: ${deployResult.deploy_ssl_url || deployResult.deploy_url}`);

      return {
        success: true,
        siteId: siteId,
        siteName: siteResult.name,
        siteUrl: siteResult.ssl_url || siteResult.url,
        deployId: deployResult.id,
        deployUrl: deployResult.deploy_ssl_url || deployResult.deploy_url,
        adminUrl: siteResult.admin_url,
        state: deployResult.state,
        createdAt: deployResult.created_at
      };

    } catch (error) {
      console.error('❌ Netlify API error:', error);
      throw error;
    }
  }

  /**
   * Create a new Netlify site
   */
  async createNetlifySite(siteName, contactData) {
    const siteConfig = {
      name: siteName,
      custom_domain: null,
      processing_settings: {
        html: {
          pretty_urls: true
        }
      }
    };

    const response = await fetch(`${this.apiBase}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(siteConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Netlify site: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Generate a unique site name based on contact data
   */
  generateSiteName(contactData) {
    const baseName = (contactData.name || 'realtor')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const timestamp = Date.now().toString().slice(-6);
    return `${baseName}-${timestamp}`;
  }

  /**
   * Check deployment status
   */
  async getDeploymentStatus(siteId, deployId) {
    try {
      const response = await fetch(`${this.apiBase}/sites/${siteId}/deploys/${deployId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get deployment status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting deployment status:', error);
      throw error;
    }
  }

  /**
   * List user's Netlify sites
   */
  async listSites() {
    try {
      const response = await fetch(`${this.apiBase}/sites`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list sites: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error listing sites:', error);
      throw error;
    }
  }

  /**
   * Delete a Netlify site
   */
  async deleteSite(siteId) {
    try {
      const response = await fetch(`${this.apiBase}/sites/${siteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete site: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting site:', error);
      throw error;
    }
  }
}

module.exports = NetlifyDeployer;
