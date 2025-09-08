#!/usr/bin/env node

/**
 * CRM System Health Monitor
 * Monitors all services and provides health status
 */

const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

class SystemMonitor {
  constructor() {
    this.services = {
      'CRM Backend': { url: 'http://localhost:5000/api/health', critical: true },
      'Chrome Extension Backend': { url: 'http://localhost:5001/health', critical: true },
      'VvebJS Server': { url: 'http://localhost:3030/', critical: false },
      'React Frontend': { url: 'http://localhost:3000/', critical: true }
    };
    
    this.status = {};
    this.alerts = [];
    this.monitorInterval = null;
  }

  async checkService(name, config) {
    try {
      const startTime = Date.now();
      const response = await axios.get(config.url, { 
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 400
      });
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        status: 'UP',
        responseTime,
        statusCode: response.status,
        critical: config.critical,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name,
        status: 'DOWN',
        error: error.message,
        critical: config.critical,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkSystemResources() {
    return new Promise((resolve) => {
      exec('df -h / && free -h && ps aux --sort=-%cpu | head -10', (error, stdout, stderr) => {
        if (error) {
          resolve({ error: error.message });
          return;
        }
        
        const lines = stdout.split('\n');
        const diskLine = lines.find(line => line.includes('/dev/') || line.includes('overlay'));
        const memoryLine = lines.find(line => line.includes('Mem:'));
        
        let diskUsage = 'Unknown';
        let memoryUsage = 'Unknown';
        
        if (diskLine) {
          const parts = diskLine.split(/\s+/);
          diskUsage = parts[4]; // Usage percentage
        }
        
        if (memoryLine) {
          const parts = memoryLine.split(/\s+/);
          memoryUsage = `${parts[2]}/${parts[1]} (${Math.round((parseFloat(parts[2]) / parseFloat(parts[1])) * 100)}%)`;
        }
        
        resolve({
          disk: diskUsage,
          memory: memoryUsage,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  async checkNodeProcesses() {
    return new Promise((resolve) => {
      exec('ps aux | grep node | grep -v grep', (error, stdout, stderr) => {
        if (error) {
          resolve([]);
          return;
        }
        
        const processes = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => {
            const parts = line.split(/\s+/);
            return {
              pid: parts[1],
              cpu: parts[2],
              memory: parts[3],
              command: parts.slice(10).join(' ')
            };
          });
        
        resolve(processes);
      });
    });
  }

  async runHealthCheck() {
    console.log('\n🏥 System Health Check - ' + new Date().toLocaleString());
    console.log('═'.repeat(80));
    
    // Check all services
    const serviceChecks = await Promise.all(
      Object.entries(this.services).map(([name, config]) => 
        this.checkService(name, config)
      )
    );
    
    // Check system resources
    const resources = await this.checkSystemResources();
    
    // Check Node processes
    const nodeProcesses = await this.checkNodeProcesses();
    
    // Update status
    this.status = {
      services: serviceChecks,
      resources,
      nodeProcesses,
      lastCheck: new Date().toISOString(),
      overall: serviceChecks.filter(s => s.critical).every(s => s.status === 'UP') ? 'HEALTHY' : 'UNHEALTHY'
    };
    
    // Display results
    console.log('\n📊 SERVICE STATUS:');
    serviceChecks.forEach(service => {
      const icon = service.status === 'UP' ? '✅' : '❌';
      const critical = service.critical ? ' [CRITICAL]' : '';
      const time = service.responseTime ? ` (${service.responseTime}ms)` : '';
      console.log(`${icon} ${service.name}${critical}: ${service.status}${time}`);
      if (service.error) {
        console.log(`   Error: ${service.error}`);
      }
    });
    
    console.log('\n💻 SYSTEM RESOURCES:');
    console.log(`📀 Disk Usage: ${resources.disk}`);
    console.log(`🧠 Memory Usage: ${resources.memory}`);
    
    console.log('\n🔍 NODE PROCESSES:');
    nodeProcesses.slice(0, 5).forEach(proc => {
      console.log(`   PID ${proc.pid}: ${proc.cpu}% CPU, ${proc.memory}% MEM - ${proc.command.substring(0, 60)}${proc.command.length > 60 ? '...' : ''}`);
    });
    
    // Check for alerts
    this.checkAlerts(serviceChecks, resources);
    
    // Save status to file
    try {
      fs.writeFileSync('./health-status.json', JSON.stringify(this.status, null, 2));
    } catch (error) {
      console.error('Could not save health status:', error.message);
    }
    
    console.log('\n🎯 OVERALL STATUS:', this.status.overall);
    console.log('═'.repeat(80));
    
    return this.status;
  }

  checkAlerts(services, resources) {
    const newAlerts = [];
    
    // Check for down services
    services.forEach(service => {
      if (service.status === 'DOWN' && service.critical) {
        newAlerts.push(`🚨 CRITICAL: ${service.name} is DOWN`);
      }
    });
    
    // Check disk usage
    if (resources.disk && resources.disk.includes('%')) {
      const diskPercent = parseInt(resources.disk.replace('%', ''));
      if (diskPercent > 90) {
        newAlerts.push(`🚨 CRITICAL: Disk usage is ${resources.disk}`);
      } else if (diskPercent > 80) {
        newAlerts.push(`⚠️ WARNING: Disk usage is ${resources.disk}`);
      }
    }
    
    // Display alerts
    if (newAlerts.length > 0) {
      console.log('\n🚨 ALERTS:');
      newAlerts.forEach(alert => console.log(`   ${alert}`));
    }
    
    this.alerts = newAlerts;
  }

  startMonitoring(intervalMinutes = 2) {
    console.log(`🚀 Starting health monitoring (checking every ${intervalMinutes} minutes)`);
    
    // Initial check
    this.runHealthCheck();
    
    // Set up interval
    this.monitorInterval = setInterval(() => {
      this.runHealthCheck();
    }, intervalMinutes * 60 * 1000);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      console.log('🛑 Health monitoring stopped');
    }
  }

  getStatus() {
    return this.status;
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new SystemMonitor();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'once';
  
  switch (command) {
    case 'monitor':
      const interval = parseInt(args[1]) || 2;
      monitor.startMonitoring(interval);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping monitor...');
        monitor.stopMonitoring();
        process.exit(0);
      });
      break;
      
    case 'once':
    default:
      monitor.runHealthCheck().then(() => {
        process.exit(0);
      });
      break;
  }
}

module.exports = SystemMonitor;
