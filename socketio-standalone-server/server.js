// ==========================================
// EDU MATRIX INTERLINKED - SOCKET.IO SERVER
// ==========================================
// Standalone Socket.IO server with NextAuth 5 integration
// Features: Real-time posts, stories, comments, voice chats, study groups and notifications as facebook

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { kafka, createKafkaProducer, createKafkaConsumer } = require('./utils/kafka');
const { logger } = require('./utils/logger');
const { testConnection: testPostgresConnection } = require('./utils/database');
const { authMiddleware, httpAuthMiddleware } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimit');
const { validateConnection } = require('./middleware/validation');
const { HealthMonitor } = require('./utils/healthMonitor');

// 🎓 STUDENT ADDITION: Simple metrics for monitoring
const { SimpleMetrics } = require('./monitoring/simple-metrics');

// 🎓 STUDENT ADDITION: Import simple dashboard
const { createSimpleDashboard } = require('./monitoring/simple-dashboard');

// Import event handlers
const { handleConnection } = require('./handlers/connection');
const { handleDisconnection } = require('./handlers/disconnection');

// Import Kafka notification consumer (CRITICAL FIX)
const { KafkaNotificationConsumer } = require('./consumers/kafka-notification-consumer');

// Import all event handlers (consistent naming - matching actual file names)
const { handlePostEvents } = require('./handlers/posts');
const { handleStoryEvents } = require('./handlers/stories');
const { handleCommentEvents } = require('./handlers/comments');
const { handleLikeEvents } = require('./handlers/likes');
const { handleVoiceCallEvents } = require('./handlers/voiceCalls');
const { handleStudyGroupEvents } = require('./handlers/studyGroups');
const { handleNotificationEvents } = require('./handlers/notifications');
const { handleFileEvents } = require('./handlers/files');
const { handlePresenceEvents } = require('./handlers/presence');
const { handleShareEvents } = require('./handlers/shares');
const { handleMessagesEvents } = require('./handlers/messages');
const { handleGroupEvents } = require('./handlers/groups');

// App configuration
const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Socket.IO
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Redis setup for Socket.IO adapter
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  family: 4
});

const pubClient = redis;
const subClient = pubClient.duplicate();

// Socket.IO server setup with PRODUCTION HTTPS support
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
  },
  // PRODUCTION FIX: Enhanced transport configuration for HTTPS
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  upgradeTimeout: 30000,
  pingTimeout: parseInt(process.env.PING_TIMEOUT) || 60000,
  pingInterval: parseInt(process.env.PING_INTERVAL) || 25000,
  maxHttpBufferSize: 1e8, // 100MB for file uploads
  allowEIO3: true,
  // PRODUCTION FIX: Cookie configuration for secure connections
  cookie: {
    name: 'socket.io',
    httpOnly: false,
    sameSite: 'none', // Required for cross-origin HTTPS
    secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
  }
});

// Global variables for tracking
const connectedUsers = new Map();
const activeRooms = new Map();
const activeCalls = new Map();
const userPresence = new Map();

// Initialize Kafka notification consumer (CRITICAL FIX)
let kafkaNotificationConsumer = null;

// 🎓 STUDENT ADDITION: Initialize simple metrics
const metrics = new SimpleMetrics();
metrics.startAutoReporting(); // This will print stats every 30 seconds

// Service health tracking
const serviceHealth = {
  postgres: false,
  redis: false,
  kafka: false,
  socketio: true,
  lastChecked: new Date().toISOString(),
  uptime: 0
};

// Initialize health monitor
const healthMonitor = new HealthMonitor();

// Kafka setup
let kafkaProducer = null;
let kafkaConsumer = null;

async function initializeServices() {
  const startTime = Date.now();
  
  // Register health monitoring services
  setupHealthMonitoring();
  
  try {
    // Test PostgreSQL connection
    logger.info('🔍 Testing PostgreSQL connection...');
    const postgresConnected = await testPostgresConnection();
    if (!postgresConnected) {
      serviceHealth.postgres = false;
      throw new Error('PostgreSQL connection failed');
    }
    serviceHealth.postgres = true;
    logger.info('✅ PostgreSQL connected successfully');

    // Connect to Redis
    logger.info('🔍 Testing Redis connection...');
    await redis.connect();
    await subClient.connect();
    serviceHealth.redis = true;
    logger.info('✅ Redis connected successfully');

    // Set up Redis adapter for Socket.IO clustering
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.IO Redis adapter configured');

    // Set up Redis subscribers for real-time events
    subClient.subscribe('notification:new');
    subClient.subscribe('students-interlinked:story-created');
    
    subClient.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        if (channel === 'notification:new') {
          // Handle notification events
          const { notification, timestamp, notificationId } = data;
          if (notification && notification.userId) {
            io.to(`user:${notification.userId}`).emit('notification:new', {
              notification,
              timestamp,
              notificationId
            });
            logger.info(`✅ Notification delivered via Redis: ${notificationId}`);
          }
        } else if (channel === 'students-interlinked:story-created') {
          // Handle story creation events
          const { storyId, authorId, storyData, timestamp } = data;
          logger.info(`📖 Broadcasting story creation: ${storyId} by ${authorId}`);
          
          // Broadcast to all clients for real-time story updates
          io.emit('students-interlinked:new-story', {
            type: 'story_created',
            storyId,
            authorId,
            storyData,
            timestamp
          });
          
          logger.info(`✅ Story creation broadcast complete: ${storyId}`);
        }
      } catch (error) {
        logger.error(`❌ Error processing Redis message from ${channel}:`, error);
      }
    });
    
    logger.info('✅ Redis subscriptions configured for real-time events');

    // Initialize rate limiters with Redis
    const { initializeRateLimiters } = require('./middleware/rateLimit');
    initializeRateLimiters(redis);
    logger.info('✅ Rate limiters initialized');

    // Initialize Kafka if enabled (with timeout and optional failure)
    if (process.env.KAFKA_ENABLED === 'true') {
      logger.info('🔍 Initializing Kafka connection...');
      try {
        await initializeKafkaWithTimeout(30000); // 30 second timeout
        serviceHealth.kafka = true;
        logger.info('✅ Kafka producer and consumer initialized');
        
        // Start Kafka notification consumer (CRITICAL FIX)
        logger.info('🔔 Starting Kafka notification consumer...');
        kafkaNotificationConsumer = new KafkaNotificationConsumer();
        await kafkaNotificationConsumer.start();
        logger.info('✅ Kafka notification consumer started successfully');
        
      } catch (error) {
        serviceHealth.kafka = false;
        logger.warn('⚠️ Kafka initialization failed, continuing without event streaming:', error.message);
        // Don't throw - continue without Kafka
      }
    } else {
      serviceHealth.kafka = false;
      logger.info('ℹ️ Kafka disabled by configuration');
    }

    // Update service health
    serviceHealth.lastChecked = new Date().toISOString();
    serviceHealth.uptime = Date.now() - startTime;
    
    // Start health monitoring
    healthMonitor.startPeriodicChecks(30000); // 30 second intervals
    
    logger.info('✅ All services initialized successfully');

  } catch (error) {
    serviceHealth.lastChecked = new Date().toISOString();
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

// Setup health monitoring services
function setupHealthMonitoring() {
  // PostgreSQL health checker
  healthMonitor.registerService('postgres', async () => {
    const isHealthy = await testPostgresConnection();
    return {
      healthy: isHealthy,
      details: { connected: isHealthy }
    };
  }, { critical: true });

  // Redis health checker
  healthMonitor.registerService('redis', async () => {
    await redis.ping();
    const isHealthy = redis.status === 'ready';
    return {
      healthy: isHealthy,
      details: { 
        status: redis.status,
        connected: isHealthy
      }
    };
  }, { critical: true });

  // Kafka health checker
  healthMonitor.registerService('kafka', async () => {
    if (process.env.KAFKA_ENABLED !== 'true') {
      return { healthy: true, details: { enabled: false } };
    }

    if (!kafkaProducer) {
      return { healthy: false, details: { enabled: true, connected: false } };
    }

    // Send a test message
    await kafkaProducer.send({
      topic: 'health-check',
      messages: [{
        key: 'health',
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          source: 'socketio-server'
        })
      }]
    });

    return {
      healthy: true,
      details: {
        enabled: true,
        connected: true,
        producerConnected: kafkaProducer !== null,
        consumerConnected: kafkaConsumer !== null
      }
    };
  }, { critical: false, enabled: process.env.KAFKA_ENABLED === 'true' });

  // Socket.IO health checker
  healthMonitor.registerService('socketio', async () => {
    return {
      healthy: true,
      details: {
        connectedUsers: connectedUsers.size,
        activeRooms: activeRooms.size,
        activeCalls: activeCalls.size
      }
    };
  }, { critical: true });

  logger.info('🏥 Health monitoring services registered');
}

// Initialize Kafka with timeout to prevent blocking startup
async function initializeKafkaWithTimeout(timeoutMs = 30000) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Kafka initialization timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      kafkaProducer = await createKafkaProducer();
      kafkaConsumer = await createKafkaConsumer('socketio-server');      // Subscribe to relevant topics including enhanced notification topics
      await kafkaConsumer.subscribe({        topics: [
          'user-actions',
          'post-events',
          'story-events',
          'comment-events',
          'like-events',
          'notification-events',
          'notification-delivery',
          'notification-analytics', 
          'push-notifications',
          'study-group-events',
          'voice-call-events',
          'messages', // Added messages topic for real-time messaging
          // STUDENTS INTERLINKED TOPICS - CRITICAL FIX
          'students-interlinked.post.created',
          'students-interlinked.post.liked',
          'students-interlinked.post.commented',
          'students-interlinked.story.created',
          'students-interlinked.story.viewed',
          'students-interlinked.story.liked',
          'students-interlinked.user.activity'
        ]
      });
      
      // Start consuming messages
      await kafkaConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const data = JSON.parse(message.value.toString());
            await handleKafkaMessage(topic, data);
          } catch (error) {
            logger.error('Error processing Kafka message:', error);
          }
        },
      });

      clearTimeout(timeout);
      resolve();
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Periodic health checks for all services
function startPeriodicHealthChecks() {
  setInterval(async () => {
    await performHealthChecks();
  }, 30000); // Check every 30 seconds
  
  logger.info('🏥 Periodic health checks started (30s interval)');
}

// Perform comprehensive health checks
async function performHealthChecks() {
  const startTime = Date.now();
  
  try {
    // Check PostgreSQL
    try {
      const result = await testPostgresConnection();
      serviceHealth.postgres = result;
    } catch (error) {
      serviceHealth.postgres = false;
      logger.warn('❌ PostgreSQL health check failed:', error.message);
    }

    // Check Redis
    try {
      await redis.ping();
      serviceHealth.redis = redis.status === 'ready';
    } catch (error) {
      serviceHealth.redis = false;
      logger.warn('❌ Redis health check failed:', error.message);
    }

    // Check Kafka (if enabled)
    if (process.env.KAFKA_ENABLED === 'true' && kafkaProducer) {
      try {
        // Simple producer health check
        await kafkaProducer.send({
          topic: 'health-check',
          messages: [{
            key: 'health',
            value: JSON.stringify({
              timestamp: new Date().toISOString(),
              source: 'socketio-server'
            })
          }]
        });
        serviceHealth.kafka = true;
      } catch (error) {
        serviceHealth.kafka = false;
        logger.warn('❌ Kafka health check failed:', error.message);
      }
    }

    // Update health metadata
    serviceHealth.lastChecked = new Date().toISOString();
    serviceHealth.uptime = process.uptime();

    // Log health status periodically (every 5 minutes)
    const now = Date.now();
    if (!performHealthChecks.lastLog || now - performHealthChecks.lastLog > 300000) {
      const healthSummary = {
        postgres: serviceHealth.postgres ? '✅' : '❌',
        redis: serviceHealth.redis ? '✅' : '❌',
        kafka: serviceHealth.kafka ? '✅' : '❌',
        connections: connectedUsers.size,
        uptime: `${Math.floor(serviceHealth.uptime / 60)}m`
      };
      
      logger.info('🏥 Health Check Summary:', healthSummary);
      performHealthChecks.lastLog = now;
    }

  } catch (error) {
    logger.error('❌ Error during health checks:', error);
  }
}

// Get detailed service health information
function getServiceHealthDetails() {
  return {
    ...serviceHealth,
    details: {
      postgres: {
        status: serviceHealth.postgres ? 'healthy' : 'unhealthy',
        connected: serviceHealth.postgres
      },
      redis: {
        status: serviceHealth.redis ? 'healthy' : 'unhealthy',
        connected: serviceHealth.redis,
        redisStatus: redis.status
      },
      kafka: {
        status: serviceHealth.kafka ? 'healthy' : 'unhealthy',
        enabled: process.env.KAFKA_ENABLED === 'true',
        connected: serviceHealth.kafka,
        producerConnected: kafkaProducer !== null,
        consumerConnected: kafkaConsumer !== null
      },
      socketio: {
        status: 'healthy',
        connectedUsers: connectedUsers.size,
        activeRooms: activeRooms.size,
        activeCalls: activeCalls.size
      }
    },
    metrics: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString()
    }
  };
}

// ==========================================
// STUDENTS INTERLINKED EVENT HANDLERS - CRITICAL FIX
// ==========================================

// Handle story creation events
async function handleStudentsInterlinkedStoryCreated(eventData) {
  try {
    const { storyData, authorId } = eventData;
    
    logger.info(`📖 Processing story creation: ${storyData.id} by ${authorId}`);

    // Emit to main feed and stories feed with proper data structure
    const storyPayload = {
      story: storyData,
      author: storyData.author || null  // Use author from storyData or null as fallback
    };

    io.to('main:feed').emit('story:created', storyPayload);
    io.to('stories-feed').emit('story:created', storyPayload);
    
    // Also emit to students-interlinked specific event
    io.to('students-interlinked').emit('students-interlinked:new-story', {
      id: storyData.id,
      content: storyData.content,
      imageUrl: storyData.imageUrl,
      videoUrl: storyData.videoUrl,
      authorId: authorId,
      author: storyData.author || {
        id: authorId,
        name: 'Unknown User',
        image: null
      },
      createdAt: storyData.createdAt,
      expiresAt: storyData.expiresAt,
      views: [],
      reactions: []
    });

    // Publish to Redis for broader distribution
    await pubClient.publish('students-interlinked:story-created', JSON.stringify({
      story: storyData,
      author: storyData.author || null,
      timestamp: new Date().toISOString()
    }));

    logger.info(`✅ Story creation event processed: ${storyData.id}`);
    logger.info(`📖 Broadcasting story creation: ${storyData.id} by ${storyData.author?.name || 'Unknown'}`);
    logger.info(`✅ Story creation broadcast complete: ${storyData.id}`);
  } catch (error) {
    logger.error('❌ Failed to handle story creation:', error);
  }
}

// Handle post creation events
async function handleStudentsInterlinkedPostCreated(eventData) {
  try {
    const { postData, authorId } = eventData;
    
    logger.info(`📝 Processing post creation: ${postData.id} by ${authorId}`);

    // Emit to main feed
    io.to('main:feed').emit('post:created', {
      post: postData,
      author: postData.author
    });

    logger.info(`✅ Post creation event processed: ${postData.id}`);
  } catch (error) {
    logger.error('❌ Failed to handle post creation:', error);
  }
}

// Handle post like events
async function handleStudentsInterlinkedPostLiked(eventData) {
  try {
    const { postId, userId, authorId, reaction } = eventData;
    
    logger.info(`❤️ Processing post like: ${postId} by ${userId}`);

    // Emit to post room
    io.to(`post:${postId}`).emit('post:liked', {
      postId,
      userId,
      reaction,
      timestamp: eventData.timestamp
    });

    // Notify post author
    if (authorId !== userId) {
      io.to(`user:${authorId}`).emit('notification:new', {
        type: 'post_liked',
        postId,
        userId,
        reaction,
        timestamp: eventData.timestamp
      });
    }

    logger.info(`✅ Post like event processed: ${postId}`);
  } catch (error) {
    logger.error('❌ Failed to handle post like:', error);
  }
}

// Handle post comment events
async function handleStudentsInterlinkedPostCommented(eventData) {
  try {
    const { commentData, postId, authorId, postAuthorId } = eventData;
    
    logger.info(`💬 Processing comment creation: ${commentData.id} on post ${postId}`);

    // Emit to post room
    io.to(`post:${postId}`).emit('comment:created', {
      comment: commentData,
      postId
    });

    // Notify post author
    if (postAuthorId !== authorId) {
      io.to(`user:${postAuthorId}`).emit('notification:new', {
        type: 'comment_created',
        postId,
        commentId: commentData.id,
        authorId,
        timestamp: eventData.timestamp
      });
    }

    logger.info(`✅ Comment creation event processed: ${commentData.id}`);
  } catch (error) {
    logger.error('❌ Failed to handle comment creation:', error);
  }
}

// Handle story view events
async function handleStudentsInterlinkedStoryViewed(eventData) {
  try {
    const { storyId, viewerId, authorId } = eventData;
    
    logger.info(`👁️ Processing story view: ${storyId} by ${viewerId}`);

    // Notify story author
    io.to(`user:${authorId}`).emit('story:viewed', {
      storyId,
      viewerId,
      timestamp: eventData.timestamp
    });

    logger.info(`✅ Story view event processed: ${storyId}`);
  } catch (error) {
    logger.error('❌ Failed to handle story view:', error);
  }
}

// Handle story like events
async function handleStudentsInterlinkedStoryLiked(eventData) {
  try {
    const { storyId, userId, authorId } = eventData;
    
    logger.info(`❤️ Processing story like: ${storyId} by ${userId}`);

    // Notify story author
    if (authorId !== userId) {
      io.to(`user:${authorId}`).emit('story:liked', {
        storyId,
        userId,
        timestamp: eventData.timestamp
      });
    }

    logger.info(`✅ Story like event processed: ${storyId}`);
  } catch (error) {
    logger.error('❌ Failed to handle story like:', error);
  }
}

// Kafka message handler
async function handleKafkaMessage(topic, data) {
  logger.info(`📨 Received Kafka message from topic: ${topic}`, { data });
  
  switch (topic) {
    case 'messages':
      await handleMessagesKafkaEvent(data);
      break;
    case 'post-events':
      io.emit('post:update', data);
      break;
    case 'story-events':
      io.emit('story:update', data);
      break;
    case 'comment-events':
      io.to(`post:${data.postId}`).emit('comment:new', data);
      break;
    case 'like-events':
      io.to(`post:${data.postId}`).emit('like:update', data);
      break;
    
    // STUDENTS INTERLINKED EVENTS - CRITICAL FIX
    case 'students-interlinked.story.created':
      await handleStudentsInterlinkedStoryCreated(data);
      break;
    case 'students-interlinked.post.created':
      await handleStudentsInterlinkedPostCreated(data);
      break;
    case 'students-interlinked.post.liked':
      await handleStudentsInterlinkedPostLiked(data);
      break;
    case 'students-interlinked.post.commented':
      await handleStudentsInterlinkedPostCommented(data);
      break;
    case 'students-interlinked.story.viewed':
      await handleStudentsInterlinkedStoryViewed(data);
      break;
    case 'students-interlinked.story.liked':
      await handleStudentsInterlinkedStoryLiked(data);
      break;
      
    case 'notification-events':
      await handleNotificationKafkaEvent(data);
      break;
    case 'notification-delivery':
      await handleNotificationDeliveryEvent(data);
      break;
    case 'notification-analytics':
      await handleNotificationAnalyticsEvent(data);
      break;
    case 'push-notifications':
      await handlePushNotificationEvent(data);
      break;    case 'study-group-events':
      io.to(`study-group:${data.groupId}`).emit('group:update', data);
      break;
    case 'voice-call-events':
      io.to(`call:${data.callId}`).emit('call:update', data);
      break;
    default:
      logger.warn(`Unknown Kafka topic: ${topic}`);
  }
}

// Handle messages events from Kafka
async function handleMessagesKafkaEvent(eventData) {
  const { type, data, metadata } = eventData;
  
  try {
    switch (type) {
      case 'CONVERSATION_CREATED':
        // Notify all participants about new conversation
        if (metadata.rooms) {
          metadata.rooms.forEach(room => {
            io.to(room).emit('conversation:created', data);
          });
        }
        break;

      case 'MESSAGE_SENT':
        // Emit message to conversation room
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('message:new', data);
          
          // Also emit to individual user rooms for notifications
          if (metadata.rooms) {
            metadata.rooms.forEach(room => {
              io.to(room).emit('message:notification', {
                conversationId: data.conversationId,
                messagePreview: data.content?.substring(0, 50) || 'New message',
                senderName: data.sender?.name || 'Someone'
              });
            });
          }
        }
        break;

      case 'MESSAGE_EDITED':
        // Emit edited message to conversation
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('message:edited', data);
        }
        break;

      case 'MESSAGE_DELETED':
        // Emit deleted message to conversation
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('message:deleted', {
            messageId: data.messageId,
            conversationId: data.conversationId,
            deletedBy: data.deletedBy
          });
        }
        break;

      case 'REACTION_ADDED':
        // Emit reaction to conversation
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('reaction:added', {
            messageId: data.messageId,
            reaction: data.reaction
          });
        }
        break;

      case 'REACTION_REMOVED':
        // Emit reaction removal to conversation
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('reaction:removed', {
            messageId: data.messageId,
            emoji: data.emoji,
            userId: data.userId
          });
        }
        break;

      case 'TYPING_START':
        // Emit typing indicator to conversation (exclude sender)
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('typing:start', {
            conversationId: data.conversationId,
            userId: data.userId,
            username: data.username
          });
        }
        break;

      case 'TYPING_STOP':
        // Remove typing indicator from conversation
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('typing:stop', {
            conversationId: data.conversationId,
            userId: data.userId
          });
        }
        break;

      case 'MESSAGES_READ':
        // Emit read receipts to conversation
        if (data.conversationId) {
          io.to(`conversation:${data.conversationId}`).emit('messages:read', {
            messageIds: data.messageIds,
            userId: data.userId,
            userName: data.userName,
            conversationId: data.conversationId
          });
        }
        break;

      case 'MENTION_NOTIFICATION':
        // Send direct notification to mentioned user
        if (metadata.rooms) {
          metadata.rooms.forEach(room => {
            io.to(room).emit('mention:notification', {
              messageId: data.messageId,
              conversationId: data.conversationId,
              senderName: data.senderName,
              content: data.content
            });
          });
        }
        break;

      default:
        logger.warn(`Unknown messages event type: ${type}`);
    }
  } catch (error) {
    logger.error(`Error handling messages Kafka event ${type}:`, error);
  }
}

// Handle notification events from Kafka
async function handleNotificationKafkaEvent(eventData) {
  const { type, userId, notification, channels, priority, metadata } = eventData;
  
  try {
    logger.info(`🔔 Processing notification Kafka event: ${type} for user ${userId}`);
    
    switch (type) {
      case 'NOTIFICATION_CREATED':
        // Emit real-time notification to specific user
        if (metadata.rooms) {
          metadata.rooms.forEach(room => {
            io.to(room).emit('notification:new', {
              notification,
              timestamp: eventData.timestamp,
              priority
            });
          });
        }
        
        // Also emit to general user room as fallback
        io.to(`user:${userId}`).emit('notification:new', {
          notification,
          timestamp: eventData.timestamp,
          priority
        });
        
        // Update notification count for user
        io.to(`notifications:${userId}`).emit('notification:count_updated', {
          unreadCount: notification.unreadCount || 1
        });
        
        // Publish to Redis pub/sub for other services
        if (redis) {
          await redis.publish('notification:new', JSON.stringify({
            userId,
            notification,
            timestamp: eventData.timestamp
          }));
        }
        
        logger.info(`✅ Delivered notification ${notification.id} to user ${userId} via Socket.IO`);
        break;

      case 'NOTIFICATION_READ':
        // Emit notification read event to user
        io.to(`user:${userId}`).emit('notification:read', {
          notificationId: eventData.notificationId,
          timestamp: eventData.timestamp
        });
        
        io.to(`notifications:${userId}`).emit('notification:count_updated', {
          unreadCount: eventData.unreadCount || 0
        });
        break;

      case 'NOTIFICATION_DELETED':
        // Emit notification deleted event to user
        io.to(`user:${userId}`).emit('notification:deleted', {
          notificationId: eventData.notificationId,
          timestamp: eventData.timestamp
        });
        break;

      case 'BULK_NOTIFICATIONS_READ':
        // Handle bulk read operations
        io.to(`user:${userId}`).emit('notification:all_read', {
          timestamp: eventData.timestamp
        });
        
        io.to(`notifications:${userId}`).emit('notification:count_updated', {
          unreadCount: 0
        });
        break;

      default:
        logger.warn(`Unknown notification event type: ${type}`);
    }
  } catch (error) {
    logger.error(`Error handling notification Kafka event ${type}:`, error);
  }
}

// Handle notification delivery events from Kafka
async function handleNotificationDeliveryEvent(eventData) {
  const { userId, notificationId, deliveryChannel, status, timestamp } = eventData;
  
  try {
    logger.info(`📬 Processing notification delivery event: ${notificationId} via ${deliveryChannel}`);
    
    // Update delivery status in real-time
    io.to(`user:${userId}`).emit('notification:delivery_status', {
      notificationId,
      deliveryChannel,
      status,
      timestamp
    });
    
    // Log delivery metrics
    logger.info(`✅ Notification ${notificationId} delivery status: ${status} via ${deliveryChannel}`);
  } catch (error) {
    logger.error(`Error handling notification delivery event:`, error);
  }
}

// Handle notification analytics events from Kafka
async function handleNotificationAnalyticsEvent(eventData) {
  const { notificationId, userId, action, channel, timestamp } = eventData;
  
  try {
    logger.info(`📊 Processing notification analytics: ${action} on ${notificationId}`);
    
    // Emit analytics event for dashboard updates
    io.to(`analytics:${userId}`).emit('notification:analytics', {
      notificationId,
      action,
      channel,
      timestamp
    });
    
    // Store analytics in Redis for real-time dashboard
    if (redis) {
      const analyticsKey = `analytics:notifications:${userId}:${new Date().toISOString().split('T')[0]}`;
      await redis.hincrby(analyticsKey, `${action}_${channel}`, 1);
      await redis.expire(analyticsKey, 2592000); // 30 days
    }
  } catch (error) {
    logger.error(`Error handling notification analytics event:`, error);
  }
}

// Handle push notification events from Kafka
async function handlePushNotificationEvent(eventData) {
  const { userId, title, body, data, badge, priority, timestamp } = eventData;
  
  try {
    logger.info(`📱 Processing push notification event for user ${userId}`);
    
    // Emit push notification ready event to user (for service worker)
    io.to(`user:${userId}`).emit('push:notification_ready', {
      title,
      body,
      data,
      badge,
      priority,
      timestamp
    });
    
    // Track push notification preparation
    if (redis) {
      await redis.hincrby(`user:${userId}:stats`, 'push_notifications_sent', 1);
    }
    
    logger.info(`✅ Push notification prepared for user ${userId}`);
  } catch (error) {
    logger.error(`Error handling push notification event:`, error);
  }
}

// Socket.IO middleware - NextAuth 5 Integration
io.use(async (socket, next) => {
  await authMiddleware.authenticateConnection(socket, next);
});
io.use(rateLimiter);
io.use(validateConnection);

// Socket.IO event handlers with NextAuth 5 authentication
io.on('connection', async (socket) => {
  const user = socket.user; // NextAuth 5 authenticated user
  const userId = user.id;
  
  // 🎓 STUDENT ADDITION: Count the connection
  metrics.userConnected();
  
  logger.info(`👤 User connected: ${user.name || user.email} (${userId}) - Verified: ${user.isVerified}`);
  
  // Track connected user with NextAuth 5 session data
  connectedUsers.set(userId, {
    socketId: socket.id,
    userId,
    userInfo: user,
    connectedAt: new Date(),
    rooms: new Set(),
    sessionExpires: user.exp ? new Date(user.exp * 1000) : null
  });

  // Update user presence with verification status
  userPresence.set(userId, {
    status: 'online',
    lastSeen: new Date(),
    socketId: socket.id,
    isVerified: user.isVerified
  });

  // Handle connection events
  await handleConnection(socket, io, {
    connectedUsers,
    activeRooms,
    activeCalls,
    userPresence,
    redis,
    kafkaProducer
  });

  // 🎓 STUDENT ADDITION: Track all messages for metrics
  socket.onAny((eventName, ...args) => {
    // Count this message for our metrics
    metrics.messageReceived(eventName);
    
    // Log the event for learning (you can remove this later)
    logger.info(`📨 Event received: ${eventName} from user ${userId}`);
  });

  // Register all event handlers
  handlePostEvents(socket, io, { connectedUsers, activeRooms, redis, kafkaProducer });
  handleStoryEvents(socket, io, { connectedUsers, activeRooms, redis, kafkaProducer });
  handleCommentEvents(socket, io, { connectedUsers, activeRooms, redis, kafkaProducer });
  handleLikeEvents(socket, io, { connectedUsers, activeRooms, redis, kafkaProducer });
  handleVoiceCallEvents(socket, io, { connectedUsers, activeCalls, redis, kafkaProducer });
  handleStudyGroupEvents(socket, io, { connectedUsers, activeRooms, redis, kafkaProducer });
  handleMessagesEvents(socket, io, { connectedUsers, activeRooms, redis, kafkaProducer });
  handleNotificationEvents(socket, io, { connectedUsers, redis, kafkaProducer });
  handleFileEvents(socket, io, { connectedUsers, redis, kafkaProducer });
  handlePresenceEvents(socket, io, { connectedUsers, userPresence, redis, kafkaProducer });
  handleShareEvents(socket, io, { connectedUsers, activeRooms, redis, kafkaProducer });
  handleGroupEvents(socket, io, { connectedUsers, redis, kafkaProducer });

  // Handle server-side emissions from API routes
  socket.on('server:emit', async (data) => {
    try {
      const { target, event, data: eventData } = data;
      
      if (!target || !event) {
        logger.error('❌ Invalid server:emit data - missing target or event');
        return;
      }

      // Handle different target types
      if (target === 'broadcast') {
        // Broadcast to all connected clients
        io.emit(event, eventData);
        logger.info(`📤 Server broadcast: ${event}`);
      } else if (target.startsWith('user:')) {
        // Emit to specific user
        const targetUserId = target.replace('user:', '');
        io.to(target).emit(event, eventData);
        logger.info(`📤 Server emit to user ${targetUserId}: ${event}`);
      } else {
        // Emit to specific room/conversation
        io.to(target).emit(event, eventData);
        logger.info(`📤 Server emit to room ${target}: ${event}`);
      }
    } catch (error) {
      logger.error('❌ Error handling server:emit:', error);
    }
  });

  // ==========================================
  // REAL-TIME DASHBOARD METRICS - NO POLLING
  // ==========================================

  // Handle metrics request from dashboard
  socket.on('request-metrics', async () => {
    try {
      const currentMetrics = metrics.getMetrics();
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const metricsData = {
        connectedClients: connectedUsers.size,
        messagesPerSecond: currentMetrics.messagesPerSecond || 0,
        errorsPerSecond: currentMetrics.errorsPerSecond || 0,
        memoryUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        totalMessages: currentMetrics.totalMessages || 0,
        uptime: formatUptime(uptime)
      };

      // Send metrics to requesting client
      socket.emit('metrics-update', metricsData);
      logger.debug(`📊 Sent metrics to dashboard client: ${socket.id}`);
    } catch (error) {
      logger.error('❌ Error sending metrics:', error);
      socket.emit('metrics-error', { error: 'Failed to get metrics' });
    }
  });

  // Join dashboard room for broadcast metrics updates
  socket.on('join-dashboard', () => {
    socket.join('dashboard');
    logger.info(`📊 Client ${socket.id} joined dashboard room`);
  });

  socket.on('leave-dashboard', () => {
    socket.leave('dashboard');
    logger.info(`📊 Client ${socket.id} left dashboard room`);
  });

  // ==========================================
  // REAL-TIME UNREAD COUNTS HANDLERS
  // ==========================================
  
  /**
   * Handle requests for unread counts via Socket.IO
   * Eliminates the need for HTTP API polling
   */
  socket.on('request-unread-counts', async (data) => {
    try {
      const { userId } = data;
      if (!userId) return;

      logger.info(`📫 Requesting unread counts for user: ${userId}`);

      // Fetch unread counts from database/cache
      // This replaces the HTTP API calls that were causing polling
      const unreadCounts = {
        messageUnreadCount: 0, // TODO: Implement actual count fetching
        notificationUnreadCount: 0, // TODO: Implement actual count fetching
        conversationUnreadCounts: {} // TODO: Implement actual count fetching
      };

      // Send real-time response
      socket.emit('unread-counts-update', {
        userId,
        counts: unreadCounts,
        timestamp: new Date().toISOString()
      });

      logger.info(`✅ Sent unread counts to user: ${userId}`);
    } catch (error) {
      logger.error('❌ Error handling request-unread-counts:', error);
      socket.emit('unread-counts-error', { 
        error: 'Failed to fetch unread counts',
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==========================================
  // REAL-TIME PRESENCE HANDLERS
  // ==========================================
  
  /**
   * Handle requests for multiple user presence status via Socket.IO
   * Eliminates the need for HTTP API polling
   */
  socket.on('presence:request-multiple', async (data) => {
    try {
      const { userIds } = data;
      if (!userIds || !Array.isArray(userIds)) return;

      logger.info(`👥 Requesting presence for users:`, userIds);

      // Fetch presence data for multiple users
      // This replaces the POST /api/users/online-status calls
      const presenceData = {};
      userIds.forEach(userId => {
        presenceData[userId] = {
          isOnline: userPresence[userId]?.isOnline || false,
          lastSeen: userPresence[userId]?.lastSeen || new Date().toISOString(),
          activity: userPresence[userId]?.activity || 'offline'
        };
      });

      // Send real-time response
      socket.emit('presence:multiple-update', {
        users: presenceData,
        timestamp: new Date().toISOString()
      });

      logger.info(`✅ Sent presence data for ${userIds.length} users`);
    } catch (error) {
      logger.error('❌ Error handling presence:request-multiple:', error);
      socket.emit('presence:error', { 
        error: 'Failed to fetch presence data',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Handle presence heartbeat via Socket.IO
   * Replaces any HTTP API calls for status updates
   */
  socket.on('presence:heartbeat', async (data) => {
    try {
      const { userId, activity, timestamp } = data;
      if (!userId || userId !== socket.userId) return;

      // Update user presence in memory
      userPresence[userId] = {
        isOnline: true,
        lastSeen: timestamp || new Date().toISOString(),
        activity: activity || 'active',
        socketId: socket.id
      };

      // Broadcast to relevant clients (followers, friends, etc.)
      socket.broadcast.emit('user:presence-update', {
        userId,
        isOnline: true,
        lastSeen: timestamp,
        activity
      });

      logger.debug(`💓 Heartbeat received from user: ${userId}`);
    } catch (error) {
      logger.error('❌ Error handling presence:heartbeat:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    // 🎓 STUDENT ADDITION: Count the disconnection
    metrics.userDisconnected();
    
    await handleDisconnection(socket, io, {
      connectedUsers,
      activeRooms,
      activeCalls,
      userPresence,
      redis,
      kafkaProducer
    }, reason);
  });

  // Emit user online status
  socket.broadcast.emit('user:online', {
    userId,
    userInfo: {
      id: userInfo.id,
      name: userInfo.name,
      email: userInfo.email,
      image: userInfo.image
    },
    timestamp: new Date()
  });
});

// ==========================================
// API ENDPOINT FOR EMITTING EVENTS FROM NEXT.JS
// ==========================================

// Middleware for parsing JSON
app.use(express.json());

// API endpoint to emit events from Next.js API routes
app.post('/api/emit', httpAuthMiddleware, async (req, res) => {
  try {
    const { target, event, data, rooms } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({
        success: false,
        error: 'Event and data are required',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📡 API emit request:`, { target, event, dataKeys: Object.keys(data) });

    // Handle different target types for group notifications
    if (target === 'group_members' && event === 'group:new_post') {
      const { groupId, postId, authorId, authorName } = data;
      
      if (!groupId || !postId) {
        return res.status(400).json({
          success: false,
          error: 'groupId and postId are required for group post notifications',
          timestamp: new Date().toISOString()
        });
      }

      // Emit to group room (all group members)
      io.to(`group:${groupId}`).emit('group:post_created', {
        postId,
        groupId,
        authorId,
        authorName,
        contentPreview: data.postContent,
        postType: data.postType,
        hasMedia: data.hasMedia,
        timestamp: data.timestamp,
        metadata: data.metadata
      });

      // Send individual notifications to group members for notification system
      io.to(`group:${groupId}`).emit('notification:new', {
        type: 'GROUP_POST',
        title: `New post in your group`,
        message: `${authorName} posted: ${data.postContent}`,
        groupId,
        postId,
        authorId,
        timestamp: data.timestamp,
        actionUrl: `/students-interlinked/groups/${groupId}`
      });

      logger.info(`✅ Group post notification sent to group:${groupId}`, { postId, authorName });

      return res.json({
        success: true,
        message: `Group post notification sent to ${groupId}`,
        groupId,
        postId,
        timestamp: new Date().toISOString()
      });
    }

    // Handle group invitation notifications
    if (target === 'group_members' && event.startsWith('invitation:')) {
      const { groupId, recipientId } = data;
      
      if (groupId && recipientId) {
        io.to(`group-notifications:${recipientId}`).emit(event, data);
        logger.info(`✅ Group invitation notification sent`, { event, recipientId, groupId });
        
        return res.json({
          success: true,
          message: `Invitation notification sent`,
          recipientId,
          groupId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Original logic for other event types
    const targetRooms = rooms || [data.conversationId || 'global'];
    
    targetRooms.forEach(room => {
      if (room) {
        io.to(room).emit(event, data);
        logger.info(`📡 Emitted event '${event}' to room '${room}'`);
      }
    });

    res.json({
      success: true,
      message: `Event '${event}' emitted successfully`,
      rooms: targetRooms,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ API emit endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// NextAuth 5 authentication test endpoint
app.get('/auth/test', httpAuthMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      message: 'NextAuth 5 authentication successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        isVerified: user.isVerified
      },
      tokenInfo: {
        exp: user.exp ? new Date(user.exp * 1000).toISOString() : null,
        iat: user.iat ? new Date(user.iat * 1000).toISOString() : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Auth test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });  }
});

// 🎓 STUDENT ADDITION: Simple Dashboard Routes
// Visit http://localhost:3001/dashboard to see your server stats!
app.get('/dashboard', (req, res) => {
  try {
    const dashboard = createSimpleDashboard();
    res.send(dashboard);
  } catch (error) {
    res.status(500).send('<h1>Dashboard Error</h1><p>' + error.message + '</p>');
  }
});

// API endpoint for dashboard data
app.get('/stats', (req, res) => {
  try {
    const stats = metrics.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthStatus = healthMonitor.getHealthStatus();
    const overallStatus = healthStatus.global.status;
    
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: connectedUsers.size,
      activeRooms: activeRooms.size,
      activeCalls: activeCalls.size,
      services: Object.fromEntries(
        Object.entries(healthStatus.services).map(([name, service]) => [
          name, service.status === 'healthy'
        ])
      ),
      lastHealthCheck: healthStatus.global.lastChecked
    };
    
    // Return appropriate HTTP status
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('❌ Error in health endpoint:', error);
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health endpoint for monitoring systems
app.get('/health/detailed', async (req, res) => {
  try {
    const healthStatus = healthMonitor.getHealthStatus();
    const healthHistory = healthMonitor.getHealthHistory(20);
    
    res.json({
      ...healthStatus,
      history: healthHistory
    });
  } catch (error) {
    logger.error('❌ Error in detailed health endpoint:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Individual service health endpoints
app.get('/api/health/socket', (req, res) => {
    res.json({
        service: 'socketio',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

app.get('/health/postgres', async (req, res) => {
  try {
    const isHealthy = await testPostgresConnection();
    res.json({
      service: 'postgres',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'postgres',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/redis', async (req, res) => {
  try {
    await redis.ping();
    res.json({
      service: 'redis',
      status: redis.status === 'ready' ? 'healthy' : 'unhealthy',
      redisStatus: redis.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'redis',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/kafka', (req, res) => {
  const isEnabled = process.env.KAFKA_ENABLED === 'true';
  const isHealthy = isEnabled && kafkaProducer !== null && serviceHealth.kafka;
  
  res.status(isHealthy ? 200 : 503).json({
    service: 'kafka',
    enabled: isEnabled,
    status: isHealthy ? 'healthy' : 'unhealthy',
    producerConnected: kafkaProducer !== null,
    consumerConnected: kafkaConsumer !== null,
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    connectedUsers: Array.from(connectedUsers.values()).map(user => ({
      userId: user.userId,
      connectedAt: user.connectedAt,
      rooms: Array.from(user.rooms)
    })),
    activeRooms: Array.from(activeRooms.entries()).map(([roomId, room]) => ({
      roomId,
      type: room.type,
      users: room.users.length,
      createdAt: room.createdAt
    })),
    activeCalls: Array.from(activeCalls.entries()).map(([callId, call]) => ({
      callId,
      participants: call.participants.length,
      startedAt: call.startedAt,
      type: call.type
    }))
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==========================================
// UTILITY FUNCTIONS FOR REAL-TIME METRICS
// ==========================================

// Format uptime in human-readable format
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Broadcast metrics to all dashboard clients
function broadcastMetricsToDashboard() {
  try {
    const currentMetrics = metrics.getMetrics();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const metricsData = {
      connectedClients: connectedUsers.size,
      messagesPerSecond: currentMetrics.messagesPerSecond || 0,
      errorsPerSecond: currentMetrics.errorsPerSecond || 0,
      memoryUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      totalMessages: currentMetrics.totalMessages || 0,
      uptime: formatUptime(uptime)
    };

    // Broadcast to all clients in dashboard room
    io.to('dashboard').emit('metrics-update', metricsData);
  } catch (error) {
    logger.error('❌ Error broadcasting metrics:', error);
  }
}

// Set up periodic metrics broadcast (every 10 seconds) - much less frequent than old polling
setInterval(broadcastMetricsToDashboard, 10000);

// ==========================================
// GRACEFUL SHUTDOWN HANDLING
// ==========================================

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Close new connections
  server.close(() => {
    logger.info('✅ HTTP server closed');
  });
  
  // Disconnect all Socket.IO clients
  io.close(() => {
    logger.info('✅ Socket.IO server closed');
  });
  
  // Close Redis connections
  try {
    await redis.disconnect();
    await subClient.disconnect();
    logger.info('✅ Redis connections closed');
  } catch (error) {
    logger.error('❌ Error closing Redis connections:', error);
  }
  
  // Close Kafka connections
  if (kafkaProducer) {
    try {
      await kafkaProducer.disconnect();
      await kafkaConsumer.disconnect();
      logger.info('✅ Kafka connections closed');
    } catch (error) {
      logger.error('❌ Error closing Kafka connections:', error);
    }
  }
  
  // Close Kafka notification consumer (CRITICAL FIX)
  if (kafkaNotificationConsumer) {
    try {
      await kafkaNotificationConsumer.stop();
      logger.info('✅ Kafka notification consumer stopped');
    } catch (error) {
      logger.error('❌ Error stopping Kafka notification consumer:', error);
    }
  }
  
  logger.info('🏁 Graceful shutdown completed');
  process.exit(0);
}

// Start server
const PORT = process.env.SOCKET_IO_PORT || 3001;
const HOST = process.env.SOCKET_IO_HOST || '0.0.0.0';

async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, HOST, () => {      logger.info(`🚀 Socket.IO server running on ${HOST}:${PORT}`);
      logger.info(`📡 CORS origins: ${process.env.SOCKET_IO_CORS_ORIGIN}`);
      logger.info(`💾 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
      logger.info(`📨 Kafka: ${process.env.KAFKA_BROKERS}`);
      logger.info(`🔐 Auth: NextAuth 5 JWT validation enabled`);
      logger.info(`🔑 Internal API: ${process.env.INTERNAL_API_KEY ? 'Enabled' : 'Disabled'} for testing`);
      logger.info(`⚡ Max connections: ${process.env.MAX_CONNECTIONS || 1000}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { io, server, redis, kafkaProducer };
