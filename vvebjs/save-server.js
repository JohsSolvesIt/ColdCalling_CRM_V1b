const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3031;

// Enable CORS for all requests
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded bodies (for VvebJS form data)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Save endpoint
app.post('/save', (req, res) => {
    try {
        // Handle both JSON and form data
        let file, content;
        
        if (req.headers['content-type']?.includes('application/json')) {
            // JSON format
            file = req.body.file;
            content = req.body.content;
        } else {
            // Form data format (from VvebJS)
            file = req.body.file;
            content = req.body.html; // VvebJS sends HTML content as 'html' field
        }
        
        if (!file || !content) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing file or content parameter',
                received: Object.keys(req.body)
            });
        }

        // Ensure the file path is within our directory
        const filePath = path.join(__dirname, file);
        const baseDir = path.resolve(__dirname);
        
        if (!filePath.startsWith(baseDir)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid file path' 
            });
        }

        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`✅ Saved: ${file} (unified contacts directory)`);
        
        res.json({ 
            success: true, 
            message: `File ${file} saved successfully`,
            timestamp: new Date().toISOString(),
            unifiedSystem: true
        });
        
    } catch (error) {
        console.error('❌ Save error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'VvebJS Save Server',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 VvebJS Save Server running on http://localhost:${PORT}`);
    console.log(`   • Save endpoint: POST http://localhost:${PORT}/save`);
    console.log(`   • Health check: GET http://localhost:${PORT}/health`);
});

module.exports = app;
