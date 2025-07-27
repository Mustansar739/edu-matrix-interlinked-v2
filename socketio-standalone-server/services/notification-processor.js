/**
 * KAFKA-POWERED NOTIFICATION PROCESSOR
 * Facebook-scale notification processing using Kafka as the event backbone
 */

const { Kafka } = require('kafkajs');
const { logger } = require('../utils/logger');
const { redis } = require('../utils/redis');

class NotificationProcessor {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'notification-processor',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:29092'],
      connectionTimeout: 10000,
      requestTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        factor: 2
      }
    });

    this.consumer = this.kafka.consumer({ 
      groupId: 'notification-processor-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000
    });

    this.isRunning = false;
    this.aggregationRules = this.initializeAggregationRules();
  }

  /**
   * Initialize Facebook-style notification aggregation rules
   */
  initializeAggregationRules() {
    return {
      'POST_LIKED': {
        timeWindow: 300, // 5 minutes
        maxActors: 3,
        template: '{actor1} and {count} others liked your post',
        groupKey: (event) => `post_likes:${event.data.entityId}:${event.data.userId}`
      },
      'POST_COMMENTED': {
        timeWindow: 600, // 10 minutes
        maxActors: 2,
        template: '{actor1} and {count} others commented on your post',
        groupKey: (event) => `post_comments:${event.data.entityId}:${event.data.userId}`
      },
      'USER_FOLLOWED': {
        timeWindow: 3600, // 1 hour
        maxActors: 5,
        template: '{actor1} and {count} others started following you',
        groupKey: (event) => `follows:${event.data.userId}`
      }
    };
  }

  /**
   * Start the notification processor
   */
  async start() {
    try {
      logger.info('🔔 Starting Kafka-powered notification processor...');
      
      await this.producer.connect();
      await this.consumer.connect();
      
      await this.consumer.subscribe({
        topics: ['notification-events']
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value?.toString() || '{}');
            logger.info(`📨 Processing notification event: ${event.type}`);
            
            // Skip self-notifications
            if (event.userId === event.actorId) {
              logger.info('⏭️ Skipping self-notification');
              return;
            }

            // Check if this event type supports aggregation
            if (this.aggregationRules[event.type]) {
              await this.processAggregatedNotification(event);
            } else {
              await this.processInstantNotification(event);
            }
          } catch (error) {
            logger.error('❌ Failed to process notification event:', error);
          }
        }
      });

      this.isRunning = true;
      logger.info('✅ Kafka notification processor started successfully');
    } catch (error) {
      logger.error('❌ Failed to start notification processor:', error);
      throw error;
    }
  }

  /**
   * Process aggregated notifications (Facebook-style)
   */
  async processAggregatedNotification(event) {
    const rule = this.aggregationRules[event.type];
    const groupKey = rule.groupKey(event);
    const aggregationKey = `notif:agg:${groupKey}`;

    try {
      // Get existing aggregation
      const existingData = await redis.get(aggregationKey);
      
      if (existingData) {
        // Update existing aggregation
        const aggregation = JSON.parse(existingData);
        
        if (!aggregation.actors.includes(event.actorId)) {
          aggregation.actors.push(event.actorId);
          aggregation.count = aggregation.actors.length;
          aggregation.lastActivity = new Date();

          // Save updated aggregation
          await redis.setex(aggregationKey, rule.timeWindow, JSON.stringify(aggregation));
          
          // Update existing notification
          await this.updateAggregatedNotification(groupKey, aggregation, rule, event);
        }
      } else {
        // Create new aggregation
        const aggregation = {
          groupKey,
          actors: [event.actorId],
          count: 1,
          lastActivity: new Date()
        };

        await redis.setex(aggregationKey, rule.timeWindow, JSON.stringify(aggregation));
        await this.createAggregatedNotification(event, aggregation, rule);
      }
    } catch (error) {
      logger.error(`Error processing aggregated notification:`, error);
    }
  }

  /**
   * Process instant notifications (no aggregation)
   */
  async processInstantNotification(event) {
    try {
      // Create notification immediately
      const notification = await this.createNotificationFromEvent(event);
      
      // Deliver via multiple channels
      await this.deliverNotification(notification, event.channels || ['IN_APP']);
      
      logger.info(`✅ Processed instant notification ${notification.id}`);
    } catch (error) {
      logger.error(`Error processing instant notification:`, error);
    }
  }

  /**
   * Create aggregated notification
   */
  async createAggregatedNotification(event, aggregation, rule) {
    const { userId, entityType, entityId, metadata } = event.data;
    const actorName = await this.getUserName(aggregation.actors[0]);
    const { title, message } = this.generateAggregatedContent(rule, aggregation, actorName);

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      message,
      type: event.type,
      entityType,
      entityId,
      groupKey: aggregation.groupKey,
      aggregatedCount: aggregation.count,
      aggregatedActors: aggregation.actors,
      data: { ...metadata, eventType: event.type },
      createdAt: new Date(),
      isRead: false
    };

    await this.deliverNotification(notification, event.channels || ['IN_APP']);
    return notification;
  }

  /**
   * Update aggregated notification
   */
  async updateAggregatedNotification(groupKey, aggregation, rule, event) {
    const actorName = await this.getUserName(aggregation.actors[0]);
    const { title, message } = this.generateAggregatedContent(rule, aggregation, actorName);

    // Publish update event
    await this.producer.send({
      topic: 'notification-delivery',
      messages: [{
        key: groupKey,
        value: JSON.stringify({
          type: 'NOTIFICATION_UPDATED',
          groupKey,
          userId: event.data.userId,
          title,
          message,
          aggregatedCount: aggregation.count,
          aggregatedActors: aggregation.actors,
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  /**
   * Generate content for aggregated notifications
   */
  generateAggregatedContent(rule, aggregation, actorName) {
    let content = rule.template.replace('{actor1}', actorName);
    
    if (aggregation.count > 1) {
      const othersCount = aggregation.count - 1;
      content = content.replace('{count}', othersCount.toString());
    } else {
      // Remove "and X others" part for single actor
      content = content.replace(/ and \{count\} others/, '');
    }

    return {
      title: content,
      message: content
    };
  }

  /**
   * Create notification from event (instant)
   */
  async createNotificationFromEvent(event) {
    const { userId, actorId, entityType, entityId, metadata } = event.data;
    const actorName = await this.getUserName(actorId);
    const title = this.generateSimpleTitle(event.type, actorName, entityType);

    return {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      message: title,
      type: event.type,
      entityType,
      entityId,
      data: { ...metadata, eventType: event.type },
      createdAt: new Date(),
      isRead: false
    };
  }

  /**
   * Deliver notification via multiple channels
   */
  async deliverNotification(notification, channels) {
    try {
      // Always deliver via real-time
      await this.producer.send({
        topic: 'notification-delivery',
        messages: [{
          key: notification.userId,
          value: JSON.stringify({
            type: 'REALTIME_DELIVERY',
            notification,
            timestamp: new Date().toISOString()
          })
        }]
      });

      // Deliver via other channels if specified
      for (const channel of channels) {
        switch (channel) {
          case 'PUSH':
            await this.deliverPushNotification(notification);
            break;
          case 'EMAIL':
            await this.deliverEmailNotification(notification);
            break;
          case 'SMS':
            await this.deliverSMSNotification(notification);
            break;
        }
      }

      // Track delivery analytics
      await this.producer.send({
        topic: 'notification-analytics',
        messages: [{
          key: notification.id,
          value: JSON.stringify({
            notificationId: notification.id,
            userId: notification.userId,
            action: 'delivered',
            channels,
            timestamp: new Date().toISOString()
          })
        }]
      });

    } catch (error) {
      logger.error(`Error delivering notification ${notification.id}:`, error);
    }
  }

  /**
   * Deliver push notification
   */
  async deliverPushNotification(notification) {
    await this.producer.send({
      topic: 'push-notifications',
      messages: [{
        key: notification.userId,
        value: JSON.stringify({
          userId: notification.userId,
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification.id,
            entityType: notification.entityType,
            entityId: notification.entityId
          },
          priority: notification.priority || 'normal',
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  /**
   * Deliver email notification
   */
  async deliverEmailNotification(notification) {
    await this.producer.send({
      topic: 'email-queue',
      messages: [{
        key: notification.userId,
        value: JSON.stringify({
          type: 'notification_email',
          userId: notification.userId,
          subject: notification.title,
          template: 'notification',
          data: {
            notification,
            unsubscribeUrl: `${process.env.NEXTAUTH_URL}/notifications/unsubscribe`
          },
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  /**
   * Deliver SMS notification
   */
  async deliverSMSNotification(notification) {
    await this.producer.send({
      topic: 'sms-queue',
      messages: [{
        key: notification.userId,
        value: JSON.stringify({
          type: 'notification_sms',
          userId: notification.userId,
          message: `${notification.title} - ${process.env.NEXTAUTH_URL}`,
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  /**
   * Get user name (cached)
   */
  async getUserName(userId) {
    try {
      const cached = await redis.get(`user:${userId}:name`);
      if (cached) return cached;

      // Fetch from database and cache
      const userName = 'User'; // Placeholder - implement actual user lookup
      await redis.setex(`user:${userId}:name`, 3600, userName);
      return userName;
    } catch (error) {
      return 'Someone';
    }
  }

  /**
   * Generate simple title for non-aggregated notifications
   */
  generateSimpleTitle(type, actorName, entityType) {
    const templates = {
      'POST_LIKED': `${actorName} liked your post`,
      'POST_COMMENTED': `${actorName} commented on your post`,
      'USER_FOLLOWED': `${actorName} started following you`,
      'STORY_VIEWED': `${actorName} viewed your story`,
      'MESSAGE_RECEIVED': `${actorName} sent you a message`,
      'ASSIGNMENT_DUE': `Assignment due soon`,
      'GRADE_POSTED': `New grade posted`,
      'SYSTEM_ANNOUNCEMENT': `System announcement`
    };

    return templates[type] || `New ${type.toLowerCase().replace('_', ' ')} notification`;
  }

  /**
   * Stop the processor
   */
  async stop() {
    try {
      this.isRunning = false;
      await this.consumer.disconnect();
      await this.producer.disconnect();
      logger.info('✅ Notification processor stopped');
    } catch (error) {
      logger.error('❌ Error stopping notification processor:', error);
    }
  }
}

module.exports = { NotificationProcessor };
