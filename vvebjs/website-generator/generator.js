#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class RealtorPageGenerator {
    constructor(config = {}) {
        this.config = {
            templatesDir: config.templatesDir || path.join(__dirname, '../demo/realtor'),
            outputDir: config.outputDir || path.join(__dirname, '../generated-pages'),
            databasesDir: config.databasesDir || path.join(__dirname, '../../crm-app/databases'),
            templateFile: config.templateFile || 'profile.html',
            ...config
        };
        
        this.template = null;
        this.loadTemplate();
        this.ensureOutputDir();
    }

    loadTemplate() {
        const templatePath = path.join(this.config.templatesDir, this.config.templateFile);
        try {
            this.template = fs.readFileSync(templatePath, 'utf8');
            console.log(`✅ Template loaded from: ${templatePath}`);
        } catch (error) {
            throw new Error(`Failed to load template from ${templatePath}: ${error.message}`);
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
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(new Error(`Failed to open database ${dbPath}: ${err.message}`));
                    return;
                }
            });

            const query = `SELECT id, data, notes, status, created_at, updated_at FROM contacts`;
            
            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to query database: ${err.message}`));
                    return;
                }

                const realtors = [];
                
                rows.forEach(row => {
                    try {
                        const data = JSON.parse(row.data);
                        const realtor = {
                            id: row.id,
                            rawData: data,
                            notes: row.notes || '',
                            status: row.status || 'New',
                            createdAt: row.created_at,
                            updatedAt: row.updated_at,
                            databaseSource: path.basename(dbPath, '.db'),
                            // Parsed and cleaned data
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
                            // Generate slug for filename
                            slug: this.generateSlug(data.NAME || row.id)
                        };

                        // Only add if we have minimum required data
                        if (realtor.name && realtor.agency) {
                            realtors.push(realtor);
                        }
                    } catch (parseError) {
                        console.warn(`⚠️  Failed to parse realtor data for ID ${row.id}:`, parseError.message);
                    }
                });

                db.close();
                resolve(realtors);
            });
        });
    }

    cleanString(str) {
        if (!str || typeof str !== 'string') return '';
        return str.trim().replace(/\s+/g, ' ');
    }

    cleanPhone(phone) {
        if (!phone || typeof phone !== 'string') return '';
        // Keep only digits, spaces, parentheses, and dashes
        return phone.replace(/[^\d\s\(\)\-\+]/g, '').trim();
    }

    cleanUrl(url) {
        if (!url || typeof url !== 'string') return '';
        // Basic URL cleaning
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

    

    /**
     * Generate HTML for a testimonial
     */
    generateTestimonialHtml(reviewText, authorName) {
        const cleanText = reviewText ? reviewText.replace(/"/g, '"').replace(/'/g, "'").trim() : '';
        const cleanAuthor = authorName ? authorName.toUpperCase().trim() : 'SATISFIED CLIENT';
        
        return `
            <div class="testimonial-content">
                <div class="testimonial-quote">
                    "${cleanText}"
                </div>
                <div class="testimonial-author">${cleanAuthor}</div>
            </div>
        `;
    }

    /**
     * Generate fallback testimonial when no real reviews are available
     */
    generateFallbackTestimonial(agentName) {
        return `
            <div class="testimonial-content">
                <div class="testimonial-quote">
                    "${agentName} was extremely helpful with our home purchase. As first time buyers, 
                    we felt very comfortable knowing we had their expertise. They were knowledgeable 
                    about the market and helped us navigate every step of the process with professionalism and care."
                </div>
                <div class="testimonial-author">SATISFIED CLIENT</div>
            </div>
        `;
    }

    generateHtmlContent(realtor) {
        let html = this.template;

        // Replace all template variables
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
            '{{WEBSITE_URL}}': `https://your-domain.com/realtors/${realtor.slug}`,
            '{{LAST_UPDATED}}': new Date().toLocaleDateString(),
            '{{REALTOR_ID}}': realtor.id,
            '{{DATABASE_SOURCE}}': realtor.databaseSource || 'unknown',
            // VvebJS no longer handles testimonials - ModularWebsiteGenerator handles this
            '{{TESTIMONIALS_CONTENT}}': ''
        };

        // Perform replacements
        Object.entries(replacements).forEach(([placeholder, value]) => {
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            html = html.replace(regex, value || '');
        });

        // Handle conditional sections (simple implementation)
        // Remove sections with empty conditionals
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

            const filename = `${realtor.slug}.html`;
            const filepath = path.join(dbDir, filename);
            
            fs.writeFileSync(filepath, html);
            
            return {
                success: true,
                filepath,
                realtor: realtor.name,
                url: `${databaseName}/${filename}`
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
        console.log('🚀 Starting realtor page generation...');
        
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
                        console.log(`   ✅ Generated: ${result.realtor} -> ${result.url}`);
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

        // Generate index file
        await this.generateIndexPage(results.generatedPages);

        return results;
    }

    async generateIndexPage(generatedPages) {
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Realtor Directory</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 2rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; background: white; }
        .card h3 { margin: 0 0 0.5rem 0; color: #333; }
        .card p { margin: 0.25rem 0; color: #666; }
        .card a { color: #667eea; text-decoration: none; font-weight: bold; }
        .card a:hover { text-decoration: underline; }
        .stats { text-align: center; margin: 2rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 Realtor Directory</h1>
        <p>Generated automatically from CRM database</p>
    </div>

    <div class="stats">
        <h2>📊 Summary</h2>
        <p><strong>${generatedPages.length}</strong> realtor pages generated</p>
        <p>Last updated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="grid">
        ${generatedPages.map(page => `
            <div class="card">
                <h3>${page.realtor}</h3>
                <p><a href="${page.url}" target="_blank">View Profile →</a></p>
                <p><small>Path: ${page.url}</small></p>
            </div>
        `).join('')}
    </div>

    <div style="text-align: center; margin-top: 2rem; color: #666;">
        <p>Generated by CRM Realtor Page Generator</p>
    </div>
</body>
</html>`;

        const indexPath = path.join(this.config.outputDir, 'index.html');
        fs.writeFileSync(indexPath, indexHtml);
        console.log(`📑 Generated index page: ${indexPath}`);
    }

    async generateSingleRealtor(realtorId, databasePath) {
        console.log(`🎯 Generating page for specific realtor: ${realtorId}`);
        
        const realtors = await this.getRealtorsFromDatabase(databasePath);
        const realtor = realtors.find(r => r.id === realtorId);
        
        if (!realtor) {
            throw new Error(`Realtor with ID ${realtorId} not found in database`);
        }

        const dbName = path.basename(databasePath, '.db');
        const result = await this.generatePageForRealtor(realtor, dbName);
        
        if (result.success) {
            console.log(`✅ Generated: ${result.realtor} -> ${result.filepath}`);
            return result;
        } else {
            throw new Error(`Failed to generate page: ${result.error}`);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    try {
        const generator = new RealtorPageGenerator();

        if (args.length === 0) {
            // Generate all pages
            const results = await generator.generateAllPages();
            
            console.log('\n🎉 Generation Complete!');
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
        } else if (args.length === 2) {
            // Generate single realtor page
            const [realtorId, databasePath] = args;
            const result = await generator.generateSingleRealtor(realtorId, databasePath);
            console.log(`\n🎉 Single page generated: ${result.filepath}`);
        } else {
            console.log('Usage:');
            console.log('  Generate all pages: node generator.js');
            console.log('  Generate single page: node generator.js <realtor-id> <database-path>');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

module.exports = RealtorPageGenerator;

// Run if called directly
if (require.main === module) {
    main();
}
