#!/usr/bin/env node

/**
 * VvebJS Realtor Page Generator
 * Generates HTML pages for realtors using VvebJS-compatible templates and actual CRM data
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

class VvebJSRealtorGenerator {
    constructor() {
    // Resolve repository root as the parent of the current folder (vvebjs)
    this.baseDir = path.resolve(__dirname, '..');
        this.config = {
            templatePath: path.join(this.baseDir, 'vvebjs', 'demo', 'realtor', 'profile-template.html'),
            outputDir: path.join(this.baseDir, 'vvebjs', 'generated-realtors'),
            databasesDir: path.join(this.baseDir, 'crm-app', 'databases')
        };
    }

    init() {
        this.loadTemplate();
        this.ensureOutputDir();
        console.log('🏠 VvebJS Realtor Generator initialized');
        console.log(`📁 Template: ${this.config.templatePath}`);
        console.log(`📁 Output: ${this.config.outputDir}`);
        console.log(`📁 Databases: ${this.config.databasesDir}`);
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

    async getDatabaseFiles() {
        try {
            const files = fs.readdirSync(this.config.databasesDir);
            return files.filter(file => file.endsWith('.db')).map(file => ({
                name: file,
                path: path.join(this.config.databasesDir, file)
            }));
        } catch (error) {
            throw new Error(`Failed to read databases directory: ${error.message}`);
        }
    }

    async getRealtorsFromDatabase(dbPath) {
        try {
            const db = new Database(dbPath, { readonly: true });
            const query = `SELECT id, data, notes, status, created_at, updated_at FROM contacts`;
            const rows = db.prepare(query).all();
            
            const realtors = [];
            
            rows.forEach(row => {
                try {
                    const data = JSON.parse(row.data);
                    const realtor = this.parseRealtorData(row, data, dbPath);
                    
                    // Only add if we have minimum required data
                    if (realtor.name && realtor.agency) {
                        realtors.push(realtor);
                    }
                } catch (parseError) {
                    console.warn(`⚠️  Failed to parse realtor data for ID ${row.id}:`, parseError.message);
                }
            });

            db.close();
            return realtors;
        } catch (error) {
            throw new Error(`Failed to access database ${dbPath}: ${error.message}`);
        }
    }

    parseRealtorData(row, data, dbPath) {
        return {
            // Database info
            id: row.id,
            rawData: data,
            notes: row.notes || '',
            status: row.status || 'New',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            databaseSource: path.basename(dbPath, '.db'),
            
            // Cleaned realtor data
            name: this.cleanString(data.NAME || ''),
            agency: this.cleanString(data.AGENCY || ''),
            phone: this.cleanPhone(data.Phone || ''),
            experience: this.cleanString(data['Experience:'] || data.Experience || ''),
            profilePic: this.cleanUrl(data['PROFILE PIC'] || ''),
            realtorCom: this.cleanUrl(data['REALTOR.COM'] || ''),
            forSale: this.cleanNumber(data['For sale:'] || data['For sale'] || '0'),
            sold: this.cleanNumber(data['Sold:'] || data.Sold || '0'),
            listedHouse: this.cleanString(data['Listed a house:'] || data['Listed a house'] || ''),
            languages: this.cleanString(data['Languages:'] || data.Languages || ''),
            
            // Generated fields
            slug: this.generateSlug(data.NAME || row.id),
            fileName: this.generateFileName(data.NAME || row.id),
            lastUpdated: new Date().toLocaleDateString()
        };
    }

    cleanString(str) {
        if (!str || typeof str !== 'string') return '';
        return str.trim().replace(/\s+/g, ' ');
    }

    cleanPhone(phone) {
        if (!phone || typeof phone !== 'string') return '';
        return phone.replace(/[^\d\s\(\)\-\+]/g, '').trim();
    }

    cleanUrl(url) {
        if (!url || typeof url !== 'string') return '';
        const cleaned = url.trim();
        if (cleaned.includes('http') && !cleaned.startsWith('http')) {
            return 'https://' + cleaned.substring(cleaned.indexOf('http') + 4);
        }
        return cleaned;
    }

    cleanNumber(num) {
        if (!num) return '0';
        if (typeof num === 'number') return num.toString();
        if (typeof num === 'string') {
            const cleaned = num.replace(/[^\d]/g, '');
            return cleaned || '0';
        }
        return '0';
    }

    generateSlug(name) {
        if (!name) return 'unknown-realtor';
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    generateFileName(name) {
        return this.generateSlug(name) + '.html';
    }

    generateHtmlContent(realtor) {
        let html = this.template;

        // Template variable replacements
        const replacements = {
            '{{NAME}}': realtor.name,
            '{{AGENCY}}': realtor.agency,
            '{{PHONE}}': realtor.phone,
            '{{EXPERIENCE}}': realtor.experience,
            '{{PROFILE_PIC}}': realtor.profilePic,
            '{{REALTOR_COM}}': realtor.realtorCom,
            '{{FOR_SALE}}': realtor.forSale,
            '{{SOLD}}': realtor.sold,
            '{{LISTED_HOUSE}}': realtor.listedHouse,
            '{{LANGUAGES}}': realtor.languages,
            '{{LAST_UPDATED}}': realtor.lastUpdated,
            '{{REALTOR_ID}}': realtor.id,
            '{{DATABASE_SOURCE}}': realtor.databaseSource
        };

        // Perform replacements
        Object.entries(replacements).forEach(([placeholder, value]) => {
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            html = html.replace(regex, value || '');
        });

        // Handle conditional sections
        html = html.replace(/{{#if LANGUAGES}}[\s\S]*?{{\/if}}/g, (match) => {
            return realtor.languages ? match.replace(/{{#if LANGUAGES}}|{{\/if}}/g, '') : '';
        });

        html = html.replace(/{{#if LISTED_HOUSE}}[\s\S]*?{{\/if}}/g, (match) => {
            return realtor.listedHouse ? match.replace(/{{#if LISTED_HOUSE}}|{{\/if}}/g, '') : '';
        });

        return html;
    }

    async generatePageForRealtor(realtor, databaseName) {
        try {
            const html = this.generateHtmlContent(realtor);
            
            // Create subdirectory for the database
            const dbDir = path.join(this.config.outputDir, this.sanitizeFilename(databaseName));
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            const filepath = path.join(dbDir, realtor.fileName);
            fs.writeFileSync(filepath, html);
            
            return {
                success: true,
                filepath,
                realtor: realtor.name,
                fileName: realtor.fileName,
                url: `generated-realtors/${databaseName}/${realtor.fileName}`,
                editUrl: `../editor.html?page=generated-realtors/${databaseName}/${realtor.fileName}`,
                vvebJSCompatible: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                realtor: realtor.name
            };
        }
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9\s\-_]/gi, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }

    async generateAllPages() {
        console.log('\n🚀 Starting VvebJS-compatible realtor page generation...');
        
        // Initialize the generator
        this.init();
        
        const databases = await this.getDatabaseFiles();
        console.log(`📊 Found ${databases.length} database(s)`);

        const results = {
            totalDatabases: databases.length,
            totalRealtors: 0,
            successfulPages: 0,
            failedPages: 0,
            errors: [],
            generatedPages: []
        };

        for (const db of databases) {
            console.log(`\n📂 Processing database: ${db.name}`);
            
            try {
                const realtors = await this.getRealtorsFromDatabase(db.path);
                console.log(`   Found ${realtors.length} realtor(s)`);
                
                results.totalRealtors += realtors.length;

                for (const realtor of realtors) {
                    const result = await this.generatePageForRealtor(realtor, db.name.replace('.db', ''));
                    
                    if (result.success) {
                        results.successfulPages++;
                        results.generatedPages.push(result);
                        console.log(`   ✅ Generated: ${result.realtor} -> ${result.fileName}`);
                    } else {
                        results.failedPages++;
                        results.errors.push({
                            database: db.name,
                            realtor: result.realtor,
                            error: result.error
                        });
                        console.log(`   ❌ Failed: ${result.realtor} - ${result.error}`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Database error: ${error.message}`);
                results.errors.push({
                    database: db.name,
                    error: error.message
                });
            }
        }

        // Generate VvebJS-compatible index
        await this.generateVvebJSIndex(results.generatedPages);

        return results;
    }

    async generateVvebJSIndex(generatedPages) {
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VvebJS Realtor Directory</title>
    <link href="../css/bootstrap.css" rel="stylesheet">
    <style>
        .header-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 0; text-align: center; }
        .card { border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 1rem; }
        .btn-vvebjs { background: #667eea; color: white; border: none; }
        .btn-vvebjs:hover { background: #5a67d8; color: white; }
        .stats-section { background: #f8f9fa; padding: 2rem; border-radius: 8px; margin: 2rem 0; }
    </style>
</head>
<body>
    <div class="header-section">
        <div class="container">
            <h1>🏠 VvebJS Realtor Directory</h1>
            <p class="lead">Generated realtor pages compatible with VvebJS editor</p>
        </div>
    </div>

    <div class="container mt-4">
        <div class="stats-section text-center">
            <h2>📊 Generation Summary</h2>
            <div class="row">
                <div class="col-md-4">
                    <h3 class="text-primary">${generatedPages.length}</h3>
                    <p>Realtor Pages Generated</p>
                </div>
                <div class="col-md-4">
                    <h3 class="text-success">100%</h3>
                    <p>VvebJS Compatible</p>
                </div>
                <div class="col-md-4">
                    <h3 class="text-info">${new Date().toLocaleDateString()}</h3>
                    <p>Last Updated</p>
                </div>
            </div>
        </div>

        <div class="row">
            ${generatedPages.map(page => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${page.realtor}</h5>
                            <p class="card-text">
                                <small class="text-muted">Database: ${page.url.split('/')[0]}</small><br>
                                <small class="text-muted">File: ${page.fileName}</small>
                            </p>
                            <div class="btn-group w-100" role="group">
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
            <a href="../editor.html" class="btn btn-vvebjs btn-lg">
                🚀 Open VvebJS Editor
            </a>
        </div>
    </div>

    <footer class="bg-dark text-white text-center py-3 mt-5">
        <p>&copy; 2025 VvebJS Realtor Generator - CRM Integration</p>
    </footer>
</body>
</html>`;

        const indexPath = path.join(this.config.outputDir, 'index.html');
        fs.writeFileSync(indexPath, indexHtml);
        console.log(`📑 Generated VvebJS-compatible index: ${indexPath}`);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    try {
        const generator = new VvebJSRealtorGenerator();

        if (args.length === 0) {
            // Generate all pages
            const results = await generator.generateAllPages();
            
            console.log('\n🎉 VvebJS Generation Complete!');
            console.log(`📊 Total: ${results.totalRealtors} realtors from ${results.totalDatabases} databases`);
            console.log(`✅ Success: ${results.successfulPages} pages`);
            console.log(`❌ Failed: ${results.failedPages} pages`);
            
            if (results.errors.length > 0) {
                console.log('\n❌ Errors:');
                results.errors.forEach(error => {
                    console.log(`   ${error.database}: ${error.error}`);
                });
            }
            
            console.log(`\n📁 Output directory: ${generator.config.outputDir}`);
            console.log(`🌐 Open ${path.join(generator.config.outputDir, 'index.html')} to view generated pages`);
            console.log(`✏️ Use VvebJS editor to customize any page: ${generator.config.vvebJSPath}/editor.html`);
        } else {
            console.log('Usage: node vvebjs-realtor-generator.js');
            console.log('Generates VvebJS-compatible realtor pages from CRM database');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

module.exports = VvebJSRealtorGenerator;

// Run if called directly
if (require.main === module) {
    main();
}
