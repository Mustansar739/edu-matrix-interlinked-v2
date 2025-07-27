/**
 * FACEBOOK-SCALE NOTIFICATION INTEGRATION EXAMPLES
 * Examples of how to integrate the notification system into content APIs
 */

import { NotificationEventPublisher } from '@/lib/services/notification-system/notification-events';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// ==========================================
// EXAMPLE 1: POST LIKE API INTEGRATION
// ==========================================

export async function POST_LIKE_INTEGRATION_EXAMPLE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }    const { postId } = await request.json();
    const userId = session.user.id;

    // Get post details
    const post = await prisma.socialPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }    // Create or update like
    const like = await prisma.socialPostLike.upsert({
      where: {
        postId_userId: {
          postId,
          userId
        }
      },      update: {
        // updatedAt is auto-managed by Prisma
      },
      create: {
        postId,
        userId
      }
    });

    // 🔥 FACEBOOK-SCALE NOTIFICATION EVENT
    if (post.authorId !== userId) { // Don't notify self
      await NotificationEventPublisher.publishPostLiked({        actorId: userId,
        postId: post.id,
        postAuthorId: post.authorId,
        postTitle: post.content,
        entityType: 'post',
        entityId: post.id,
        userId: post.authorId,
        institutionId: post.institutionId || undefined,
        metadata: {
          postType: post.postType,
          postCategory: post.subjectArea || undefined
        }
      });
    }

    return NextResponse.json({ success: true, like });

  } catch (error) {
    console.error('Error in post like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// EXAMPLE 2: COMMENT CREATION API INTEGRATION
// ==========================================

export async function POST_COMMENT_INTEGRATION_EXAMPLE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content, parentCommentId } = await request.json();
    const userId = session.user.id;    // Get post details
    const post = await prisma.socialPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }    // Create comment
    const comment = await prisma.socialPostComment.create({
      data: {
        content,
        postId,
        userId,
        parentId: parentCommentId
      },
      include: {
        parent: true
      }
    });

    // 🔥 FACEBOOK-SCALE NOTIFICATION EVENTS

    // 1. Notify post author (if not self)
    if (post.authorId !== userId) {
      await NotificationEventPublisher.publishPostCommented({
        actorId: userId,
        commentId: comment.id,
        commentText: content,
        postId: post.id,
        postAuthorId: post.authorId,        entityType: 'post',
        entityId: post.id,
        userId: post.authorId,
        institutionId: post.institutionId || undefined,
        metadata: {
          postTitle: post.content,
          commentType: parentCommentId ? 'reply' : 'comment'
        }
      });
    }    // 2. Notify parent comment author (if reply and not self)
    if (parentCommentId && comment.parent && comment.parent.userId !== userId) {
      await NotificationEventPublisher.publishCommentLiked({
        actorId: userId,
        commentId: parentCommentId,
        commentText: comment.parent.content,
        postId: post.id,
        postAuthorId: post.authorId,
        entityType: 'comment',
        entityId: parentCommentId,
        userId: comment.parent.userId,
        institutionId: post.institutionId || undefined,
        metadata: {
          replyText: content,
          postTitle: post.content
        }
      });
    }

    return NextResponse.json({ success: true, comment });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// EXAMPLE 3: USER FOLLOW API INTEGRATION
// ==========================================

export async function USER_FOLLOW_INTEGRATION_EXAMPLE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await request.json();
    const followerId = session.user.id;

    if (targetUserId === followerId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }    // Create or update follow relationship
    const follow = await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId
        }
      },
      update: {
        status: 'ACCEPTED'
      },
      create: {
        followerId,
        followingId: targetUserId,
        status: 'ACCEPTED'
      }
    });

    // 🔥 FACEBOOK-SCALE NOTIFICATION EVENT
    await NotificationEventPublisher.publishUserFollowed({
      targetUserId,
      followerId,
      entityType: 'user',
      entityId: targetUserId,
      userId: targetUserId,
      actorId: followerId,
      metadata: {
        followType: 'user_follow'
      }
    });

    return NextResponse.json({ success: true, follow });

  } catch (error) {
    console.error('Error in user follow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// EXAMPLE 4: STORY VIEW API INTEGRATION
// ==========================================

export async function STORY_VIEW_INTEGRATION_EXAMPLE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await request.json();
    const viewerId = session.user.id;    // Get story details
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }    // Record view (only once per user per story)
    const existingView = await prisma.storyView.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId: viewerId
        }
      }
    });

    if (!existingView) {
      await prisma.storyView.create({
        data: {
          storyId,
          userId: viewerId,
          viewedAt: new Date()
        }
      });

      // 🔥 FACEBOOK-SCALE NOTIFICATION EVENT (only for new views)
      if (story.authorId !== viewerId) { // Don't notify self
        await NotificationEventPublisher.publishStoryViewed({
          storyId: story.id,
          storyAuthorId: story.authorId,
          viewerId,          entityType: 'story',
          entityId: story.id,
          userId: story.authorId,
          actorId: viewerId,
          institutionId: undefined, // Story doesn't have institutionId
          metadata: {
            storyType: 'general', // Story doesn't have type field
            viewCount: await prisma.storyView.count({ where: { storyId } })
          }
        });
      }
    }

    return NextResponse.json({ success: true, viewed: !existingView });

  } catch (error) {
    console.error('Error recording story view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// EXAMPLE 5: MESSAGE SEND API INTEGRATION
// ==========================================

export async function MESSAGE_SEND_INTEGRATION_EXAMPLE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId, content, conversationId } = await request.json();
    const senderId = session.user.id;

    if (recipientId === senderId) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        conversationId,
        messageType: 'TEXT'
      }
    });

    // 🔥 FACEBOOK-SCALE NOTIFICATION EVENT
    await NotificationEventPublisher.publishMessageReceived({
      messageId: message.id,
      senderId,
      recipientId,
      conversationId,
      messageText: content,
      entityType: 'message',
      entityId: message.id,
      userId: recipientId,
      actorId: senderId,
      metadata: {
        messageType: 'direct_message',
        conversationType: 'private'
      }
    });

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ==========================================
// EXAMPLE 6: BATCH NOTIFICATION EXAMPLE
// ==========================================

export async function BATCH_NOTIFICATION_EXAMPLE() {
  try {    // Example: Course assignment deadline reminder
    const assignmentsDue = await prisma.assignment.findMany({
      where: {
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      },
      include: {
        course: true
      }
    });

    const batchEvents = [];

    for (const assignment of assignmentsDue) {
      // Get students enrolled in course who haven't submitted
      const enrolledStudents = await prisma.courseEnrollment.findMany({
        where: {
          courseId: assignment.courseId,
          status: 'ACTIVE'
        }
      });

      for (const enrollment of enrolledStudents) {
        // Check if student has submitted (would need to implement this logic properly)
        const hasSubmitted = false; // Placeholder since submissions relation doesn't exist

        if (!hasSubmitted) {
          batchEvents.push({
            type: 'ASSIGNMENT_DUE',
            data: {
              userId: enrollment.studentId,
              actorId: 'SYSTEM',
              entityType: 'assignment',
              entityId: assignment.id,
              action: 'reminder',
              metadata: {
                title: `Assignment Due Soon: ${assignment.title}`,
                message: `Your assignment "${assignment.title}" is due in less than 24 hours`,
                courseName: assignment.course.name,
                dueDate: assignment.dueDate,
                priority: 'HIGH'
              }
            }
          });
        }
      }
    }

    // 🔥 FACEBOOK-SCALE BATCH NOTIFICATION EVENT
    if (batchEvents.length > 0) {
      await NotificationEventPublisher.publishBatch(batchEvents);
      console.log(`📤 Sent ${batchEvents.length} assignment reminder notifications`);
    }

  } catch (error) {
    console.error('Error in batch notification example:', error);
  }
}

// ==========================================
// UTILITY FUNCTIONS FOR INTEGRATION
// ==========================================

/**
 * Helper to check if user wants notifications for specific type
 */
export async function shouldSendNotificationToUser(
  userId: string, 
  notificationType: string
): Promise<boolean> {
  try {
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!preferences || !preferences.globalEnabled) {
      return false;
    }

    // Check category-specific preferences
    switch (notificationType) {
      case 'POST_LIKED':
      case 'POST_COMMENTED':
      case 'USER_FOLLOWED':
        return preferences.socialNotifications;
      
      case 'ASSIGNMENT_DUE':
      case 'GRADE_POSTED':
        return preferences.educationalNotifications;
      
      case 'SYSTEM_ANNOUNCEMENT':
      case 'PAYMENT_DUE':
        return preferences.systemNotifications;
      
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return false; // Fail safe - don't send if error
  }
}

/**
 * Helper to respect quiet hours
 */
export function isInQuietHours(timezone: string, quietStart: string, quietEnd: string): boolean {
  try {
    const now = new Date();
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    const currentHour = parseInt(userTime.split(':')[0]);
    const startHour = parseInt(quietStart.split(':')[0]);
    const endHour = parseInt(quietEnd.split(':')[0]);

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  } catch (error) {
    return false; // Fail safe - allow notifications if error
  }
}

export default {
  POST_LIKE_INTEGRATION_EXAMPLE,
  POST_COMMENT_INTEGRATION_EXAMPLE,
  USER_FOLLOW_INTEGRATION_EXAMPLE,
  STORY_VIEW_INTEGRATION_EXAMPLE,
  MESSAGE_SEND_INTEGRATION_EXAMPLE,
  BATCH_NOTIFICATION_EXAMPLE,
  shouldSendNotificationToUser,
  isInQuietHours
};
