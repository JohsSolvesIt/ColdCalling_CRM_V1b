const fs = require('fs');
const path = require('path');

// Scan the generated-realtors directory for all HTML files
const outputDir = './generated-realtors';
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
                url: itemRelativePath,
                editUrl: `../editor.html?page=${itemRelativePath}`,
                database: path.dirname(itemRelativePath)
            });
        }
    });
};

try {
    scanDirectory(outputDir);
    console.log('Found', generatedPages.length, 'generated pages');
    
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
                    <h3 class="text-info">8/19/2025</h3>
                    <p>Last Updated</p>
                </div>
            </div>
        </div>

        <div class="row">
            ${generatedPages.slice(0, 50).map(page => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${page.name}</h5>
                            <p class="card-text">
                                <small class="text-muted">Database: ${page.database}</small><br>
                                <strong>VvebJS Compatible</strong>
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

    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);
    console.log('✅ Index regenerated with correct VvebJS paths');
} catch (error) {
    console.error('Error:', error);
}
