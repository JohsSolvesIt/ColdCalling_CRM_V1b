#!/usr/bin/env node

/**
 * Real-time Realtor Page Generator Webhook
 * 
 * This script monitors CRM database changes and automatically generates
 * HTML pages for new realtors using VvebJS templates.
 * 
 * Usage:
 *   node webhook-trigger.js --realtor-id <id> --database <dbname>
 *   node webhook-trigger.js --monitor --database <dbname>
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { EventEmitter } = require('events');

class RealtorWebhookTrigger extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            webhookUrl: config.webhookUrl || 'http://localhost:3001/api/webhook/realtor-added',
            databasesDir: config.databasesDir || path.join(__dirname, '../crm-app/databases'),
            monitorInterval: config.monitorInterval || 5000, // 5 seconds
            ...config
        };
        
        this.monitoring = false;
        this.lastChecked = {};
    }

    // Trigger webhook for specific realtor
    async triggerWebhook(realtorId, databaseName) {
        try {
            console.log(`🔔 Triggering webhook for realtor: ${realtorId} in ${databaseName}`);
            
            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    realtorId,
                    databaseName
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Webhook success:`, result.message);
                this.emit('webhook-success', { realtorId, databaseName, result });
                return result;
            } else {
                const error = await response.text();
                console.error(`❌ Webhook failed:`, error);
                this.emit('webhook-error', { realtorId, databaseName, error });
                throw new Error(error);
            }
        } catch (error) {
            console.error(`❌ Webhook error:`, error.message);
            this.emit('webhook-error', { realtorId, databaseName, error: error.message });
            throw error;
        }
    }

    // Monitor database for new additions
    async startMonitoring(databaseName = null) {
        console.log(`👀 Starting realtor monitoring...`);
        
        this.monitoring = true;
        
        const databases = databaseName 
            ? [{ name: databaseName, path: path.join(this.config.databasesDir, databaseName) }]
            : await this.getDatabaseFiles();

        // Initialize last checked counts
        for (const db of databases) {
            this.lastChecked[db.name] = await this.getRealtorCount(db.path);
            console.log(`📊 ${db.name}: Currently ${this.lastChecked[db.name]} realtors`);
        }

        const monitorLoop = async () => {
            if (!this.monitoring) return;

            try {
                for (const db of databases) {
                    const currentCount = await this.getRealtorCount(db.path);
                    const lastCount = this.lastChecked[db.name];

                    if (currentCount > lastCount) {
                        console.log(`🆕 New realtor(s) detected in ${db.name}: ${currentCount} (was ${lastCount})`);
                        
                        // Get the new realtors
                        const newRealtors = await this.getNewRealtors(db.path, lastCount);
                        
                        for (const realtor of newRealtors) {
                            try {
                                await this.triggerWebhook(realtor.id, db.name);
                                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
                            } catch (error) {
                                console.error(`❌ Failed to trigger webhook for ${realtor.id}:`, error.message);
                            }
                        }

                        this.lastChecked[db.name] = currentCount;
                    }
                }
            } catch (error) {
                console.error('❌ Monitoring error:', error.message);
            }

            setTimeout(monitorLoop, this.config.monitorInterval);
        };

        monitorLoop();
        console.log(`✅ Monitoring started (checking every ${this.config.monitorInterval}ms)`);
    }

    // Stop monitoring
    stopMonitoring() {
        this.monitoring = false;
        console.log('🛑 Monitoring stopped');
    }

    // Get database files
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

    // Get realtor count from database
    async getRealtorCount(dbPath) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(new Error(`Failed to open database ${dbPath}: ${err.message}`));
                    return;
                }
            });

            db.get('SELECT COUNT(*) as count FROM contacts', [], (err, row) => {
                if (err) {
                    reject(new Error(`Failed to count realtors: ${err.message}`));
                    return;
                }

                db.close();
                resolve(row.count);
            });
        });
    }

    // Get new realtors added since last check
    async getNewRealtors(dbPath, lastCount) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(new Error(`Failed to open database ${dbPath}: ${err.message}`));
                    return;
                }
            });

            // Get realtors ordered by creation date, skip the ones we already processed
            const query = `
                SELECT id, data, created_at 
                FROM contacts 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            
            db.all(query, [100], (err, rows) => { // Get up to 100 latest
                if (err) {
                    reject(new Error(`Failed to query new realtors: ${err.message}`));
                    return;
                }

                // Take only the new ones (those beyond lastCount)
                const newRows = rows.slice(0, rows.length - lastCount);
                
                const realtors = newRows.map(row => {
                    try {
                        const data = JSON.parse(row.data);
                        return {
                            id: row.id,
                            name: data.NAME || 'Unknown',
                            agency: data.AGENCY || 'Unknown Agency',
                            createdAt: row.created_at
                        };
                    } catch (parseError) {
                        console.warn(`⚠️ Failed to parse data for realtor ${row.id}`);
                        return {
                            id: row.id,
                            name: 'Unknown',
                            agency: 'Unknown Agency',
                            createdAt: row.created_at
                        };
                    }
                });

                db.close();
                resolve(realtors);
            });
        });
    }

    // Manual trigger for testing
    async testWebhook(realtorId, databaseName) {
        console.log(`🧪 Testing webhook trigger...`);
        return await this.triggerWebhook(realtorId, databaseName);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🔔 Realtor Webhook Trigger

Usage:
  node webhook-trigger.js --realtor-id <id> --database <db>    # Trigger for specific realtor
  node webhook-trigger.js --monitor [--database <db>]         # Monitor for changes
  node webhook-trigger.js --test --realtor-id <id> --database <db>  # Test webhook

Examples:
  node webhook-trigger.js --realtor-id wq48kbf --database "Realtors - AZ 05203.db"
  node webhook-trigger.js --monitor --database "testD.db"
  node webhook-trigger.js --monitor  # Monitor all databases
        `);
        return;
    }

    const trigger = new RealtorWebhookTrigger();

    // Parse arguments
    const getArg = (name) => {
        const index = args.indexOf(`--${name}`);
        return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
    };

    const hasFlag = (name) => args.includes(`--${name}`);

    try {
        if (hasFlag('monitor')) {
            const databaseName = getArg('database');
            
            // Set up event listeners
            trigger.on('webhook-success', ({ realtorId, result }) => {
                console.log(`✅ Successfully generated page for realtor: ${realtorId}`);
            });

            trigger.on('webhook-error', ({ realtorId, error }) => {
                console.error(`❌ Failed to generate page for realtor: ${realtorId} - ${error}`);
            });

            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n🛑 Shutting down monitor...');
                trigger.stopMonitoring();
                process.exit(0);
            });

            await trigger.startMonitoring(databaseName);
            
        } else if (hasFlag('realtor-id') && hasFlag('database')) {
            const realtorId = getArg('realtor-id');
            const databaseName = getArg('database');

            if (!realtorId || !databaseName) {
                console.error('❌ Both --realtor-id and --database are required');
                process.exit(1);
            }

            if (hasFlag('test')) {
                await trigger.testWebhook(realtorId, databaseName);
            } else {
                await trigger.triggerWebhook(realtorId, databaseName);
            }
        } else {
            console.error('❌ Invalid arguments. Use --help for usage information.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

module.exports = RealtorWebhookTrigger;

// Run if called directly
if (require.main === module) {
    // Add fetch polyfill for Node.js if needed
    if (!global.fetch) {
        const { fetch, Headers, Request, Response } = require('undici');
        Object.assign(global, { fetch, Headers, Request, Response });
    }
    
    main();
}
