// ==========================================
// SHARES HANDLER - Facebook-style Share/Repost Feature
// ==========================================
// Handles sharing posts, stories, and content

const { logger } = require('../utils/logger');
const { eventPublishers } = require('../utils/kafka');
const { validateEventData } = require('../middleware/validation');
const { checkActionRateLimit } = require('../middleware/rateLimit');

/**
 * Handle share-related events (Facebook-style)
 */
function handleShareEvents(socket, io, context) {
  const { connectedUsers, activeRooms, redis, kafkaProducer } = context;

  // Share/Repost content
  socket.on('share:create', async (data) => {
    try {
      // Rate limiting
      if (!await checkActionRateLimit(socket, 'share_create', { points: 20, duration: 60 })) {
        return;
      }

      const { 
        originalContentId, 
        originalContentType, // 'post', 'story', 'photo', 'video'
        shareMessage, 
        shareType, // 'share', 'quote_share', 'story_share'
        privacy, // 'public', 'followers', 'private'
        targetAudience 
      } = data;

      // Validate required data
      if (!originalContentId || !originalContentType) {
        socket.emit('error', { message: 'Original content ID and type required' });
        return;
      }

      // Get original content
      const originalContentData = await redis.get(`${originalContentType}:${originalContentId}`);
      if (!originalContentData) {
        socket.emit('error', { message: 'Original content not found' });
        return;
      }

      const originalContent = JSON.parse(originalContentData);

      // Check if original content allows sharing
      if (originalContent.shareSettings && originalContent.shareSettings.allowSharing === false) {
        socket.emit('error', { message: 'This content cannot be shared' });
        return;
      }

      const shareId = `share_${Date.now()}_${socket.userId}`;
      const share = {
        id: shareId,
        type: shareType || 'share',
        shareMessage: shareMessage || '',
        privacy: privacy || 'public',
        targetAudience: targetAudience || [],
        originalContent: {
          id: originalContentId,
          type: originalContentType,
          author: originalContent.author,
          content: originalContent.content,
          createdAt: originalContent.createdAt,
          attachments: originalContent.attachments || []
        },
        sharedBy: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        sharedAt: new Date().toISOString(),
        stats: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0
        }
      };

      // Store share in Redis
      await redis.setex(`share:${shareId}`, 3600 * 24 * 30, JSON.stringify(share)); // 30 days

      // Add to user's shares list
      await redis.lpush(`user:${socket.userId}:shares`, shareId);
      await redis.ltrim(`user:${socket.userId}:shares`, 0, 99); // Keep last 100 shares

      // Update original content share count
      if (originalContent.stats) {
        originalContent.stats.shares = (originalContent.stats.shares || 0) + 1;
        await redis.setex(`${originalContentType}:${originalContentId}`, 3600 * 24 * 30, JSON.stringify(originalContent));
      }

      // Broadcast share based on privacy settings
      if (privacy === 'public') {
        io.to('global-feed').emit('share:new', share);
      } else if (privacy === 'friends') {
        // Emit to followers only (would need followers list implementation)
        socket.broadcast.emit('share:new_follower', share);
      }

      // Notify original content author
      if (originalContent.author.id !== socket.userInfo.id) {
        io.to(`user:${originalContent.author.id}`).emit('share:content_shared', {
          shareId,
          share,
          sharedBy: {
            id: socket.userInfo.id,
            name: socket.userInfo.name,
            image: socket.userInfo.image
          },
          originalContentId,
          originalContentType
        });
      }

      // Send confirmation to sharer
      socket.emit('share:created', {
        shareId,
        share,
        timestamp: new Date().toISOString()
      });

      // Publish to Kafka
      if (kafkaProducer) {
        await eventPublishers.postEvent(kafkaProducer, 'content_shared', shareId, socket.userId, {
          share,
          originalContentId,
          originalContentType,
          shareType
        });
      }

      logger.info(`🔄 Content shared: ${shareId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error creating share:', error);
      socket.emit('error', { 
        type: 'SHARE_CREATE_ERROR',
        message: 'Failed to share content',
        details: error.message 
      });
    }
  });

  // Get shares of content
  socket.on('share:get_shares', async (data) => {
    try {
      const { contentId, contentType, limit = 20, offset = 0 } = data;

      // Get shares from Redis (simplified - in production use database)
      const shareKeys = await redis.lrange(`${contentType}:${contentId}:shares`, offset, offset + limit - 1);
      const shares = [];

      for (const shareKey of shareKeys) {
        const shareData = await redis.get(shareKey);
        if (shareData) {
          shares.push(JSON.parse(shareData));
        }
      }

      socket.emit('share:shares_list', {
        contentId,
        contentType,
        shares,
        hasMore: shareKeys.length === limit
      });

      logger.info(`📋 Shares retrieved for ${contentType}:${contentId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error getting shares:', error);
      socket.emit('error', { 
        type: 'SHARE_GET_ERROR',
        message: 'Failed to get shares',
        details: error.message 
      });
    }
  });

  // Delete share
  socket.on('share:delete', async (data) => {
    try {
      const { shareId } = data;

      if (!shareId) {
        socket.emit('error', { message: 'Share ID required' });
        return;
      }

      // Get existing share
      const shareData = await redis.get(`share:${shareId}`);
      if (!shareData) {
        socket.emit('error', { message: 'Share not found' });
        return;
      }

      const share = JSON.parse(shareData);

      // Check if user owns the share
      if (share.sharedBy.id !== socket.userInfo.id) {
        socket.emit('error', { message: 'Unauthorized to delete this share' });
        return;
      }

      // Delete share
      await redis.del(`share:${shareId}`);
      await redis.lrem(`user:${socket.userId}:shares`, 0, shareId);

      // Update original content share count
      const originalContentData = await redis.get(`${share.originalContent.type}:${share.originalContent.id}`);
      if (originalContentData) {
        const originalContent = JSON.parse(originalContentData);
        if (originalContent.stats && originalContent.stats.shares > 0) {
          originalContent.stats.shares -= 1;
          await redis.setex(`${share.originalContent.type}:${share.originalContent.id}`, 3600 * 24 * 30, JSON.stringify(originalContent));
        }
      }

      // Broadcast share deletion
      io.to('global-feed').emit('share:deleted', {
        shareId,
        deletedBy: socket.userInfo.id
      });

      // Send confirmation
      socket.emit('share:delete_success', {
        shareId,
        timestamp: new Date().toISOString()
      });

      // Publish to Kafka
      if (kafkaProducer) {
        await eventPublishers.postEvent(kafkaProducer, 'share_deleted', shareId, socket.userId, {
          originalContentId: share.originalContent.id,
          originalContentType: share.originalContent.type
        });
      }

      logger.info(`🗑️ Share deleted: ${shareId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error deleting share:', error);
      socket.emit('error', { 
        type: 'SHARE_DELETE_ERROR',
        message: 'Failed to delete share',
        details: error.message 
      });
    }
  });

  // Share to story (Instagram/Facebook style)
  socket.on('share:to_story', async (data) => {
    try {
      const { originalContentId, originalContentType, storyMessage, duration = 24 } = data;

      // Create story share
      const storyShareId = `story_share_${Date.now()}_${socket.userId}`;
      const storyShare = {
        id: storyShareId,
        type: 'content_share',
        message: storyMessage || '',
        originalContent: {
          id: originalContentId,
          type: originalContentType
        },
        sharedBy: {
          id: socket.userInfo.id,
          name: socket.userInfo.name,
          image: socket.userInfo.image
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
        views: [],
        reactions: []
      };

      // Store story share
      await redis.setex(`story_share:${storyShareId}`, duration * 60 * 60, JSON.stringify(storyShare));

      // Broadcast to followers
      socket.broadcast.emit('story:new_share', storyShare);

      // Send confirmation
      socket.emit('share:story_created', {
        storyShareId,
        storyShare,
        timestamp: new Date().toISOString()
      });

      // Publish to Kafka
      if (kafkaProducer) {
        await eventPublishers.storyEvent(kafkaProducer, 'content_shared_to_story', storyShareId, socket.userId, {
          storyShare,
          originalContentId,
          originalContentType
        });
      }

      logger.info(`📖 Content shared to story: ${storyShareId} by ${socket.userInfo.name}`);

    } catch (error) {
      logger.error('Error sharing to story:', error);
      socket.emit('error', { 
        type: 'STORY_SHARE_ERROR',
        message: 'Failed to share to story',
        details: error.message 
      });
    }
  });
}

module.exports = {
  handleShareEvents
};
