// 🎓 STUDENT FRIENDLY: Simple Metrics Counter
// This file counts basic things happening in your Socket.IO server

class SimpleMetrics {
  constructor() {
    // Simple counters - like counting sheep! 🐑
    this.connectedUsers = 0;
    this.totalMessages = 0;
    this.errors = 0;
    this.startTime = Date.now();
    
    // Keep history of last 60 seconds
    this.messageHistory = [];
    this.errorHistory = [];
    
    console.log('📊 Simple metrics started!');
  }

  // When someone connects
  userConnected() {
    this.connectedUsers++;
    console.log(`👤 User connected. Total: ${this.connectedUsers}`);
  }

  // When someone disconnects  
  userDisconnected() {
    this.connectedUsers--;
    console.log(`👋 User left. Total: ${this.connectedUsers}`);
  }

  // When a message is sent
  messageReceived(eventType = 'unknown') {
    this.totalMessages++;
    
    // Add to history with timestamp
    this.messageHistory.push({
      time: Date.now(),
      type: eventType
    });
    
    // Keep only last 60 seconds
    const oneMinuteAgo = Date.now() - 60000;
    this.messageHistory = this.messageHistory.filter(msg => msg.time > oneMinuteAgo);
    
    console.log(`💬 Message received (${eventType}). Total: ${this.totalMessages}`);
  }

  // When an error happens
  errorOccurred(errorType = 'unknown') {
    this.errors++;
    
    // Add to history
    this.errorHistory.push({
      time: Date.now(),
      type: errorType
    });
    
    // Keep only last 60 seconds
    const oneMinuteAgo = Date.now() - 60000;
    this.errorHistory = this.errorHistory.filter(err => err.time > oneMinuteAgo);
    
    console.log(`❌ Error occurred (${errorType}). Total: ${this.errors}`);
  }

  // Get current stats (like checking your car dashboard)
  getStats() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const messagesPerSecond = this.messageHistory.length / 60; // Last minute average
    const errorsPerSecond = this.errorHistory.length / 60;
    
    return {
      // Basic counts
      connectedUsers: this.connectedUsers,
      totalMessages: this.totalMessages,
      totalErrors: this.errors,
      
      // Performance metrics
      uptime: `${uptime} seconds`,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      errorsPerSecond: Math.round(errorsPerSecond * 100) / 100,
      
      // Server health
      memoryUsage: process.memoryUsage(),
      memoryUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      
      // Status
      status: this.connectedUsers > 0 ? 'active' : 'idle',
      timestamp: new Date().toISOString()
    };
  }

  // Print nice summary every 30 seconds
  startAutoReporting() {
    setInterval(() => {
      const stats = this.getStats();
      console.log('\n📊 === SERVER STATS ===');
      console.log(`👥 Connected Users: ${stats.connectedUsers}`);
      console.log(`💬 Messages/sec: ${stats.messagesPerSecond}`);
      console.log(`❌ Errors/sec: ${stats.errorsPerSecond}`);
      console.log(`💾 Memory: ${stats.memoryUsedMB}MB`);
      console.log(`⏱️ Uptime: ${stats.uptime}`);
      console.log('========================\n');
    }, 30000); // Every 30 seconds
  }
}

// Export so we can use it in server.js
module.exports = { SimpleMetrics };
