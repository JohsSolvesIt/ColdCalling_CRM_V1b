#!/usr/bin/env node

/**
 * Simple HTTP server for VvebJS with proper URL decoding
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3030;

const mimeTypes = {
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'json': 'application/json',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  try {
    // Properly decode the URL to handle spaces and special characters
    const decodedPath = decodeURIComponent(url.parse(req.url).pathname);
    const filePath = path.join(__dirname, decodedPath);
    
    console.log(`📁 Requesting: ${decodedPath}`);
    console.log(`📂 File path: ${filePath}`);
    
    // Security check - prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
      console.log('❌ Directory traversal attempt blocked');
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    // Check if file exists and is a file (not directory)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).substring(1).toLowerCase();
      const mimeType = mimeTypes[ext] || 'text/plain';
      
      console.log(`✅ Serving file: ${filePath} (${mimeType})`);
      
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
      });
      
      fs.createReadStream(filePath).pipe(res);
    } else {
      console.log(`❌ File not found: ${filePath}`);
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 VvebJS server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔧 URL decoding enabled for proper file path handling`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the existing server first.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});
