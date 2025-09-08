/**
 * HTML Generator for Popup System
 * 
 * This module handles all HTML generation for the popup/tab display,
 * including CSS styles and content sections.
 */

class PopupHtmlGenerator {
  
  /**
   * Generate the complete HTML content for the data viewer
   * @param {Object} data - The extracted data
   * @param {Object} summary - The extraction summary
   * @returns {string} Complete HTML content
   */
  generateDataViewerHTML(data, summary) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Realtor Data Extraction Results</title>
    <style>
        ${this.getBaseStyles()}
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 Realtor Data Extraction Results</h1>
        <div class="url">${summary.url}</div>
        <div class="timestamp">Extracted on ${summary.timestamp}</div>
    </div>

    <div class="summary">
        <h2>📊 Extraction Summary</h2>
        <div class="summary-stats">
            <div class="stat-card ${this.getQualityClass(summary.qualityScore)}">
                <div class="stat-value">${Math.round(summary.qualityScore)}%</div>
                <div class="stat-label">Quality Score</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${summary.agentFields}</div>
                <div class="stat-label">Agent Details</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${summary.propertyFields}</div>
                <div class="stat-label">Properties</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${summary.reviewFields}</div>
                <div class="stat-label">Reviews</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${summary.contactFields}</div>
                <div class="stat-label">Contact Info</div>
            </div>
        </div>
        <div class="quality-meter">
            <div class="quality-fill" style="width: ${summary.qualityScore}%; background: ${this.getQualityColor(summary.qualityScore)};"></div>
        </div>
    </div>

    <div class="actions">
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
        <button class="btn btn-success" onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(data)}, null, 2))">📋 Copy JSON</button>
        <button class="btn btn-info" onclick="window.open('${summary.url}', '_blank')">🔗 View Source</button>
        <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
    </div>

    <div class="content">
        <div class="data-sections">
            ${this.generateEnhancedDataSections(data, summary)}
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Get base CSS styles for the popup
   * @returns {string} CSS styles
   */
  getBaseStyles() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
            color: #333;
            line-height: 1.5;
            margin: 0;
            padding: 12px;
        }
        
        .header {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            padding: 15px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .header h1 { font-size: 22px; margin-bottom: 6px; font-weight: 400; }
        .header .url { opacity: 0.9; font-size: 12px; font-weight: 300; }
        .header .timestamp { opacity: 0.8; font-size: 11px; margin-top: 4px; }
        
        .summary {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 10px rgba(0,0,0,0.06);
            margin-bottom: 15px;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-bottom: 15px;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            border-left: 3px solid;
            transition: transform 0.2s ease;
        }
        
        .stat-card:hover { transform: translateY(-1px); }
        .stat-card.success { border-left-color: #27ae60; }
        .stat-card.warning { border-left-color: #f39c12; }
        .stat-card.danger { border-left-color: #e74c3c; }
        .stat-card.info { border-left-color: #3498db; }
        
        .stat-value { font-size: 24px; font-weight: 400; margin-bottom: 4px; color: #2c3e50; }
        .stat-label { color: #7f8c8d; font-size: 12px; font-weight: 500; }
        
        .quality-meter {
            background: #e9ecef;
            height: 15px;
            border-radius: 8px;
            overflow: hidden;
            margin: 6px 0;
        }
        
        .quality-fill {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 8px;
        }
        
        .actions {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
        }
        
        .btn:hover { transform: translateY(-1px); }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-info { background: #17a2b8; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        
        .content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .data-sections {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 10px rgba(0,0,0,0.06);
            overflow: hidden;
        }
    `;
  }

  /**
   * Get quality CSS class based on score
   * @param {number} score - Quality score (0-100)
   * @returns {string} CSS class name
   */
  getQualityClass(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  /**
   * Get quality color based on score
   * @param {number} score - Quality score (0-100)
   * @returns {string} Color value
   */
  getQualityColor(score) {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  }

  /**
   * Generate enhanced data sections
   * @param {Object} data - The extracted data
   * @param {Object} summary - The extraction summary
   * @returns {string} HTML for all data sections
   */
  generateEnhancedDataSections(data, summary) {
    const sections = [];
    
    // Import section generators
    const sectionGenerator = new PopupSectionGenerator();
    
    sections.push(sectionGenerator.createAgentInfoSection(data));
    sections.push(sectionGenerator.createPropertyInfoSection(data));
    sections.push(sectionGenerator.createContactInfoSection(data));
    sections.push(sectionGenerator.createReviewsInfoSection(data));
    sections.push(sectionGenerator.createRawDataSection(data));
    
    return sections.join('');
  }
}

// Export for use in popup system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupHtmlGenerator;
} else {
  window.PopupHtmlGenerator = PopupHtmlGenerator;
}
