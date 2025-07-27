/**
 * NOTIFICATION EVENT PUBLISHERS
 * Facebook-scale event publishers for triggering notifications via Kafka
 */

import { publishEvent } from '@/lib/kafka';

interface BaseEventData {
  userId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  institutionId?: string;
  metadata?: Record<string, any>;
}

interface PostEventData extends BaseEventData {
  postId: string;
  postTitle?: string;
  postAuthorId: string;
}

interface CommentEventData extends BaseEventData {
  commentId: string;
  commentText?: string;
  postId: string;
  postAuthorId: string;
}

interface UserEventData extends BaseEventData {
  targetUserId: string;
  followerId: string;
}

interface StoryEventData extends BaseEventData {
  storyId: string;
  storyAuthorId: string;
  viewerId: string;
}

interface MessageEventData extends BaseEventData {
  messageId: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  messageText?: string;
}

export class NotificationEventPublisher {
  /**
   * Publish post liked event
   */
  static async publishPostLiked(data: PostEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'POST_LIKED',
      data: {
        userId: data.postAuthorId, // Notification recipient
        actorId: data.actorId, // User who liked
        entityType: 'post',
        entityId: data.postId,
        action: 'liked',
        metadata: {
          postTitle: data.postTitle,
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published POST_LIKED event: ${data.actorId} liked post ${data.postId}`);
  }

  /**
   * Publish post commented event
   */
  static async publishPostCommented(data: CommentEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'POST_COMMENTED',
      data: {
        userId: data.postAuthorId, // Notification recipient
        actorId: data.actorId, // User who commented
        entityType: 'post',
        entityId: data.postId,
        action: 'commented',
        metadata: {
          commentId: data.commentId,
          commentText: data.commentText?.substring(0, 100), // Truncate for privacy
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published POST_COMMENTED event: ${data.actorId} commented on post ${data.postId}`);
  }

  /**
   * Publish comment liked event
   */
  static async publishCommentLiked(data: CommentEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'COMMENT_LIKED',
      data: {
        userId: data.userId, // Comment author
        actorId: data.actorId, // User who liked
        entityType: 'comment',
        entityId: data.commentId,
        action: 'liked',
        metadata: {
          postId: data.postId,
          commentText: data.commentText?.substring(0, 50),
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published COMMENT_LIKED event: ${data.actorId} liked comment ${data.commentId}`);
  }

  /**
   * Publish user followed event
   */
  static async publishUserFollowed(data: UserEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'USER_FOLLOWED',
      data: {
        userId: data.targetUserId, // User being followed
        actorId: data.followerId, // User who followed
        entityType: 'user',
        entityId: data.targetUserId,
        action: 'followed',
        metadata: {
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published USER_FOLLOWED event: ${data.followerId} followed ${data.targetUserId}`);
  }

  /**
   * Publish post shared event
   */
  static async publishPostShared(data: PostEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'POST_SHARED',
      data: {
        userId: data.postAuthorId, // Original post author
        actorId: data.actorId, // User who shared
        entityType: 'post',
        entityId: data.postId,
        action: 'shared',
        metadata: {
          postTitle: data.postTitle,
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published POST_SHARED event: ${data.actorId} shared post ${data.postId}`);
  }

  /**
   * Publish story viewed event
   */
  static async publishStoryViewed(data: StoryEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'STORY_VIEWED',
      data: {
        userId: data.storyAuthorId, // Story owner
        actorId: data.viewerId, // User who viewed
        entityType: 'story',
        entityId: data.storyId,
        action: 'viewed',
        metadata: {
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published STORY_VIEWED event: ${data.viewerId} viewed story ${data.storyId}`);
  }

  /**
   * Publish story liked event
   */
  static async publishStoryLiked(data: StoryEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'STORY_LIKED',
      data: {
        userId: data.storyAuthorId, // Story owner
        actorId: data.actorId, // User who liked
        entityType: 'story',
        entityId: data.storyId,
        action: 'liked',
        metadata: {
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published STORY_LIKED event: ${data.actorId} liked story ${data.storyId}`);
  }

  /**
   * Publish message received event
   */
  static async publishMessageReceived(data: MessageEventData): Promise<void> {
    await publishEvent('notification-events', {
      type: 'MESSAGE_RECEIVED',
      data: {
        userId: data.recipientId, // Message recipient
        actorId: data.senderId, // Message sender
        entityType: 'message',
        entityId: data.messageId,
        action: 'sent',
        metadata: {
          conversationId: data.conversationId,
          messagePreview: data.messageText?.substring(0, 50),
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published MESSAGE_RECEIVED event: ${data.senderId} sent message to ${data.recipientId}`);
  }

  /**
   * Publish course enrollment event
   */
  static async publishCourseEnrolled(data: {
    userId: string;
    courseId: string;
    courseName: string;
    instructorId: string;
    institutionId?: string;
  }): Promise<void> {
    await publishEvent('notification-events', {
      type: 'COURSE_ENROLLED',
      data: {
        userId: data.instructorId, // Instructor gets notification
        actorId: data.userId, // Student who enrolled
        entityType: 'course',
        entityId: data.courseId,
        action: 'enrolled',
        metadata: {
          courseName: data.courseName,
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published COURSE_ENROLLED event: ${data.userId} enrolled in ${data.courseId}`);
  }

  /**
   * Publish assignment submitted event
   */
  static async publishAssignmentSubmitted(data: {
    studentId: string;
    assignmentId: string;
    assignmentTitle: string;
    instructorId: string;
    courseId: string;
    institutionId?: string;
  }): Promise<void> {
    await publishEvent('notification-events', {
      type: 'ASSIGNMENT_SUBMITTED',
      data: {
        userId: data.instructorId, // Instructor gets notification
        actorId: data.studentId, // Student who submitted
        entityType: 'assignment',
        entityId: data.assignmentId,
        action: 'submitted',
        metadata: {
          assignmentTitle: data.assignmentTitle,
          courseId: data.courseId,
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published ASSIGNMENT_SUBMITTED event: ${data.studentId} submitted ${data.assignmentId}`);
  }

  /**
   * Publish grade posted event
   */
  static async publishGradePosted(data: {
    studentId: string;
    assignmentId: string;
    assignmentTitle: string;
    grade: string;
    instructorId: string;
    courseId: string;
    institutionId?: string;
  }): Promise<void> {
    await publishEvent('notification-events', {
      type: 'GRADE_POSTED',
      data: {
        userId: data.studentId, // Student gets notification
        actorId: data.instructorId, // Instructor who graded
        entityType: 'assignment',
        entityId: data.assignmentId,
        action: 'graded',
        metadata: {
          assignmentTitle: data.assignmentTitle,
          grade: data.grade,
          courseId: data.courseId,
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published GRADE_POSTED event: Grade ${data.grade} posted for ${data.assignmentId}`);
  }

  /**
   * Publish system announcement event
   */
  static async publishSystemAnnouncement(data: {
    userId: string;
    title: string;
    message: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH';
    institutionId?: string;
    targetAudience?: string[];
  }): Promise<void> {
    const recipients = data.targetAudience || [data.userId];

    for (const recipientId of recipients) {
      await publishEvent('notification-events', {
        type: 'SYSTEM_ANNOUNCEMENT',
        data: {
          userId: recipientId,
          actorId: 'SYSTEM',
          entityType: 'announcement',
          entityId: `announcement-${Date.now()}`,
          action: 'announced',
          metadata: {
            title: data.title,
            message: data.message,
            priority: data.priority,
            institutionId: data.institutionId
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📤 Published SYSTEM_ANNOUNCEMENT event to ${recipients.length} recipients`);
  }

  /**
   * Publish payment reminder event
   */
  static async publishPaymentReminder(data: {
    userId: string;
    invoiceId: string;
    amount: number;
    dueDate: string;
    institutionId?: string;
  }): Promise<void> {
    await publishEvent('notification-events', {
      type: 'PAYMENT_DUE',
      data: {
        userId: data.userId,
        actorId: 'SYSTEM',
        entityType: 'invoice',
        entityId: data.invoiceId,
        action: 'reminder',
        metadata: {
          amount: data.amount,
          dueDate: data.dueDate,
          institutionId: data.institutionId
        }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Published PAYMENT_DUE event: Payment of ${data.amount} due for ${data.userId}`);
  }

  /**
   * Batch publish multiple events (for efficiency)
   */
  static async publishBatch(events: Array<{
    type: string;
    data: any;
  }>): Promise<void> {
    const timestamp = new Date().toISOString();
    
    const kafkaEvents = events.map(event => ({
      ...event,
      timestamp
    }));

    await publishEvent('notification-events', kafkaEvents);
    console.log(`📤 Published batch of ${events.length} notification events`);
  }
}

/**
 * Utility functions for integrating into existing APIs
 */

/**
 * Decorator to automatically publish notification events
 */
export function publishNotificationEvent(eventType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Extract notification data from result or args
      const notificationData = result?.notificationData || args[0]?.notificationData;
      
      if (notificationData) {
        try {
          await publishEvent('notification-events', {
            type: eventType,
            data: notificationData,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Failed to publish ${eventType} notification:`, error);
        }
      }
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Helper to extract user ID from auth context
 */
export function getCurrentUserId(request: any): string | null {
  // This would integrate with your auth system
  return request.auth?.user?.id || request.user?.id || null;
}

/**
 * Helper to extract institution ID from context
 */
export function getCurrentInstitutionId(request: any): string | null {
  // This would integrate with your multi-tenant system
  return request.institution?.id || request.headers?.['x-institution-id'] || null;
}
