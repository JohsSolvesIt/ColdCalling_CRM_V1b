// Configuration for the Realtor Page Generator
const path = require('path');

const config = {
    // Directory paths
    paths: {
        templatesDir: path.join(__dirname, 'demo/realtor'),
        outputDir: path.join(__dirname, 'generated-pages'),
        databasesDir: path.join(__dirname, '../crm-app/databases'),
        staticAssetsDir: path.join(__dirname, 'assets')
    },

    // Template settings
    template: {
        file: 'profile.html',
        defaultImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNkZGQiLz48dGV4dCB4PSI3NSIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='
    },

    // Website settings
    website: {
        domain: 'https://your-domain.com',
        title: 'Real Estate Professionals',
        description: 'Find experienced real estate agents in your area',
        contactEmail: 'info@your-domain.com'
    },

    // Database settings
    database: {
        // Filter criteria for including realtors
        minRequiredFields: ['NAME', 'AGENCY'],
        
        // Mapping of database fields to template variables
        fieldMapping: {
            'NAME': 'name',
            'AGENCY': 'agency',
            'Phone': 'phone',
            'Experience:': 'experience',
            'PROFILE PIC': 'profilePic',
            'REALTOR.COM': 'realtorCom',
            'For sale:': 'forSale',
            'Sold:': 'sold',
            'Listed a house:': 'listedHouse',
            'Languages:': 'languages'
        }
    },

    // Generation settings
    generation: {
        // Whether to overwrite existing files
        overwriteExisting: true,
        
        // Whether to generate an index page
        generateIndex: true,
        
        // Whether to create subdirectories by database
        organizeByDatabase: true,
        
        // Maximum number of realtors to process per database (0 = unlimited)
        maxRealtorsPerDatabase: 0,
        
        // File naming convention
        fileNaming: {
            // Options: 'slug', 'id', 'name-id'
            strategy: 'slug',
            prefix: '',
            suffix: ''
        }
    },

    // Logging settings
    logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        logToFile: false,
        logFile: 'generation.log'
    },

    // Performance settings
    performance: {
        // Process databases in parallel
        parallelDatabases: false,
        
        // Process realtors in parallel within each database
        parallelRealtors: true,
        
        // Batch size for parallel processing
        batchSize: 10
    }
};

module.exports = config;
