/**
 * ==========================================
 * STUDENTS INTERLINKED - REAL-TIME SERVICE (FIXED)
 * ==========================================
 * 
 * PRODUCTION-READY VERSION:
 * ✅ Socket.IO client connections that caused conflicts
 * ✅ Uses Kafka events  for real-time communication  
 * ✅ reliable event publishing
 * 
 * Real-time functionality via Kafka event publishing only.
 * Socket.IO connections are handled by the centralized SocketContext on the frontend.
 * 
 */

import { redis } from '@/lib/redis'
import { publishEvent, KAFKA_TOPICS } from '@/lib/kafka'

// ==========================================
// SOCKET.IO EVENT TYPES
// ==========================================

export const SOCKET_EVENTS = {
  // Posts - Students Interlinked events (matching frontend expectations)
  POST_CREATED: 'students-interlinked:new-post',
  POST_LIKED: 'students-interlinked:new-like',
  POST_UNLIKED: 'students-interlinked:post-unliked',
  POST_COMMENTED: 'students-interlinked:new-comment',
  POST_UPDATED: 'students-interlinked:post-updated',
  POST_DELETED: 'students-interlinked:post-deleted',
  
  // Stories - Students Interlinked events
  STORY_CREATED: 'students-interlinked:new-story',
  STORY_LIKED: 'students-interlinked:story-liked',
  STORY_UNLIKED: 'students-interlinked:story-unliked',
  STORY_VIEWED: 'students-interlinked:story-viewed',
  STORY_EXPIRED: 'students-interlinked:story-expired',
  
  // Comments - Students Interlinked events
  COMMENT_CREATED: 'students-interlinked:new-comment',
  COMMENT_UPDATED: 'students-interlinked:comment-updated',
  COMMENT_DELETED: 'students-interlinked:comment-deleted',
  COMMENT_LIKED: 'students-interlinked:comment-liked',
  COMMENT_UNLIKED: 'students-interlinked:comment-unliked',
  COMMENT_REPLIED: 'students-interlinked:comment-replied',
  
  // Shares - Students Interlinked events
  POST_SHARED: 'students-interlinked:post-shared',
  POST_UNSHARED: 'students-interlinked:post-unshared',
  
  // Users - Students Interlinked events
  USER_ONLINE: 'students-interlinked:user-presence',
  USER_OFFLINE: 'students-interlinked:user-presence',
  USER_TYPING: 'students-interlinked:user-typing',
  USER_STOPPED_TYPING: 'students-interlinked:user-stopped-typing',
  
  // Notifications - Students Interlinked events
  NOTIFICATION_NEW: 'students-interlinked:notification',
  NOTIFICATION_READ: 'students-interlinked:notification-read',
}

// ==========================================
// REDIS CACHE KEYS
// ==========================================

export const CACHE_KEYS = {
  // Posts
  POST: (id: string) => `post:${id}`,
  POST_STATS: (id: string) => `post:${id}:stats`,
  POST_LIKES: (id: string) => `post:${id}:likes`,
  POST_COMMENTS: (id: string) => `post:${id}:comments`,
  USER_POSTS: (userId: string) => `user:${userId}:posts`,
  USER_LIKED_POSTS: (userId: string) => `user:${userId}:liked_posts`,
  FEED_POSTS: (userId: string) => `feed:${userId}:posts`,
  
  // Stories
  STORY: (id: string) => `story:${id}`,
  STORY_STATS: (id: string) => `story:${id}:stats`,
  STORY_VIEWS: (id: string) => `story:${id}:views`,
  USER_STORIES: (userId: string) => `user:${userId}:stories`,
  ACTIVE_STORIES: 'stories:active',
  
  // Comments
  COMMENT: (id: string) => `comment:${id}`,
  COMMENT_LIKES: (id: string) => `comment:${id}:likes`,
  
  // Shares
  POST_SHARES: (id: string) => `post:${id}:shares`,
  USER_SHARED_POSTS: (userId: string) => `user:${userId}:shared_posts`,
  
  // User activity
  USER_ONLINE: (userId: string) => `user:${userId}:online`,
  USER_ACTIVITY: (userId: string) => `user:${userId}:activity`,
  
  // Feed cache
  USER_FEED: (userId: string) => `feed:${userId}`,
  TRENDING_POSTS: 'posts:trending',
  TRENDING_STORIES: 'stories:trending',
}

// ==========================================
// KAFKA TOPICS FOR STUDENTS INTERLINKED
// ==========================================

export const SI_KAFKA_TOPICS = {
  // Posts events
  POST_CREATED: KAFKA_TOPICS.STUDENTS_POST_CREATED,
  POST_LIKED: KAFKA_TOPICS.STUDENTS_POST_LIKED,
  POST_UNLIKED: KAFKA_TOPICS.STUDENTS_POST_LIKED, // Reuse the same topic
  POST_COMMENTED: KAFKA_TOPICS.STUDENTS_POST_COMMENTED,
  POST_SHARED: 'students.post.shared',
  POST_UNSHARED: 'students.post.unshared',
  
  // Comments events
  COMMENT_UPDATED: 'students.comment.updated',
  COMMENT_DELETED: 'students.comment.deleted',
  
  // Stories events
  STORY_CREATED: KAFKA_TOPICS.STUDENTS_STORY_CREATED,
  STORY_VIEWED: KAFKA_TOPICS.STUDENTS_STORY_VIEWED,
  STORY_LIKED: KAFKA_TOPICS.STUDENTS_STORY_LIKED,
  
  // User activity
  USER_ACTIVITY: KAFKA_TOPICS.STUDENTS_USER_ACTIVITY,
  
  // Analytics
  ENGAGEMENT_METRICS: KAFKA_TOPICS.STUDENTS_ENGAGEMENT_METRICS,
  CONTENT_METRICS: KAFKA_TOPICS.STUDENTS_CONTENT_METRICS,
}

// ==========================================
// REAL-TIME SERVICE - NO SOCKET.IO CONFLICTS
// ==========================================

/**
 * Students Interlinked Service - Real-time functionality via Kafka ONLY
 * FIXED: No longer creates direct Socket.IO connections to prevent conflicts
 */
export class StudentsInterlinkedService {
  
  /**
   * Publish Kafka event for real-time updates (no Socket.IO conflicts)
   */
  static async publishEvent(topic: string, data: any): Promise<void> {
    try {
      await publishEvent(topic, {
        ...data,
        timestamp: new Date().toISOString(),
        service: 'students-interlinked'
      })
      console.log(`📤 Published event to ${topic}`)
    } catch (error) {
      console.error(`❌ Failed to publish event to ${topic}:`, error)
    }
  }

  /**
   * Handle new post creation - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onPostCreated(postData: any, authorId: string): Promise<void> {
    try {
      // Cache the new post with safe Redis operations
      const postKey = CACHE_KEYS.POST(postData.id);
      await redis.setex(postKey, 3600, JSON.stringify(postData));
      
      // Update user's posts cache with safe operations
      const userPostsKey = CACHE_KEYS.USER_POSTS(authorId);
      
      // Check if key exists and its type
      const keyType = await redis.type(userPostsKey);
      
      if (keyType === 'none') {
        // Key doesn't exist, create as set
        await redis.sadd(userPostsKey, postData.id);
      } else if (keyType === 'set') {
        // Key exists and is a set, add to it
        await redis.sadd(userPostsKey, postData.id);
      } else {
        // Key exists but is wrong type, delete and recreate
        await redis.del(userPostsKey);
        await redis.sadd(userPostsKey, postData.id);
      }
      
      // Initialize post stats safely
      const statsKey = CACHE_KEYS.POST_STATS(postData.id);
      await redis.hmset(statsKey, {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      });
      
      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_CREATED, {
        type: 'post_created',
        postId: postData.id,
        authorId,
        postData
      });

      console.log(`✅ Post created event published: ${postData.id}`);

    } catch (error) {
      console.error('❌ Error handling post creation:', error);
      // Don't throw, just log the error to prevent breaking the post creation flow
    }
  }

  /**
   * Handle post like - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onPostLiked(postId: string, userId: string, authorId: string, reaction: string = 'like'): Promise<void> {
    try {
      // Update cache with new like
      const likeKey = CACHE_KEYS.POST_LIKES(postId)
      await redis.sadd(likeKey, userId)
      await redis.sadd(CACHE_KEYS.USER_LIKED_POSTS(userId), postId)
      
      // Increment post like count
      await redis.hincrby(CACHE_KEYS.POST_STATS(postId), 'likes', 1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_LIKED, {
        type: 'post_liked',
        postId,
        userId,
        authorId,
        reaction,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Post liked event published: ${postId} by ${userId}`)

    } catch (error) {
      console.error('❌ Error handling post like:', error)
    }
  }

  /**
   * Handle post unlike - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onPostUnliked(postId: string, userId: string, authorId: string, previousReaction?: string): Promise<void> {
    try {
      // Update cache - remove like
      await redis.srem(CACHE_KEYS.POST_LIKES(postId), userId)
      await redis.srem(CACHE_KEYS.USER_LIKED_POSTS(userId), postId)
      
      // Decrement post like count
      await redis.hincrby(CACHE_KEYS.POST_STATS(postId), 'likes', -1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_UNLIKED, {
        type: 'post_unliked',
        postId,
        userId,
        authorId,
        previousReaction,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Post unliked event published: ${postId} by ${userId}`)

    } catch (error) {
      console.error('❌ Error handling post unlike:', error)
    }
  }

  /**
   * Handle new comment - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onCommentCreated(commentData: any, postId: string, authorId: string, postAuthorId: string): Promise<void> {
    try {
      // Cache the new comment
      await redis.setex(CACHE_KEYS.COMMENT(commentData.id), 3600, JSON.stringify(commentData))
      
      // Add to post's comments
      await redis.sadd(CACHE_KEYS.POST_COMMENTS(postId), commentData.id)
      
      // Increment post comment count
      await redis.hincrby(CACHE_KEYS.POST_STATS(postId), 'comments', 1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_COMMENTED, {
        type: 'comment_created',
        commentId: commentData.id,
        postId,
        authorId,
        postAuthorId,
        commentData
      })

      console.log(`✅ Comment created event published: ${commentData.id}`)

    } catch (error) {
      console.error('❌ Error handling comment creation:', error)
    }
  }

  /**
   * Handle story creation - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onStoryCreated(storyData: any, authorId: string): Promise<void> {
    try {
      // Cache the new story
      await redis.setex(CACHE_KEYS.STORY(storyData.id), 86400, JSON.stringify(storyData)) // 24 hours
      
      // Add to user's stories
      await redis.sadd(CACHE_KEYS.USER_STORIES(authorId), storyData.id)
      
      // Add to active stories
      await redis.zadd(CACHE_KEYS.ACTIVE_STORIES, Date.now(), storyData.id)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.STORY_CREATED, {
        type: 'story_created',
        storyId: storyData.id,
        authorId,
        storyData
      })

      console.log(`✅ Story created event published: ${storyData.id}`)

    } catch (error) {
      console.error('❌ Error handling story creation:', error)
    }
  }

  /**
   * Handle story view - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onStoryViewed(storyId: string, viewerId: string, authorId: string): Promise<void> {
    try {
      // Track story view
      await redis.sadd(CACHE_KEYS.STORY_VIEWS(storyId), viewerId)
      
      // Increment view count
      await redis.hincrby(CACHE_KEYS.STORY_STATS(storyId), 'views', 1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.STORY_VIEWED, {
        type: 'story_viewed',
        storyId,
        viewerId,
        authorId,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Story viewed event published: ${storyId} by ${viewerId}`)

    } catch (error) {
      console.error('❌ Error handling story view:', error)
    }
  }

  /**
   * Handle comment like - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onCommentLiked(commentId: string, userId: string, authorId: string, reaction: string = 'like'): Promise<void> {
    try {
      // Update cache with new comment like
      const likeKey = CACHE_KEYS.COMMENT_LIKES(commentId)
      await redis.sadd(likeKey, userId)
      
      // Increment comment like count
      await redis.hincrby(CACHE_KEYS.COMMENT(commentId), 'likes', 1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_COMMENTED, {
        type: 'comment_liked',
        commentId,
        userId,
        authorId,
        reaction,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Comment liked event published: ${commentId} by ${userId}`)

    } catch (error) {
      console.error('❌ Error handling comment like:', error)
    }
  }

  /**
   * Handle comment unlike - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onCommentUnliked(commentId: string, userId: string, authorId: string, previousReaction?: string): Promise<void> {
    try {
      // Update cache - remove comment like
      await redis.srem(CACHE_KEYS.COMMENT_LIKES(commentId), userId)
      
      // Decrement comment like count
      await redis.hincrby(CACHE_KEYS.COMMENT(commentId), 'likes', -1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_COMMENTED, {
        type: 'comment_unliked',
        commentId,
        userId,
        authorId,
        previousReaction,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Comment unliked event published: ${commentId} by ${userId}`)

    } catch (error) {
      console.error('❌ Error handling comment unlike:', error)
    }
  }

  /**
   * Handle story like - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onStoryLiked(storyId: string, userId: string, authorId: string, reaction: string = 'like'): Promise<void> {
    try {
      // Update cache with new story like
      await redis.sadd(CACHE_KEYS.STORY_VIEWS(storyId), `like:${userId}`)
      
      // Increment story like count
      await redis.hincrby(CACHE_KEYS.STORY_STATS(storyId), 'likes', 1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.STORY_LIKED, {
        type: 'story_liked',
        storyId,
        userId,
        authorId,
        reaction,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Story liked event published: ${storyId} by ${userId}`)

    } catch (error) {
      console.error('❌ Error handling story like:', error)
    }
  }

  /**
   * Handle story unlike - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onStoryUnliked(storyId: string, userId: string, authorId: string, previousReaction?: string): Promise<void> {
    try {
      // Update cache - remove story like
      await redis.srem(CACHE_KEYS.STORY_VIEWS(storyId), `like:${userId}`)
      
      // Decrement story like count
      await redis.hincrby(CACHE_KEYS.STORY_STATS(storyId), 'likes', -1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.STORY_LIKED, {
        type: 'story_unliked',
        storyId,
        userId,
        authorId,
        previousReaction,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Story unliked event published: ${storyId} by ${userId}`)

    } catch (error) {
      console.error('❌ Error handling story unlike:', error)
    }
  }

    /**
   * Handle post sharing - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onPostShared(postId: string, userId: string, authorId: string, shareData?: any): Promise<void> {
    try {
      const eventData = {
        postId,
        userId,
        authorId,
        shareData,
        eventType: 'post_shared'
      }

      // Publish to Kafka for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_SHARED, eventData)
      
      // Cache activity for analytics
      await this.cacheUserActivity(userId, 'shared', 'post', postId)
      
      console.log(`✅ Post shared event published: ${postId} by ${userId}`)
    } catch (error) {
      console.error('❌ Error handling post share:', error)
    }
  }

  /**
   * Handle story reply creation - Instagram-like real-time
   * PRODUCTION FIX: New story reply functionality for complete story interaction
   */
  static async onStoryReplyCreated(
    replyId: string, 
    storyId: string, 
    userId: string, 
    storyAuthorId: string, 
    content: string
  ): Promise<void> {
    try {
      const eventData = {
        replyId,
        storyId,
        userId,
        storyAuthorId,
        content: content.slice(0, 100), // Truncate for performance
        eventType: 'story_reply_created'
      }

      // Publish to Kafka for real-time updates
      await this.publishEvent('students.story.reply.created', eventData)
      
      // Cache activity for analytics
      await this.cacheUserActivity(userId, 'replied', 'story', storyId)
      
      // Update story engagement metrics
      await this.updateStoryEngagement(storyId, 'reply')
      
      console.log(`✅ Story reply created event published: ${replyId} on story ${storyId} by ${userId}`)
    } catch (error) {
      console.error('❌ Error handling story reply creation:', error)
    }
  }

  /**
   * Handle story reply like - Real-time interaction
   * PRODUCTION FIX: Complete story reply interaction system
   */
  static async onStoryReplyLiked(
    replyId: string, 
    storyId: string, 
    userId: string, 
    replyAuthorId: string
  ): Promise<void> {
    try {
      const eventData = {
        replyId,
        storyId,
        userId,
        replyAuthorId,
        eventType: 'story_reply_liked'
      }

      // Publish to Kafka for real-time updates
      await this.publishEvent('students.story.reply.liked', eventData)
      
      // Cache activity for analytics
      await this.cacheUserActivity(userId, 'liked', 'story_reply', replyId)
      
      console.log(`✅ Story reply liked event published: ${replyId} by ${userId}`)
    } catch (error) {
      console.error('❌ Error handling story reply like:', error)
    }
  }

  /**
   * Handle comment update - Real-time Facebook-style comment editing
   * PRODUCTION FIX: Real-time comment updates with proper event publishing
   */
  static async onCommentUpdated(
    comment: any,
    postId: string,
    userId: string
  ): Promise<void> {
    try {
      const eventData = {
        type: 'comment_updated',
        postId,
        commentId: comment.id,
        comment,
        userId,
        timestamp: new Date().toISOString()
      }

      // Publish to Kafka for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.COMMENT_UPDATED, eventData)
      
      // Cache activity for analytics
      await this.cacheUserActivity(userId, 'edited', 'comment', comment.id)
      
      console.log(`✅ Comment updated event published: ${comment.id} on post ${postId} by ${userId}`)
    } catch (error) {
      console.error('❌ Error handling comment update:', error)
    }
  }

  /**
   * Handle comment deletion - Real-time Facebook-style comment removal
   * PRODUCTION FIX: Real-time comment deletion with proper cleanup
   */
  static async onCommentDeleted(
    commentId: string,
    postId: string,
    userId: string
  ): Promise<void> {
    try {
      const eventData = {
        type: 'comment_deleted',
        postId,
        commentId,
        userId,
        timestamp: new Date().toISOString()
      }

      // Publish to Kafka for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.COMMENT_DELETED, eventData)
      
      // Remove from cache
      await redis.del(`comment:${commentId}`)
      
      // Cache activity for analytics
      await this.cacheUserActivity(userId, 'deleted', 'comment', commentId)
      
      console.log(`✅ Comment deleted event published: ${commentId} on post ${postId} by ${userId}`)
    } catch (error) {
      console.error('❌ Error handling comment deletion:', error)
    }
  }

  /**
   * Handle post unsharing - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onPostUnshared(postId: string, userId: string, authorId: string): Promise<void> {
    try {
      // Update cache - remove share
      await redis.srem(CACHE_KEYS.POST_SHARES(postId), userId)
      await redis.srem(CACHE_KEYS.USER_SHARED_POSTS(userId), postId)
      
      // Decrement post share count
      await redis.hincrby(CACHE_KEYS.POST_STATS(postId), 'shares', -1)

      // Publish Kafka event for real-time updates
      await this.publishEvent(SI_KAFKA_TOPICS.POST_UNSHARED, {
        type: 'post_unshared',
        postId,
        userId,
        authorId,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Post unshared event published: ${postId} by ${userId}`)

    } catch (error) {
      console.error('❌ Error handling post unshare:', error)
    }
  }

  /**
   * Handle notification creation - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onNotificationCreated(notificationData: any): Promise<void> {
    try {
      // Cache the notification
      await redis.setex(`notification:${notificationData.id}`, 86400, JSON.stringify(notificationData))

      // Publish Kafka event for real-time updates
      await this.publishEvent('notifications.created', {
        type: 'notification_created',
        notificationId: notificationData.id,
        recipientId: notificationData.recipientId,
        notificationData,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Notification created event published: ${notificationData.id}`)

    } catch (error) {
      console.error('❌ Error handling notification creation:', error)
    }
  }

  /**
   * Handle notification read - Facebook-like real-time
   * FIXED: Uses Kafka only, no Socket.IO conflicts
   */
  static async onNotificationRead(notificationId: string, userId: string): Promise<void> {
    try {
      // Update notification in cache
      await redis.hset(`notification:${notificationId}`, 'readAt', new Date().toISOString())

      // Publish Kafka event for real-time updates
      await this.publishEvent('notifications.read', {
        type: 'notification_read',
        notificationId,
        userId,
        timestamp: new Date().toISOString()
      })

      console.log(`✅ Notification read event published: ${notificationId}`)

    } catch (error) {
      console.error('❌ Error handling notification read:', error)
    }
  }

  /**
   * Get user activity status
   */
  static async getUserActivityStatus(userId: string): Promise<{ online: boolean; lastSeen?: Date }> {
    try {
      const isOnline = await redis.exists(CACHE_KEYS.USER_ONLINE(userId))
      const lastActivity = await redis.get(CACHE_KEYS.USER_ACTIVITY(userId))
      
      return {
        online: Boolean(isOnline),
        lastSeen: lastActivity ? new Date(lastActivity) : undefined
      }
    } catch (error) {
      console.error('Error getting user activity status:', error)
      return { online: false }
    }
  }

  /**
   * Update user activity
   */
  static async updateUserActivity(userId: string): Promise<void> {
    try {
      const now = new Date().toISOString()
      
      // Mark user as online (expires in 5 minutes)
      await redis.setex(CACHE_KEYS.USER_ONLINE(userId), 300, now)
      
      // Update last activity
      await redis.set(CACHE_KEYS.USER_ACTIVITY(userId), now)

      // Publish user activity event
      await this.publishEvent(SI_KAFKA_TOPICS.USER_ACTIVITY, {
        type: 'user_activity',
        userId,
        status: 'online',
        timestamp: now
      })

    } catch (error) {
      console.error('Error updating user activity:', error)
    }
  }

  /**
   * Get post statistics from cache
   */
  static async getPostStats(postId: string): Promise<{
    likes: number
    comments: number
    shares: number
    views: number
  }> {
    try {
      const stats = await redis.hmget(
        CACHE_KEYS.POST_STATS(postId),
        'likes',
        'comments',
        'shares',
        'views'
      )
      
      return {
        likes: parseInt(stats[0] || '0'),
        comments: parseInt(stats[1] || '0'),
        shares: parseInt(stats[2] || '0'),
        views: parseInt(stats[3] || '0')
      }
    } catch (error) {
      console.error('Error getting post stats:', error)
      return { likes: 0, comments: 0, shares: 0, views: 0 }
    }
  }

  /**
   * Clear user's feed cache when new content is created
   */
  static async invalidateUserFeeds(userId: string, followersIds: string[]): Promise<void> {
    try {
      const feedKeys = [
        CACHE_KEYS.USER_FEED(userId),
        ...followersIds.map(id => CACHE_KEYS.USER_FEED(id))
      ]
      
      await Promise.all(feedKeys.map(key => redis.del(key)))
      
      console.log(`✅ Invalidated ${feedKeys.length} feed caches`)
    } catch (error) {
      console.error('Error invalidating feed caches:', error)
    }
  }

  /**
   * Cache user activity for analytics - Redis-based performance optimization
   * PRODUCTION FIX: High-performance activity tracking for real-time analytics
   */
  private static async cacheUserActivity(
    userId: string, 
    action: string, 
    entityType: string, 
    entityId: string
  ): Promise<void> {
    try {
      const activityKey = `user_activity:${userId}:${new Date().toISOString().split('T')[0]}`
      const activityData = {
        action,
        entityType,
        entityId,
        timestamp: new Date().toISOString()
      }

      await redis.lpush(activityKey, JSON.stringify(activityData))
      await redis.expire(activityKey, 86400) // 24 hours
      
      console.log(`✅ Cached user activity: ${userId} ${action} ${entityType}`)
    } catch (error) {
      console.error('❌ Error caching user activity:', error)
    }
  }

  /**
   * Update story engagement metrics - Real-time analytics
   * PRODUCTION FIX: Story performance tracking for analytics dashboard
   */
  private static async updateStoryEngagement(storyId: string, action: 'view' | 'like' | 'reply'): Promise<void> {
    try {
      const engagementKey = `story_engagement:${storyId}`
      const currentData = await redis.hgetall(engagementKey)
      
      const engagement = {
        views: parseInt(currentData.views || '0'),
        likes: parseInt(currentData.likes || '0'),
        replies: parseInt(currentData.replies || '0'),
        lastUpdated: new Date().toISOString()
      }

      // Increment the specific metric
      engagement[action === 'view' ? 'views' : action === 'like' ? 'likes' : 'replies']++

      await redis.hmset(engagementKey, engagement)
      await redis.expire(engagementKey, 604800) // 7 days
      
      console.log(`✅ Updated story engagement: ${storyId} ${action}`)
    } catch (error) {
      console.error('❌ Error updating story engagement:', error)
    }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generate room ID for Socket.IO events
 */
export function generateRoomId(type: 'post' | 'story' | 'user', id: string): string {
  return `${type}:${id}`
}

/**
 * Check if user is online
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const isOnline = await redis.exists(CACHE_KEYS.USER_ONLINE(userId))
    return Boolean(isOnline)
  } catch (error) {
    console.error('Error checking user online status:', error)
    return false
  }
}

/**
 * Get trending posts from cache
 */
export async function getTrendingPosts(limit: number = 10): Promise<string[]> {
  try {
    // Get trending post IDs (sorted by score)
    const postIds = await redis.zrevrange(CACHE_KEYS.TRENDING_POSTS, 0, limit - 1)
    return postIds
  } catch (error) {
    console.error('Error getting trending posts:', error)
    return []
  }
}

/**
 * Update trending score for a post
 */
export async function updateTrendingScore(postId: string, engagement: number): Promise<void> {
  try {
    const score = Date.now() + (engagement * 1000) // Boost recent posts with high engagement
    await redis.zadd(CACHE_KEYS.TRENDING_POSTS, score, postId)
  } catch (error) {
    console.error('Error updating trending score:', error)
  }
}
