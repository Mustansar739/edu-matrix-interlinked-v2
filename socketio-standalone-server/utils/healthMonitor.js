// ==========================================
// HEALTH MONITORING UTILITIES
// ==========================================
// Comprehensive health monitoring for all services

const { logger } = require('./logger');

/**
 * Service health monitoring class
 */
class HealthMonitor {
  constructor() {
    this.services = new Map();
    this.globalHealth = {
      status: 'initializing',
      lastChecked: new Date().toISOString(),
      uptime: 0,
      startTime: Date.now()
    };
    
    this.healthHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Register a service for monitoring
   */
  registerService(name, checker, options = {}) {
    this.services.set(name, {
      name,
      checker,
      critical: options.critical || false,
      enabled: options.enabled !== false,
      lastCheck: null,
      lastResult: null,
      status: 'unknown',
      consecutiveFailures: 0,
      maxFailures: options.maxFailures || 3
    });
    
    logger.info(`🏥 Registered health service: ${name} (critical: ${options.critical})`);
  }

  /**
   * Check health of a specific service
   */
  async checkService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service || !service.enabled) {
      return { status: 'disabled', healthy: false };
    }

    const startTime = Date.now();
    try {
      const result = await service.checker();
      const duration = Date.now() - startTime;
      
      service.lastCheck = new Date().toISOString();
      service.lastResult = result;
      service.status = result.healthy ? 'healthy' : 'unhealthy';
      service.consecutiveFailures = result.healthy ? 0 : service.consecutiveFailures + 1;
      
      return {
        ...result,
        duration,
        consecutiveFailures: service.consecutiveFailures,
        critical: service.critical
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      service.lastCheck = new Date().toISOString();
      service.lastResult = { healthy: false, error: error.message };
      service.status = 'unhealthy';
      service.consecutiveFailures++;
      
      logger.warn(`❌ Health check failed for ${serviceName}:`, error.message);
      
      return {
        healthy: false,
        error: error.message,
        duration,
        consecutiveFailures: service.consecutiveFailures,
        critical: service.critical
      };
    }
  }

  /**
   * Check health of all services
   */
  async checkAllServices() {
    const results = new Map();
    const promises = Array.from(this.services.keys()).map(async (serviceName) => {
      const result = await this.checkService(serviceName);
      results.set(serviceName, result);
      return { serviceName, result };
    });

    await Promise.all(promises);
    
    // Update global health
    this.updateGlobalHealth(results);
    
    // Store in history
    this.addToHistory(results);
    
    return results;
  }

  /**
   * Update global health status
   */
  updateGlobalHealth(serviceResults) {
    const criticalServices = Array.from(this.services.values())
      .filter(s => s.critical && s.enabled);
    
    const allCriticalHealthy = criticalServices.every(service => {
      const result = serviceResults.get(service.name);
      return result && result.healthy;
    });

    this.globalHealth = {
      status: allCriticalHealthy ? 'healthy' : 'unhealthy',
      lastChecked: new Date().toISOString(),
      uptime: process.uptime(),
      serviceCount: this.services.size,
      healthyServices: Array.from(serviceResults.values()).filter(r => r.healthy).length,
      criticalServices: criticalServices.length,
      healthyCriticalServices: criticalServices.filter(service => {
        const result = serviceResults.get(service.name);
        return result && result.healthy;
      }).length
    };
  }

  /**
   * Add health check to history
   */
  addToHistory(serviceResults) {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      globalStatus: this.globalHealth.status,
      services: Object.fromEntries(
        Array.from(serviceResults.entries()).map(([name, result]) => [
          name,
          {
            healthy: result.healthy,
            duration: result.duration,
            consecutiveFailures: result.consecutiveFailures
          }
        ])
      )
    };

    this.healthHistory.push(historyEntry);
    
    // Keep only recent history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    const serviceStatuses = {};
    
    for (const [name, service] of this.services) {
      serviceStatuses[name] = {
        status: service.status,
        enabled: service.enabled,
        critical: service.critical,
        lastCheck: service.lastCheck,
        consecutiveFailures: service.consecutiveFailures,
        maxFailures: service.maxFailures
      };
    }

    return {
      global: this.globalHealth,
      services: serviceStatuses,
      metrics: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Get health history
   */
  getHealthHistory(limit = 10) {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Start periodic health monitoring
   */
  startPeriodicChecks(intervalMs = 30000) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      try {
        await this.checkAllServices();
        
        // Log summary every 5 minutes
        if (!this.lastSummaryLog || Date.now() - this.lastSummaryLog > 300000) {
          this.logHealthSummary();
          this.lastSummaryLog = Date.now();
        }
      } catch (error) {
        logger.error('❌ Error during periodic health checks:', error);
      }
    }, intervalMs);

    logger.info(`🏥 Started periodic health monitoring (${intervalMs}ms interval)`);
  }

  /**
   * Log health summary
   */
  logHealthSummary() {
    const status = this.getHealthStatus();
    const summary = {
      overall: status.global.status,
      uptime: `${Math.floor(status.global.uptime / 60)}m`,
      services: Object.fromEntries(
        Object.entries(status.services).map(([name, service]) => [
          name,
          service.status === 'healthy' ? '✅' : '❌'
        ])
      )
    };

    logger.info('🏥 Health Summary:', summary);
  }

  /**
   * Stop periodic health monitoring
   */
  stopPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('🏥 Stopped periodic health monitoring');
    }
  }

  /**
   * Get service by name
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * Enable/disable a service
   */
  setServiceEnabled(name, enabled) {
    const service = this.services.get(name);
    if (service) {
      service.enabled = enabled;
      logger.info(`🏥 Service ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

module.exports = {
  HealthMonitor
};
