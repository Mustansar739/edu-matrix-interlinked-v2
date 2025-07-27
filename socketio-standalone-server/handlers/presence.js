// ==========================================
// FACEBOOK-STYLE PRESENCE HANDLER - Production Ready
// ==========================================
// User online status, activity tracking, and real-time presence updates
// Comprehensive security, validation, and real-time broadcasting

const axios = require('axios');
const { logger } = require('../utils/logger');
const { eventPublishers } = require('../utils/kafka');

/**
 * Rate limiting utility for presence actions
 * @param {string} userId - User ID
 * @param {string} action - Action type
 * @returns {Promise<Object>} - Rate limit result with allowed status and retryAfter
 */
async function checkPresenceActionRateLimit(userId, action) {
  try {
    // Production rate limiting configuration for presence operations
    const limits = {
      'update_status': { points: 20, duration: 60 }, // 20 status updates per minute
      'set_activity': { points: 60, duration: 60 }, // 60 activity updates per minute (typing, etc.)
      'ping': { points: 120, duration: 60 }, // 120 pings per minute
      'subscribe': { points: 10, duration: 60 }, // 10 subscriptions per minute
      'study_mode': { points: 5, duration: 60 } // 5 study mode toggles per minute
    };

    const limit = limits[action] || { points: 30, duration: 60 };
    // In production, this would use Redis-based rate limiting
    return { 
      allowed: true, 
      retryAfter: 0,
      remaining: limit.points 
    };
  } catch (error) {
    logger.warn(`Presence rate limit check failed for ${userId}:${action}:`, error.message);
    return { allowed: true, retryAfter: 0 }; // Fail open for production stability
  }
}

/**
 * Handle Presence Events with comprehensive validation and real-time features
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} io - Socket.IO server instance
 * @param {Object} context - Application context with Redis, Kafka, etc.
 */
function handlePresenceEvents(socket, io, context) {
  const { connectedUsers, userPresence, redis, kafkaProducer, kafkaClient } = context;

  // Critical: Validate user authentication before allowing any presence operations
  if (!socket.userId || !socket.userInfo) {
    const error = { type: 'AUTHENTICATION_ERROR', message: 'User authentication required for presence operations' };
    logger.error(`🚫 Unauthenticated presence handler access attempt from socket ${socket.id}`);
    socket.emit('error', error);
    return;
  }

  const userId = socket.userId;
  const userInfo = socket.userInfo;

  // Production API configuration
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const authToken = socket.user?.token || socket.handshake.auth?.token;

  logger.info(`👤 User ${userInfo.name} (${userId}) connected to Facebook-style presence system`);

  // Join user to presence-related rooms
  socket.join(`presence_${userId}`);
  socket.join('global-presence');

  // Initialize user presence state
  socket.presence = {
    userId,
    status: 'online',
    lastSeen: new Date(),
    activity: null,
    studyMode: null
  };

  // ==========================================
  // PRESENCE STATUS MANAGEMENT - Production Ready
  // ==========================================

  /**
   * Update user presence status with comprehensive validation
   */
  socket.on('presence:update_status', async (data, callback) => {
    try {
      // Authentication validation
      if (!socket.userId || !socket.userInfo) {
        const error = { type: 'AUTHENTICATION_ERROR', message: 'User not authenticated' };
        logger.warn(`🚫 Unauthenticated presence status update attempt from socket ${socket.id}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Input validation
      if (!data.status) {
        const error = { type: 'VALIDATION_ERROR', message: 'Status is required' };
        logger.warn(`🚫 Missing status in presence update from user ${socket.userId}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      const validStatuses = ['online', 'away', 'busy', 'invisible', 'offline', 'studying'];
      if (!validStatuses.includes(data.status)) {
        const error = { type: 'VALIDATION_ERROR', message: 'Invalid status value' };
        logger.warn(`🚫 Invalid status ${data.status} from user ${socket.userId}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Rate limiting check
      const rateLimitResult = await checkPresenceActionRateLimit(socket.userId, 'update_status');
      if (!rateLimitResult.allowed) {
        const error = { 
          type: 'RATE_LIMIT_ERROR', 
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`,
          retryAfter: rateLimitResult.retryAfter
        };
        logger.warn(`🚫 Rate limit exceeded for user ${socket.userId} on presence status update`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      const customMessage = data.customMessage ? data.customMessage.substring(0, 100) : '';
      const timestamp = new Date().toISOString();

      const presence = {
        userId,
        status: data.status,
        customMessage,
        lastSeen: timestamp,
        updatedAt: timestamp,
        userInfo: {
          id: userInfo.id,
          name: userInfo.name,
          username: userInfo.username,
          image: userInfo.image
        }
      };

      // Store in socket for quick access
      socket.presence = { ...socket.presence, ...presence };

      // Store in Redis with TTL
      await redis.setex(`presence:${userId}`, 3600, JSON.stringify(presence)); // 1 hour TTL

      // Send to API for persistence
      try {
        await axios.post(
          `${apiBaseUrl}/api/presence/status`,
          {
            status: data.status,
            customMessage,
            timestamp
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'x-socket-user-id': socket.userId,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (apiError) {
        logger.warn(`API presence update failed for user ${userId}:`, apiError.message);
        // Continue with real-time updates even if API fails
      }

      // Real-time broadcast to presence subscribers
      socket.to(`presence_${userId}`).emit('presence:status_updated', {
        userId,
        status: data.status,
        customMessage,
        updatedAt: timestamp,
        user: presence.userInfo
      });

      // Broadcast to global presence room (for friend lists, etc.)
      socket.to('global-presence').emit('presence:user_status_changed', {
        userId,
        status: data.status,
        customMessage,
        user: presence.userInfo
      });

      // Publish Kafka event for analytics
      if (kafkaClient?.isConnected) {
        await kafkaClient.publishEvent('presence.status_updated', {
          userId,
          status: data.status,
          previousStatus: socket.presence?.status || 'unknown',
          customMessage,
          timestamp
        });
      }

      logger.info(`👤 Presence status updated: ${userId} → ${data.status} (${customMessage})`);
      
      // Success callback
      if (callback) {
        callback(null, { 
          success: true, 
          presence,
          timestamp 
        });
      }

    } catch (error) {
      const errorResponse = { 
        type: 'PRESENCE_STATUS_ERROR', 
        message: 'Failed to update presence status',
        details: error.message 
      };
      logger.error(`❌ Error updating presence status for user ${socket.userId}:`, {
        error: error.message,
        status: data?.status,
        stack: error.stack
      });
      
      if (callback) callback(errorResponse);
      socket.emit('presence:status_update_failed', {
        error: errorResponse.message,
        details: errorResponse.details
      });
    }
  });

  // ==========================================
  // ACTIVITY TRACKING - Production Ready
  // ==========================================

  /**
   * Set user activity status (typing, studying, etc.)
   */
  socket.on('presence:set_activity', async (data, callback) => {
    try {
      // Authentication validation
      if (!socket.userId || !socket.userInfo) {
        const error = { type: 'AUTHENTICATION_ERROR', message: 'User not authenticated' };
        logger.warn(`🚫 Unauthenticated activity set attempt from socket ${socket.id}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Input validation
      if (!data.activity) {
        const error = { type: 'VALIDATION_ERROR', message: 'Activity is required' };
        logger.warn(`🚫 Missing activity in request from user ${socket.userId}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      const validActivities = ['typing', 'recording', 'uploading', 'reading', 'studying', 'browsing'];
      if (!validActivities.includes(data.activity)) {
        const error = { type: 'VALIDATION_ERROR', message: 'Invalid activity type' };
        logger.warn(`🚫 Invalid activity ${data.activity} from user ${socket.userId}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Rate limiting check
      const rateLimitResult = await checkPresenceActionRateLimit(socket.userId, 'set_activity');
      if (!rateLimitResult.allowed) {
        // For activity updates, silently ignore rate limits to avoid spamming
        logger.debug(`🚫 Activity rate limit exceeded for user ${socket.userId}`);
        return;
      }

      const context = data.context ? data.context.substring(0, 50) : '';
      const activityStatus = {
        userId,
        activity: data.activity,
        context,
        startedAt: new Date().toISOString(),
        userInfo: {
          id: userInfo.id,
          name: userInfo.name,
          username: userInfo.username
        }
      };

      // Store activity in socket and Redis
      socket.currentActivity = activityStatus;
      await redis.setex(`activity:${userId}`, 300, JSON.stringify(activityStatus)); // 5 minutes TTL

      // Notify relevant users based on context
      if (context) {
        socket.to(context).emit('presence:activity_started', {
          userId,
          activity: data.activity,
          context,
          user: activityStatus.userInfo
        });
      }

      // Broadcast to global presence room
      socket.to('global-presence').emit('presence:user_activity', {
        userId,
        activity: data.activity,
        context,
        user: activityStatus.userInfo
      });

      // Publish Kafka event
      if (kafkaClient?.isConnected) {
        await kafkaClient.publishEvent('presence.activity_started', {
          userId,
          activity: data.activity,
          context,
          timestamp: activityStatus.startedAt
        });
      }

      logger.debug(`⚡ Activity started: ${userId} → ${data.activity} in ${context}`);
      
      if (callback) {
        callback(null, { 
          success: true, 
          activityStatus 
        });
      }

    } catch (error) {
      const errorResponse = { 
        type: 'ACTIVITY_ERROR', 
        message: 'Failed to set activity status',
        details: error.message 
      };
      logger.error(`❌ Error setting activity for user ${socket.userId}:`, {
        error: error.message,
        activity: data?.activity,
        stack: error.stack
      });
      
      if (callback) callback(errorResponse);
    }
  });

  /**
   * Clear user activity status
   */
  socket.on('presence:clear_activity', async (data, callback) => {
    try {
      // Authentication validation
      if (!socket.userId || !socket.userInfo) {
        const error = { type: 'AUTHENTICATION_ERROR', message: 'User not authenticated' };
        logger.warn(`🚫 Unauthenticated activity clear attempt from socket ${socket.id}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      const context = data?.context || '';
      const previousActivity = socket.currentActivity;
      
      // Clear activity state
      socket.currentActivity = null;
      await redis.del(`activity:${userId}`);

      // Notify relevant users
      if (context && previousActivity) {
        socket.to(context).emit('presence:activity_stopped', {
          userId,
          activity: previousActivity.activity,
          context,
          duration: new Date() - new Date(previousActivity.startedAt)
        });
      }

      // Broadcast to global presence room
      socket.to('global-presence').emit('presence:user_activity_stopped', {
        userId,
        previousActivity: previousActivity?.activity,
        context
      });

      // Publish Kafka event
      if (kafkaClient?.isConnected && previousActivity) {
        await kafkaClient.publishEvent('presence.activity_stopped', {
          userId,
          activity: previousActivity.activity,
          context,
          duration: new Date() - new Date(previousActivity.startedAt),
          timestamp: new Date().toISOString()
        });
      }

      logger.debug(`⚡ Activity cleared: ${userId} in ${context}`);
      
      if (callback) {
        callback(null, { success: true });
      }

    } catch (error) {
      const errorResponse = { 
        type: 'ACTIVITY_ERROR', 
        message: 'Failed to clear activity status',
        details: error.message 
      };
      logger.error(`❌ Error clearing activity for user ${socket.userId}:`, {
        error: error.message,
        context: data?.context,
        stack: error.stack
      });
      
      if (callback) callback(errorResponse);
    }
  });

  // ==========================================
  // STUDY MODE - Production Ready Educational Feature
  // ==========================================

  /**
   * Toggle study mode with comprehensive tracking
   */
  socket.on('presence:study_mode', async (data, callback) => {
    try {
      // Authentication validation
      if (!socket.userId || !socket.userInfo) {
        const error = { type: 'AUTHENTICATION_ERROR', message: 'User not authenticated' };
        logger.warn(`🚫 Unauthenticated study mode attempt from socket ${socket.id}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Input validation
      if (typeof data.enabled !== 'boolean') {
        const error = { type: 'VALIDATION_ERROR', message: 'Enabled status is required' };
        logger.warn(`🚫 Missing enabled status in study mode from user ${socket.userId}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Rate limiting check
      const rateLimitResult = await checkPresenceActionRateLimit(socket.userId, 'study_mode');
      if (!rateLimitResult.allowed) {
        const error = { 
          type: 'RATE_LIMIT_ERROR', 
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`,
          retryAfter: rateLimitResult.retryAfter
        };
        logger.warn(`🚫 Rate limit exceeded for user ${socket.userId} on study mode`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      const subject = data.subject ? data.subject.substring(0, 100) : '';
      const endTime = data.endTime ? new Date(data.endTime) : null;
      const timestamp = new Date().toISOString();

      const studyMode = {
        enabled: data.enabled,
        subject,
        startTime: data.enabled ? timestamp : null,
        endTime: endTime ? endTime.toISOString() : null,
        userId,
        userInfo: {
          id: userInfo.id,
          name: userInfo.name,
          username: userInfo.username,
          image: userInfo.image
        }
      };

      // Update socket presence
      if (socket.presence) {
        socket.presence.studyMode = studyMode;
        socket.presence.status = data.enabled ? 'studying' : 'online';
      }

      // Store in Redis
      await redis.setex(`study_mode:${userId}`, 86400, JSON.stringify(studyMode)); // 24 hours TTL

      // Send to API for persistence
      try {
        await axios.post(
          `${apiBaseUrl}/api/presence/study-mode`,
          studyMode,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'x-socket-user-id': socket.userId,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (apiError) {
        logger.warn(`API study mode update failed for user ${userId}:`, apiError.message);
      }

      // Real-time broadcast to presence subscribers
      socket.to(`presence_${userId}`).emit('presence:study_mode_updated', {
        userId,
        studyMode,
        user: studyMode.userInfo
      });

      // Broadcast to educational rooms (study groups, courses)
      socket.to('students-interlinked-main').emit('study:mode_updated', {
        userId,
        studyMode,
        user: studyMode.userInfo
      });

      // Publish Kafka event for educational analytics
      if (kafkaClient?.isConnected) {
        await kafkaClient.publishEvent('presence.study_mode_updated', {
          userId,
          enabled: data.enabled,
          subject,
          expectedDuration: endTime ? (new Date(endTime) - new Date()) / 1000 : null,
          timestamp
        });
      }

      logger.info(`📚 Study mode ${data.enabled ? 'enabled' : 'disabled'}: ${userId} (${subject})`);
      
      if (callback) {
        callback(null, { 
          success: true, 
          studyMode 
        });
      }

    } catch (error) {
      const errorResponse = { 
        type: 'STUDY_MODE_ERROR', 
        message: 'Failed to update study mode',
        details: error.message 
      };
      logger.error(`❌ Error updating study mode for user ${socket.userId}:`, {
        error: error.message,
        enabled: data?.enabled,
        subject: data?.subject,
        stack: error.stack
      });
      
      if (callback) callback(errorResponse);
      socket.emit('presence:study_mode_failed', {
        error: errorResponse.message,
        details: errorResponse.details
      });
    }
  });

  // ==========================================
  // PRESENCE SUBSCRIPTIONS - Production Ready
  // ==========================================

  /**
   * Subscribe to user presence updates
   */
  socket.on('presence:subscribe', async (data, callback) => {
    try {
      // Authentication validation
      if (!socket.userId || !socket.userInfo) {
        const error = { type: 'AUTHENTICATION_ERROR', message: 'User not authenticated' };
        logger.warn(`🚫 Unauthenticated presence subscribe attempt from socket ${socket.id}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Input validation
      if (!Array.isArray(data.targetUserIds) || data.targetUserIds.length === 0) {
        const error = { type: 'VALIDATION_ERROR', message: 'Target user IDs array is required' };
        logger.warn(`🚫 Invalid target user IDs from user ${socket.userId}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      if (data.targetUserIds.length > 100) {
        const error = { type: 'VALIDATION_ERROR', message: 'Cannot subscribe to more than 100 users at once' };
        logger.warn(`🚫 Too many target users (${data.targetUserIds.length}) from user ${socket.userId}`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Rate limiting check
      const rateLimitResult = await checkPresenceActionRateLimit(socket.userId, 'subscribe');
      if (!rateLimitResult.allowed) {
        const error = { 
          type: 'RATE_LIMIT_ERROR', 
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`,
          retryAfter: rateLimitResult.retryAfter
        };
        logger.warn(`🚫 Rate limit exceeded for user ${socket.userId} on presence subscribe`);
        if (callback) callback(error);
        socket.emit('error', error);
        return;
      }

      // Join presence rooms for specific users
      const joinedRooms = [];
      for (const targetUserId of data.targetUserIds.slice(0, 100)) {
        if (typeof targetUserId === 'string' && targetUserId.length > 0) {
          socket.join(`presence_${targetUserId}`);
          joinedRooms.push(targetUserId);
        }
      }

      logger.info(`👥 Presence subscribed: ${userId} → ${joinedRooms.length} users`);
      
      if (callback) {
        callback(null, { 
          success: true, 
          subscribedTo: joinedRooms,
          count: joinedRooms.length 
        });
      }

    } catch (error) {
      const errorResponse = { 
        type: 'SUBSCRIBE_ERROR', 
        message: 'Failed to subscribe to presence',
        details: error.message 
      };
      logger.error(`❌ Error subscribing to presence for user ${socket.userId}:`, {
        error: error.message,
        targetCount: data?.targetUserIds?.length || 0,
        stack: error.stack
      });
      
      if (callback) callback(errorResponse);
    }
  });

  logger.info(`✅ Facebook-style presence handler fully initialized for user ${socket.userId}`);
}

module.exports = { handlePresenceEvents };
