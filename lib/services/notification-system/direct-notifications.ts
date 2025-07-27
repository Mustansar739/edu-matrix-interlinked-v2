/**
 * DIRECT NOTIFICATION SERVICE - SERVER-SIDE ONLY
 * 
 * This service provides direct database access for notifications
 * without making HTTP requests. Used for server-side API routes.
 * 
 * Features:
 * - Direct database operations
 * - Redis caching
 * - Kafka event publishing
 * - No HTTP overhead
 * - Production-ready error handling
 */


import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { publishEvent } from '@/lib/kafka';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus
} from '@prisma/client';

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  entityType?: string;
  entityId?: string;
  actionUrl?: string; // Allow manual actionUrl override
  data?: Record<string, any>;
}

export class DirectNotificationService {
  private static instance: DirectNotificationService | null = null;

  private constructor() {}

  static getInstance(): DirectNotificationService {
    if (!DirectNotificationService.instance) {
      DirectNotificationService.instance = new DirectNotificationService();
    }
    return DirectNotificationService.instance;
  }

  /**
   * Generate actionUrl based on notification type and entity
   * Facebook-style URL generation for different content types
   * ENHANCED: Async support for database lookups
   */
  private async generateActionUrl(
    type: NotificationType,
    entityType?: string,
    entityId?: string,
    data?: Record<string, any>
  ): Promise<string> {
    console.log('🔗 Generating actionUrl for:', { type, entityType, entityId, data });

    try {
      switch (type) {
        // Post-related notifications
        case NotificationType.POST_LIKED:
        case NotificationType.POST_COMMENTED:
        case NotificationType.POST_SHARED:
          if (entityType === 'POST' && entityId) {
            return `/students-interlinked/posts/${entityId}`;
          }
          break;

        // Comment-related notifications
        case NotificationType.COMMENT_LIKED:
        case NotificationType.COMMENT_REPLIED:
          if (entityType === 'COMMENT' && data?.postId) {
            // Navigate to post with comment highlighted
            return `/students-interlinked/posts/${data.postId}?comment=${entityId}`;
          }
          if (data?.postId) {
            return `/students-interlinked/posts/${data.postId}`;
          }
          break;

        // Story-related notifications
        case NotificationType.STORY_LIKED:
        case NotificationType.STORY_COMMENTED:
        case NotificationType.STORY_REPLY:
          if (entityType === 'STORY' && entityId) {
            return `/students-interlinked/stories/${entityId}`;
          }
          if (data?.storyId) {
            return `/students-interlinked/stories/${data.storyId}`;
          }
          // For story replies, navigate to messages/conversation
          if (type === NotificationType.STORY_REPLY && data?.conversationId) {
            return `/messages?conversation=${data.conversationId}`;
          }
          if (type === NotificationType.STORY_REPLY && data?.senderId) {
            return `/messages?user=${data.senderId}`;
          }
          break;

        // Message notifications
        case NotificationType.MESSAGE_RECEIVED:
        case NotificationType.MESSAGE_READ:
          if (data?.conversationId) {
            return `/messages?conversation=${data.conversationId}`;
          } else if (data?.senderId) {
            return `/messages?user=${data.senderId}`;
          }
          return '/messages';

        // Follow/Social notifications
        case NotificationType.FOLLOW_REQUEST:
        case NotificationType.USER_FOLLOWED:
        case NotificationType.CONNECTION_REQUEST:
          if (data?.followerId || data?.userId) {
            const userId = data.followerId || data.userId;
            return `/profile/${userId}`;
          }
          break;

        // Course/Educational notifications
        case NotificationType.COURSE_UPDATE:
        case NotificationType.ASSIGNMENT_DUE:
        case NotificationType.GRADE_POSTED:
        case NotificationType.ENROLLMENT_CONFIRMED:
        case NotificationType.CERTIFICATE_ISSUED:
          if (data?.courseId) {
            return `/courses/${data.courseId}`;
          }
          return '/courses';

        // Job/Career notifications
        case NotificationType.JOB_APPLICATION:
        case NotificationType.FREELANCE_PROPOSAL:
          if (data?.jobId) {
            return `/jobs/${data.jobId}`;
          }
          return '/jobs';

        // Achievement notifications
        case NotificationType.ACHIEVEMENT_UNLOCKED:
          return '/profile/achievements';

        // Event notifications
        case NotificationType.EVENT_REMINDER:
          if (data?.eventId) {
            return `/events/${data.eventId}`;
          }
          return '/events';

        // Payment/Financial notifications
        case NotificationType.PAYMENT_RECEIVED:
        case NotificationType.PAYMENT_PENDING:
        case NotificationType.SUBSCRIPTION_EXPIRING:
          return '/freelancing/earnings';

        // Profile notifications - ENHANCED URL GENERATION
        case NotificationType.PROFILE_LIKED:
        case NotificationType.PROFILE_SHARED:
          console.log('🔗 Processing profile notification URL:', { data });
          
          // Priority 1: Use profileUsername from notification data
          if (data?.profileUsername) {
            console.log('✅ Using profileUsername from data:', data.profileUsername);
            return `/profile/${data.profileUsername}`;
          }
          
          // Priority 2: Use likerUsername (for notifications about liking someone's profile)
          if (data?.likerUsername) {
            console.log('✅ Using likerUsername from data:', data.likerUsername);
            return `/profile/${data.likerUsername}`;
          }
          
          // Priority 3: Try to resolve UUID to username from database
          if (data?.profileId || entityId) {
            const profileId = data?.profileId || entityId;
            try {
              console.log('🔍 Resolving UUID to username for profile:', profileId);
              
              // Import prisma dynamically to avoid circular dependencies
              const { prisma } = await import('@/lib/prisma');
              const user = await prisma.user.findUnique({
                where: { id: profileId },
                select: { username: true }
              });
              
              if (user?.username) {
                console.log('✅ Resolved UUID to username:', user.username);
                return `/profile/${user.username}`;
              } else {
                console.warn('⚠️ User not found for profile UUID:', profileId);
              }
            } catch (dbError) {
              console.error('❌ Database error resolving profile UUID:', dbError);
            }
          }
          
          // Priority 4: Fallback to notifications page
          console.warn('⚠️ Could not resolve profile URL, using fallback');
          return '/notifications?type=profile';
          
          break;

        // Mention/Tag notifications
        case NotificationType.MENTION_IN_POST:
        case NotificationType.TAG_IN_POST:
          if (data?.postId) {
            return `/students-interlinked/posts/${data.postId}`;
          }
          break;

        case NotificationType.MENTION_IN_COMMENT:
          if (data?.postId && data?.commentId) {
            return `/students-interlinked/posts/${data.postId}?comment=${data.commentId}`;
          }
          break;

        // News notifications
        case NotificationType.NEWS_PUBLISHED:
          if (data?.newsId) {
            return `/edu-news/${data.newsId}`;
          }
          return '/edu-news';

        // System notifications
        case NotificationType.SYSTEM_ALERT:
        case NotificationType.FEEDBACK_RESPONSE:
          return '/settings';

        default:
          console.log('⚠️ No specific URL pattern for notification type:', type);
          return '/notifications';
      }
    } catch (error) {
      console.error('❌ Error generating actionUrl:', error);
    }

    // Fallback to notifications page
    return '/notifications';
  }

  /**
   * Create notification directly in database
   * @param data - Notification data
   * @returns Created notification
   */
  async createNotification(data: CreateNotificationData) {
    try {
      console.log('📢 Creating notification:', {
        userId: data.userId,
        title: data.title,
        type: data.type
      });

      // Generate actionUrl if not provided - ASYNC
      const actionUrl = data.actionUrl || await this.generateActionUrl(
        data.type,
        data.entityType,
        data.entityId,
        data.data
      );

      console.log('🔗 Generated actionUrl:', actionUrl);

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          category: data.category || NotificationCategory.ADMINISTRATIVE,
          priority: data.priority || NotificationPriority.NORMAL,
          channels: data.channels || [NotificationChannel.IN_APP],
          status: NotificationStatus.SENT,
          entityType: data.entityType,
          entityId: data.entityId,
          actionUrl: actionUrl,
          data: data.data || {},
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Cache notification for quick access
      await this.cacheNotification(notification);

      // Publish real-time event
      await this.publishNotificationEvent(notification);

      console.log('✅ Notification created successfully:', notification.id);
      return notification;

    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user notifications with pagination
   * @param userId - User ID
   * @param page - Page number (default: 1)
   * @param limit - Results per page (default: 20)
   * @returns Paginated notifications
   */
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: {
            userId,
            status: NotificationStatus.SENT
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.notification.count({
          where: {
            userId,
            status: NotificationStatus.SENT
          }
        })
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      throw new Error(`Failed to get notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark notification as read
   * @param notificationId - Notification ID
   * @param userId - User ID (for security)
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date()
        }
      });

      if (notification.count === 0) {
        throw new Error('Notification not found or access denied');
      }

      // Update cache
      await this.invalidateUserNotificationsCache(userId);

      console.log('✅ Notification marked as read:', notificationId);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unread notification count for user
   * @param userId - User ID
   * @returns Unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Try to get from cache first
      const cacheKey = `notifications:unread:${userId}`;
      const cachedCount = await redis.get(cacheKey);

      if (cachedCount !== null) {
        return parseInt(cachedCount, 10);
      }

      // Get from database
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
          status: NotificationStatus.SENT
        }
      });

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, count.toString());

      return count;

    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0; // Fail gracefully
    }
  }

  /**
   * Cache notification for quick access
   * @param notification - Notification to cache
   */
  private async cacheNotification(notification: any) {
    try {
      const cacheKey = `notification:${notification.id}`;
      await redis.setex(cacheKey, 3600, JSON.stringify(notification)); // Cache for 1 hour

      // Invalidate user's notifications cache
      await this.invalidateUserNotificationsCache(notification.userId);

    } catch (error) {
      console.error('❌ Failed to cache notification:', error);
      // Don't throw, caching is not critical
    }
  }

  /**
   * Invalidate user's notifications cache
   * @param userId - User ID
   */
  private async invalidateUserNotificationsCache(userId: string) {
    try {
      const pattern = `notifications:${userId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // Also invalidate unread count
      await redis.del(`notifications:unread:${userId}`);

    } catch (error) {
      console.error('❌ Failed to invalidate cache:', error);
      // Don't throw, caching is not critical
    }
  }

  /**
   * Publish notification event for real-time updates
   * @param notification - Notification to publish
   */
  private async publishNotificationEvent(notification: any) {
    try {
      await publishEvent('notification-created', {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        data: notification.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Failed to publish notification event:', error);
      // Don't throw, event publishing is not critical
    }
  }
}

/**
 * Export singleton instance
 */
export const directNotificationService = DirectNotificationService.getInstance();
