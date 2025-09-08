#!/usr/bin/env node

/**
 * VvebJS Realtor API Server
 * Provides REST API for dynamic realtor page generation and VvebJS integration
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const VvebJSRealtorGenerator = require('./vvebjs-realtor-generator');

class VvebJSRealtorAPIServer {
    constructor(options = {}) {
        this.config = {
            port: options.port || 3031,
            host: options.host || 'localhost',
            vvebJSPath: options.vvebJSPath || __dirname,
            corsEnabled: options.corsEnabled !== false,
            ...options
        };
        
        this.app = express();
        this.generator = new VvebJSRealtorGenerator({
            vvebJSPath: this.config.vvebJSPath
        });
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // CORS for VvebJS editor integration
        if (this.config.corsEnabled) {
            this.app.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
                if (req.method === 'OPTIONS') {
                    res.sendStatus(200);
                } else {
                    next();
                }
            });
        }

        // JSON parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Static files
        this.app.use('/generated-realtors', express.static(path.join(__dirname, 'generated-realtors')));
        this.app.use('/vvebjs', express.static(__dirname));

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
                status: 'healthy',
                service: 'VvebJS Realtor API',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Get all databases
        this.app.get('/api/databases', async (req, res) => {
            try {
                const databases = await this.generator.getDatabaseFiles();
                res.json({
                    success: true,
                    databases: databases.map(db => ({
                        name: db.name,
                        displayName: db.name.replace('.db', '').replace(/-/g, ' '),
                        path: db.path
                    }))
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get realtors from specific database
        this.app.get('/api/databases/:dbName/realtors', async (req, res) => {
            try {
                const dbName = req.params.dbName + '.db';
                const dbPath = path.join(this.generator.config.databasesDir, dbName);
                
                if (!fs.existsSync(dbPath)) {
                    return res.status(404).json({
                        success: false,
                        error: 'Database not found'
                    });
                }

                const realtors = await this.generator.getRealtorsFromDatabase(dbPath);
                res.json({
                    success: true,
                    database: req.params.dbName,
                    count: realtors.length,
                    realtors
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Generate page for specific realtor
        this.app.post('/api/generate/realtor/:id', async (req, res) => {
            try {
                const realtorId = req.params.id;
                const { database } = req.body;

                if (!database) {
                    return res.status(400).json({
                        success: false,
                        error: 'Database name required'
                    });
                }

                const dbPath = path.join(this.generator.config.databasesDir, database + '.db');
                const realtors = await this.generator.getRealtorsFromDatabase(dbPath);
                const realtor = realtors.find(r => r.id == realtorId);

                if (!realtor) {
                    return res.status(404).json({
                        success: false,
                        error: 'Realtor not found'
                    });
                }

                const result = await this.generator.generatePageForRealtor(realtor, database);
                
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Page generated successfully',
                        result,
                        vvebJSEditUrl: `/vvebjs/editor.html?page=generated-realtors/${result.url}`,
                        viewUrl: `/generated-realtors/${result.url}`
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: result.error
                    });
                }
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Generate all pages
        this.app.post('/api/generate/all', async (req, res) => {
            try {
                console.log('🚀 Starting bulk generation...');
                const results = await this.generator.generateAllPages();
                
                res.json({
                    success: true,
                    message: 'Bulk generation completed',
                    results,
                    indexUrl: '/generated-realtors/index.html',
                    vvebJSEditorUrl: '/vvebjs/editor.html'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get generated pages
        this.app.get('/api/generated', (req, res) => {
            try {
                const generatedDir = path.join(__dirname, 'generated-realtors');
                
                if (!fs.existsSync(generatedDir)) {
                    return res.json({
                        success: true,
                        pages: [],
                        count: 0
                    });
                }

                const pages = [];
                const databases = fs.readdirSync(generatedDir);
                
                databases.forEach(database => {
                    const dbPath = path.join(generatedDir, database);
                    if (fs.statSync(dbPath).isDirectory()) {
                        const files = fs.readdirSync(dbPath).filter(file => file.endsWith('.html'));
                        
                        files.forEach(file => {
                            const fileName = file.replace('.html', '');
                            pages.push({
                                database,
                                fileName: file,
                                realtorName: fileName.replace(/-/g, ' '),
                                url: `${database}/${file}`,
                                editUrl: `/vvebjs/editor.html?page=generated-realtors/${database}/${file}`,
                                viewUrl: `/generated-realtors/${database}/${file}`
                            });
                        });
                    }
                });

                res.json({
                    success: true,
                    pages,
                    count: pages.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // VvebJS webhook for real-time generation
        this.app.post('/api/webhook/new-realtor', async (req, res) => {
            try {
                const { database, realtorData } = req.body;

                if (!database || !realtorData) {
                    return res.status(400).json({
                        success: false,
                        error: 'Database and realtor data required'
                    });
                }

                // Parse realtor data into our format
                const realtor = this.generator.parseRealtorData(
                    { id: Date.now(), data: JSON.stringify(realtorData) },
                    realtorData,
                    database
                );

                const result = await this.generator.generatePageForRealtor(realtor, database);

                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Real-time page generation successful',
                        result,
                        vvebJSEditUrl: `/vvebjs/editor.html?page=generated-realtors/${result.url}`
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: result.error
                    });
                }
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // VvebJS integration routes
        this.app.get('/vvebjs/editor', (req, res) => {
            const editorPath = path.join(__dirname, 'editor.html');
            if (fs.existsSync(editorPath)) {
                res.sendFile(editorPath);
            } else {
                res.status(404).json({
                    success: false,
                    error: 'VvebJS editor not found'
                });
            }
        });

        // Root route
        this.app.get('/', (req, res) => {
            const indexPath = path.join(__dirname, 'generated-realtors', 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.json({
                    service: 'VvebJS Realtor API Server',
                    status: 'ready',
                    message: 'Generate realtor pages first using POST /api/generate/all',
                    endpoints: {
                        'GET /health': 'Health check',
                        'GET /api/databases': 'List all databases',
                        'GET /api/databases/:dbName/realtors': 'Get realtors from database',
                        'POST /api/generate/realtor/:id': 'Generate page for specific realtor',
                        'POST /api/generate/all': 'Generate all realtor pages',
                        'GET /api/generated': 'List generated pages',
                        'POST /api/webhook/new-realtor': 'Real-time page generation webhook',
                        'GET /vvebjs/editor': 'VvebJS Editor',
                        'GET /generated-realtors/': 'Generated realtor pages'
                    }
                });
            }
        });

        // Error handling
        this.app.use((error, req, res, next) => {
            console.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.path
            });
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.config.port, this.config.host, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🚀 VvebJS Realtor API Server running at http://${this.config.host}:${this.config.port}`);
                    console.log(`🏠 VvebJS Editor: http://${this.config.host}:${this.config.port}/vvebjs/editor.html`);
                    console.log(`📊 API Documentation: http://${this.config.host}:${this.config.port}/`);
                    resolve(this.server);
                }
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 VvebJS Realtor API Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const isDev = args.includes('--dev');
    
    const server = new VvebJSRealtorAPIServer({
        port: process.env.PORT || 3032,
        corsEnabled: true
    });

    try {
        await server.start();
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down server...');
            await server.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Shutting down server...');
            await server.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

module.exports = VvebJSRealtorAPIServer;

// Run if called directly
if (require.main === module) {
    main();
}
