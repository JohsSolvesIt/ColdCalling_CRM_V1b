const express = require('express');
const router = express.Router();
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Active processes tracking
const activeProcesses = new Map();

// Save CSV content endpoint (without multer)
router.post('/save-csv', async (req, res) => {
  try {
    const { csvContent, filename, targetDirectory } = req.body;
    
    if (!csvContent || !filename) {
      return res.status(400).json({
        success: false,
        error: 'CSV content and filename are required'
      });
    }

    // Determine target directory path
    let targetPath;
    if (targetDirectory === 'chromeExtensionRealtor') {
      targetPath = path.join(__dirname, '../../../chromeExtensionRealtor');
    } else {
      targetPath = path.join(__dirname, '../../../', targetDirectory || '');
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetPath)) {
      return res.status(400).json({
        success: false,
        error: `Target directory does not exist: ${targetPath}`
      });
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const extension = path.extname(filename) || '.csv';
    const baseName = path.basename(filename, extension);
    
    // Sanitize filename by removing special characters that cause shell issues
    const sanitizedBaseName = baseName
      .replace(/[()]/g, '')  // Remove parentheses
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove other special characters except underscore and dash
    
    const newFilename = `${sanitizedBaseName}_${timestamp}${extension}`;
    const finalPath = path.join(targetPath, newFilename);

    // Write CSV content to file
    fs.writeFileSync(finalPath, csvContent, 'utf8');
    
    logger.info(`CSV file saved: ${filename} -> ${newFilename}`);
    
    res.json({
      success: true,
      message: 'CSV file saved successfully',
      filename: newFilename,
      originalName: filename,
      path: finalPath,
      size: csvContent.length
    });
    
  } catch (error) {
    logger.error('CSV save error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to save CSV file',
      message: error.message
    });
  }
});

// Check CSV URLs against existing database
router.post('/check-csv-urls', async (req, res) => {
  try {
    const { csvContent } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: 'CSV content is required'
      });
    }

    // Parse CSV content to extract URLs
    const lines = csvContent.split('\n').filter(line => line.trim());
    const urls = [];
    let lineCount = 0;
    
    for (const line of lines) {
      lineCount++;
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      let url;
      if (trimmedLine.includes(',')) {
        // CSV format with multiple columns
        const parts = trimmedLine.split(',');
        url = parts[0].trim().replace(/"/g, '');
      } else {
        // Single URL per line
        url = trimmedLine;
      }
      
      // Skip header row (first line that doesn't look like a realtor.com URL)
      if (lineCount === 1 && !url.match(/^https?:\/\/.*realtor\.com/)) {
        console.log(`Skipping header row: ${trimmedLine}`);
        continue;
      }
      
      // Validate URL
      if (url && url.match(/^https?:\/\/.*realtor\.com/)) {
        urls.push(url);
      }
    }

    // Check each URL against the database
    const db = require('../database/connection');
    const checkResults = [];
    
    for (const url of urls) {
      try {
        // Use the same logic as check-duplicate endpoint
        const existingAgent = await db.findAgentByUrl(url);
        console.log(`URL: ${url}, Agent found: ${existingAgent ? existingAgent.name : 'none'}`);
        
        if (existingAgent) {
          checkResults.push({
            url,
            exists: true,
            selected: true, // Default to selected for re-scraping
            existingAgent: {
              name: existingAgent.name,
              title: existingAgent.company
            }
          });
        } else {
          checkResults.push({
            url,
            exists: false,
            selected: true, // Default to selected
            existingAgent: null
          });
        }
      } catch (dbError) {
        console.error('Database query error for URL:', url, dbError);
        // If database query fails, treat as new
        checkResults.push({
          url,
          exists: false,
          selected: true,
          existingAgent: null
        });
      }
    }

    const total = checkResults.length;
    const existing = checkResults.filter(r => r.exists).length;
    const newCount = total - existing;

    console.log(`Check results: Total=${total}, Existing=${existing}, New=${newCount}`);

    res.json({
      success: true,
      urls: checkResults,
      total,
      existing,
      new: newCount
    });
    
  } catch (error) {
    logger.error('CSV URL check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check CSV URLs',
      message: error.message
    });
  }
});

// Create filtered CSV with selected URLs
router.post('/create-filtered-csv', async (req, res) => {
  try {
    const { selectedUrls, filename } = req.body;
    
    if (!selectedUrls || !Array.isArray(selectedUrls) || selectedUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Selected URLs array is required'
      });
    }

    // Determine target directory path
    const targetPath = path.join(__dirname, '../../../chromeExtensionRealtor');
    
    // Clean up old filtered CSV files (keep only last 3)
    try {
      const files = fs.readdirSync(targetPath)
        .filter(file => file.includes('_filtered_') && file.endsWith('.csv'))
        .map(file => ({
          name: file,
          path: path.join(targetPath, file),
          stats: fs.statSync(path.join(targetPath, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime); // Sort by modification time, newest first
      
      // Remove all but the 3 most recent filtered files
      const filesToDelete = files.slice(3);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        logger.info(`Cleaned up old filtered CSV: ${file.name}`);
      }
      
      if (filesToDelete.length > 0) {
        logger.info(`Cleaned up ${filesToDelete.length} old filtered CSV files`);
      }
    } catch (cleanupError) {
      logger.warn('Failed to cleanup old filtered files:', cleanupError.message);
    }

    // Create CSV content with selected URLs
    const csvContent = selectedUrls.join('\n') + '\n';  // Add final newline!
    console.log('🔍 CSV CONTENT TO WRITE:', csvContent);
    console.log('🔍 CSV CONTENT LENGTH:', csvContent.length);
    
    // Generate unique filename
    const timestamp = Date.now();
    const baseName = filename ? path.basename(filename, path.extname(filename)) : 'filtered_urls';
    
    // Sanitize the base name to remove problematic characters
    const sanitizedBaseName = baseName
      .replace(/[()]/g, '')  // Remove parentheses
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove other special characters except underscore and dash
    
    const newFilename = `${sanitizedBaseName}_filtered_${timestamp}.csv`;
    const finalPath = path.join(targetPath, newFilename);

    // Write filtered CSV content to file
    fs.writeFileSync(finalPath, csvContent, 'utf8');
    console.log('🔍 FILE WRITTEN TO:', finalPath);
    
    // Verify file content immediately after writing
    const writtenContent = fs.readFileSync(finalPath, 'utf8');
    console.log('🔍 FILE CONTENT VERIFICATION:', writtenContent);
    console.log('🔍 FILE LINES COUNT:', writtenContent.split('\n').length);
    
    logger.info(`Filtered CSV file created: ${newFilename} with ${selectedUrls.length} URLs`);
    
    res.json({
      success: true,
      message: 'Filtered CSV file created successfully',
      filename: newFilename,
      originalName: filename,
      path: finalPath,
      urlCount: selectedUrls.length
    });
    
  } catch (error) {
    logger.error('Filtered CSV creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create filtered CSV file',
      message: error.message
    });
  }
});

// Execute command endpoint
router.post('/execute-command', async (req, res) => {
  try {
    const { command, workingDir, tags = [] } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    // Generate unique process ID
    const processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Starting process ${processId}: ${command}`);
    
    // Parse command properly to handle quoted arguments
    function parseCommand(cmd) {
      const parts = [];
      let current = '';
      let inQuotes = false;
      let quoteChar = '';
      
      for (let i = 0; i < cmd.length; i++) {
        const char = cmd[i];
        
        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
          inQuotes = false;
          quoteChar = '';
        } else if (char === ' ' && !inQuotes) {
          if (current.trim()) {
            parts.push(current.trim());
            current = '';
          }
        } else {
          current += char;
        }
      }
      
      if (current.trim()) {
        parts.push(current.trim());
      }
      
      return parts;
    }

    // Smart command execution that handles scripts and executables robustly
    function createSpawnOptions(command, workingDir, tags) {
      const parts = parseCommand(command);
      let executable = parts[0];
      let args = parts.slice(1);
      let spawnOptions = {
        cwd: workingDir || process.cwd(),
        env: {
          ...process.env,
          BATCH_TAGS: tags.join(',')
        }
      };

      // Check if the executable is a script file (ends with common script extensions)
      const scriptExtensions = ['.sh', '.bash', '.py', '.pl', '.rb', '.js', '.ts'];
      const isScript = scriptExtensions.some(ext => executable.toLowerCase().endsWith(ext));
      
      if (isScript) {
        // For script files, always use shell execution for maximum compatibility
        spawnOptions.shell = true;
        
        // Check if file exists and is executable
        if (fs.existsSync(executable)) {
          try {
            fs.accessSync(executable, fs.constants.F_OK | fs.constants.X_OK);
            // File exists and is executable, can run directly
          } catch (err) {
            // File not executable, try to make it executable
            try {
              fs.chmodSync(executable, '755');
              logger.info(`Made script executable: ${executable}`);
            } catch (chmodErr) {
              logger.warn(`Could not make script executable: ${executable}`, chmodErr);
            }
          }
        }
      } else {
        // For regular executables, try without shell first, fallback to shell if needed
        spawnOptions.shell = false;
      }

      return { executable, args, spawnOptions };
    }
    
    const { executable, args, spawnOptions } = createSpawnOptions(command, workingDir, tags);
    
    // Start process with multiple fallback strategies
    let child;
    let usingExec = false;
    
    try {
      child = spawn(executable, args, spawnOptions);
    } catch (spawnError) {
      logger.warn(`Spawn failed for: ${command}`, spawnError);
      
      // If spawn fails and we weren't using shell, try with shell
      if (!spawnOptions.shell) {
        logger.info(`Direct spawn failed, retrying with shell for: ${command}`);
        try {
          spawnOptions.shell = true;
          child = spawn(executable, args, spawnOptions);
        } catch (shellSpawnError) {
          logger.warn(`Shell spawn also failed, trying exec fallback: ${command}`, shellSpawnError);
          
          // Last resort: use exec with the full command string
          usingExec = true;
          child = exec(command, {
            cwd: spawnOptions.cwd,
            env: spawnOptions.env,
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
          });
        }
      } else {
        logger.warn(`Shell spawn failed, trying exec fallback: ${command}`, spawnError);
        
        // Last resort: use exec with the full command string
        usingExec = true;
        child = exec(command, {
          cwd: spawnOptions.cwd,
          env: spawnOptions.env,
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
      }
    }
    
    // Store process information
    const processInfo = {
      id: processId,
      command,
      workingDir,
      tags,
      startTime: new Date().toISOString(),
      process: child,
      output: [],
      isRunning: true,
      exitCode: null,
      usingExec
    };
    
    activeProcesses.set(processId, processInfo);
    
    // Handle process output - works for both spawn and exec
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const output = data.toString().split('\n').filter(line => line.trim());
        processInfo.output.push(...output);
        logger.info(`Process ${processId} output: ${data.toString()}`);
      });
    }
    
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const error = data.toString().split('\n').filter(line => line.trim());
        processInfo.output.push(...error.map(line => `ERROR: ${line}`));
        logger.error(`Process ${processId} error: ${data.toString()}`);
      });
    }
    
    // Handle process completion
    const handleCompletion = (code, signal) => {
      processInfo.isRunning = false;
      processInfo.exitCode = code;
      processInfo.endTime = new Date().toISOString();
      logger.info(`Process ${processId} completed with code ${code}${signal ? `, signal ${signal}` : ''}`);
    };
    
    if (usingExec) {
      // exec returns all output at once when complete
      child.on('close', handleCompletion);
    } else {
      // spawn streams output as it happens
      child.on('close', handleCompletion);
    }
    
    child.on('error', (error) => {
      processInfo.isRunning = false;
      processInfo.exitCode = -1;
      processInfo.endTime = new Date().toISOString();
      processInfo.output.push(`PROCESS ERROR: ${error.message}`);
      logger.error(`Process ${processId} failed:`, error);
    });
    
    res.json({
      success: true,
      processId,
      message: 'Process started',
      command
    });
    
  } catch (error) {
    logger.error('Execute command error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute command',
      message: error.message
    });
  }
});

// Get process output
router.get('/process-output/:processId', async (req, res) => {
  try {
    const { processId } = req.params;
    const { lastLines = 0 } = req.query;
    
    const processInfo = activeProcesses.get(processId);
    if (!processInfo) {
      return res.status(404).json({
        success: false,
        error: 'Process not found'
      });
    }
    
    // Get new output since last check
    const startIndex = parseInt(lastLines) || 0;
    const newOutput = processInfo.output.slice(startIndex);
    
    res.json({
      success: true,
      processId,
      output: newOutput,
      totalLines: processInfo.output.length,
      isRunning: processInfo.isRunning,
      exitCode: processInfo.exitCode,
      startTime: processInfo.startTime,
      endTime: processInfo.endTime
    });
    
  } catch (error) {
    logger.error('Process output error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get process output',
      message: error.message
    });
  }
});

// Stop process
router.post('/stop-process/:processId', async (req, res) => {
  try {
    const { processId } = req.params;
    
    const processInfo = activeProcesses.get(processId);
    if (!processInfo) {
      return res.status(404).json({
        success: false,
        error: 'Process not found'
      });
    }
    
    if (!processInfo.isRunning) {
      return res.json({
        success: true,
        message: 'Process already stopped'
      });
    }
    
    // Kill the process immediately and aggressively
    try {
      // Try SIGTERM first
      processInfo.process.kill('SIGTERM');
      
      // Give it 1 second, then force kill
      setTimeout(() => {
        if (processInfo.isRunning) {
          logger.info(`Force killing process: ${processId}`);
          processInfo.process.kill('SIGKILL');
        }
      }, 1000);
      
    } catch (killError) {
      // If process is already dead, that's fine
      logger.info(`Process ${processId} already terminated`);
    }
    
    processInfo.isRunning = false;
    processInfo.exitCode = -2; // Manually stopped
    processInfo.endTime = new Date().toISOString();
    processInfo.output.push('PROCESS STOPPED BY USER');
    
    logger.info(`Stopped process: ${processId}`);
    
    res.json({
      success: true,
      message: 'Process stopped immediately',
      processId,
      stoppedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Stop process error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop process',
      message: error.message
    });
  }
});

// List active processes
router.get('/processes', async (req, res) => {
  try {
    const processes = [];
    
    for (const [processId, processInfo] of activeProcesses.entries()) {
      processes.push({
        id: processInfo.id,
        command: processInfo.command,
        startTime: processInfo.startTime,
        endTime: processInfo.endTime,
        isRunning: processInfo.isRunning,
        exitCode: processInfo.exitCode,
        outputLines: processInfo.output.length,
        tags: processInfo.tags
      });
    }
    
    // Sort by start time (newest first)
    processes.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    res.json({
      success: true,
      processes,
      count: processes.length
    });
    
  } catch (error) {
    logger.error('List processes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list processes',
      message: error.message
    });
  }
});

// Clean up old processes
router.delete('/cleanup', async (req, res) => {
  try {
    const { olderThanMinutes = 60 } = req.query;
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - parseInt(olderThanMinutes));
    
    let cleanedCount = 0;
    
    for (const [processId, processInfo] of activeProcesses.entries()) {
      const startTime = new Date(processInfo.startTime);
      
      // Clean up old completed processes
      if (!processInfo.isRunning && startTime < cutoffTime) {
        activeProcesses.delete(processId);
        cleanedCount++;
        logger.info(`Cleaned up old process: ${processId}`);
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old processes`,
      cleanedCount
    });
    
  } catch (error) {
    logger.error('Cleanup processes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup processes',
      message: error.message
    });
  }
});

// Execute command endpoint with direct executable/args - avoids shell parsing issues
router.post('/execute-command-direct', async (req, res) => {
  try {
  const { executable, args = [], workingDir, tags = [] } = req.body;
    
    if (!executable) {
      return res.status(400).json({
        success: false,
        error: 'Executable is required'
      });
    }

    // Generate unique process ID
    const processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Starting process ${processId}: ${executable} ${args.join(' ')}`);
    
    // Resolve repo root (assumes backend lives at chromeExtensionRealtor/backend)
    const backendDir = path.resolve(__dirname, '..');
    const repoRoot = path.resolve(backendDir, '..');

    // If executable is relative, resolve it from repo root
    const resolvedExecutable = path.isAbsolute(executable)
      ? executable
      : path.resolve(repoRoot, executable);

    // Determine working directory: respect provided path, resolving relative to repo
    const resolvedCwd = workingDir
      ? (path.isAbsolute(workingDir) ? workingDir : path.resolve(repoRoot, workingDir))
      : repoRoot;

    // Use spawn directly with executable and args to avoid shell parsing issues
    const spawnOptions = {
      cwd: resolvedCwd,
      env: {
        ...process.env,
        BATCH_TAGS: tags.join(',')
      },
      shell: false  // Don't use shell to avoid path parsing issues
    };
    
    // Check if the executable exists and is accessible
  if (!fs.existsSync(resolvedExecutable)) {
      return res.status(400).json({
        success: false,
    error: `Executable not found: ${resolvedExecutable}`
      });
    }
    
    // Make sure the script is executable
    try {
      fs.accessSync(resolvedExecutable, fs.constants.F_OK | fs.constants.X_OK);
    } catch (err) {
      // Try to make it executable
      try {
        fs.chmodSync(resolvedExecutable, '755');
        logger.info(`Made script executable: ${resolvedExecutable}`);
      } catch (chmodErr) {
        logger.warn(`Could not make script executable: ${resolvedExecutable}`, chmodErr);
        return res.status(400).json({
          success: false,
          error: `Script is not executable: ${resolvedExecutable}`
        });
      }
    }
    
    // Start the process
    const child = spawn(resolvedExecutable, args, spawnOptions);
    
    // Store process information
    const processInfo = {
      id: processId,
  command: `${resolvedExecutable} ${args.join(' ')}`,
  executable: resolvedExecutable,
      args,
  workingDir: resolvedCwd,
      tags,
      startTime: new Date().toISOString(),
      process: child,
      output: [],
      isRunning: true,
      exitCode: null,
      usingExec: false
    };
    
    activeProcesses.set(processId, processInfo);
    
    // Handle process output
    child.stdout?.on('data', (data) => {
      const output = data.toString();
      processInfo.output.push({ type: 'stdout', data: output, timestamp: new Date().toISOString() });
      logger.info(`Process ${processId} stdout: ${output.trim()}`);
    });
    
    child.stderr?.on('data', (data) => {
      const output = data.toString();
      processInfo.output.push({ type: 'stderr', data: output, timestamp: new Date().toISOString() });
      logger.warn(`Process ${processId} stderr: ${output.trim()}`);
    });
    
    child.on('close', (code, signal) => {
      processInfo.isRunning = false;
      processInfo.exitCode = code;
      processInfo.endTime = new Date().toISOString();
      
      if (code === 0) {
        logger.info(`Process ${processId} completed successfully`);
      } else {
        logger.warn(`Process ${processId} exited with code ${code}, signal: ${signal}`);
      }
    });
    
    child.on('error', (error) => {
      processInfo.isRunning = false;
      processInfo.error = error.message;
      processInfo.endTime = new Date().toISOString();
      logger.error(`Process ${processId} failed:`, error);
    });
    
    res.json({
      success: true,
      processId,
      message: 'Process started successfully',
      command: processInfo.command
    });
    
  } catch (error) {
    logger.error('Execute command direct error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute command',
      message: error.message
    });
  }
});

module.exports = router;
