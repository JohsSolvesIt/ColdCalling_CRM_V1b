#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const RealtorPageGenerator = require('./generator');
const config = require('../realtor-config');

class RealtorAPIServer {
    constructor(port = 3001) {
        this.app = express();
        this.port = port;
        this.generator = new RealtorPageGenerator(config.paths);
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(config.paths.outputDir));
        
        // Serve static files from vvebjs root (for editor and other assets)
        this.app.use(express.static(path.join(__dirname, '..')));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                service: 'realtor-page-generator'
            });
        });

        // Get generator status and stats
        this.app.get('/api/status', async (req, res) => {
            try {
                const databases = await this.generator.getDatabaseFiles();
                const outputExists = fs.existsSync(config.paths.outputDir);
                
                let generatedCount = 0;
                if (outputExists) {
                    const dirs = fs.readdirSync(config.paths.outputDir, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory());
                    
                    for (const dir of dirs) {
                        const files = fs.readdirSync(path.join(config.paths.outputDir, dir.name));
                        generatedCount += files.filter(f => f.endsWith('.html') && f !== 'index.html').length;
                    }
                }

                res.json({
                    databases: databases.length,
                    generatedPages: generatedCount,
                    outputDir: config.paths.outputDir,
                    lastGenerated: outputExists ? fs.statSync(config.paths.outputDir).mtime : null
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // List all databases
        this.app.get('/api/databases', async (req, res) => {
            try {
                const databases = await this.generator.getDatabaseFiles();
                const dbStats = [];

                for (const db of databases) {
                    try {
                        const realtors = await this.generator.getRealtorsFromDatabase(db.path);
                        dbStats.push({
                            name: db.name,
                            path: db.path,
                            realtorCount: realtors.length,
                            size: fs.statSync(db.path).size
                        });
                    } catch (error) {
                        dbStats.push({
                            name: db.name,
                            path: db.path,
                            error: error.message
                        });
                    }
                }

                res.json(dbStats);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get realtors from a specific database
        this.app.get('/api/databases/:dbName/realtors', async (req, res) => {
            try {
                const { dbName } = req.params;
                const { page = 1, limit = 50 } = req.query;
                
                const databases = await this.generator.getDatabaseFiles();
                const db = databases.find(d => d.name === dbName);
                
                if (!db) {
                    return res.status(404).json({ error: 'Database not found' });
                }

                const realtors = await this.generator.getRealtorsFromDatabase(db.path);
                
                // Pagination
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + parseInt(limit);
                const paginatedRealtors = realtors.slice(startIndex, endIndex);

                res.json({
                    database: dbName,
                    total: realtors.length,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    data: paginatedRealtors
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Generate all pages
        this.app.post('/api/generate/all', async (req, res) => {
            try {
                console.log('🚀 Starting bulk page generation via API...');
                const results = await this.generator.generateAllPages();
                
                res.json({
                    success: true,
                    message: 'Page generation completed',
                    results
                });
            } catch (error) {
                console.error('❌ Generation error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Generate pages for specific database
        this.app.post('/api/generate/database/:dbName', async (req, res) => {
            try {
                const { dbName } = req.params;
                const databases = await this.generator.getDatabaseFiles();
                const db = databases.find(d => d.name === dbName);
                
                if (!db) {
                    return res.status(404).json({ error: 'Database not found' });
                }

                console.log(`🎯 Generating pages for database: ${dbName}`);
                const realtors = await this.generator.getRealtorsFromDatabase(db.path);
                
                const results = {
                    database: dbName,
                    totalRealtors: realtors.length,
                    successfulPages: 0,
                    failedPages: 0,
                    errors: [],
                    generatedPages: []
                };

                for (const realtor of realtors) {
                    const result = await this.generator.generatePageForRealtor(realtor, dbName.replace('.db', ''));
                    
                    if (result.success) {
                        results.successfulPages++;
                        results.generatedPages.push(result);
                    } else {
                        results.failedPages++;
                        results.errors.push({
                            realtor: result.realtor,
                            error: result.error
                        });
                    }
                }

                res.json({
                    success: true,
                    message: `Generated ${results.successfulPages} pages for ${dbName}`,
                    results
                });
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Generate single realtor page
        this.app.post('/api/generate/realtor', async (req, res) => {
            try {
                const { realtorId, databasePath } = req.body;
                
                if (!realtorId || !databasePath) {
                    return res.status(400).json({ 
                        error: 'realtorId and databasePath are required' 
                    });
                }

                console.log(`🎯 Generating single page for realtor: ${realtorId}`);
                const result = await this.generator.generateSingleRealtor(realtorId, databasePath);
                
                res.json({
                    success: true,
                    message: `Generated page for ${result.realtor}`,
                    result
                });
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Get generated page content
        this.app.get('/api/pages/:dbName/:realtorSlug', (req, res) => {
            try {
                const { dbName, realtorSlug } = req.params;
                const filePath = path.join(config.paths.outputDir, dbName, `${realtorSlug}.html`);
                
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: 'Page not found' });
                }

                const content = fs.readFileSync(filePath, 'utf8');
                res.send(content);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // List generated pages
        this.app.get('/api/pages', (req, res) => {
            try {
                const outputDir = config.paths.outputDir;
                
                if (!fs.existsSync(outputDir)) {
                    return res.json({ pages: [] });
                }

                const pages = [];
                const dirs = fs.readdirSync(outputDir, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory());

                for (const dir of dirs) {
                    const dbDir = path.join(outputDir, dir.name);
                    const files = fs.readdirSync(dbDir)
                        .filter(f => f.endsWith('.html') && f !== 'index.html');
                    
                    for (const file of files) {
                        const filePath = path.join(dbDir, file);
                        const stats = fs.statSync(filePath);
                        
                        pages.push({
                            database: dir.name,
                            filename: file,
                            slug: file.replace('.html', ''),
                            url: `/${dir.name}/${file}`,
                            size: stats.size,
                            created: stats.birthtime,
                            modified: stats.mtime
                        });
                    }
                }

                res.json({ pages });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Webhook endpoint for real-time generation (called when new realtor is added)
        this.app.post('/api/webhook/realtor-added', async (req, res) => {
            try {
                const { realtorId, databaseName } = req.body;
                
                if (!realtorId || !databaseName) {
                    return res.status(400).json({ 
                        error: 'realtorId and databaseName are required' 
                    });
                }

                console.log(`🔔 Webhook triggered: New realtor ${realtorId} in ${databaseName}`);
                
                const databases = await this.generator.getDatabaseFiles();
                const db = databases.find(d => d.name === databaseName || d.name === `${databaseName}.db`);
                
                if (!db) {
                    return res.status(404).json({ error: 'Database not found' });
                }

                const result = await this.generator.generateSingleRealtor(realtorId, db.path);
                
                res.json({
                    success: true,
                    message: `Auto-generated page for new realtor: ${result.realtor}`,
                    result
                });
            } catch (error) {
                console.error('❌ Webhook error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            res.status(500).json({ error: 'Internal server error' });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🌐 Realtor Page Generator API running on http://localhost:${this.port}`);
            console.log(`📁 Serving generated pages from: ${config.paths.outputDir}`);
            console.log('');
            console.log('Available endpoints:');
            console.log('  GET  /health                     - Health check');
            console.log('  GET  /api/status                 - Generator status');
            console.log('  GET  /api/databases              - List databases');
            console.log('  GET  /api/databases/:db/realtors - List realtors');
            console.log('  POST /api/generate/all           - Generate all pages');
            console.log('  POST /api/generate/database/:db  - Generate for database');
            console.log('  POST /api/generate/realtor       - Generate single page');
            console.log('  GET  /api/pages                  - List generated pages');
            console.log('  POST /api/webhook/realtor-added  - Real-time generation');
        });
    }
}

// Start server if called directly
if (require.main === module) {
    const port = process.env.PORT || 3001;
    const server = new RealtorAPIServer(port);
    server.start();
}

module.exports = RealtorAPIServer;
