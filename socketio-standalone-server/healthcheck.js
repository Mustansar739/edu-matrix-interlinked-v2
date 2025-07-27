#!/usr/bin/env node
// ==========================================
// EDU MATRIX SOCKETIO - ENHANCED HEALTH CHECK
// ==========================================
// Comprehensive health verification for production readiness

const http = require('http');
const process = require('process');

// Configuration
const CONFIG = {
  hostname: process.env.HOSTNAME || 'localhost',
  port: parseInt(process.env.PORT) || 3001,
  timeout: parseInt(process.env.HEALTH_TIMEOUT) || 5000,
  path: '/health',
  retries: parseInt(process.env.HEALTH_RETRIES) || 2
};

// Enhanced health check with retry logic
async function performHealthCheck(attempt = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.hostname,
      port: CONFIG.port,
      path: CONFIG.path,
      method: 'GET',
      timeout: CONFIG.timeout,
      headers: {
        'User-Agent': 'Docker-HealthCheck/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.status === 'healthy') {
              console.log(`✅ Health check passed (attempt ${attempt}): ${response.message}`);
              resolve(0);
            } else {
              console.error(`❌ Health check failed (attempt ${attempt}): Unhealthy status - ${response.message}`);
              reject(1);
            }
          } catch (parseError) {
            console.error(`❌ Health check failed (attempt ${attempt}): Invalid JSON response`);
            reject(1);
          }
        } else {
          console.error(`❌ Health check failed (attempt ${attempt}): HTTP ${res.statusCode}`);
          reject(1);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Health check failed (attempt ${attempt}): ${error.message}`);
      reject(1);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`❌ Health check failed (attempt ${attempt}): Timeout after ${CONFIG.timeout}ms`);
      reject(1);
    });

    req.setTimeout(CONFIG.timeout);
    req.end();
  });
}

// Main health check with retry logic
async function main() {
  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const result = await performHealthCheck(attempt);
      process.exit(result);
    } catch (exitCode) {
      if (attempt === CONFIG.retries) {
        console.error(`💀 All ${CONFIG.retries} health check attempts failed`);
        process.exit(exitCode);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  console.log('🛑 Health check received SIGTERM');
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('🛑 Health check received SIGINT');
  process.exit(1);
});

// Execute health check
main().catch((error) => {
  console.error('💥 Health check crashed:', error.message);
  process.exit(1);
});
