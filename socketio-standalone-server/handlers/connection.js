// ==========================================
// CONNECTION HANDLER - NEXTAUTH 5 INTEGRATED
// ==========================================
// Handles Socket.IO connection events with NextAuth 5 authentication

const { logger } = require('../utils/logger');
const { eventPublishers } = require('../utils/kafka');
const { connectionTracker } = require('../utils/auth');
const axios = require('axios');

/**
 * Handle new Socket.IO connection with NextAuth 5 authentication
 */
async function handleConnection(socket, io, context) {
  const { connectedUsers, activeRooms, redis, kafkaProducer } = context;
  
  // ==========================================
  // INTERNAL COMMUNICATION HANDLERS
  // ==========================================
  // These handlers allow the StudentsInterlinkedService to emit events directly
  
  // Handle emit-to-room events from internal services
  socket.on('emit-to-room', async (data) => {
    try {
      const { room, event, data: eventData } = data;
      
      // Verify this is an internal connection
      if (!socket.handshake.auth?.internal) {
        logger.warn('Non-internal socket tried to use emit-to-room');
        return;
      }
      
      // Emit to the specified room
      io.to(room).emit(event, eventData);
      logger.info(`🔄 Internal emit-to-room: ${event} to room ${room}`);
      
    } catch (error) {
      logger.error('Error in emit-to-room handler:', error);
    }
  });

  // Handle emit-to-user events from internal services
  socket.on('emit-to-user', async (data) => {
    try {
      const { userId, event, data: eventData } = data;
      
      // Verify this is an internal connection
      if (!socket.handshake.auth?.internal) {
        logger.warn('Non-internal socket tried to use emit-to-user');
        return;
      }
      
      // Emit to the specific user's room
      io.to(`user-${userId}`).emit(event, eventData);
      logger.info(`🔄 Internal emit-to-user: ${event} to user ${userId}`);
      
    } catch (error) {
      logger.error('Error in emit-to-user handler:', error);
    }
  });

  // For internal connections (from StudentsInterlinkedService), don't require full auth
  if (socket.handshake.auth?.internal) {
    logger.info('✅ Internal service connected to Socket.IO server');
    // Don't join user-specific rooms for internal connections
    return;
  }

  // Extract authenticated user from NextAuth 5 middleware (for regular user connections)
  const user = socket.user;
  if (!user || !user.id) {
    logger.error('Connection handler called without authenticated user');
    socket.disconnect(true);
    return;
  }

  const userId = user.id;
  const userInfo = user;

  // Add user data to socket for consistent access across handlers
  socket.userId = userId;
  socket.userInfo = userInfo;

  try {
    // Validate session expiration
    if (user.exp && user.exp * 1000 < Date.now()) {
      logger.warn(`Expired session for user ${userId}`);
      socket.emit('auth:session_expired', { message: 'Session expired, please login again' });
      socket.disconnect(true);
      return;
    }

    // Track connection using NextAuth 5 user data
    connectionTracker.addConnection(userId, socket.id);    // Store user session in Redis using official ioredis patterns
    await redis.setex(`user:${userId}:session`, 3600 * 24, JSON.stringify({
      socketId: socket.id,
      connectedAt: new Date().toISOString(),
      userInfo: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified
      },
      tokenInfo: {
        exp: user.exp,
        iat: user.iat,
        sessionExpires: user.exp ? new Date(user.exp * 1000).toISOString() : null
      }
    }));    // Official Socket.IO room management for educational platform
    await socket.join(`user-${userId}`);        // Personal notifications
    await socket.join('posts-feed');            // Global posts feed
    await socket.join('stories-feed');          // Global stories feed
    await socket.join('online-users');          // Presence tracking
    await socket.join('students-interlinked-main'); // Students Interlinked real-time events
    
    // Educational context rooms (if user has courses/groups)
    try {
      // Get user's courses and study groups from Redis cache
      const userCourses = await redis.smembers(`user:${userId}:courses`);
      const userStudyGroups = await redis.smembers(`user:${userId}:study-groups`);
      
      // Join course rooms
      for (const courseId of userCourses) {
        await socket.join(`course-${courseId}`);
      }
      
      // Join study group rooms
      for (const groupId of userStudyGroups) {
        await socket.join(`study-group-${groupId}`);
      }
      
      logger.info(`👨‍🎓 User joined educational rooms: ${userCourses.length} courses, ${userStudyGroups.length} groups`);
    } catch (error) {
      logger.warn('Failed to join educational rooms:', error.message);
    }

    // CRITICAL FIX: Auto-join user's active conversation rooms for real-time messaging
    try {
      // Get user's active conversations from API
      const conversationsResponse = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/messages`, {
        headers: {
          'Authorization': `Bearer ${socket.handshake.auth.token}`,
          'x-socket-user-id': userId,
          'Content-Type': 'application/json'
        }
      });

      if (conversationsResponse.status === 200) {
        const conversationsData = conversationsResponse.data;
        const conversations = conversationsData.conversations || [];
        
        // Join all conversation rooms
        for (const conversation of conversations) {
          await socket.join(`conversation:${conversation.id}`);
          logger.info(`💬 User auto-joined conversation room: ${conversation.id}`);
        }
        
        // Store active conversations in Redis for reference
        if (conversations.length > 0) {
          const conversationIds = conversations.map(c => c.id);
          await redis.sadd(`user:${userId}:active_conversations`, ...conversationIds);
          await redis.expire(`user:${userId}:active_conversations`, 3600);
        }
        
        logger.info(`✅ User auto-joined ${conversations.length} conversation rooms`);
      } else {
        logger.warn('Failed to fetch user conversations for auto-join');
      }
    } catch (error) {
      logger.error('Error auto-joining conversation rooms:', error);
    }
      // Store user presence using official Redis patterns
    await redis.setex(`presence:${userId}`, 300, JSON.stringify({
      status: 'online',
      lastSeen: new Date().toISOString(),
      socketId: socket.id,
      rooms: [`user-${userId}`, 'posts-feed', 'stories-feed', 'online-users', 'students-interlinked-main']
    }));
    
    // Add to online users set
    await redis.sadd('online-users:set', userId);
    await redis.expire('online-users:set', 300); // 5 minute TTL// Publish user online event to Kafka with NextAuth 5 user data
    if (kafkaProducer) {
      await eventPublishers.userAction(kafkaProducer, 'user_online', userId, {
        userInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          isVerified: user.isVerified
        },
        socketId: socket.id
      });      await eventPublishers.presenceEvent(kafkaProducer, userId, 'online', {
        socketId: socket.id,
        userInfo: {
          id: user.id,
          name: user.name,
          username: user.username
        }
      });
    }

    // Send connection acknowledgment
    socket.emit('connection:ack', {
      success: true,
      userId,
      connectionId: socket.id,
      timestamp: new Date().toISOString(),
      features: {
        posts: true,
        stories: true,
        comments: true,
        likes: true,
        voiceCalls: process.env.ENABLE_VIDEO_CALLS === 'true',
        fileSharing: process.env.ENABLE_FILE_SHARING === 'true',
        screenSharing: process.env.ENABLE_SCREEN_SHARING === 'true',
        liveStreaming: process.env.ENABLE_LIVE_STREAMING === 'true'
      }
    });

    // Send current online users count
    const onlineCount = connectedUsers.size;
    socket.emit('users:online_count', { count: onlineCount });    // Notify other users about new connection (optional, for friends/contacts)
    socket.broadcast.emit('user:online', {
      userId,
      userInfo: {
        id: user.id,
        name: user.name,
        username: user.username,
        isVerified: user.isVerified
      },
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ User connection established: ${user.name || user.email} (${userId}) - Verified: ${user.isVerified}`);

    // Handle join room requests
    socket.on('room:join', async (data, callback) => {
      try {
        const { roomId, roomType } = data;
        
        if (!roomId || !roomType) {
          const error = { message: 'Room ID and type required' };
          socket.emit('error', error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }

        await joinRoom(socket, io, roomId, roomType, context);
        if (callback) callback({ success: true, roomId, roomType });
      } catch (error) {
        logger.error('Error joining room:', error);
        const errorMsg = 'Failed to join room';
        socket.emit('error', { 
          type: 'ROOM_JOIN_ERROR',
          message: errorMsg,
          details: error.message 
        });
        if (callback) callback({ success: false, error: errorMsg });
      }
    });

    // Handle leave room requests
    socket.on('room:leave', async (data, callback) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          const error = { message: 'Room ID required' };
          socket.emit('error', error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }

        await leaveRoom(socket, io, roomId, context);
        if (callback) callback({ success: true, roomId });
      } catch (error) {
        logger.error('Error leaving room:', error);
        const errorMsg = 'Failed to leave room';
        socket.emit('error', { 
          type: 'ROOM_LEAVE_ERROR',
          message: errorMsg,
          details: error.message 
        });
        if (callback) callback({ success: false, error: errorMsg });
      }
    });

    // Handle get room info requests
    socket.on('room:info', async (data, callback) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          const error = { message: 'Room ID required' };
          socket.emit('error', error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }

        const roomInfo = await getRoomInfo(roomId, context);
        socket.emit('room:info', roomInfo);
        if (callback) callback({ success: true, roomInfo });
      } catch (error) {
        logger.error('Error getting room info:', error);
        const errorMsg = 'Failed to get room info';
        socket.emit('error', { 
          type: 'ROOM_INFO_ERROR',
          message: errorMsg,
          details: error.message 
        });
        if (callback) callback({ success: false, error: errorMsg });
      }
    });

    // Handle get online users requests
    socket.on('users:get_online', (callback) => {
      try {
        const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
          userId: user.userId,
          userInfo: {
            id: user.userInfo.id,
            name: user.userInfo.name,
            image: user.userInfo.image
          },
          connectedAt: user.connectedAt
        }));

        socket.emit('users:online_list', { users: onlineUsers });
        if (callback) callback({ success: true, users: onlineUsers });
      } catch (error) {
        logger.error('Error getting online users:', error);
        const errorMsg = 'Failed to get online users';
        socket.emit('error', { 
          type: 'ONLINE_USERS_ERROR',
          message: errorMsg 
        });
        if (callback) callback({ success: false, error: errorMsg });
      }
    });

    // Handle Students Interlinked specific room joins
    socket.on('join-students-interlinked', async (data, callback) => {
      try {
        const { userId } = data;
        if (userId === user.id) {
          await socket.join('students-interlinked-main');
          await socket.join(`students-interlinked-user-${userId}`);
          logger.info(`User ${userId} joined Students Interlinked rooms`);
          
          // Emit confirmation
          const response = { 
            rooms: ['students-interlinked-main', `students-interlinked-user-${userId}`]
          };
          socket.emit('students-interlinked:joined', response);
          if (callback) callback({ success: true, ...response });
        } else {
          const error = { message: 'User ID mismatch' };
          socket.emit('error', error);
          if (callback) callback({ success: false, error: error.message });
        }
      } catch (error) {
        logger.error('Error joining Students Interlinked rooms:', error);
        const errorMsg = 'Failed to join Students Interlinked rooms';
        socket.emit('error', { 
          type: 'STUDENTS_INTERLINKED_JOIN_ERROR',
          message: errorMsg 
        });
        if (callback) callback({ success: false, error: errorMsg });
      }
    });

    socket.on('leave-students-interlinked', async (data, callback) => {
      try {
        const { userId } = data;
        if (userId === user.id) {
          await socket.leave('students-interlinked-main');
          await socket.leave(`students-interlinked-user-${userId}`);
          logger.info(`User ${userId} left Students Interlinked rooms`);
          if (callback) callback({ success: true });
        } else {
          const error = { message: 'User ID mismatch' };
          socket.emit('error', error);
          if (callback) callback({ success: false, error: error.message });
        }
      } catch (error) {
        logger.error('Error leaving Students Interlinked rooms:', error);
        const errorMsg = 'Failed to leave Students Interlinked rooms';
        socket.emit('error', { 
          type: 'STUDENTS_INTERLINKED_LEAVE_ERROR',
          message: errorMsg 
        });
        if (callback) callback({ success: false, error: errorMsg });
      }
    });

    socket.on('join-user-room', async (data) => {
      try {
        const { userId } = data;
        if (userId === user.id) {
          await socket.join(`user-room-${userId}`);
          logger.info(`User ${userId} joined personal room`);
        }
      } catch (error) {
        logger.error('Error joining user room:', error);
      }
    });

    socket.on('leave-user-room', async (data) => {
      try {
        const { userId } = data;
        if (userId === user.id) {
          await socket.leave(`user-room-${userId}`);
          logger.info(`User ${userId} left personal room`);
        }
      } catch (error) {
        logger.error('Error leaving user room:', error);
      }
    });

    // Handle typing indicators for Students Interlinked
    socket.on('students-interlinked:typing', async (data) => {
      try {
        const { postId, userId } = data;
        if (userId === user.id) {
          // Emit to others in the post room
          socket.to(`post-${postId}`).emit('students-interlinked:user-typing', {
            postId,
            userId,
            userName: user.name
          });
        }
      } catch (error) {
        logger.error('Error handling typing indicator:', error);
      }
    });

    socket.on('students-interlinked:stopped-typing', async (data) => {
      try {
        const { postId, userId } = data;
        if (userId === user.id) {
          // Emit to others in the post room
          socket.to(`post-${postId}`).emit('students-interlinked:user-stopped-typing', {
            postId,
            userId
          });
        }
      } catch (error) {
        logger.error('Error handling stopped typing:', error);
      }
    });

    // Handle heartbeat for presence
    socket.on('students-interlinked:heartbeat', async (data) => {
      try {
        const { userId } = data;
        if (userId === user.id) {
          // Update presence in Redis
          await redis.setex(`presence:${userId}`, 300, JSON.stringify({
            status: 'online',
            lastSeen: new Date().toISOString(),
            socketId: socket.id
          }));
          
          // Emit presence update
          io.to('students-interlinked-main').emit('students-interlinked:user-presence', {
            userId,
            status: 'online',
            lastSeen: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Error handling heartbeat:', error);
      }
    });

  } catch (error) {
    logger.error('Error in connection handler:', error);
    socket.emit('error', { message: 'Connection setup failed' });
  }
}

/**
 * Join a room
 */
async function joinRoom(socket, io, roomId, roomType, context) {
  const { connectedUsers, activeRooms, redis, kafkaProducer } = context;
  const userId = socket.userId;
  const userInfo = socket.userInfo;

  // Validate room access (can be extended with database checks)
  if (!isValidRoomType(roomType)) {
    throw new Error('Invalid room type');
  }

  // Join the Socket.IO room
  await socket.join(roomId);

  // Update user's room list
  const user = connectedUsers.get(userId);
  if (user) {
    user.rooms.add(roomId);
  }

  // Update room info
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, {
      id: roomId,
      type: roomType,
      users: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
  }

  const room = activeRooms.get(roomId);
  if (!room.users.find(u => u.userId === userId)) {
    room.users.push({
      userId,
      userInfo: {
        id: userInfo.id,
        name: userInfo.name,
        image: userInfo.image
      },
      joinedAt: new Date().toISOString()
    });
  }

  // Store room membership in Redis
  await redis.sadd(`room:${roomId}:members`, userId);
  await redis.setex(`user:${userId}:rooms`, 3600, JSON.stringify(Array.from(user?.rooms || [])));

  // Notify room about new member
  socket.to(roomId).emit('room:user_joined', {
    roomId,
    userId,
    userInfo: {
      id: userInfo.id,
      name: userInfo.name,
      image: userInfo.image
    },
    timestamp: new Date().toISOString()
  });

  // Send room info to user
  socket.emit('room:joined', {
    roomId,
    roomType,
    users: room.users,
    timestamp: new Date().toISOString()
  });

  // Publish to Kafka
  if (kafkaProducer) {
    await eventPublishers.chatEvent(kafkaProducer, 'user_joined_room', roomId, userId, {
      roomType,
      userInfo: {
        id: userInfo.id,
        name: userInfo.name
      }
    });
  }

  logger.info(`👥 User ${userInfo.name} joined room ${roomId} (${roomType})`);
}

/**
 * Leave a room
 */
async function leaveRoom(socket, io, roomId, context) {
  const { connectedUsers, activeRooms, redis, kafkaProducer } = context;
  const userId = socket.userId;
  const userInfo = socket.userInfo;

  // Leave the Socket.IO room
  await socket.leave(roomId);

  // Update user's room list
  const user = connectedUsers.get(userId);
  if (user) {
    user.rooms.delete(roomId);
  }

  // Update room info
  const room = activeRooms.get(roomId);
  if (room) {
    room.users = room.users.filter(u => u.userId !== userId);
    
    // Remove room if empty
    if (room.users.length === 0) {
      activeRooms.delete(roomId);
      await redis.del(`room:${roomId}:members`);
    }
  }

  // Remove from Redis
  await redis.srem(`room:${roomId}:members`, userId);
  await redis.setex(`user:${userId}:rooms`, 3600, JSON.stringify(Array.from(user?.rooms || [])));

  // Notify room about member leaving
  socket.to(roomId).emit('room:user_left', {
    roomId,
    userId,
    userInfo: {
      id: userInfo.id,
      name: userInfo.name,
      image: userInfo.image
    },
    timestamp: new Date().toISOString()
  });

  // Confirm to user
  socket.emit('room:left', {
    roomId,
    timestamp: new Date().toISOString()
  });

  // Publish to Kafka
  if (kafkaProducer) {
    await eventPublishers.chatEvent(kafkaProducer, 'user_left_room', roomId, userId, {
      userInfo: {
        id: userInfo.id,
        name: userInfo.name
      }
    });
  }

  logger.info(`👋 User ${userInfo.name} left room ${roomId}`);
}

/**
 * Get room information
 */
async function getRoomInfo(roomId, context) {
  const { activeRooms, redis } = context;

  const room = activeRooms.get(roomId);
  if (!room) {
    // Try to get from Redis
    const members = await redis.smembers(`room:${roomId}:members`);
    return {
      roomId,
      exists: false,
      memberCount: members.length
    };
  }

  return {
    roomId: room.id,
    type: room.type,
    users: room.users.map(u => ({
      userId: u.userId,
      userInfo: u.userInfo,
      joinedAt: u.joinedAt
    })),
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
    memberCount: room.users.length
  };
}

/**
 * Validate room type
 */
function isValidRoomType(roomType) {
  const validTypes = ['chat', 'study-group', 'course', 'voice-call', 'general', 'post', 'story'];
  return validTypes.includes(roomType);
}

module.exports = {
  handleConnection,
  joinRoom,
  leaveRoom,
  getRoomInfo
};
