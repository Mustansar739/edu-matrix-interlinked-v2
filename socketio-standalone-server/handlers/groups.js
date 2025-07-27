// ==========================================
// FACEBOOK-STYLE GROUPS HANDLER - REAL-TIME EVENTS
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
 * Handle Facebook-Style Group Events with Real-time Updates
 */
function handleGroupEvents(socket, io, { connectedUsers, redis }) {
  const userId = socket.userId;

  // Join user-specific group notification room
  socket.join(`group-notifications:${userId}`);
  logger.info(`🏘️ User ${userId} joined group notifications room`);

  // ==========================================
  // GROUP CREATION EVENTS
  // ==========================================

  /**
   * Handle group creation - notify relevant users about new groups
   */
  socket.on('group:created', async (data) => {
    try {
      logger.info(`🏘️ Group created by user ${userId}:`, {
        groupId: data.groupId,
        groupName: data.groupName,
        groupType: data.groupType
      });

      // Store group creation in Redis for caching
      await redis.setex(`group:${data.groupId}:info`, 3600, JSON.stringify({
        id: data.groupId,
        name: data.groupName,
        type: data.groupType,
        createdBy: data.creatorId,
        createdAt: data.timestamp,
        memberCount: data.metadata?.memberCount || 1
      }));

      // Join creator to group room
      socket.join(`group:${data.groupId}`);

      // If public group, notify all connected users
      if (data.groupType === 'PUBLIC') {
        io.emit('group:new_public_group', {
          groupId: data.groupId,
          groupName: data.groupName,
          creatorId: data.creatorId,
          category: data.metadata?.category,
          memberCount: data.metadata?.memberCount || 1,
          timestamp: data.timestamp
        });

        logger.info(`📢 Broadcasted new public group ${data.groupName} to all users`);
      }

    } catch (error) {
      logger.error('Error handling group:created event:', error);
      socket.emit('group:error', {
        message: 'Failed to process group creation',
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==========================================
  // GROUP INVITATION EVENTS
  // ==========================================

  /**
   * Handle invitation sending - notify recipients
   */
  socket.on('invitation:sent', async (data) => {
    try {
      logger.info(`📨 Invitation sent by user ${userId}:`, {
        groupId: data.groupId,
        recipientId: data.recipientId,
        groupName: data.groupName
      });

      // Check if recipient is online
      const recipientSocketId = connectedUsers.get(data.recipientId);
      
      if (recipientSocketId) {
        // Send real-time invitation to recipient
        io.to(`group-notifications:${data.recipientId}`).emit('invitation:received', {
          id: data.invitationId,
          message: data.message,
          createdAt: data.timestamp,
          group: {
            id: data.groupId,
            name: data.groupName,
            privacy: 'PUBLIC', // Would be fetched from database in real implementation
            memberCount: 1 // Would be fetched from database
          },
          inviter: {
            id: data.inviterId,
            name: data.inviterName
          }
        });

        logger.info(`✅ Real-time invitation delivered to user ${data.recipientId}`);
      } else {
        // Store invitation for offline user in Redis
        await redis.lpush(`pending_invitations:${data.recipientId}`, JSON.stringify({
          type: 'group_invitation',
          data: data,
          timestamp: data.timestamp
        }));

        logger.info(`📦 Stored invitation for offline user ${data.recipientId}`);
      }

    } catch (error) {
      logger.error('Error handling invitation:sent event:', error);
      socket.emit('invitation:error', {
        message: 'Failed to send invitation',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Handle invitation responses - notify group members
   */
  socket.on('invitation:respond', async (data) => {
    try {
      logger.info(`📋 Invitation response from user ${userId}:`, {
        invitationId: data.invitationId,
        action: data.action,
        groupId: data.groupId
      });

      // If accepted, add user to group room
      if (data.action === 'accept') {
        socket.join(`group:${data.groupId}`);
        
        // Notify group members about new member
        socket.to(`group:${data.groupId}`).emit('group:member_joined', {
          groupId: data.groupId,
          groupName: data.groupName,
          newMemberId: userId,
          newMemberName: 'New Member', // Would be fetched from database
          memberCount: data.memberCount,
          timestamp: data.timestamp
        });

        logger.info(`🎉 User ${userId} joined group ${data.groupId}`);
      }

      // Notify the invitation sender (if online)
      io.to(`group-notifications:${data.inviterId || 'unknown'}`).emit('invitation:responded', {
        invitationId: data.invitationId,
        userId: userId,
        action: data.action,
        groupId: data.groupId,
        groupName: data.groupName,
        timestamp: data.timestamp
      });

    } catch (error) {
      logger.error('Error handling invitation:respond event:', error);
      socket.emit('invitation:error', {
        message: 'Failed to process invitation response',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Handle bulk invitations sent to multiple users
   */
  socket.on('group:invitations_sent', async (data) => {
    try {
      logger.info(`📬 Bulk invitations sent by user ${userId}:`, {
        groupId: data.groupId,
        recipientCount: data.recipientCount
      });

      // Notify group members about invitations being sent
      socket.to(`group:${data.groupId}`).emit('group:activity', {
        type: 'INVITATIONS_SENT',
        groupId: data.groupId,
        message: `${data.inviterName} sent ${data.recipientCount} invitation(s)`,
        timestamp: data.timestamp
      });

    } catch (error) {
      logger.error('Error handling group:invitations_sent event:', error);
    }
  });

  // ==========================================
  // GROUP MEMBERSHIP EVENTS
  // ==========================================

  /**
   * Handle member joining group
   */
  socket.on('group:member_joined', async (data) => {
    try {
      logger.info(`👥 Member joined group:`, {
        groupId: data.groupId,
        memberId: data.newMemberId,
        memberCount: data.memberCount
      });

      // Add to group room
      socket.join(`group:${data.groupId}`);

      // Update group member count in Redis
      await redis.hset(`group:${data.groupId}:stats`, 'memberCount', data.memberCount);

      // Notify all group members
      socket.to(`group:${data.groupId}`).emit('group:member_update', {
        type: 'MEMBER_JOINED',
        groupId: data.groupId,
        groupName: data.groupName,
        memberId: data.newMemberId,
        memberCount: data.memberCount,
        timestamp: data.timestamp
      });

    } catch (error) {
      logger.error('Error handling group:member_joined event:', error);
    }
  });

  // ==========================================
  // GROUP ROOM MANAGEMENT
  // ==========================================

  /**
   * Handle user joining group room for real-time updates
   */
  socket.on('group:join', async (data) => {
    try {
      const { groupId } = data;
      
      if (!groupId) {
        logger.warn(`Group join attempt without groupId by user ${userId}`);
        return;
      }

      // Join the group room
      socket.join(`group:${groupId}`);
      
      logger.info(`👥 User ${userId} joined group room: group:${groupId}`);

      // Optional: Verify user has permission to join this group
      // In production, you might want to verify membership here
      
      socket.emit('group:joined', {
        groupId,
        message: 'Successfully joined group for real-time updates',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling group:join event:', error);
      socket.emit('group:error', {
        message: 'Failed to join group room',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Handle user leaving group room
   */
  socket.on('group:leave', async (data) => {
    try {
      const { groupId } = data;
      
      if (!groupId) {
        logger.warn(`Group leave attempt without groupId by user ${userId}`);
        return;
      }

      // Leave the group room
      socket.leave(`group:${groupId}`);
      
      logger.info(`👋 User ${userId} left group room: group:${groupId}`);
      
      socket.emit('group:left', {
        groupId,
        message: 'Successfully left group room',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling group:leave event:', error);
    }
  });

  // ==========================================
  // GROUP POSTS EVENTS
  // ==========================================

  /**
   * Handle new group post creation - notify all group members
   */
  socket.on('group:new_post', async (data) => {
    try {
      logger.info(`📝 New post created in group by user ${userId}:`, {
        groupId: data.groupId,
        postId: data.postId,
        authorName: data.authorName
      });

      // Store post info in Redis for caching
      await redis.setex(`post:${data.postId}:info`, 1800, JSON.stringify({
        id: data.postId,
        groupId: data.groupId,
        authorId: data.authorId,
        authorName: data.authorName,
        contentPreview: data.metadata?.contentPreview,
        createdAt: data.timestamp,
        hasMedia: data.hasMedia
      }));

      // Broadcast to all group members (except the author)
      socket.to(`group:${data.groupId}`).emit('group:post_created', {
        postId: data.postId,
        groupId: data.groupId,
        authorId: data.authorId,
        authorName: data.authorName,
        contentPreview: data.postContent,
        postType: data.postType,
        hasMedia: data.hasMedia,
        timestamp: data.timestamp,
        metadata: data.metadata
      });

      // Send individual notifications to group members
      const groupMemberNotification = {
        type: 'GROUP_POST',
        title: `New post in your group`,
        message: `${data.authorName} posted in the group: ${data.postContent}`,
        groupId: data.groupId,
        postId: data.postId,
        authorId: data.authorId,
        timestamp: data.timestamp,
        actionUrl: `/students-interlinked/groups/${data.groupId}/posts/${data.postId}`
      };

      // Notify each group member individually for notification systems
      socket.to(`group:${data.groupId}`).emit('notification:new', groupMemberNotification);

      logger.info(`✅ Group post notification broadcasted to group ${data.groupId} members`);

    } catch (error) {
      logger.error('Error handling group:new_post event:', error);
      socket.emit('group:error', {
        message: 'Failed to process group post notification',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Handle group post reactions (likes, comments) - notify relevant users
   */
  socket.on('group:post_reaction', async (data) => {
    try {
      logger.info(`👍 Post reaction in group by user ${userId}:`, {
        groupId: data.groupId,
        postId: data.postId,
        reactionType: data.reactionType
      });

      // Notify the post author about the reaction (if not self-reaction)
      if (data.postAuthorId && data.postAuthorId !== userId) {
        io.to(`group-notifications:${data.postAuthorId}`).emit('notification:new', {
          type: 'POST_REACTION',
          title: `Someone ${data.reactionType} your post`,
          message: `${data.reactorName} ${data.reactionType} your post in the group`,
          groupId: data.groupId,
          postId: data.postId,
          reactorId: userId,
          timestamp: new Date().toISOString()
        });
      }

      // Broadcast reaction to all group members for live updates
      socket.to(`group:${data.groupId}`).emit('group:post_updated', {
        postId: data.postId,
        updateType: 'REACTION',
        reactionType: data.reactionType,
        reactorId: userId,
        reactorName: data.reactorName,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling group:post_reaction event:', error);
    }
  });

  /**
   * Handle group post comments - notify post author and group members
   */
  socket.on('group:post_comment', async (data) => {
    try {
      logger.info(`💬 New comment on group post by user ${userId}:`, {
        groupId: data.groupId,
        postId: data.postId,
        commentId: data.commentId
      });

      // Notify the post author about the comment (if not self-comment)
      if (data.postAuthorId && data.postAuthorId !== userId) {
        io.to(`group-notifications:${data.postAuthorId}`).emit('notification:new', {
          type: 'POST_COMMENT',
          title: `New comment on your post`,
          message: `${data.commenterName} commented: ${data.commentContent.substring(0, 100)}...`,
          groupId: data.groupId,
          postId: data.postId,
          commentId: data.commentId,
          commenterId: userId,
          timestamp: new Date().toISOString()
        });
      }

      // Broadcast comment to all group members for live updates
      socket.to(`group:${data.groupId}`).emit('group:post_updated', {
        postId: data.postId,
        updateType: 'COMMENT',
        commentId: data.commentId,
        commenterId: userId,
        commenterName: data.commenterName,
        commentContent: data.commentContent,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling group:post_comment event:', error);
    }
  });

  // ==========================================
  // GROUP ACTIVITY EVENTS
  // ==========================================

  /**
   * Handle general group activities (posts, discussions, etc.)
   */
  socket.on('group:activity', async (data) => {
    try {
      logger.info(`📊 Group activity:`, {
        groupId: data.groupId,
        activityType: data.type,
        userId: userId
      });

      // Broadcast activity to group members
      socket.to(`group:${data.groupId}`).emit('group:live_activity', {
        type: data.type,
        groupId: data.groupId,
        userId: userId,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error handling group:activity event:', error);
    }
  });

  // ==========================================
  // USER DISCONNECTION CLEANUP
  // ==========================================

  socket.on('disconnect', () => {
    logger.info(`🔌 User ${userId} disconnected from group events`);
    // Socket.IO automatically handles room cleanup
  });
}

module.exports = { handleGroupEvents };
