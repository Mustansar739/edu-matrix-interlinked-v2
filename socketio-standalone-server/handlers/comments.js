// ==========================================
// COMMENTS HANDLER - Post/Story Comments
// ==========================================
// Production-ready comments system with Facebook-style features
// Features: Nested comments, reactions, mentions, real-time updates

const { logger } = require('../utils/logger');
const { eventPublishers } = require('../utils/kafka');

/**
 * Rate limiting utility for comment actions
 * @param {Object} socket - Socket instance
 * @param {string} action - Action type
 * @param {Object} limits - Rate limit configuration
 * @returns {Promise<boolean>} - Whether action is allowed
 */
async function checkActionRateLimit(socket, action, limits) {
  try {
    const rateLimiter = socket.rateLimiter;
    if (!rateLimiter) return true; // Skip if no rate limiter configured
    
    const key = `${socket.userId}:${action}`;
    const result = await rateLimiter.consume(key, limits.points || 1);
    return result.remainingPoints >= 0;
  } catch (error) {
    logger.warn(`Rate limit exceeded for ${socket.userId}:${action}`);
    socket.emit('error', { 
      type: 'RATE_LIMIT_EXCEEDED',
      message: `Too many ${action} requests. Please slow down.`,
      retryAfter: error.msBeforeNext || 60000
    });
    return false;
  }
}

/**
 * Handle Comments Events - Enhanced Facebook-style
 * - Add comment with nested replies
 * - Edit comment
 * - Delete comment  
 * - React to comments
 * - Tag users in comments
 * - Load comment threads
 */
function handleCommentEvents(socket, io, context) {
  const { connectedUsers, activeRooms, redis, kafkaProducer } = context;

  // Add comment to post/story with enhanced features
  socket.on('comment:add', async (data) => {
    try {
      // Rate limiting
      if (!await checkActionRateLimit(socket, 'comment_add', { points: 40, duration: 60 })) {
        return;
      }

      const { 
        targetId, 
        targetType, // 'post', 'story'
        content, 
        parentCommentId = null, // For nested replies
        mentions = [],
        attachments = []
      } = data;

      if (!targetId || !targetType || !content) {
        socket.emit('error', { message: 'Target ID, type, and content required' });
        return;
      }

      const commentId = `comment_${Date.now()}_${socket.userId}`;
      const comment = {
        id: commentId,
        targetId,
        targetType,
        content,
        parentCommentId,
        mentions,
        attachments,
        author: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        createdAt: new Date().toISOString(),
        edited: false,
        editedAt: null,
        reactions: {}, // Facebook-style reactions
        repliesCount: 0,
        reported: false,
        pinned: false
      };

      // Store comment in Redis
      await redis.setex(`comment:${commentId}`, 3600 * 24 * 30, JSON.stringify(comment)); // 30 days

      // Add to target's comments list
      await redis.lpush(`${targetType}:${targetId}:comments`, commentId);
      await redis.ltrim(`${targetType}:${targetId}:comments`, 0, 499); // Keep last 500 comments

      // If it's a reply, update parent comment
      if (parentCommentId) {
        const parentCommentData = await redis.get(`comment:${parentCommentId}`);
        if (parentCommentData) {
          const parentComment = JSON.parse(parentCommentData);
          parentComment.repliesCount += 1;
          await redis.setex(`comment:${parentCommentId}`, 3600 * 24 * 30, JSON.stringify(parentComment));
          
          // Add to parent's replies list
          await redis.lpush(`comment:${parentCommentId}:replies`, commentId);
          await redis.ltrim(`comment:${parentCommentId}:replies`, 0, 99); // Keep last 100 replies
        }
      }

      // Update target content comment count
      const targetData = await redis.get(`${targetType}:${targetId}`);
      if (targetData) {
        const target = JSON.parse(targetData);
        if (target.stats) {
          target.stats.comments = (target.stats.comments || 0) + 1;
          await redis.setex(`${targetType}:${targetId}`, 3600 * 24 * 30, JSON.stringify(target));
        }
      }

      // Join comment room for real-time updates
      await socket.join(`comment:${commentId}`);

      // Broadcast to target content room using consistent naming
      const roomName = `post:${targetId}:comments`;
      io.to(roomName).emit('comment:created', {
        postId: targetId,
        comment,
        isReply: !!parentCommentId,
        parentCommentId
      });

      // Handle mentions
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          io.to(`user:${mentionedUserId}`).emit('comment:mentioned', {
            commentId,
            comment,
            mentionedBy: {
              id: socket.userInfo.id,
              name: socket.userInfo.name,
              image: socket.userInfo.image
            },
            targetId,
            targetType
          });
        }
      }

      // Notify target content author (if not self-comment)
      if (targetData) {
        const target = JSON.parse(targetData);
        if (target.author && target.author.id !== socket.userInfo.id) {
          io.to(`user:${target.author.id}`).emit('notification:new', {
            type: 'comment',
            commentId,
            targetId,
            targetType,
            from: {
              id: socket.userInfo.id,
              name: socket.userInfo.name,
              image: socket.userInfo.image
            },
            content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString()
          });
        }
      }

      // Send confirmation
      socket.emit('comment:added', {
        commentId,
        comment,
        timestamp: new Date().toISOString()
      });

      // Publish to Kafka
      if (kafkaProducer) {
        await eventPublishers.commentEvent(kafkaProducer, 'comment_added', commentId, targetId, socket.userId, {
          comment,
          targetType,
          isReply: !!parentCommentId,
          mentions
        });
      }

      logger.info(`💬 Comment added: ${commentId} on ${targetType}:${targetId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error adding comment:', error);
      socket.emit('error', { 
        type: 'COMMENT_ADD_ERROR',
        message: 'Failed to add comment',
        details: error.message 
      });
    }
  });

  // React to comment (Facebook-style)
  socket.on('comment:react', async (data) => {
    try {
      const { commentId, reactionType, remove = false } = data;
      // reactionType: 'like', 'love', 'haha', 'wow', 'sad', 'angry'

      if (!commentId || !reactionType) {
        socket.emit('error', { message: 'Comment ID and reaction type required' });
        return;
      }

      // Get existing comment
      const commentData = await redis.get(`comment:${commentId}`);
      if (!commentData) {
        socket.emit('error', { message: 'Comment not found' });
        return;
      }

      const comment = JSON.parse(commentData);

      // Initialize reactions if not exists
      if (!comment.reactions) {
        comment.reactions = {};
      }

      // Remove existing reaction from user if any
      Object.keys(comment.reactions).forEach(type => {
        if (comment.reactions[type] && comment.reactions[type].includes(socket.userId)) {
          comment.reactions[type] = comment.reactions[type].filter(id => id !== socket.userId);
          if (comment.reactions[type].length === 0) {
            delete comment.reactions[type];
          }
        }
      });

      // Add new reaction if not removing
      if (!remove) {
        if (!comment.reactions[reactionType]) {
          comment.reactions[reactionType] = [];
        }
        comment.reactions[reactionType].push(socket.userId);
      }

      // Save updated comment
      await redis.setex(`comment:${commentId}`, 3600 * 24 * 30, JSON.stringify(comment));

      // Broadcast reaction update
      io.to(`comment:${commentId}`).emit('comment:reaction_updated', {
        commentId,
        reactions: comment.reactions,
        reactedBy: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        reactionType: remove ? null : reactionType,
        timestamp: new Date().toISOString()
      });

      // Notify comment author if not self-reaction
      if (comment.author.id !== socket.userInfo.id && !remove) {
        io.to(`user:${comment.author.id}`).emit('notification:new', {
          type: 'comment_reaction',
          commentId,
          reactionType,
          from: {
            id: socket.userInfo.id,
            name: socket.userInfo.name,
            image: socket.userInfo.image
          },
          timestamp: new Date().toISOString()
        });
      }

      // Send confirmation
      socket.emit('comment:reaction_success', {
        commentId,
        reactionType: remove ? null : reactionType,
        reactions: comment.reactions,
        timestamp: new Date().toISOString()
      });

      logger.info(`${remove ? '🚫' : '👍'} Comment reaction ${remove ? 'removed' : 'added'}: ${commentId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error reacting to comment:', error);
      socket.emit('error', { 
        type: 'COMMENT_REACT_ERROR',
        message: 'Failed to react to comment',
        details: error.message 
      });
    }
  });

  // Load comment replies (threaded comments)
  socket.on('comment:load_replies', async (data) => {
    try {
      const { commentId, limit = 10, offset = 0 } = data;

      if (!commentId) {
        socket.emit('error', { message: 'Comment ID required' });
        return;
      }

      // Get reply IDs
      const replyIds = await redis.lrange(`comment:${commentId}:replies`, offset, offset + limit - 1);
      const replies = [];

      // Get reply details
      for (const replyId of replyIds) {
        const replyData = await redis.get(`comment:${replyId}`);
        if (replyData) {
          replies.push(JSON.parse(replyData));
        }
      }

      socket.emit('comment:replies_loaded', {
        parentCommentId: commentId,
        replies,
        hasMore: replyIds.length === limit,
        totalCount: await redis.llen(`comment:${commentId}:replies`)
      });

      logger.info(`📝 Comment replies loaded: ${commentId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error loading comment replies:', error);
      socket.emit('error', { 
        type: 'COMMENT_REPLIES_ERROR',
        message: 'Failed to load replies',
        details: error.message 
      });
    }
  });

  // Edit comment with complete implementation
  socket.on('comment:edit', async (data, callback) => {
    try {
      if (!await checkActionRateLimit(socket, 'comment_edit', { points: 20, duration: 60 })) {
        return;
      }

      const { commentId, content } = data;

      if (!commentId || !content) {
        const error = { message: 'Comment ID and content required' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get existing comment
      const commentData = await redis.get(`comment:${commentId}`);
      if (!commentData) {
        const error = { message: 'Comment not found' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const comment = JSON.parse(commentData);

      // Check if user owns the comment
      if (comment.author.id !== socket.userInfo.id) {
        const error = { message: 'Unauthorized to edit this comment' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Update comment
      comment.content = content;
      comment.edited = true;
      comment.editedAt = new Date().toISOString();

      // Save updated comment
      await redis.setex(`comment:${commentId}`, 3600 * 24 * 30, JSON.stringify(comment));

      // Broadcast update to target content room with consistent naming
      const roomName = `post:${comment.targetId}:comments`;
      io.to(roomName).emit('comment:updated', {
        postId: comment.targetId,
        commentId,
        comment,
        editedBy: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        timestamp: new Date().toISOString()
      });

      // Publish to Kafka
      if (kafkaProducer && eventPublishers.commentEvent) {
        await eventPublishers.commentEvent(kafkaProducer, 'comment_edited', commentId, socket.userId, {
          comment,
          editedContent: content
        });
      }

      logger.info(`✏️ Comment edited: ${commentId} by ${socket.userInfo.name}`);
      if (callback) callback({ success: true, comment });

    } catch (error) {
      logger.error('Error editing comment:', error);
      const errorMsg = 'Failed to edit comment';
      socket.emit('error', { 
        type: 'COMMENT_EDIT_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Delete comment with complete implementation
  socket.on('comment:delete', async (data, callback) => {
    try {
      if (!await checkActionRateLimit(socket, 'comment_delete', { points: 10, duration: 60 })) {
        return;
      }

      const { commentId } = data;

      if (!commentId) {
        const error = { message: 'Comment ID required' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get existing comment
      const commentData = await redis.get(`comment:${commentId}`);
      if (!commentData) {
        const error = { message: 'Comment not found' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const comment = JSON.parse(commentData);

      // Check if user owns the comment (or has admin rights)
      if (comment.author.id !== socket.userInfo.id) {
        const error = { message: 'Unauthorized to delete this comment' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Remove comment from Redis
      await redis.del(`comment:${commentId}`);

      // Remove from target's comments list
      await redis.lrem(`${comment.targetType}:${comment.targetId}:comments`, 0, commentId);

      // If it's a reply, update parent comment
      if (comment.parentCommentId) {
        const parentCommentData = await redis.get(`comment:${comment.parentCommentId}`);
        if (parentCommentData) {
          const parentComment = JSON.parse(parentCommentData);
          parentComment.repliesCount = Math.max(0, (parentComment.repliesCount || 1) - 1);
          await redis.setex(`comment:${comment.parentCommentId}`, 3600 * 24 * 30, JSON.stringify(parentComment));
          
          // Remove from parent's replies list
          await redis.lrem(`comment:${comment.parentCommentId}:replies`, 0, commentId);
        }
      }

      // Update target content comment count
      const targetData = await redis.get(`${comment.targetType}:${comment.targetId}`);
      if (targetData) {
        const target = JSON.parse(targetData);
        if (target.stats) {
          target.stats.comments = Math.max(0, (target.stats.comments || 1) - 1);
          await redis.setex(`${comment.targetType}:${comment.targetId}`, 3600 * 24 * 30, JSON.stringify(target));
        }
      }

      // Broadcast deletion to target content room with consistent naming
      const roomName = `post:${comment.targetId}:comments`;
      io.to(roomName).emit('comment:deleted', {
        postId: comment.targetId,
        commentId,
        deletedBy: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        timestamp: new Date().toISOString()
      });

      // Publish to Kafka
      if (kafkaProducer && eventPublishers.commentEvent) {
        await eventPublishers.commentEvent(kafkaProducer, 'comment_deleted', commentId, socket.userId, {
          comment,
          targetId: comment.targetId,
          targetType: comment.targetType
        });
      }

      logger.info(`🗑️ Comment deleted: ${commentId} by ${socket.userInfo.name}`);
      if (callback) callback({ success: true });

    } catch (error) {
      logger.error('Error deleting comment:', error);
      const errorMsg = 'Failed to delete comment';
      socket.emit('error', { 
        type: 'COMMENT_DELETE_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Like/Unlike comment with complete implementation
  socket.on('comment:like', async (data, callback) => {
    try {
      if (!await checkActionRateLimit(socket, 'comment_like', { points: 60, duration: 60 })) {
        return;
      }

      const { commentId, liked } = data;

      if (!commentId || typeof liked !== 'boolean') {
        const error = { message: 'Comment ID and liked status required' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get existing comment
      const commentData = await redis.get(`comment:${commentId}`);
      if (!commentData) {
        const error = { message: 'Comment not found' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const comment = JSON.parse(commentData);

      // Initialize likes array if not exists
      if (!comment.likes) {
        comment.likes = [];
      }

      // Update likes
      const userLikeIndex = comment.likes.indexOf(socket.userId);
      if (liked && userLikeIndex === -1) {
        comment.likes.push(socket.userId);
      } else if (!liked && userLikeIndex !== -1) {
        comment.likes.splice(userLikeIndex, 1);
      }

      // Save updated comment
      await redis.setex(`comment:${commentId}`, 3600 * 24 * 30, JSON.stringify(comment));

      // Broadcast like update to target content room with consistent naming
      const roomName = `post:${comment.targetId}:comments`;
      io.to(roomName).emit('comment:liked', {
        postId: comment.targetId,
        commentId,
        isLiked: liked,
        likeCount: comment.likes.length,
        likedBy: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        timestamp: new Date().toISOString()
      });

      // Notify comment author if not self-like
      if (comment.author.id !== socket.userInfo.id && liked) {
        io.to(`user:${comment.author.id}`).emit('notification:new', {
          type: 'comment_like',
          commentId,
          from: {
            id: socket.userInfo.id,
            name: socket.userInfo.name,
            image: socket.userInfo.image
          },
          timestamp: new Date().toISOString()
        });
      }

      // Publish to Kafka
      if (kafkaProducer && eventPublishers.commentEvent) {
        await eventPublishers.commentEvent(kafkaProducer, liked ? 'comment_liked' : 'comment_unliked', commentId, socket.userId, {
          comment,
          likesCount: comment.likes.length
        });
      }

      logger.info(`${liked ? '👍' : '👎'} Comment ${liked ? 'liked' : 'unliked'}: ${commentId} by ${socket.userInfo.name}`);
      if (callback) callback({ success: true, liked, likesCount: comment.likes.length });

    } catch (error) {
      logger.error('Error updating comment like:', error);
      const errorMsg = 'Failed to update comment like';
      socket.emit('error', { 
        type: 'COMMENT_LIKE_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Report comment with complete implementation
  socket.on('comment:report', async (data, callback) => {
    try {
      if (!await checkActionRateLimit(socket, 'comment_report', { points: 5, duration: 60 })) {
        return;
      }

      const { commentId, reason, description = '' } = data;

      if (!commentId || !reason) {
        const error = { message: 'Comment ID and reason required' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Validate reason
      const validReasons = ['spam', 'harassment', 'inappropriate', 'fake_news', 'hate_speech', 'violence', 'other'];
      if (!validReasons.includes(reason)) {
        const error = { message: 'Invalid report reason' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Check if comment exists
      const commentData = await redis.get(`comment:${commentId}`);
      if (!commentData) {
        const error = { message: 'Comment not found' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Check if user already reported this comment
      const existingReport = await redis.get(`report:${socket.userId}:comment:${commentId}`);
      if (existingReport) {
        const error = { message: 'You have already reported this comment' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const reportId = `report_${Date.now()}_${socket.userId}`;
      const report = {
        id: reportId,
        type: 'comment',
        commentId,
        reportedBy: socket.userId,
        reporterInfo: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        reason,
        description,
        reportedAt: new Date().toISOString(),
        status: 'pending',
        reviewed: false
      };

      // Store report
      await redis.setex(`report:${reportId}`, 3600 * 24 * 30, JSON.stringify(report)); // 30 days
      await redis.setex(`report:${socket.userId}:comment:${commentId}`, 3600 * 24 * 7, 'reported'); // 7 days

      // Add to reports list
      await redis.lpush('reports:pending', reportId);
      await redis.ltrim('reports:pending', 0, 999); // Keep last 1000 reports

      // Update comment with report flag
      const comment = JSON.parse(commentData);
      comment.reported = true;
      comment.reportCount = (comment.reportCount || 0) + 1;
      await redis.setex(`comment:${commentId}`, 3600 * 24 * 30, JSON.stringify(comment));

      // Publish to Kafka for moderation queue
      if (kafkaProducer && eventPublishers.commentEvent) {
        await eventPublishers.commentEvent(kafkaProducer, 'comment_reported', commentId, socket.userId, {
          report,
          comment
        });
      }

      // Notify moderation team (if configured)
      io.to('moderation-team').emit('moderation:new_report', {
        reportId,
        type: 'comment',
        commentId,
        reason,
        reportedBy: socket.userInfo.name,
        timestamp: new Date().toISOString()
      });

      logger.info(`🚨 Comment reported: ${commentId} by ${socket.userInfo.name} for ${reason}`);
      if (callback) callback({ success: true, reportId, message: 'Report submitted successfully' });

    } catch (error) {
      logger.error('Error reporting comment:', error);
      const errorMsg = 'Failed to report comment';
      socket.emit('error', { 
        type: 'COMMENT_REPORT_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Get comments for target with complete implementation
  socket.on('comment:get', async (data, callback) => {
    try {
      const { targetId, targetType, limit = 20, offset = 0, sortBy = 'newest' } = data;

      if (!targetId || !targetType) {
        const error = { message: 'Target ID and type required' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Validate target type
      const validTargetTypes = ['post', 'story'];
      if (!validTargetTypes.includes(targetType)) {
        const error = { message: 'Invalid target type' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get comment IDs from Redis
      const commentIds = await redis.lrange(`${targetType}:${targetId}:comments`, offset, offset + limit - 1);
      const comments = [];

      // Get comment details
      for (const commentId of commentIds) {
        const commentData = await redis.get(`comment:${commentId}`);
        if (commentData) {
          const comment = JSON.parse(commentData);
          
          // Add user-specific data
          comment.isLiked = comment.likes && comment.likes.includes(socket.userId);
          comment.likesCount = comment.likes ? comment.likes.length : 0;
          comment.canEdit = comment.author.id === socket.userInfo.id;
          comment.canDelete = comment.author.id === socket.userInfo.id;
          
          // Get recent replies count
          const repliesCount = await redis.llen(`comment:${commentId}:replies`);
          comment.repliesCount = repliesCount;
          
          comments.push(comment);
        }
      }

      // Sort comments based on sortBy parameter
      if (sortBy === 'newest') {
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (sortBy === 'oldest') {
        comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else if (sortBy === 'most_liked') {
        comments.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
      }

      // Get total count
      const totalCount = await redis.llen(`${targetType}:${targetId}:comments`);
      const hasMore = offset + limit < totalCount;

      // Join target content room for real-time updates with consistent naming
      const roomName = `post:${targetId}:comments`;
      await socket.join(roomName);

      const response = {
        success: true,
        comments,
        totalCount,
        hasMore,
        offset,
        limit
      };

      socket.emit('comment:list', response);
      if (callback) callback(response);

      logger.info(`📝 Comments fetched: ${comments.length} for ${targetType}:${targetId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error getting comments:', error);
      const errorMsg = 'Failed to get comments';
      socket.emit('error', { 
        type: 'COMMENT_GET_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });

  // Additional utility: Pin/Unpin comment (for content creators)
  socket.on('comment:pin', async (data, callback) => {
    try {
      if (!await checkActionRateLimit(socket, 'comment_pin', { points: 10, duration: 60 })) {
        return;
      }

      const { commentId, pinned } = data;

      if (!commentId || typeof pinned !== 'boolean') {
        const error = { message: 'Comment ID and pinned status required' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Get comment
      const commentData = await redis.get(`comment:${commentId}`);
      if (!commentData) {
        const error = { message: 'Comment not found' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const comment = JSON.parse(commentData);

      // Check if user is the content author (can pin comments)
      const targetData = await redis.get(`${comment.targetType}:${comment.targetId}`);
      if (!targetData) {
        const error = { message: 'Target content not found' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      const target = JSON.parse(targetData);
      if (target.author.id !== socket.userInfo.id) {
        const error = { message: 'Only content author can pin comments' };
        socket.emit('error', error);
        if (callback) callback({ success: false, error: error.message });
        return;
      }

      // Update comment pin status
      comment.pinned = pinned;
      comment.pinnedAt = pinned ? new Date().toISOString() : null;
      comment.pinnedBy = pinned ? socket.userInfo.id : null;

      // Save updated comment
      await redis.setex(`comment:${commentId}`, 3600 * 24 * 30, JSON.stringify(comment));

      // Broadcast pin update
      io.to(`${comment.targetType}:${comment.targetId}`).emit('comment:pin_updated', {
        commentId,
        pinned,
        pinnedBy: pinned ? {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        } : null,
        timestamp: new Date().toISOString()
      });

      logger.info(`📌 Comment ${pinned ? 'pinned' : 'unpinned'}: ${commentId} by ${socket.userInfo.name}`);
      if (callback) callback({ success: true, pinned });

    } catch (error) {
      logger.error('Error pinning comment:', error);
      const errorMsg = 'Failed to pin comment';
      socket.emit('error', { 
        type: 'COMMENT_PIN_ERROR',
        message: errorMsg,
        details: error.message 
      });
      if (callback) callback({ success: false, error: errorMsg });
    }
  });
}

module.exports = { handleCommentEvents };
