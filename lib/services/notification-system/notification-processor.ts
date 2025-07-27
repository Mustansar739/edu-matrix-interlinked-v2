/**
 * FACEBOOK-STYLE NOTIFICATION PROCESSOR - CLEAN & WORKING
 * Processes Kafka events and creates notifications with Facebook-like aggregation
 * "John and 5 others liked your post"
 */

import { Kafka } from 'kafkajs';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { pushNotificationSender } from '@/lib/services/push-notification-sender';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel, 
  NotificationCategory,
  NotificationStatus 
} from '@prisma/client';

interface NotificationEvent {
  type: string;
  data: {
    userId: string;
    actorId: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
}

interface AggregationRule {
  timeWindow: number; // seconds
  maxActors: number;
  template: {
    single: string;
    double: string;
    multiple: string;
  };
}

interface AggregatedNotification {
  groupKey: string;
  actors: string[];
  count: number;
  lastActivity: Date;
}

export class FacebookNotificationProcessor {
  private kafka: Kafka;
  private consumer: any;
  private isRunning = false;

  // Facebook-style aggregation rules
  private aggregationRules: Record<string, AggregationRule> = {
    'POST_LIKED': {
      timeWindow: 300, // 5 minutes
      maxActors: 50,
      template: {
        single: '{actor} liked your post',
        double: '{actor1} and {actor2} liked your post',
        multiple: '{actor1} and {count} others liked your post'
      }
    },
    'POST_COMMENTED': {
      timeWindow: 600, // 10 minutes
      maxActors: 20,
      template: {
        single: '{actor} commented on your post',
        double: '{actor1} and {actor2} commented on your post',
        multiple: '{actor1} and {count} others commented on your post'
      }
    },
    'USER_FOLLOWED': {
      timeWindow: 1800, // 30 minutes
      maxActors: 30,
      template: {
        single: '{actor} started following you',
        double: '{actor1} and {actor2} started following you',
        multiple: '{actor1} and {count} others started following you'
      }
    },
    'STORY_VIEWED': {
      timeWindow: 3600, // 1 hour
      maxActors: 100,
      template: {
        single: '{actor} viewed your story',
        double: '{actor1} and {actor2} viewed your story',
        multiple: '{actor1} and {count} others viewed your story'
      }
    },
    'COMMENT_LIKED': {
      timeWindow: 300, // 5 minutes
      maxActors: 20,
      template: {
        single: '{actor} liked your comment',
        double: '{actor1} and {actor2} liked your comment',
        multiple: '{actor1} and {count} others liked your comment'
      }
    }
  };

  constructor() {
    this.kafka = new Kafka({
      clientId: 'notification-processor',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:29092'],
    });

    this.consumer = this.kafka.consumer({ 
      groupId: 'notification-processor-group'
    });
  }

  /**
   * Start the notification processor
   */
  async start(): Promise<void> {
    try {
      console.log('🔔 Starting Facebook notification processor...');

      await this.consumer.connect();
      
      await this.consumer.subscribe({ 
        topics: ['notification-events']
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
          try {
            const event: NotificationEvent = JSON.parse(message.value?.toString() || '{}');
            console.log(`📨 Processing notification event: ${event.type}`);

            // Skip self-notifications
            if (event.data.userId === event.data.actorId) {
              console.log('⏭️ Skipping self-notification');
              return;
            }

            // Check if this event type supports aggregation
            if (this.aggregationRules[event.type]) {
              await this.processAggregatedNotification(event);
            } else {
              await this.processInstantNotification(event);
            }

          } catch (error) {
            console.error('❌ Failed to process notification event:', error);
          }
        }
      });

      this.isRunning = true;
      console.log('✅ Facebook notification processor started successfully');

    } catch (error) {
      console.error('❌ Failed to start notification processor:', error);
      throw error;
    }
  }

  /**
   * Stop the notification processor
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.consumer.disconnect();
    console.log('🛑 Notification processor stopped');
  }

  /**
   * Process aggregated notification with Facebook-style grouping
   */
  private async processAggregatedNotification(event: NotificationEvent): Promise<void> {
    const { userId, actorId, entityType, entityId, action } = event.data;
    const groupKey = `${userId}:${entityType}:${entityId}:${event.type}`;
    const rule = this.aggregationRules[event.type];

    try {
      // Get existing aggregation from Redis
      const existing = await this.getAggregation(groupKey);
      
      if (existing && this.isWithinTimeWindow(existing.lastActivity, rule.timeWindow)) {
        // Update existing aggregation
        await this.updateAggregation(groupKey, actorId, existing, rule, event);
      } else {
        // Create new aggregation
        await this.createNewAggregation(groupKey, event, rule);
      }
    } catch (error) {
      console.error('❌ Failed to process aggregated notification:', error);
      // Fallback to instant notification
      await this.processInstantNotification(event);
    }
  }

  /**
   * Process instant notification (no aggregation)
   */
  private async processInstantNotification(event: NotificationEvent): Promise<void> {
    try {
      const notification = await this.createNotificationFromEvent(event);
      await this.deliverNotification(notification);
    } catch (error) {
      console.error('❌ Failed to process instant notification:', error);
    }
  }

  /**
   * Get aggregation data from Redis
   */
  private async getAggregation(groupKey: string): Promise<AggregatedNotification | null> {
    try {
      const data = await redis.get(`notif:agg:${groupKey}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Failed to get aggregation:', error);
      return null;
    }
  }

  /**
   * Check if activity is within time window
   */
  private isWithinTimeWindow(lastActivity: Date, windowSeconds: number): boolean {
    const now = new Date();
    const diff = (now.getTime() - new Date(lastActivity).getTime()) / 1000;
    return diff <= windowSeconds;
  }

  /**
   * Update existing aggregation
   */
  private async updateAggregation(
    groupKey: string, 
    actorId: string, 
    existing: AggregatedNotification, 
    rule: AggregationRule,
    event: NotificationEvent
  ): Promise<void> {
    // Add actor if not already present
    if (!existing.actors.includes(actorId)) {
      existing.actors.unshift(actorId); // Add to beginning (most recent)
      if (existing.actors.length > rule.maxActors) {
        existing.actors = existing.actors.slice(0, rule.maxActors);
      }
    } else {
      // Move existing actor to front (most recent)
      existing.actors = existing.actors.filter(id => id !== actorId);
      existing.actors.unshift(actorId);
    }

    existing.count = existing.actors.length;
    existing.lastActivity = new Date();

    // Save to Redis with expiry
    await redis.setex(`notif:agg:${groupKey}`, rule.timeWindow, JSON.stringify(existing));

    // Update notification in database
    await this.updateAggregatedNotification(groupKey, existing, rule, event);
  }

  /**
   * Create new aggregation
   */
  private async createNewAggregation(groupKey: string, event: NotificationEvent, rule: AggregationRule): Promise<void> {
    const aggregation: AggregatedNotification = {
      groupKey,
      actors: [event.data.actorId],
      count: 1,
      lastActivity: new Date()
    };

    // Save to Redis with expiry
    await redis.setex(`notif:agg:${groupKey}`, rule.timeWindow, JSON.stringify(aggregation));

    // Create notification in database
    await this.createAggregatedNotification(event, aggregation, rule);
  }

  /**
   * Create aggregated notification in database
   */
  private async createAggregatedNotification(
    event: NotificationEvent, 
    aggregation: AggregatedNotification, 
    rule: AggregationRule
  ): Promise<any> {    const { userId, entityType, entityId, metadata } = event.data;
    const actorName = await this.getUserName(aggregation.actors[0]);
    
    const { title, message } = await this.generateAggregatedContent(rule, aggregation, actorName);

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: this.mapEventTypeToNotificationType(event.type),
        category: this.getNotificationCategory(event.type),
        priority: this.getNotificationPriority(event.type),
        title,
        message,
        entityType,
        entityId,
        groupKey: aggregation.groupKey,
        aggregatedCount: aggregation.count,
        aggregatedActors: aggregation.actors,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        data: { ...metadata, eventType: event.type },
        status: NotificationStatus.SENT
      }
    });

    await this.deliverNotification(notification);
    return notification;
  }

  /**
   * Update aggregated notification in database
   */
  private async updateAggregatedNotification(
    groupKey: string, 
    aggregation: AggregatedNotification, 
    rule: AggregationRule,
    event: NotificationEvent
  ): Promise<void> {    const actorName = await this.getUserName(aggregation.actors[0]);
    const { title, message } = await this.generateAggregatedContent(rule, aggregation, actorName);

    const notification = await prisma.notification.updateMany({
      where: { groupKey },
      data: {
        title,
        message,
        aggregatedCount: aggregation.count,
        aggregatedActors: aggregation.actors,
        updatedAt: new Date()
      }
    });

    // Get updated notification and deliver
    if (notification.count > 0) {
      const updatedNotif = await prisma.notification.findFirst({
        where: { groupKey }
      });
      if (updatedNotif) {
        await this.deliverNotification(updatedNotif);
      }
    }
  }
  /**
   * Generate Facebook-style aggregated content
   */
  private async generateAggregatedContent(
    rule: AggregationRule, 
    aggregation: AggregatedNotification, 
    actorName: string
  ): Promise<{ title: string; message: string }> {
    const { actors, count } = aggregation;
    
    let content: string;
    
    if (count === 1) {
      content = rule.template.single.replace('{actor}', actorName);
    } else if (count === 2) {
      const actor2Name = actors.length > 1 ? await this.getUserName(actors[1]) : 'Someone';
      content = rule.template.double
        .replace('{actor1}', actorName)
        .replace('{actor2}', actor2Name);
    } else {
      const othersCount = count - 1;
      content = rule.template.multiple
        .replace('{actor1}', actorName)
        .replace('{count}', othersCount.toString());
    }

    return {
      title: content,
      message: content
    };
  }

  /**
   * Create notification from event (instant)
   */
  private async createNotificationFromEvent(event: NotificationEvent): Promise<any> {
    const { userId, actorId, entityType, entityId, metadata } = event.data;
    const actorName = await this.getUserName(actorId);
    
    const title = this.generateSimpleTitle(event.type, actorName, entityType);
    
    return await prisma.notification.create({
      data: {
        userId,
        type: this.mapEventTypeToNotificationType(event.type),
        category: this.getNotificationCategory(event.type),
        priority: this.getNotificationPriority(event.type),
        title,
        message: title,
        entityType,
        entityId,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        data: { ...metadata, eventType: event.type },
        status: NotificationStatus.SENT
      }
    });
  }

  /**
   * Generate simple title for non-aggregated notifications
   */
  private generateSimpleTitle(type: string, actorName: string, entityType: string): string {
    const templates: Record<string, string> = {
      'MESSAGE_RECEIVED': `New message from ${actorName}`,
      'ASSIGNMENT_DUE': `Assignment due soon`,
      'GRADE_POSTED': `Grade posted by ${actorName}`,
      'COURSE_ENROLLED': `${actorName} enrolled in your course`,
      'ASSIGNMENT_SUBMITTED': `${actorName} submitted an assignment`,
      'SYSTEM_ANNOUNCEMENT': `System announcement`,
      'PAYMENT_DUE': `Payment reminder`
    };

    return templates[type] || `Notification from ${actorName}`;
  }
  /**
   * Deliver notification via Socket.IO and Push Notifications
   */
  private async deliverNotification(notification: any): Promise<void> {
    try {
      // Update unread count in Redis
      const cacheKey = `notif:count:${notification.userId}`;
      await redis.incr(cacheKey);
      await redis.expire(cacheKey, 300); // 5 minutes

      // Publish to Socket.IO via Redis pub/sub
      await redis.publish('notification:new', JSON.stringify({
        userId: notification.userId,
        notificationId: notification.id,
        notification,
        timestamp: new Date().toISOString()
      }));

      // Send browser push notification
      if (notification.channels.includes(NotificationChannel.PUSH)) {
        await this.sendPushNotification(notification);
      }

      console.log(`📤 Delivered notification: ${notification.id} to user ${notification.userId}`);

    } catch (error) {
      console.error('❌ Failed to deliver notification:', error);
    }
  }

  /**
   * Send browser push notification
   */
  private async sendPushNotification(notification: any): Promise<void> {
    try {
      const pushPayload = {
        title: notification.title,
        message: notification.message,
        notificationId: notification.id,
        actionUrl: notification.actionUrl || '/notifications',
        imageUrl: notification.imageUrl,
        priority: notification.priority,
        data: {
          notificationId: notification.id,
          entityType: notification.entityType,
          entityId: notification.entityId,
          ...notification.data
        }
      };

      await pushNotificationSender.sendToUser(notification.userId, pushPayload);
      console.log(`📱 Push notification sent for notification: ${notification.id}`);
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      // Don't throw - push notification failure shouldn't break the flow
    }
  }

  /**
   * Get user name for display
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      // Try cache first
      const cached = await redis.get(`user:name:${userId}`);
      if (cached) return cached;

      // Get from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, username: true }
      });

      const name = user?.name || user?.username || 'Someone';
      
      // Cache for 5 minutes
      await redis.setex(`user:name:${userId}`, 300, name);
      
      return name;
    } catch (error) {
      console.error('❌ Failed to get user name:', error);
      return 'Someone';
    }
  }

  /**
   * Map event type to Prisma NotificationType
   */
  private mapEventTypeToNotificationType(eventType: string): NotificationType {
    const mapping: Record<string, NotificationType> = {
      'POST_LIKED': NotificationType.POST_LIKED,
      'POST_COMMENTED': NotificationType.POST_COMMENTED,
      'COMMENT_LIKED': NotificationType.COMMENT_LIKED,
      'USER_FOLLOWED': NotificationType.USER_FOLLOWED,
      'STORY_VIEWED': NotificationType.STORY_VIEWED,
      'STORY_LIKED': NotificationType.STORY_LIKED,
      'MESSAGE_RECEIVED': NotificationType.MESSAGE_RECEIVED,
      'ASSIGNMENT_DUE': NotificationType.ASSIGNMENT_DUE,
      'GRADE_POSTED': NotificationType.GRADE_POSTED,
      'COURSE_ENROLLED': NotificationType.ENROLLMENT_CONFIRMED,
      'ASSIGNMENT_SUBMITTED': NotificationType.ASSIGNMENT_DUE,
      'SYSTEM_ANNOUNCEMENT': NotificationType.SYSTEM_ALERT,
      'PAYMENT_DUE': NotificationType.PAYMENT_PENDING
    };

    return mapping[eventType] || NotificationType.SYSTEM_ALERT;
  }

  /**
   * Get notification category
   */
  private getNotificationCategory(eventType: string): NotificationCategory {
    const socialTypes = ['POST_LIKED', 'POST_COMMENTED', 'COMMENT_LIKED', 'USER_FOLLOWED', 'STORY_VIEWED', 'STORY_LIKED'];
    const educationalTypes = ['ASSIGNMENT_DUE', 'GRADE_POSTED', 'COURSE_ENROLLED', 'ASSIGNMENT_SUBMITTED'];
    const financialTypes = ['PAYMENT_DUE'];

    if (socialTypes.includes(eventType)) return NotificationCategory.SOCIAL;
    if (educationalTypes.includes(eventType)) return NotificationCategory.EDUCATIONAL;
    if (financialTypes.includes(eventType)) return NotificationCategory.FINANCIAL;
    
    return NotificationCategory.ADMINISTRATIVE;
  }

  /**
   * Get notification priority
   */
  private getNotificationPriority(eventType: string): NotificationPriority {
    const highPriorityTypes = ['ASSIGNMENT_DUE', 'PAYMENT_DUE', 'SYSTEM_ANNOUNCEMENT'];
    const lowPriorityTypes = ['STORY_VIEWED'];

    if (highPriorityTypes.includes(eventType)) return NotificationPriority.HIGH;
    if (lowPriorityTypes.includes(eventType)) return NotificationPriority.LOW;
    
    return NotificationPriority.NORMAL;
  }
}

// Export singleton instance
let processorInstance: FacebookNotificationProcessor | null = null;

export function getNotificationProcessor(): FacebookNotificationProcessor {
  if (!processorInstance) {
    processorInstance = new FacebookNotificationProcessor();
  }
  return processorInstance;
}

export default FacebookNotificationProcessor;
