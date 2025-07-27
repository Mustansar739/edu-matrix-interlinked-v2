// ==========================================
// FACEBOOK-STYLE NOTIFICATIONS HANDLER - ENHANCED & CLEAN
// ==========================================

const { logger } = require('../utils/logger');

/**
 * Retry failed API requests with exponential backoff
 */
async function retryApiCall(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      if (attempt === maxRetries) throw new Error(`API call failed after ${maxRetries} attempts`);
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      if (attempt === maxRetries) throw error;
      logger.warn(`API call attempt ${attempt} failed, retrying...`, { error: error.message });
    }
  }
}

/**
 * Handle Facebook-Style Notification Events with Kafka Integration
 */
function handleNotificationEvents(socket, io, { connectedUsers, redis }) {
  const userId = socket.userId;

  // Join user-specific notification room
  socket.join(`notifications:${userId}`);
  logger.info(`🔔 User ${userId} joined notification room`);

  // Subscribe to Redis pub/sub for real-time notifications from Kafka processor
  const subscriber = redis.duplicate();
  subscriber.subscribe('notification:new');
  
  subscriber.on('message', async (channel, message) => {
    if (channel === 'notification:new') {
      try {
        const data = JSON.parse(message);
        if (data.userId === userId) {
          // Emit notification directly to user
          socket.emit('notification:new', {
            notification: data.notification,
            timestamp: data.timestamp
          });

          // Update unread count
          const cacheKey = `notif:count:${userId}`;
          const count = await redis.get(cacheKey) || '0';
          socket.emit('notification:count_updated', {
            unreadCount: parseInt(count, 10)
          });

          logger.info(`📤 Delivered notification ${data.notificationId} to user ${userId}`);
        }
      } catch (error) {
        logger.error('Failed to process notification message:', error);
      }
    }
  });

  // Handle joining notification room
  socket.on('join:notifications', async (data) => {
    const { userId: targetUserId } = data;
    if (targetUserId === userId) {
      socket.join(`notifications:${userId}`);
      logger.info(`🔔 User ${userId} explicitly joined notification room`);

      // Send current unread count
      try {
        const cacheKey = `notif:count:${userId}`;
        const count = await redis.get(cacheKey) || '0';
        socket.emit('notification:count_updated', {
          unreadCount: parseInt(count, 10)
        });
      } catch (error) {
        logger.error('Failed to get unread count:', error);
      }
    }
  });

  // Handle leaving notification room
  socket.on('leave:notifications', async (data) => {
    const { userId: targetUserId } = data;
    if (targetUserId === userId) {
      socket.leave(`notifications:${userId}`);
      logger.info(`🔔 User ${userId} left notification room`);
    }
  });
  // Handle notification mark as read
  socket.on('notification:mark_read', async (data, callback) => {
    try {
      const { notificationId } = data;
      
      // Get JWT token from socket user session
      const token = socket.user?.token || socket.handshake.auth?.token;
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      
      // Update in database via API call with proper authentication
      const response = await fetch(`${apiBaseUrl}/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Socket-Request': 'true'
        },
        body: JSON.stringify({ isRead: true })
      });

      if (response.ok) {
        // Update Redis cache
        const cacheKey = `notif:count:${userId}`;
        const currentCount = await redis.get(cacheKey) || '0';
        const newCount = Math.max(0, parseInt(currentCount, 10) - 1);
        await redis.setex(cacheKey, 300, newCount.toString());
        
        // Broadcast to user's other sessions
        io.to(`notifications:${userId}`).emit('notification:read', {
          notificationId,
          timestamp: new Date().toISOString()
        });

        // Send updated count
        io.to(`notifications:${userId}`).emit('notification:count_updated', {
          unreadCount: newCount
        });

        logger.info(`✅ Marked notification ${notificationId} as read for user ${userId}`);
        if (callback) callback({ success: true });
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  });
  // Handle mark all notifications as read
  socket.on('notification:mark_all_read', async (data, callback) => {
    try {
      const token = socket.user?.token || socket.handshake.auth?.token;
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      
      // Update in database via API call with proper authentication
      const response = await fetch(`${apiBaseUrl}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Socket-Request': 'true'
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        // Clear Redis cache
        const cacheKey = `notif:count:${userId}`;
        await redis.del(cacheKey);
        
        // Broadcast to user's other sessions
        io.to(`notifications:${userId}`).emit('notification:all_read', {
          timestamp: new Date().toISOString()
        });

        // Send updated count
        io.to(`notifications:${userId}`).emit('notification:count_updated', {
          unreadCount: 0
        });

        logger.info(`✅ Marked all notifications as read for user ${userId}`);
        if (callback) callback({ success: true });
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Handle notification count request
  socket.on('notification:get_count', async (data, callback) => {
    try {
      const cacheKey = `notif:count:${userId}`;
      let count = await redis.get(cacheKey);
      
      if (count === null) {
        // Fetch from database via API
        const response = await fetch(`http://localhost:3000/api/notifications/counts`, {
          headers: { 'x-user-id': userId }
        });
        
        if (response.ok) {
          const countsData = await response.json();
          count = countsData.unread || 0;
          await redis.setex(cacheKey, 300, count.toString());
        } else {
          count = 0;
        }
      }
      
      if (callback) callback({ success: true, count: parseInt(count, 10) });
    } catch (error) {
      logger.error('Failed to get notification count:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Handle send notification (for testing and manual notifications)
  socket.on('notification:send', async (data, callback) => {
    try {
      const { 
        targetUserId, 
        type, 
        title, 
        message, 
        data: notificationData = {},
        priority = 'NORMAL'
      } = data;

      // Create notification via API
      const response = await fetch('http://localhost:3000/api/notifications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          userId: targetUserId,
          title,
          message,
          type: type || 'SYSTEM_ALERT',
          category: 'ADMINISTRATIVE',
          priority,
          channels: ['IN_APP', 'PUSH'],
          data: notificationData
        })
      });

      if (response.ok) {
        const result = await response.json();
        logger.info('Notification sent via API', { 
          userId, 
          targetUserId, 
          notificationId: result.notification?.id 
        });
        if (callback) callback({ success: true, notification: result.notification });
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }

    } catch (error) {
      logger.error('Failed to send notification:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    logger.info(`🔔 User ${userId} left notification room (disconnected)`);
    subscriber.quit();
  });
}

module.exports = { handleNotificationEvents };
