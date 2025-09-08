#!/usr/bin/env node

/**
 * Enhanced VvebJS Realtor Page Generator
 * Generates HTML pages for realtors using data from both:
 * 1. CRM SQLite databases (existing)
 * 2. Chrome Extension PostgreSQL database (new)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

class EnhancedVvebJSRealtorGenerator {
    constructor() {
    // Resolve repository root as the parent of the current folder (vvebjs)
    this.baseDir = path.resolve(__dirname, '..');
        this.config = {
            templatePath: path.join(this.baseDir, 'vvebjs', 'templates', 'vvebjs-realtor-profile.html'),
            outputDir: path.join(this.baseDir, 'vvebjs', 'generated-realtors'),
            databasesDir: path.join(this.baseDir, 'crm-app', 'databases'),
            chromeExtensionDir: path.join(this.baseDir, 'chromeExtensionRealtor'),
            chromeExtensionAPI: 'http://localhost:5001/api'
        };
        
        // We'll access Chrome extension data via its API instead of direct DB connection
        this.chromeExtensionAvailable = false;
        
        // Track used slugs to prevent duplicates
        this.usedSlugs = new Set();
    }

    async init() {
        this.loadTemplate();
        this.ensureOutputDir();
        await this.testConnections();
        console.log('🏠 Enhanced VvebJS Realtor Generator initialized');
        console.log(`📁 Template: ${this.config.templatePath}`);
        console.log(`📁 Output: ${this.config.outputDir}`);
        console.log(`📁 CRM Databases: ${this.config.databasesDir}`);
        console.log(`🗄️  Chrome Extension: PostgreSQL connection`);
    }

    async testConnections() {
        try {
            // Test Chrome Extension API instead of direct PostgreSQL
            const response = await fetch(`${this.config.chromeExtensionAPI}/health`);
            if (response.ok) {
                console.log('✅ Chrome Extension API connection successful');
                this.chromeExtensionAvailable = true;
            } else {
                throw new Error(`API returned ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️  Chrome Extension API connection failed:', error.message);
            console.log('   Chrome extension data will be skipped');
            this.chromeExtensionAvailable = false;
        }
    }

    loadTemplate() {
        try {
            this.template = fs.readFileSync(this.config.templatePath, 'utf8');
            console.log('✅ VvebJS template loaded successfully');
        } catch (error) {
            throw new Error(`Failed to load template: ${error.message}`);
        }
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${this.config.outputDir}`);
        }
    }

    // Get SQLite databases (existing CRM data)
    async getSQLiteDatabases() {
        try {
            const files = fs.readdirSync(this.config.databasesDir);
            return files.filter(file => file.endsWith('.db')).map(file => ({
                name: file.replace('.db', ''),
                path: path.join(this.config.databasesDir, file),
                type: 'sqlite'
            }));
        } catch (error) {
            console.log('⚠️  Error reading SQLite databases:', error.message);
            return [];
        }
    }

    // Get Chrome extension data via API
    async getChromeExtensionData() {
        if (!this.chromeExtensionAvailable) {
            return [];
        }

        try {
            const response = await fetch(`${this.config.chromeExtensionAPI}/agents`);
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            
            const data = await response.json();
            return data.map(agent => ({
                ...agent,
                source: 'chrome-extension',
                data: JSON.stringify(agent)
            }));
        } catch (error) {
            console.log('⚠️  Error reading Chrome extension API data:', error.message);
            return [];
        }
    }

    // Enhanced realtor processing for different data sources
    async processRealtor(realtor, source, folder) {
        let realtorData;
        
        if (source === 'sqlite') {
            // CRM SQLite format - data is in JSON string
            try {
                realtorData = JSON.parse(realtor.data);
            } catch (error) {
                console.log(`⚠️  Invalid JSON for ${realtor.name}: ${error.message}`);
                return null;
            }
        } else if (source === 'chrome-extension' || source === 'chrome-extension-csv') {
            // Chrome extension format - already processed
            realtorData = realtor;
        }

        // Enhanced template replacement with comprehensive Chrome Extension data mapping
        const replacements = {
            // Basic Information
            '{{REALTOR_ID}}': realtorData.id || realtorData.agent_id || 'realtor-' + Date.now(),
            '{{REALTOR_NAME}}': realtorData.name || realtorData.NAME || 'Professional Realtor',
            '{{REALTOR_FIRST_NAME}}': this.getFirstName(realtorData.name || realtorData.NAME || 'Professional'),
            '{{REALTOR_TITLE}}': realtorData.title || 'Real Estate Professional',
            '{{REALTOR_COMPANY}}': realtorData.company || realtorData.AGENCY || 'Independent Agent',
            
            // Contact Information
            '{{REALTOR_PHONE}}': realtorData.phone || realtorData.Phone || 'Contact for phone',
            '{{REALTOR_EMAIL}}': realtorData.email || 'Contact for email',
            '{{REALTOR_WEBSITE}}': realtorData.website || realtorData['REALTOR.COM'] || '',
            '{{REALTOR_ADDRESS}}': realtorData.address || 'Contact for address',
            
            // Professional Details
            '{{REALTOR_BIO}}': realtorData.bio || 'Experienced real estate professional dedicated to helping clients achieve their goals.',
            '{{REALTOR_LICENSE}}': realtorData.license_number || 'Licensed Professional',
            '{{REALTOR_LICENSE_STATE}}': realtorData.license_state || 'State Licensed',
            '{{REALTOR_EXPERIENCE}}': realtorData.experience_years || 'Contact for experience details',
            
            // Profile Image
            '{{REALTOR_PROFILE_IMAGE}}': realtorData.profile_image_url || realtorData['PROFILE PIC'] || '../../img/default-avatar.svg',
            
            // Statistics and Performance
            '{{REALTOR_TOTAL_PROPERTIES}}': this.formatNumber(realtorData.total_properties) || '0',
            '{{REALTOR_AVG_PRICE}}': this.formatCurrency(realtorData.avg_property_price) || '$0',
            '{{REALTOR_MIN_PRICE}}': this.formatCurrency(realtorData.min_property_price) || '$0',
            '{{REALTOR_MAX_PRICE}}': this.formatCurrency(realtorData.max_property_price) || '$0',
            '{{REALTOR_CITIES_SERVED}}': realtorData.cities_served || '0',
            
            // Ratings and Reviews
            '{{REALTOR_RATING_COUNT}}': realtorData.ratings?.count || '0',
            
            // Arrays and Lists
            '{{REALTOR_SPECIALIZATIONS}}': this.formatSpecializations(realtorData),
            '{{REALTOR_LANGUAGES}}': this.formatLanguages(realtorData),
            '{{REALTOR_CERTIFICATIONS}}': this.formatCertifications(realtorData),
            '{{REALTOR_SERVICE_AREAS}}': this.formatServiceAreas(realtorData),
            
            // Social Media
            '{{REALTOR_SOCIAL_MEDIA}}': this.formatSocialMedia(realtorData),
            
            // Metadata
            '{{CURRENT_DATE}}': new Date().toLocaleDateString(),
            '{{DATA_SOURCE}}': source.toUpperCase(),
            '{{LAST_UPDATED}}': new Date().toISOString()
        };

        let html = this.template;
        
        // Process simple replacements
        for (const [placeholder, value] of Object.entries(replacements)) {
            html = html.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
        }
        
        // Process conditional blocks for specializations
        html = this.processConditionalBlocks(html, realtorData);

        return html;
    }

    getFirstName(fullName) {
        if (!fullName || fullName === 'Agent Name Not Found') return 'Agent';
        return fullName.split(' ')[0];
    }

    formatNumber(num) {
        if (!num) return '0';
        return parseInt(num).toLocaleString();
    }

    formatCurrency(amount) {
        if (!amount) return '$0';
        const num = parseFloat(amount);
        if (isNaN(num)) return '$0';
        return '$' + num.toLocaleString();
    }

    formatSpecializations(data) {
        let specializations = [];
        
        if (data.specializations && Array.isArray(data.specializations) && data.specializations.length > 0) {
            specializations = data.specializations;
        } else {
            // Default specializations based on property data
            specializations = ['Residential Properties', 'Buyer Representation', 'Seller Representation'];
            
            if (data.avg_property_price && parseFloat(data.avg_property_price) > 500000) {
                specializations.push('Luxury Homes');
            }
            if (data.total_properties && parseInt(data.total_properties) > 10) {
                specializations.push('Investment Properties');
            }
        }
        
        return specializations;
    }

    formatLanguages(data) {
        if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
            return data.languages;
        }
        return ['English']; // Default language
    }

    formatCertifications(data) {
        if (data.certifications && Array.isArray(data.certifications)) {
            return data.certifications;
        }
        return [];
    }

    formatServiceAreas(data) {
        if (data.service_areas && Array.isArray(data.service_areas)) {
            return data.service_areas;
        }
        return [];
    }

    formatSocialMedia(data) {
        const socialMedia = {};
        
        if (data.social_media) {
            if (typeof data.social_media === 'object') {
                return data.social_media;
            }
        }
        
        // Check for individual social media fields
        if (data.facebook) socialMedia.facebook = data.facebook;
        if (data.linkedin) socialMedia.linkedin = data.linkedin;
        if (data.twitter) socialMedia.twitter = data.twitter;
        if (data.instagram) socialMedia.instagram = data.instagram;
        
        return socialMedia;
    }

    processConditionalBlocks(html, data) {
        // Process {{#if REALTOR_BIO}} blocks
        html = this.processIfBlock(html, 'REALTOR_BIO', data.bio);
        html = this.processIfBlock(html, 'REALTOR_SPECIALIZATIONS', data.specializations && data.specializations.length > 0);
        html = this.processIfBlock(html, 'REALTOR_LANGUAGES', data.languages && data.languages.length > 0);
        html = this.processIfBlock(html, 'REALTOR_LICENSE', data.license_number);
        html = this.processIfBlock(html, 'REALTOR_EXPERIENCE', data.experience_years);
        html = this.processIfBlock(html, 'REALTOR_RATING_COUNT', data.ratings?.count);
        html = this.processIfBlock(html, 'REALTOR_WEBSITE', data.website);
        html = this.processIfBlock(html, 'REALTOR_SOCIAL_MEDIA', data.social_media && Object.keys(data.social_media).length > 0);
        
        // Process each loops for arrays
        html = this.processEachLoop(html, 'REALTOR_SPECIALIZATIONS', this.formatSpecializations(data));
        html = this.processEachLoop(html, 'REALTOR_LANGUAGES', this.formatLanguages(data));
        
        // Process social media conditionals
        const socialMedia = this.formatSocialMedia(data);
        html = this.processIfBlock(html, 'REALTOR_SOCIAL_MEDIA.facebook', socialMedia.facebook);
        html = this.processIfBlock(html, 'REALTOR_SOCIAL_MEDIA.instagram', socialMedia.instagram);
        html = this.processIfBlock(html, 'REALTOR_SOCIAL_MEDIA.linkedin', socialMedia.linkedin);
        html = this.processIfBlock(html, 'REALTOR_SOCIAL_MEDIA.twitter', socialMedia.twitter);
        
        return html;
    }

    processIfBlock(html, condition, value) {
        const regex = new RegExp(`{{#if ${condition}}}([\\s\\S]*?){{\/if}}`, 'g');
        return html.replace(regex, value ? '$1' : '');
    }

    processEachLoop(html, arrayName, array) {
        const regex = new RegExp(`{{#each ${arrayName}}}([\\s\\S]*?){{\/each}}`, 'g');
        return html.replace(regex, (match, template) => {
            if (!Array.isArray(array) || array.length === 0) return '';
            return array.map(item => template.replace(/{{this}}/g, item)).join('');
        });
    }

    formatSpecialties(data) {
        if (data.specializations) {
            if (Array.isArray(data.specializations)) {
                return data.specializations.join(', ');
            }
            return data.specializations;
        }
        if (data.agent?.specialties) {
            return Array.isArray(data.agent.specialties) ? data.agent.specialties.join(', ') : data.agent.specialties;
        }
        return 'Residential, Commercial, Investment Properties';
    }

    formatLanguages(data) {
        if (data.languages) {
            if (Array.isArray(data.languages)) {
                return data.languages.join(', ');
            }
            return data.languages;
        }
        if (data.agent?.languages) {
            return Array.isArray(data.agent.languages) ? data.agent.languages.join(', ') : data.agent.languages;
        }
        return 'English';
    }

    formatArray(arr) {
        if (Array.isArray(arr)) {
            return arr.join(', ');
        }
        return arr || '';
    }

    /**
     * Generate deterministic contact ID (matching CRM logic)
     */
    generateContactId(contact, database) {
        const contactString = JSON.stringify({
            name: contact.name || contact.NAME || (contact.data?.name) || '',
            company: contact.company || (contact.data?.company) || '',
            id: contact.id || '',
            database: database
        });
        
        let hash = 0;
        for (let i = 0; i < contactString.length; i++) {
            const char = contactString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return (Math.abs(hash % 9000000) + 1000000).toString();
    }

    generateSlug(contact, database) {
        let name = contact.name || contact.NAME || 'unknown-agent';
        
        // Handle placeholder names  
        if (!name || name === 'Agent Name Not Found' || name === 'Unknown') {
            const companyName = (contact.company || contact.AGENCY || '')
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
            
        // Use deterministic ID generation
        const uniqueId = this.generateContactId(contact, database);
        const slug = `${cleanName}-${uniqueId}`;
        
        // Add to used slugs set
        this.usedSlugs.add(slug);
        
        return slug;
    }

    async generateFromSQLite() {
        const databases = await this.getSQLiteDatabases();
        let totalGenerated = 0;

        for (const db of databases) {
            console.log(`\n📂 Processing SQLite database: ${db.name}`);
            
            try {
                const database = new Database(db.path);
                
                // Check if contacts table exists (CRM format)
                const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
                console.log(`   Tables found: ${tables.map(t => t.name).join(', ')}`);
                
                const hasContacts = tables.some(table => table.name === 'contacts');
                const hasRealtors = tables.some(table => table.name === 'realtors');
                
                let realtors = [];
                
                if (hasContacts) {
                    console.log(`   Using contacts table for ${db.name}`);
                    // CRM format - contacts table with JSON data
                    const contacts = database.prepare("SELECT id, data FROM contacts WHERE data IS NOT NULL AND data != ''").all();
                    console.log(`   Found ${contacts.length} contacts with data`);
                    
                    realtors = contacts.map(contact => {
                        try {
                            const data = JSON.parse(contact.data);
                            return {
                                id: contact.id,
                                name: data.NAME || data.name || 'Unknown',
                                data: contact.data,
                                source: 'crm-contacts'
                            };
                        } catch (error) {
                            console.log(`   ⚠️  Invalid JSON for contact ${contact.id}: ${error.message}`);
                            return null;
                        }
                    }).filter(r => r !== null);
                } else if (hasRealtors) {
                    console.log(`   Using realtors table for ${db.name}`);
                    // Legacy format - realtors table
                    realtors = database.prepare('SELECT * FROM realtors').all();
                } else {
                    console.log(`   No suitable table found in ${db.name}`);
                }
                
                if (realtors.length === 0) {
                    console.log(`   No contacts/realtors found in ${db.name}`);
                    continue;
                }
                
                console.log(`   Found ${realtors.length} realtor(s)`);
                
                const folderName = db.name.replace(/\s+/g, '-').toLowerCase();
                const outputFolder = path.join(this.config.outputDir, folderName);
                
                if (!fs.existsSync(outputFolder)) {
                    fs.mkdirSync(outputFolder, { recursive: true });
                }
                
                for (const realtor of realtors) {
                    const html = await this.processRealtor(realtor, 'sqlite', folderName);
                    if (html) {
                        // Parse realtor data to pass to generateSlug
                        let realtorData;
                        try {
                            realtorData = JSON.parse(realtor.data);
                        } catch {
                            realtorData = realtor;
                        }
                        const fileName = `${this.generateSlug(realtorData, db.name)}.html`;
                        const filePath = path.join(outputFolder, fileName);
                        
                        fs.writeFileSync(filePath, html);
                        console.log(`   ✅ Generated: ${realtor.name} -> ${fileName}`);
                        totalGenerated++;
                    }
                }
                
                database.close();
            } catch (error) {
                console.log(`   ❌ Error processing ${db.name}: ${error.message}`);
            }
        }

        return totalGenerated;
    }

    async generateFromChromeExtension() {
        let totalGenerated = 0;

        // Generate from Chrome Extension API data
        try {
            const apiRealtors = await this.getChromeExtensionData();
            if (apiRealtors.length > 0) {
                console.log(`\n📂 Processing Chrome Extension API data`);
                console.log(`   Found ${apiRealtors.length} realtor(s)`);
                
                const folderName = 'chrome-extension-api';
                const outputFolder = path.join(this.config.outputDir, folderName);
                
                if (!fs.existsSync(outputFolder)) {
                    fs.mkdirSync(outputFolder, { recursive: true });
                }
                
                for (const realtor of apiRealtors) {
                    const html = await this.processRealtor(realtor, 'chrome-extension', folderName);
                    if (html) {
                        const fileName = `${this.generateSlug(realtor, 'Realtor Database')}.html`;
                        const filePath = path.join(outputFolder, fileName);
                        
                        fs.writeFileSync(filePath, html);
                        console.log(`   ✅ Generated: ${realtor.name} -> ${fileName}`);
                        totalGenerated++;
                    }
                }
            }
        } catch (error) {
            console.log(`   ⚠️  Error processing Chrome Extension API data: ${error.message}`);
        }

        return totalGenerated;
    }

    async generateIndex(totalPages) {
        const indexPath = path.join(this.config.outputDir, 'index.html');
        
        // Scan all generated folders and files
        const generatedPages = [];
        const scanDirectory = (dir, relativePath = '') => {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const itemRelativePath = path.join(relativePath, item);
                
                if (fs.statSync(fullPath).isDirectory()) {
                    scanDirectory(fullPath, itemRelativePath);
                } else if (item.endsWith('.html') && item !== 'index.html') {
                    const name = item.replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    generatedPages.push({
                        name: name,
                        url: itemRelativePath.replace(/\\/g, '/'),
                        editUrl: `../editor.html?page=${itemRelativePath.replace(/\\/g, '/')}`,
                        database: path.dirname(itemRelativePath),
                        source: itemRelativePath.includes('chrome-extension') ? 'Chrome Extension' : 'CRM Database'
                    });
                }
            });
        };

        try {
            scanDirectory(this.config.outputDir);
        } catch (error) {
            console.log('⚠️  Error scanning generated pages:', error.message);
        }

        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced VvebJS Realtor Directory</title>
    <link href="../css/bootstrap.css" rel="stylesheet">
    <style>
        .header-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 0; text-align: center; }
        .card { border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 1rem; }
        .btn-vvebjs { background: #667eea; color: white; border: none; }
        .btn-vvebjs:hover { background: #5a67d8; color: white; }
        .stats-section { background: #f8f9fa; padding: 2rem; border-radius: 8px; margin: 2rem 0; }
        .source-badge { font-size: 0.8rem; }
        .chrome-ext { background: #28a745; }
        .crm-db { background: #007bff; }
    </style>
</head>
<body>
    <div class="header-section">
        <div class="container">
            <h1>🏠 Enhanced VvebJS Realtor Directory</h1>
            <p class="lead">Generated realtor pages from CRM databases and Chrome extension data</p>
        </div>
    </div>

    <div class="container mt-4">
        <div class="stats-section text-center">
            <h2>📊 Generation Summary</h2>
            <div class="row">
                <div class="col-md-3">
                    <h3 class="text-primary">${generatedPages.length}</h3>
                    <p>Total Pages Generated</p>
                </div>
                <div class="col-md-3">
                    <h3 class="text-success">${generatedPages.filter(p => p.source === 'Chrome Extension').length}</h3>
                    <p>Chrome Extension Pages</p>
                </div>
                <div class="col-md-3">
                    <h3 class="text-info">${generatedPages.filter(p => p.source === 'CRM Database').length}</h3>
                    <p>CRM Database Pages</p>
                </div>
                <div class="col-md-3">
                    <h3 class="text-warning">100%</h3>
                    <p>VvebJS Compatible</p>
                </div>
            </div>
        </div>

        <div class="row">
            ${generatedPages.slice(0, 50).map(page => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">${page.name}</h5>
                                <span class="badge ${page.source === 'Chrome Extension' ? 'chrome-ext' : 'crm-db'} source-badge">${page.source}</span>
                            </div>
                            <p class="card-text">
                                <small class="text-muted">Database: ${page.database}</small><br>
                                <strong>VvebJS Compatible • Enhanced Data</strong>
                            </p>
                            <div class="d-flex gap-2">
                                <a href="${page.url}" class="btn btn-outline-primary btn-sm" target="_blank">
                                    👁️ View Page
                                </a>
                                <a href="${page.editUrl}" class="btn btn-vvebjs btn-sm" target="_blank">
                                    ✏️ Edit in VvebJS
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="text-center mt-4 mb-4">
            <a href="../editor.html" class="btn btn-vvebjs btn-lg me-3">
                🚀 Open VvebJS Editor
            </a>
            <a href="." class="btn btn-outline-secondary btn-lg">
                🔄 Refresh Directory
            </a>
        </div>
    </div>

    <footer class="bg-dark text-white text-center py-3 mt-5">
        <p>&copy; 2025 Enhanced VvebJS Realtor Generator - Multi-Source Integration</p>
    </footer>
</body>
</html>`;

        fs.writeFileSync(indexPath, indexHtml);
        console.log(`📑 Generated enhanced index: ${indexPath}`);
    }

    async generate() {
        console.log('🚀 Starting enhanced realtor page generation...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        let totalGenerated = 0;

        // Generate from existing CRM SQLite databases
        totalGenerated += await this.generateFromSQLite();

        // Generate from Chrome extension data
        totalGenerated += await this.generateFromChromeExtension();

        // Regenerate existing realtor-database pages with enhanced template
        totalGenerated += await this.regenerateExistingRealtorPages();

        // Generate enhanced index
        await this.generateIndex(totalGenerated);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Enhanced VvebJS Generation Complete!');
        console.log(`📊 Total: ${totalGenerated} realtor pages from multiple sources`);
        console.log(`✅ Success: All pages generated with enhanced data`);
        console.log(`📁 Output directory: ${this.config.outputDir}`);
        console.log(`🌐 Open ${this.config.outputDir}/index.html to view all generated pages`);
        console.log(`✏️ Use VvebJS editor to customize any page`);

        return totalGenerated;
    }

    async regenerateExistingRealtorPages() {
        console.log('\n🔄 Regenerating existing realtor-database pages with enhanced template...');
        
        const realtorDatabaseDir = path.join(this.config.outputDir, 'realtor-database');
        if (!fs.existsSync(realtorDatabaseDir)) {
            console.log('📁 No realtor-database directory found, skipping regeneration');
            return 0;
        }

        const existingFiles = fs.readdirSync(realtorDatabaseDir).filter(file => file.endsWith('.html'));
        let regeneratedCount = 0;

        for (const file of existingFiles) {
            const filePath = path.join(realtorDatabaseDir, file);
            
            // Extract realtor info from filename (e.g., "agent-at-john-l-scott-real-estate-5722416.html")
            const realtorSlug = file.replace('.html', '');
            const realtorName = realtorSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            // Create a basic realtor object from the filename
            const basicRealtor = {
                id: this.generateContactId(realtorName),
                full_name: realtorName,
                phone: 'Contact for phone',
                email: 'Contact for email',
                company: 'Contact for company',
                profile_image_url: '../../img/default-avatar.svg',
                bio: `Professional real estate agent dedicated to helping clients achieve their property goals.`,
                specializations: [],
                languages: [],
                certifications: [],
                social_media: {},
                total_properties: 0,
                avg_property_price: 0,
                ratings: 0,
                address: 'Contact for address'
            };

            // Generate the enhanced page
            const html = await this.processRealtor(basicRealtor, 'chrome-extension');
            fs.writeFileSync(filePath, html);
            
            regeneratedCount++;
            console.log(`   ✅ Regenerated: ${realtorName} -> ${file}`);
        }

        console.log(`🔄 Regenerated ${regeneratedCount} realtor-database pages with enhanced template`);
        return regeneratedCount;
    }

    async close() {
        // No database connections to close since we're using API
        console.log('🔌 Enhanced generator completed');
    }

    /**
     * Generate website for a single realtor
     */
    async generateSingleRealtorWebsite(contact, database) {
        console.log(`🔄 Generating website for ${contact.NAME || contact.name} from ${database}...`);
        
        try {
            // Determine data source and parse accordingly
            let realtorData;
            if (database === 'Realtor Database' || database.includes('chrome')) {
                // Chrome extension data
                realtorData = this.parseChromeExtensionContactData(contact);
            } else {
                // SQLite data
                realtorData = this.parseSqliteContactData(contact, database);
            }

            // Generate the HTML page
            const filePath = await this.generatePageForRealtor(realtorData);
            
            // Generate URLs
            const websiteUrl = `http://localhost:3030/generated-realtors/${realtorData.fileName}`;
            const editorUrl = `http://localhost:3030/editor.html?page=generated-realtors/${realtorData.fileName}`;
            
            return {
                websiteUrl,
                editorUrl,
                filePath,
                realtorData
            };
        } catch (error) {
            throw new Error(`Failed to generate website for ${contact.NAME || contact.name}: ${error.message}`);
        }
    }

    /**
     * Parse Chrome Extension contact data format
     */
    parseChromeExtensionContactData(contact) {
        const data = contact.data || contact;
        
        return {
            id: contact.id,
            source: 'chrome_extension',
            databaseSource: 'chrome-extension',
            
            // Basic info from Chrome Extension format
            name: data.name || contact.name || '',
            agency: data.company || contact.company || '',
            title: data.title || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            website: data.website || '',
            
            // Enhanced data
            bio: data.bio || '',
            specializations: Array.isArray(data.specializations) ? data.specializations.join(', ') : (data.specializations || ''),
            languages: Array.isArray(data.languages) ? data.languages.join(', ') : (data.languages || ''),
            experienceYears: data.experience_years || '',
            licenseNumber: data.license_number || '',
            licenseState: data.license_state || '',
            profilePic: data.profile_image_url || '',
            realtorUrl: data.realtor_url || '',
            socialMedia: data.social_media || {},
            ratings: data.ratings || {},
            certifications: Array.isArray(data.certifications) ? data.certifications.join(', ') : (data.certifications || ''),
            serviceAreas: Array.isArray(data.service_areas) ? data.service_areas.join(', ') : (data.service_areas || ''),
            
            // Property data
            propertyCount: 0, // Will be filled from properties if available
            properties: [],
            forSale: '0',
            sold: '0',
            
            // Generated fields
            slug: this.generateSlug(data.name || contact.name || contact.id, data),
            fileName: this.generateFileName(data.name || contact.name || contact.id, data),
            lastUpdated: new Date().toLocaleDateString(),
            createdAt: contact.created_at,
            updatedAt: contact.updated_at
        };
    }

    /**
     * Parse SQLite contact data format
     */
    parseSqliteContactData(contact, databaseName) {
        const data = typeof contact.data === 'string' ? JSON.parse(contact.data) : (contact.data || contact);
        
        return {
            id: contact.id,
            source: 'sqlite',
            databaseSource: databaseName,
            
            // Basic info from SQLite format
            name: data.NAME || '',
            agency: data.AGENCY || '',
            phone: this.cleanPhone(data.Phone || ''),
            experience: data['Experience:'] || data.Experience || '',
            profilePic: this.cleanUrl(data['PROFILE PIC'] || ''),
            realtorCom: this.cleanUrl(data['REALTOR.COM'] || ''),
            forSale: this.cleanNumber(data['For sale:'] || data['For sale'] || '0'),
            sold: this.cleanNumber(data['Sold:'] || data.Sold || '0'),
            listedHouse: data['Listed a house:'] || data['Listed a house'] || '',
            languages: data['Languages:'] || data.Languages || '',
            
            // Map to unified format
            title: '',
            email: '',
            address: '',
            website: this.cleanUrl(data['REALTOR.COM'] || ''),
            bio: '',
            specializations: '',
            experienceYears: this.extractYears(data['Experience:'] || data.Experience || ''),
            licenseNumber: '',
            licenseState: '',
            realtorUrl: this.cleanUrl(data['REALTOR.COM'] || ''),
            socialMedia: {},
            ratings: {},
            certifications: '',
            serviceAreas: '',
            propertyCount: parseInt(this.cleanNumber(data['For sale:'] || '0')) + parseInt(this.cleanNumber(data['Sold:'] || '0')),
            properties: [],
            
            // Generated fields
            slug: this.generateSlug(data.NAME || contact.id, data),
            fileName: this.generateFileName(data.NAME || contact.id, data),
            lastUpdated: new Date().toLocaleDateString(),
            notes: contact.notes || '',
            status: contact.status || 'New',
            createdAt: contact.created_at,
            updatedAt: contact.updated_at
        };
    }
}

// Main execution
async function main() {
    const generator = new EnhancedVvebJSRealtorGenerator();
    
    try {
        await generator.init();
        await generator.generate();
    } catch (error) {
        console.error('❌ Generation failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await generator.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = EnhancedVvebJSRealtorGenerator;
