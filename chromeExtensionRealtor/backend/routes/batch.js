const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const logger = require('../utils/logger');

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'temp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Active batch processes
const activeBatches = new Map();

// Start batch processing
router.post('/start', upload.single('csvFile'), async (req, res) => {
  try {
    const { batchSize, tabDelay, batchDelay, tags } = req.body;
    const csvFile = req.file;
    
    if (!csvFile) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    // Generate unique batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create batch directory
    const batchDir = path.join(__dirname, '../../../temp/batches', batchId);
    fs.mkdirSync(batchDir, { recursive: true });
    
    // Move CSV file to batch directory
    const csvPath = path.join(batchDir, 'urls.csv');
    fs.renameSync(csvFile.path, csvPath);
    
    // Create batch configuration
    const batchConfig = {
      id: batchId,
      csvPath,
      batchSize: parseInt(batchSize) || 5,
      tabDelay: parseInt(tabDelay) || 3,
      batchDelay: parseInt(batchDelay) || 15,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: 'starting',
      startTime: new Date().toISOString(),
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        skipped: 0,
        failed: 0
      },
      logFile: path.join(batchDir, 'batch.log'),
      progressFile: path.join(batchDir, 'progress.json')
    };
    
    // Save batch configuration
    fs.writeFileSync(
      path.join(batchDir, 'config.json'),
      JSON.stringify(batchConfig, null, 2)
    );
    
    // Count total URLs in CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim() && line.includes('realtor.com'));
    batchConfig.progress.total = lines.length;
    
    // Start the simple tab opener script
    const scriptPath = path.join(__dirname, '../../simple_tab_opener.sh');
    const child = spawn('bash', [
      scriptPath,
      '-b', batchConfig.batchSize.toString(),
      '-d', batchConfig.tabDelay.toString(),
      '-w', batchConfig.batchDelay.toString(),
      csvPath
    ], {
      cwd: path.dirname(scriptPath),
      env: {
        ...process.env,
        BATCH_ID: batchId,
        BATCH_TAGS: batchConfig.tags.join(',')
      }
    });
    
    // Store process information
    activeBatches.set(batchId, {
      ...batchConfig,
      process: child,
      status: 'running'
    });
    
    // Handle process output
    child.stdout.on('data', (data) => {
      const output = data.toString();
      logger.info(`Batch ${batchId}: ${output}`);
      
      // Append to log file
      fs.appendFileSync(batchConfig.logFile, `${new Date().toISOString()} - ${output}\n`);
    });
    
    child.stderr.on('data', (data) => {
      const error = data.toString();
      logger.error(`Batch ${batchId} error: ${error}`);
      
      // Append to log file
      fs.appendFileSync(batchConfig.logFile, `${new Date().toISOString()} - ERROR: ${error}\n`);
    });
    
    child.on('close', (code) => {
      logger.info(`Batch ${batchId} completed with code ${code}`);
      
      const batch = activeBatches.get(batchId);
      if (batch) {
        batch.status = code === 0 ? 'completed' : 'failed';
        batch.endTime = new Date().toISOString();
        
        // Save final status
        fs.writeFileSync(
          path.join(batchDir, 'config.json'),
          JSON.stringify(batch, null, 2)
        );
      }
    });
    
    logger.info(`Started batch processing: ${batchId}`);
    
    res.json({
      success: true,
      batchId,
      message: 'Batch processing started',
      config: {
        batchSize: batchConfig.batchSize,
        tabDelay: batchConfig.tabDelay,
        batchDelay: batchConfig.batchDelay,
        tags: batchConfig.tags,
        totalUrls: batchConfig.progress.total
      }
    });
    
  } catch (error) {
    logger.error('Batch start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start batch processing',
      message: error.message
    });
  }
});

// Get batch status
router.get('/status/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Check active batches first
    const activeBatch = activeBatches.get(batchId);
    if (activeBatch) {
      // Try to read progress file for latest stats
      try {
        const progressPath = activeBatch.progressFile;
        if (fs.existsSync(progressPath)) {
          const progressData = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
          activeBatch.progress = progressData;
        }
      } catch (e) {
        // Progress file might not exist yet
      }
      
      return res.json({
        success: true,
        batch: {
          id: activeBatch.id,
          status: activeBatch.status,
          startTime: activeBatch.startTime,
          endTime: activeBatch.endTime,
          progress: activeBatch.progress,
          tags: activeBatch.tags,
          config: {
            batchSize: activeBatch.batchSize,
            tabDelay: activeBatch.tabDelay,
            batchDelay: activeBatch.batchDelay
          }
        }
      });
    }
    
    // Check batch directory for completed batches
    const batchDir = path.join(__dirname, '../../../temp/batches', batchId);
    const configPath = path.join(batchDir, 'config.json');
    
    if (fs.existsSync(configPath)) {
      const batchConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      return res.json({
        success: true,
        batch: {
          id: batchConfig.id,
          status: batchConfig.status,
          startTime: batchConfig.startTime,
          endTime: batchConfig.endTime,
          progress: batchConfig.progress,
          tags: batchConfig.tags,
          config: {
            batchSize: batchConfig.batchSize,
            tabDelay: batchConfig.tabDelay,
            batchDelay: batchConfig.batchDelay
          }
        }
      });
    }
    
    res.status(404).json({
      success: false,
      error: 'Batch not found'
    });
    
  } catch (error) {
    logger.error('Batch status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batch status',
      message: error.message
    });
  }
});

// List all batches
router.get('/list', async (req, res) => {
  try {
    const batchesDir = path.join(__dirname, '../../../temp/batches');
    const batches = [];
    
    // Add active batches
    for (const [batchId, batch] of activeBatches.entries()) {
      batches.push({
        id: batch.id,
        status: batch.status,
        startTime: batch.startTime,
        endTime: batch.endTime,
        progress: batch.progress,
        tags: batch.tags,
        totalUrls: batch.progress.total
      });
    }
    
    // Add completed batches from filesystem
    if (fs.existsSync(batchesDir)) {
      const batchDirs = fs.readdirSync(batchesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const batchId of batchDirs) {
        // Skip if already in active batches
        if (activeBatches.has(batchId)) continue;
        
        const configPath = path.join(batchesDir, batchId, 'config.json');
        if (fs.existsSync(configPath)) {
          try {
            const batchConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            batches.push({
              id: batchConfig.id,
              status: batchConfig.status,
              startTime: batchConfig.startTime,
              endTime: batchConfig.endTime,
              progress: batchConfig.progress,
              tags: batchConfig.tags,
              totalUrls: batchConfig.progress.total
            });
          } catch (e) {
            // Skip invalid config files
          }
        }
      }
    }
    
    // Sort by start time (newest first)
    batches.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    res.json({
      success: true,
      batches,
      count: batches.length
    });
    
  } catch (error) {
    logger.error('Batch list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list batches',
      message: error.message
    });
  }
});

// Stop batch processing
router.post('/stop/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const activeBatch = activeBatches.get(batchId);
    if (!activeBatch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found or not active'
      });
    }
    
    // Kill the process
    if (activeBatch.process) {
      activeBatch.process.kill('SIGTERM');
      activeBatch.status = 'stopped';
      activeBatch.endTime = new Date().toISOString();
      
      logger.info(`Stopped batch processing: ${batchId}`);
    }
    
    res.json({
      success: true,
      message: 'Batch processing stopped',
      batchId
    });
    
  } catch (error) {
    logger.error('Batch stop error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop batch processing',
      message: error.message
    });
  }
});

// Get batch logs
router.get('/logs/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { lines = 100 } = req.query;
    
    const batchDir = path.join(__dirname, '../../../temp/batches', batchId);
    const logPath = path.join(batchDir, 'batch.log');
    
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({
        success: false,
        error: 'Log file not found'
      });
    }
    
    const logContent = fs.readFileSync(logPath, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    
    // Return last N lines
    const recentLines = logLines.slice(-parseInt(lines));
    
    res.json({
      success: true,
      logs: recentLines,
      totalLines: logLines.length
    });
    
  } catch (error) {
    logger.error('Batch logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batch logs',
      message: error.message
    });
  }
});

// Clean up old batches
router.delete('/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));
    
    const batchesDir = path.join(__dirname, '../../../temp/batches');
    let deletedCount = 0;
    
    if (fs.existsSync(batchesDir)) {
      const batchDirs = fs.readdirSync(batchesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const batchId of batchDirs) {
        // Skip active batches
        if (activeBatches.has(batchId)) continue;
        
        const batchDir = path.join(batchesDir, batchId);
        const configPath = path.join(batchDir, 'config.json');
        
        if (fs.existsSync(configPath)) {
          try {
            const batchConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const batchDate = new Date(batchConfig.startTime);
            
            if (batchDate < cutoffDate) {
              // Delete batch directory
              fs.rmSync(batchDir, { recursive: true, force: true });
              deletedCount++;
              logger.info(`Deleted old batch: ${batchId}`);
            }
          } catch (e) {
            // Skip invalid config files but delete directory anyway if it's old
            const stats = fs.statSync(batchDir);
            if (stats.birthtime < cutoffDate) {
              fs.rmSync(batchDir, { recursive: true, force: true });
              deletedCount++;
            }
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old batches`,
      deletedCount
    });
    
  } catch (error) {
    logger.error('Batch cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup batches',
      message: error.message
    });
  }
});

module.exports = router;
