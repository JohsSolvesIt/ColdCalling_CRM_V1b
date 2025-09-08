#!/usr/bin/env node

const { Command } = require('commander');
const RealtorPageGenerator = require('./generator');
const RealtorAPIServer = require('./realtor-api-server');
const config = require('../realtor-config');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
    .name('realtor-generator')
    .description('Dynamic HTML page generator for realtors using VvebJS templates')
    .version('1.0.0');

// Generate all pages command
program
    .command('generate')
    .alias('gen')
    .description('Generate HTML pages for all realtors in all databases')
    .option('-o, --output <dir>', 'Output directory', config.paths.outputDir)
    .option('-t, --template <file>', 'Template file', config.template.file)
    .option('--no-index', 'Skip generating index page')
    .action(async (options) => {
        try {
            console.log('🚀 Starting realtor page generation...');
            
            const generator = new RealtorPageGenerator({
                ...config.paths,
                outputDir: options.output,
                templateFile: options.template
            });

            const results = await generator.generateAllPages();
            
            console.log('\n🎉 Generation Complete!');
            console.log(`📊 Total: ${results.totalRealtors} realtors from ${results.totalDatabases} databases`);
            console.log(`✅ Success: ${results.successfulPages} pages`);
            console.log(`❌ Failed: ${results.failedPages} pages`);
            
            if (results.errors.length > 0) {
                console.log('\n❌ Errors:');
                results.errors.forEach(error => {
                    console.log(`   ${error.database || 'Unknown'}: ${error.error}`);
                });
            }
            
            console.log(`\n📁 Output directory: ${options.output}`);
            console.log(`🌐 Open ${path.join(options.output, 'index.html')} to view the index`);
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });

// Generate for specific database command
program
    .command('generate-db <database>')
    .description('Generate HTML pages for realtors in a specific database')
    .option('-o, --output <dir>', 'Output directory', config.paths.outputDir)
    .action(async (database, options) => {
        try {
            const generator = new RealtorPageGenerator({
                ...config.paths,
                outputDir: options.output
            });

            const databases = await generator.getDatabaseFiles();
            const db = databases.find(d => d.name === database || d.name === `${database}.db`);
            
            if (!db) {
                console.error(`❌ Database not found: ${database}`);
                console.log('Available databases:');
                databases.forEach(d => console.log(`  - ${d.name}`));
                process.exit(1);
            }

            console.log(`🎯 Generating pages for database: ${db.name}`);
            const realtors = await generator.getRealtorsFromDatabase(db.path);
            
            let successCount = 0;
            let failCount = 0;

            for (const realtor of realtors) {
                const result = await generator.generatePageForRealtor(realtor, db.name.replace('.db', ''));
                
                if (result.success) {
                    successCount++;
                    console.log(`   ✅ Generated: ${result.realtor}`);
                } else {
                    failCount++;
                    console.log(`   ❌ Failed: ${result.realtor} - ${result.error}`);
                }
            }

            console.log(`\n🎉 Completed: ${successCount} success, ${failCount} failed`);
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });

// Generate single realtor page command
program
    .command('generate-one <realtor-id> <database>')
    .description('Generate HTML page for a specific realtor')
    .option('-o, --output <dir>', 'Output directory', config.paths.outputDir)
    .action(async (realtorId, database, options) => {
        try {
            const generator = new RealtorPageGenerator({
                ...config.paths,
                outputDir: options.output
            });

            const databases = await generator.getDatabaseFiles();
            const db = databases.find(d => d.name === database || d.name === `${database}.db`);
            
            if (!db) {
                console.error(`❌ Database not found: ${database}`);
                process.exit(1);
            }

            const result = await generator.generateSingleRealtor(realtorId, db.path);
            console.log(`🎉 Generated page: ${result.filepath}`);
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });

// List databases command
program
    .command('list-db')
    .alias('ls')
    .description('List all available databases')
    .action(async () => {
        try {
            const generator = new RealtorPageGenerator(config.paths);
            const databases = await generator.getDatabaseFiles();
            
            console.log(`📊 Found ${databases.length} database(s):`);
            
            for (const db of databases) {
                try {
                    const realtors = await generator.getRealtorsFromDatabase(db.path);
                    const stats = fs.statSync(db.path);
                    console.log(`  📁 ${db.name}`);
                    console.log(`     Realtors: ${realtors.length}`);
                    console.log(`     Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                    console.log(`     Modified: ${stats.mtime.toLocaleDateString()}`);
                    console.log('');
                } catch (error) {
                    console.log(`  ❌ ${db.name} - Error: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });

// List realtors in database command
program
    .command('list-realtors <database>')
    .description('List realtors in a specific database')
    .option('-l, --limit <number>', 'Limit number of results', '20')
    .action(async (database, options) => {
        try {
            const generator = new RealtorPageGenerator(config.paths);
            const databases = await generator.getDatabaseFiles();
            const db = databases.find(d => d.name === database || d.name === `${database}.db`);
            
            if (!db) {
                console.error(`❌ Database not found: ${database}`);
                process.exit(1);
            }

            const realtors = await generator.getRealtorsFromDatabase(db.path);
            const limit = parseInt(options.limit);
            const displayRealtors = realtors.slice(0, limit);
            
            console.log(`👥 Realtors in ${db.name} (showing ${displayRealtors.length} of ${realtors.length}):`);
            console.log('');
            
            displayRealtors.forEach((realtor, index) => {
                console.log(`${index + 1}. ${realtor.name}`);
                console.log(`   ID: ${realtor.id}`);
                console.log(`   Agency: ${realtor.agency}`);
                console.log(`   Phone: ${realtor.phone}`);
                console.log(`   Experience: ${realtor.experience}`);
                console.log(`   Slug: ${realtor.slug}`);
                console.log('');
            });

            if (realtors.length > limit) {
                console.log(`... and ${realtors.length - limit} more. Use --limit to see more.`);
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });

// Start API server command
program
    .command('serve')
    .description('Start the API server for dynamic generation')
    .option('-p, --port <number>', 'Server port', '3001')
    .action((options) => {
        const port = parseInt(options.port);
        const server = new RealtorAPIServer(port);
        server.start();
    });

// Clean output directory command
program
    .command('clean')
    .description('Clean the output directory')
    .option('-o, --output <dir>', 'Output directory', config.paths.outputDir)
    .action((options) => {
        try {
            if (fs.existsSync(options.output)) {
                fs.rmSync(options.output, { recursive: true, force: true });
                console.log(`🧹 Cleaned output directory: ${options.output}`);
            } else {
                console.log(`📁 Output directory doesn't exist: ${options.output}`);
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });

// Status command
program
    .command('status')
    .description('Show generator status and configuration')
    .action(async () => {
        try {
            const generator = new RealtorPageGenerator(config.paths);
            const databases = await generator.getDatabaseFiles();
            
            console.log('📊 Realtor Page Generator Status');
            console.log('================================');
            console.log(`Templates directory: ${config.paths.templatesDir}`);
            console.log(`Output directory: ${config.paths.outputDir}`);
            console.log(`Databases directory: ${config.paths.databasesDir}`);
            console.log(`Template file: ${config.template.file}`);
            console.log('');
            console.log(`Databases found: ${databases.length}`);
            
            let totalRealtors = 0;
            for (const db of databases) {
                try {
                    const realtors = await generator.getRealtorsFromDatabase(db.path);
                    totalRealtors += realtors.length;
                } catch (error) {
                    console.log(`⚠️  Error reading ${db.name}: ${error.message}`);
                }
            }
            
            console.log(`Total realtors: ${totalRealtors}`);
            
            // Check if output directory exists and count generated pages
            if (fs.existsSync(config.paths.outputDir)) {
                let pageCount = 0;
                const dirs = fs.readdirSync(config.paths.outputDir, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory());
                
                for (const dir of dirs) {
                    const files = fs.readdirSync(path.join(config.paths.outputDir, dir.name));
                    pageCount += files.filter(f => f.endsWith('.html') && f !== 'index.html').length;
                }
                
                console.log(`Generated pages: ${pageCount}`);
            } else {
                console.log('Generated pages: 0 (output directory not found)');
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    });

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
